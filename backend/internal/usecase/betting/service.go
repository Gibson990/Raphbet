// Package betting is the application use case for the server-authoritative
// wallet and bets. All balance changes happen here, never on the client.
package betting

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

var (
	ErrInvalidAmount = errors.New("amount must be positive")
	ErrInsufficient  = errors.New("insufficient balance")
	ErrEmptyBet      = errors.New("no selections provided")
	ErrBadSelection  = errors.New("selection is not available for betting")
	ErrDuplicateLeg  = errors.New("a match can only appear once on an accumulator")
	ErrTooManyLegs   = errors.New("too many selections on the accumulator")
)

// maxAccaLegs caps the number of legs on an accumulator. Bounds combinatorial
// payout risk and matches the practical limits used by mainstream bookmakers.
const maxAccaLegs = 20

// OddsResolver returns the canonical, server-side price for a market outcome on
// a match. Implemented by the football use case; nil in tests (which then trust
// the supplied odds). When set, the placement path always overwrites the
// client-supplied odds with the resolved price — the client can never dictate a
// payout multiplier.
type OddsResolver interface {
	OddsForSelection(matchID, marketCode string) (float64, bool)
}

// Limits are the configurable risk limits (USD cents).
type Limits struct {
	MinBet, MaxBet, MinWithdrawal, MaxWithdrawal domain.Money
}

// Service coordinates the wallet, bet and withdrawal repositories.
type Service struct {
	wallets        domain.WalletRepository
	bets           domain.BetRepository
	withdrawals    domain.WithdrawalRepository
	initialBalance domain.Money
	limits         Limits
	limitsMu       sync.RWMutex
	locks          sync.Map     // deviceID -> *sync.Mutex, serialises wallet mutations
	odds           OddsResolver // nil in tests; set in production to validate prices
}

// SetOddsResolver wires the canonical odds source. Once set, every placed
// selection is repriced server-side, so forged client odds are ignored.
func (s *Service) SetOddsResolver(r OddsResolver) { s.odds = r }

// resolveSelection reprices a selection from the authoritative odds source. When
// no resolver is configured (tests) the supplied odds are trusted unchanged.
func (s *Service) resolveSelection(sel domain.BetSelection) (domain.BetSelection, error) {
	if s.odds == nil {
		return sel, nil
	}
	price, ok := s.odds.OddsForSelection(sel.MatchID, sel.Market)
	if !ok {
		return sel, ErrBadSelection
	}
	sel.Odds = price
	return sel, nil
}

// New builds a betting service. initialBalance seeds a brand-new wallet.
func New(wallets domain.WalletRepository, bets domain.BetRepository, withdrawals domain.WithdrawalRepository, initialBalance domain.Money, limits Limits) *Service {
	return &Service{wallets: wallets, bets: bets, withdrawals: withdrawals, initialBalance: initialBalance, limits: limits}
}

var (
	ErrStakeRange      = errors.New("stake is outside the allowed limits")
	ErrWithdrawalRange = errors.New("withdrawal amount is outside the allowed limits")
	ErrSuspended       = errors.New("account suspended")
)

// lock serialises all balance mutations for one device so concurrent requests
// can't both pass a balance check and overdraw (read-modify-write race). Returns
// the unlock func. (Single-instance; a distributed lock would replace this when
// scaling horizontally.)
func (s *Service) lock(deviceID string) func() {
	m, _ := s.locks.LoadOrStore(deviceID, &sync.Mutex{})
	mu := m.(*sync.Mutex)
	mu.Lock()
	return mu.Unlock
}

var ErrNoAddress = errors.New("a withdrawal address is required")
var ErrNotPending = errors.New("withdrawal is not pending")

// RequestWithdrawal validates funds, holds them (debits the wallet) and records
// a PENDING withdrawal for admin approval.
func (s *Service) RequestWithdrawal(deviceID string, amount domain.Money, address string) (*domain.Withdrawal, error) {
	defer s.lock(deviceID)()
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	lim := s.Limits()
	if amount < lim.MinWithdrawal || amount > lim.MaxWithdrawal {
		return nil, ErrWithdrawalRange
	}
	if address == "" {
		return nil, ErrNoAddress
	}
	w, err := s.Wallet(deviceID)
	if err != nil {
		return nil, err
	}
	if w.Suspended {
		return nil, ErrSuspended
	}
	if amount > w.Balance {
		return nil, ErrInsufficient
	}
	w.Balance -= amount
	s.addTx(w, domain.TxWithdrawal, -amount, "Withdrawal to "+address)
	if err := s.wallets.Save(w); err != nil {
		return nil, err
	}
	wd := &domain.Withdrawal{
		ID:          newID(),
		DeviceID:    deviceID,
		Amount:      amount,
		Address:     address,
		Status:      domain.WdPending,
		CreatedDate: time.Now(),
	}
	return wd, s.withdrawals.AddWithdrawal(wd)
}

// Withdrawals returns a device's withdrawal requests.
func (s *Service) Withdrawals(deviceID string) ([]*domain.Withdrawal, error) {
	return s.withdrawals.ListWithdrawalsByDevice(deviceID)
}

// PendingWithdrawals returns all withdrawals awaiting approval (admin).
func (s *Service) PendingWithdrawals() ([]*domain.Withdrawal, error) {
	return s.withdrawals.ListPendingWithdrawals()
}

// ApproveWithdrawal marks a pending withdrawal as paid. (Funds were already held
// at request time; the actual crypto payout executes via the payout provider —
// sandbox marks it paid until NOWPayments payouts are configured.)
func (s *Service) ApproveWithdrawal(id string) (*domain.Withdrawal, error) {
	wd, err := s.withdrawals.GetWithdrawal(id)
	if err != nil || wd == nil {
		return nil, err
	}
	if wd.Status != domain.WdPending {
		return nil, ErrNotPending
	}
	wd.Status = domain.WdPaid
	wd.Note = "approved"
	return wd, s.withdrawals.UpdateWithdrawal(wd)
}

// RejectWithdrawal refunds the held funds and marks the request rejected.
func (s *Service) RejectWithdrawal(id, reason string) (*domain.Withdrawal, error) {
	wd, err := s.withdrawals.GetWithdrawal(id)
	if err != nil || wd == nil {
		return nil, err
	}
	if wd.Status != domain.WdPending {
		return nil, ErrNotPending
	}
	defer s.lock(wd.DeviceID)()
	w, err := s.Wallet(wd.DeviceID)
	if err != nil {
		return nil, err
	}
	w.Balance += wd.Amount
	s.addTx(w, domain.TxPayout, wd.Amount, "Withdrawal refund")
	if err := s.wallets.Save(w); err != nil {
		return nil, err
	}
	wd.Status = domain.WdRejected
	wd.Note = reason
	return wd, s.withdrawals.UpdateWithdrawal(wd)
}

// Wallet returns the device's wallet, creating it (seeded) on first use.
func (s *Service) Wallet(deviceID string) (*domain.Wallet, error) {
	w, err := s.wallets.Get(deviceID)
	if err != nil {
		return nil, err
	}
	if w == nil {
		w = &domain.Wallet{DeviceID: deviceID, Balance: s.initialBalance, Transactions: []domain.Transaction{}}
		if err := s.wallets.Save(w); err != nil {
			return nil, err
		}
	}
	return w, nil
}

// TopUp adds credits to the wallet.
func (s *Service) TopUp(deviceID string, amount domain.Money, method string) (*domain.Wallet, error) {
	defer s.lock(deviceID)()
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	w, err := s.Wallet(deviceID)
	if err != nil {
		return nil, err
	}
	if w.Suspended {
		return nil, ErrSuspended
	}
	w.Balance += amount
	s.addTx(w, domain.TxTopUp, amount, "Top up via "+method)
	return w, s.wallets.Save(w)
}

// Withdraw removes credits from the wallet.
func (s *Service) Withdraw(deviceID string, amount domain.Money, method string) (*domain.Wallet, error) {
	defer s.lock(deviceID)()
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	w, err := s.Wallet(deviceID)
	if err != nil {
		return nil, err
	}
	if w.Suspended {
		return nil, ErrSuspended
	}
	if amount > w.Balance {
		return nil, ErrInsufficient
	}
	w.Balance -= amount
	s.addTx(w, domain.TxWithdrawal, -amount, "Withdrawal to "+method)
	return w, s.wallets.Save(w)
}

// PlaceItem is one selection plus its stake.
type PlaceItem struct {
	Selection domain.BetSelection
	Wager     domain.Money
}

// PlaceBet validates funds, debits the wallet and records pending bets.
func (s *Service) PlaceBet(deviceID string, items []PlaceItem) ([]*domain.Bet, *domain.Wallet, error) {
	defer s.lock(deviceID)()
	if len(items) == 0 {
		return nil, nil, ErrEmptyBet
	}
	var total domain.Money
	lim := s.Limits()
	for i := range items {
		if items[i].Wager <= 0 {
			return nil, nil, ErrInvalidAmount
		}
		if items[i].Wager < lim.MinBet || items[i].Wager > lim.MaxBet {
			return nil, nil, ErrStakeRange
		}
		// Reprice from the authoritative odds engine — never trust client odds.
		sel, err := s.resolveSelection(items[i].Selection)
		if err != nil {
			return nil, nil, err
		}
		items[i].Selection = sel
		total += items[i].Wager
	}
	w, err := s.Wallet(deviceID)
	if err != nil {
		return nil, nil, err
	}
	if w.Suspended {
		return nil, nil, ErrSuspended
	}
	if total > w.Balance {
		return nil, nil, ErrInsufficient
	}

	now := time.Now()
	placed := make([]*domain.Bet, 0, len(items))
	for _, it := range items {
		b := &domain.Bet{
			ID:         newID(),
			DeviceID:   deviceID,
			Selection:  it.Selection,
			Wager:      it.Wager,
			Status:     domain.BetPending,
			PlacedDate: now,
		}
		if err := s.bets.Add(b); err != nil {
			return nil, nil, err
		}
		placed = append(placed, b)
	}

	w.Balance -= total
	s.addTx(w, domain.TxWager, -total, fmt.Sprintf("%d bet(s) placed", len(items)))
	if err := s.wallets.Save(w); err != nil {
		return nil, nil, err
	}
	return placed, w, nil
}

// accaBoostLadder is the winnings boost applied to a winning accumulator, keyed
// by leg count. It mirrors the mainstream bet365 ladder (2.5% at 2 legs rising
// to a 100% cap at 20 legs). The boost is a marketing top-up on already
// margin-loaded legs; going beyond ~100% turns the product loss-making, which is
// why every major book caps here. Index 0/1 are unused (need 2+ legs).
var accaBoostLadder = [...]float64{
	0.00, 0.00, 0.025, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40,
	0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.90, 1.00,
}

// CalculateWinBoost returns the fractional win boost for a given number of legs
// (e.g. 0.10 == +10%). Two legs is the minimum for a boost; the ladder is capped
// at maxAccaLegs.
func CalculateWinBoost(legs int) float64 {
	if legs < 2 {
		return 0.0
	}
	if legs >= len(accaBoostLadder) {
		return accaBoostLadder[len(accaBoostLadder)-1]
	}
	return accaBoostLadder[legs]
}

// PlaceMultiBet validates funds, debits the wallet and records a pending multi-bet.
func (s *Service) PlaceMultiBet(deviceID string, selections []domain.BetSelection, wager domain.Money) (*domain.Bet, *domain.Wallet, error) {
	defer s.lock(deviceID)()
	if len(selections) == 0 {
		return nil, nil, ErrEmptyBet
	}
	if len(selections) > maxAccaLegs {
		return nil, nil, ErrTooManyLegs
	}
	if wager <= 0 {
		return nil, nil, ErrInvalidAmount
	}
	lim := s.Limits()
	if wager < lim.MinBet || wager > lim.MaxBet {
		return nil, nil, ErrStakeRange
	}

	// Reprice every leg from the authoritative odds engine and reject duplicate
	// matches (legs in one acca must be independent, and a forged odds field must
	// never reach the payout math).
	seen := make(map[string]bool, len(selections))
	priced := make([]domain.BetSelection, len(selections))
	for i := range selections {
		if seen[selections[i].MatchID] {
			return nil, nil, ErrDuplicateLeg
		}
		seen[selections[i].MatchID] = true
		sel, err := s.resolveSelection(selections[i])
		if err != nil {
			return nil, nil, err
		}
		priced[i] = sel
	}
	selections = priced

	w, err := s.Wallet(deviceID)
	if err != nil {
		return nil, nil, err
	}
	if w.Suspended {
		return nil, nil, ErrSuspended
	}
	if wager > w.Balance {
		return nil, nil, ErrInsufficient
	}

	// Calculate compounded multiplier
	multiplier := 1.0
	for _, sel := range selections {
		multiplier *= sel.Odds
	}
	// Round multiplier to 2 decimal places
	multiplier = math.Round(multiplier*100) / 100

	winBoost := CalculateWinBoost(len(selections))

	now := time.Now()
	// Backwards compatibility selection: use the first selection
	firstSel := selections[0]

	b := &domain.Bet{
		ID:         newID(),
		DeviceID:   deviceID,
		Selection:  firstSel,
		Selections: selections,
		Wager:      wager,
		Status:     domain.BetPending,
		PlacedDate: now,
		IsMulti:    true,
		Multiplier: multiplier,
		WinBoost:   winBoost,
	}

	if err := s.bets.Add(b); err != nil {
		return nil, nil, err
	}

	w.Balance -= wager
	s.addTx(w, domain.TxWager, -wager, fmt.Sprintf("Accumulator bet placed (%d legs)", len(selections)))
	if err := s.wallets.Save(w); err != nil {
		return nil, nil, err
	}

	return b, w, nil
}


// Limits returns the configured risk limits (for the public config endpoint).
func (s *Service) Limits() Limits {
	s.limitsMu.RLock()
	defer s.limitsMu.RUnlock()
	return s.limits
}

// SetLimits updates the risk limits.
func (s *Service) SetLimits(limits Limits) {
	s.limitsMu.Lock()
	defer s.limitsMu.Unlock()
	s.limits = limits
}

// AdjustBalance updates a device/user's wallet balance directly (admin option).
func (s *Service) AdjustBalance(deviceID string, amount domain.Money, description string) (*domain.Wallet, error) {
	defer s.lock(deviceID)()
	w, err := s.Wallet(deviceID)
	if err != nil {
		return nil, err
	}
	w.Balance += amount
	s.addTx(w, domain.TxTopUp, amount, description)
	return w, s.wallets.Save(w)
}

// SetSuspended updates a device/user's account suspension status (admin option).
func (s *Service) SetSuspended(deviceID string, suspended bool) (*domain.Wallet, error) {
	defer s.lock(deviceID)()
	w, err := s.Wallet(deviceID)
	if err != nil {
		return nil, err
	}
	w.Suspended = suspended
	return w, s.wallets.Save(w)
}

// Bets returns all bets for a device, pending first then newest.
func (s *Service) Bets(deviceID string) ([]*domain.Bet, error) {
	return s.bets.ListByDevice(deviceID)
}

// SettleBet manually resolves a pending bet as WON or LOST (admin override).
// If outcome is WON, payout = wager * odds is credited to the wallet.
func (s *Service) SettleBet(betID string, outcome domain.BetStatus) (*domain.Bet, error) {
	pending, err := s.bets.ListPending()
	if err != nil {
		return nil, err
	}
	var bet *domain.Bet
	for _, b := range pending {
		if b.ID == betID {
			bet = b
			break
		}
	}
	if bet == nil {
		return nil, errors.New("bet not found or already settled")
	}
	bet.Status = outcome
	if outcome == domain.BetWon {
		payout := domain.Money(float64(bet.Wager) * bet.Selection.Odds)
		bet.Payout = payout
		if err := s.CreditPayout(bet.DeviceID, payout, fmt.Sprintf("Winnings: %s", bet.Selection.MatchDescription)); err != nil {
			return nil, err
		}
	}
	return bet, s.bets.Update(bet)
}

// CreditPayout adds winnings to a wallet. Used by the settlement worker.
func (s *Service) CreditPayout(deviceID string, amount domain.Money, desc string) error {
	defer s.lock(deviceID)()
	if amount <= 0 {
		return nil
	}
	w, err := s.Wallet(deviceID)
	if err != nil {
		return err
	}
	w.Balance += amount
	s.addTx(w, domain.TxPayout, amount, desc)
	return s.wallets.Save(w)
}

func (s *Service) addTx(w *domain.Wallet, t domain.TxType, amount domain.Money, desc string) {
	w.Transactions = append([]domain.Transaction{{
		ID:          newID(),
		Type:        t,
		Amount:      amount,
		Description: desc,
		Date:        time.Now(),
	}}, w.Transactions...)
}

func newID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

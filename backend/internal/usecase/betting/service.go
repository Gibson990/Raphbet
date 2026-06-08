// Package betting is the application use case for the server-authoritative
// wallet and bets. All balance changes happen here, never on the client.
package betting

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

var (
	ErrInvalidAmount = errors.New("amount must be positive")
	ErrInsufficient  = errors.New("insufficient balance")
	ErrEmptyBet      = errors.New("no selections provided")
)

// Service coordinates the wallet, bet and withdrawal repositories.
type Service struct {
	wallets        domain.WalletRepository
	bets           domain.BetRepository
	withdrawals    domain.WithdrawalRepository
	initialBalance domain.Money
	locks          sync.Map // deviceID -> *sync.Mutex, serialises wallet mutations
}

// New builds a betting service. initialBalance seeds a brand-new wallet.
func New(wallets domain.WalletRepository, bets domain.BetRepository, withdrawals domain.WithdrawalRepository, initialBalance domain.Money) *Service {
	return &Service{wallets: wallets, bets: bets, withdrawals: withdrawals, initialBalance: initialBalance}
}

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
	if address == "" {
		return nil, ErrNoAddress
	}
	w, err := s.Wallet(deviceID)
	if err != nil {
		return nil, err
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
	for _, it := range items {
		if it.Wager <= 0 {
			return nil, nil, ErrInvalidAmount
		}
		total += it.Wager
	}
	w, err := s.Wallet(deviceID)
	if err != nil {
		return nil, nil, err
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

// Bets returns all bets for a device, pending first then newest.
func (s *Service) Bets(deviceID string) ([]*domain.Bet, error) {
	return s.bets.ListByDevice(deviceID)
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

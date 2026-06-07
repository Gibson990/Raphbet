// Package betting is the application use case for the server-authoritative
// wallet and bets. All balance changes happen here, never on the client.
package betting

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

var (
	ErrInvalidAmount = errors.New("amount must be positive")
	ErrInsufficient  = errors.New("insufficient balance")
	ErrEmptyBet      = errors.New("no selections provided")
)

// Service coordinates the wallet and bet repositories.
type Service struct {
	wallets        domain.WalletRepository
	bets           domain.BetRepository
	initialBalance domain.Money
}

// New builds a betting service. initialBalance seeds a brand-new wallet.
func New(wallets domain.WalletRepository, bets domain.BetRepository, initialBalance domain.Money) *Service {
	return &Service{wallets: wallets, bets: bets, initialBalance: initialBalance}
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

// Package store provides persistence implementations of the domain repository
// ports. MemoryStore is a zero-dependency, in-process implementation used for
// local development; a MongoDB implementation will sit alongside it later and
// is a drop-in replacement (the use cases depend only on the interfaces).
package store

import (
	"sync"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// MemoryStore implements both WalletRepository and BetRepository in memory.
// Data resets when the process restarts.
type MemoryStore struct {
	mu      sync.RWMutex
	wallets       map[string]*domain.Wallet
	bets          map[string]*domain.Bet
	withdrawals   map[string]*domain.Withdrawal
	kyc           map[string]bool
	deviceSession map[string]string // deviceID -> sessionID
	sessionDevice map[string]string // sessionID -> deviceID
	processed     map[string]bool   // idempotency keys (e.g. payment ids)
	config        *domain.BookmakerConfig
}

// NewMemoryStore creates an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		wallets:       make(map[string]*domain.Wallet),
		bets:          make(map[string]*domain.Bet),
		withdrawals:   make(map[string]*domain.Withdrawal),
		kyc:           make(map[string]bool),
		deviceSession: make(map[string]string),
		sessionDevice: make(map[string]string),
		processed:     make(map[string]bool),
	}
}

// MarkProcessed records an idempotency key and reports whether it is new (true)
// or was already processed (false).
func (s *MemoryStore) MarkProcessed(key string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.processed[key] {
		return false, nil
	}
	s.processed[key] = true
	return true, nil
}

// ---- WithdrawalRepository ----

func (s *MemoryStore) AddWithdrawal(w *domain.Withdrawal) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *w
	s.withdrawals[w.ID] = &cp
	return nil
}

func (s *MemoryStore) GetWithdrawal(id string) (*domain.Withdrawal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if w, ok := s.withdrawals[id]; ok {
		cp := *w
		return &cp, nil
	}
	return nil, nil
}

func (s *MemoryStore) ListWithdrawalsByDevice(deviceID string) ([]*domain.Withdrawal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*domain.Withdrawal{}
	for _, w := range s.withdrawals {
		if w.DeviceID == deviceID {
			cp := *w
			out = append(out, &cp)
		}
	}
	return out, nil
}

func (s *MemoryStore) ListPendingWithdrawals() ([]*domain.Withdrawal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*domain.Withdrawal{}
	for _, w := range s.withdrawals {
		if w.Status == domain.WdPending {
			cp := *w
			out = append(out, &cp)
		}
	}
	return out, nil
}

func (s *MemoryStore) UpdateWithdrawal(w *domain.Withdrawal) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *w
	s.withdrawals[w.ID] = &cp
	return nil
}

// ---- kyc.Store ----

func (s *MemoryStore) SetVerified(deviceID string, verified bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.kyc[deviceID] = verified
	return nil
}

func (s *MemoryStore) IsVerified(deviceID string) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.kyc[deviceID], nil
}

func (s *MemoryStore) LinkSession(deviceID, sessionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.deviceSession[deviceID] = sessionID
	s.sessionDevice[sessionID] = deviceID
	return nil
}

func (s *MemoryStore) DeviceForSession(sessionID string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sessionDevice[sessionID], nil
}

func (s *MemoryStore) SessionForDevice(deviceID string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.deviceSession[deviceID], nil
}

// ---- WalletRepository ----

func (s *MemoryStore) Get(deviceID string) (*domain.Wallet, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if w, ok := s.wallets[deviceID]; ok {
		return cloneWallet(w), nil
	}
	return nil, nil
}

func (s *MemoryStore) Save(w *domain.Wallet) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.wallets[w.DeviceID] = cloneWallet(w)
	return nil
}

func (s *MemoryStore) AllWallets() ([]*domain.Wallet, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*domain.Wallet, 0, len(s.wallets))
	for _, w := range s.wallets {
		out = append(out, cloneWallet(w))
	}
	return out, nil
}

// ---- BetRepository ----

func (s *MemoryStore) Add(b *domain.Bet) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bets[b.ID] = cloneBet(b)
	return nil
}

func (s *MemoryStore) ListByDevice(deviceID string) ([]*domain.Bet, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*domain.Bet{}
	for _, b := range s.bets {
		if b.DeviceID == deviceID {
			out = append(out, cloneBet(b))
		}
	}
	return out, nil
}

func (s *MemoryStore) ListPending() ([]*domain.Bet, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*domain.Bet{}
	for _, b := range s.bets {
		if b.Status == domain.BetPending {
			out = append(out, cloneBet(b))
		}
	}
	return out, nil
}

func (s *MemoryStore) Update(b *domain.Bet) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bets[b.ID] = cloneBet(b)
	return nil
}

func (s *MemoryStore) AllBets() ([]*domain.Bet, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*domain.Bet, 0, len(s.bets))
	for _, b := range s.bets {
		out = append(out, cloneBet(b))
	}
	return out, nil
}

// Clones prevent callers from mutating stored data through shared pointers.
func cloneWallet(w *domain.Wallet) *domain.Wallet {
	cp := *w
	cp.Transactions = append([]domain.Transaction(nil), w.Transactions...)
	return &cp
}

func cloneBet(b *domain.Bet) *domain.Bet {
	cp := *b
	return &cp
}

// GetConfig returns the stored configuration.
func (s *MemoryStore) GetConfig() (*domain.BookmakerConfig, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.config == nil {
		return nil, nil
	}
	cp := *s.config
	return &cp, nil
}

// SaveConfig updates the stored configuration.
func (s *MemoryStore) SaveConfig(cfg *domain.BookmakerConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *cfg
	s.config = &cp
	return nil
}


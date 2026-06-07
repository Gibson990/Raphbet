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
	wallets map[string]*domain.Wallet
	bets    map[string]*domain.Bet
	kyc     map[string]bool
}

// NewMemoryStore creates an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		wallets: make(map[string]*domain.Wallet),
		bets:    make(map[string]*domain.Bet),
		kyc:     make(map[string]bool),
	}
}

// ---- kyc.Store ----

func (s *MemoryStore) SetVerified(deviceID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.kyc[deviceID] = true
	return nil
}

func (s *MemoryStore) IsVerified(deviceID string) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.kyc[deviceID], nil
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

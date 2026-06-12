package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/betting"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/payments"
)

// BettingService is the use case port for wallet, bets and withdrawals.
type BettingService interface {
	Wallet(deviceID string) (*domain.Wallet, error)
	RecordEmail(deviceID, email string) error
	PlaceBet(deviceID string, items []betting.PlaceItem) ([]*domain.Bet, *domain.Wallet, error)
	PlaceMultiBet(deviceID string, selections []domain.BetSelection, wager domain.Money) (*domain.Bet, *domain.Wallet, error)
	Bets(deviceID string) ([]*domain.Bet, error)
	CashoutValue(b *domain.Bet) domain.Money
	CashOut(deviceID, betID string) (*domain.Bet, *domain.Wallet, error)
	RequestWithdrawal(deviceID string, amount domain.Money, address string) (*domain.Withdrawal, error)
	Withdrawals(deviceID string) ([]*domain.Withdrawal, error)
	PendingWithdrawals() ([]*domain.Withdrawal, error)
	ApproveWithdrawal(id string) (*domain.Withdrawal, error)
	RejectWithdrawal(id, reason string) (*domain.Withdrawal, error)
	Limits() betting.Limits
	AdjustBalance(deviceID string, amount domain.Money, description string) (*domain.Wallet, error)
	SetSuspended(deviceID string, suspended bool) (*domain.Wallet, error)
	DeleteAccount(deviceID string) (*domain.Wallet, error)
	SetLimits(limits betting.Limits)
	SettleBet(betID string, outcome domain.BetStatus) (*domain.Bet, error)
}

// publicConfig exposes risk limits so the UI can show accurate min/max hints.
func (h *Handlers) publicConfig(w http.ResponseWriter, r *http.Request) {
	l := h.betting.Limits()
	writeJSON(w, http.StatusOK, map[string]int64{
		"minBet":        l.MinBet,
		"maxBet":        l.MaxBet,
		"minWithdrawal": l.MinWithdrawal,
		"maxWithdrawal": l.MaxWithdrawal,
	})
}

// bettingError maps domain errors to HTTP status codes.
func bettingError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, betting.ErrInsufficient):
		writeJSON(w, http.StatusPaymentRequired, map[string]string{"error": "insufficient balance"})
	case errors.Is(err, betting.ErrInvalidAmount), errors.Is(err, betting.ErrEmptyBet), errors.Is(err, betting.ErrNoAddress), errors.Is(err, betting.ErrNotPending), errors.Is(err, betting.ErrStakeRange), errors.Is(err, betting.ErrWithdrawalRange), errors.Is(err, betting.ErrBadSelection), errors.Is(err, betting.ErrDuplicateLeg), errors.Is(err, betting.ErrTooManyLegs), errors.Is(err, betting.ErrLiabilityCap), errors.Is(err, betting.ErrNotCashable), errors.Is(err, betting.ErrAdjustNegative):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	case errors.Is(err, betting.ErrSuspended), errors.Is(err, betting.ErrDeleted):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
	default:
		writeError(w, http.StatusInternalServerError, "betting operation failed", err)
	}
}

// requireVerified blocks the request unless the identity is KYC-verified. Fails
// closed: a KYC lookup error blocks too, so an unverified user can never slip
// through during a backend hiccup.
func (h *Handlers) requireVerified(w http.ResponseWriter, id string) bool {
	verified, err := h.kyc.Status(id)
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "could not verify identity", err)
		return false
	}
	if !verified {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "identity verification required"})
		return false
	}
	return true
}

// deleteAccount lets a signed-in player close their own account. The wallet
// record is kept (audit trail) but flagged deleted + suspended.
func (h *Handlers) deleteAccount(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	wallet, err := h.betting.DeleteAccount(id)
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wallet)
}

func (h *Handlers) getWallet(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	wallet, err := h.betting.Wallet(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load wallet", err)
		return
	}
	writeJSON(w, http.StatusOK, wallet)
}

type amountRequest struct {
	Amount domain.Money `json:"amount"`
	Method string       `json:"method"`
}

func (h *Handlers) topUp(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	var req amountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	// Deposits flow through the payment provider (sandbox by default), which
	// credits the wallet on capture.
	method := payments.Method(strings.ToLower(strings.TrimSpace(req.Method)))
	intent, wallet, err := h.payments.Deposit(r.Context(), id, req.Amount, method)
	if err != nil {
		bettingError(w, err)
		return
	}
	if wallet != nil {
		writeJSON(w, http.StatusOK, wallet) // synchronous capture (sandbox): return updated wallet
		return
	}
	writeJSON(w, http.StatusAccepted, intent) // async rails: client follows the checkout/STK flow
}

// withdraw creates a crypto withdrawal request (held + pending admin approval).
func (h *Handlers) withdraw(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	if !h.requireVerified(w, id) {
		return
	}
	var req struct {
		Amount  domain.Money `json:"amount"`
		Address string       `json:"address"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	wd, err := h.betting.RequestWithdrawal(id, req.Amount, strings.TrimSpace(req.Address))
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, wd)
}

func (h *Handlers) listWithdrawals(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	wds, err := h.betting.Withdrawals(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load withdrawals", err)
		return
	}
	writeJSON(w, http.StatusOK, wds)
}

type placeBetRequest struct {
	Items []struct {
		Selection domain.BetSelection `json:"selection"`
		Wager     domain.Money        `json:"wager"`
	} `json:"items"`

	IsMulti    bool                  `json:"isMulti"`
	Selections []domain.BetSelection `json:"selections"`
	Wager      domain.Money          `json:"wager"`
}

func (h *Handlers) placeBet(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	// Server-side KYC gate (fail-closed): never trust the client to enforce it.
	if !h.requireVerified(w, id) {
		return
	}
	var req placeBetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if req.IsMulti {
		bet, wallet, err := h.betting.PlaceMultiBet(id, req.Selections, req.Wager)
		if err != nil {
			bettingError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"bets": []*domain.Bet{bet}, "wallet": wallet})
		return
	}
	items := make([]betting.PlaceItem, 0, len(req.Items))
	for _, it := range req.Items {
		items = append(items, betting.PlaceItem{Selection: it.Selection, Wager: it.Wager})
	}
	bets, wallet, err := h.betting.PlaceBet(id, items)
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"bets": bets, "wallet": wallet})
}

func (h *Handlers) listBets(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	bets, err := h.betting.Bets(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load bets", err)
		return
	}
	// Attach the live cash-out offer to each pending bet (computed, not stored).
	for _, b := range bets {
		if b.Status == domain.BetPending {
			b.CashoutValue = h.betting.CashoutValue(b)
		}
	}
	writeJSON(w, http.StatusOK, bets)
}

// cashOut settles a pending single bet early for the current cash-out value.
func (h *Handlers) cashOut(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	bet, wallet, err := h.betting.CashOut(id, r.PathValue("id"))
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"bet": bet, "wallet": wallet})
}

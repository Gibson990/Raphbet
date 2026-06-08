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
	PlaceBet(deviceID string, items []betting.PlaceItem) ([]*domain.Bet, *domain.Wallet, error)
	Bets(deviceID string) ([]*domain.Bet, error)
	RequestWithdrawal(deviceID string, amount domain.Money, address string) (*domain.Withdrawal, error)
	Withdrawals(deviceID string) ([]*domain.Withdrawal, error)
	PendingWithdrawals() ([]*domain.Withdrawal, error)
	ApproveWithdrawal(id string) (*domain.Withdrawal, error)
	RejectWithdrawal(id, reason string) (*domain.Withdrawal, error)
	Limits() betting.Limits
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
	case errors.Is(err, betting.ErrInvalidAmount), errors.Is(err, betting.ErrEmptyBet), errors.Is(err, betting.ErrNoAddress), errors.Is(err, betting.ErrNotPending), errors.Is(err, betting.ErrStakeRange), errors.Is(err, betting.ErrWithdrawalRange):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		writeError(w, http.StatusInternalServerError, "betting operation failed", err)
	}
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
	if verified, err := h.kyc.Status(id); err == nil && !verified {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "identity verification required"})
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
}

func (h *Handlers) placeBet(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	// Server-side KYC gate: never trust the client to enforce verification.
	if verified, err := h.kyc.Status(id); err == nil && !verified {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "identity verification required"})
		return
	}
	var req placeBetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
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
	writeJSON(w, http.StatusOK, bets)
}

package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/betting"
)

// BettingService is the use case port for wallet and bets.
type BettingService interface {
	Wallet(deviceID string) (*domain.Wallet, error)
	TopUp(deviceID string, amount domain.Money, method string) (*domain.Wallet, error)
	Withdraw(deviceID string, amount domain.Money, method string) (*domain.Wallet, error)
	PlaceBet(deviceID string, items []betting.PlaceItem) ([]*domain.Bet, *domain.Wallet, error)
	Bets(deviceID string) ([]*domain.Bet, error)
}

// deviceID extracts the per-device identity (until real auth lands in Phase 5).
func deviceID(w http.ResponseWriter, r *http.Request) (string, bool) {
	id := r.Header.Get("X-Device-Id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing X-Device-Id"})
		return "", false
	}
	return id, true
}

// bettingError maps domain errors to HTTP status codes.
func bettingError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, betting.ErrInsufficient):
		writeJSON(w, http.StatusPaymentRequired, map[string]string{"error": "insufficient balance"})
	case errors.Is(err, betting.ErrInvalidAmount), errors.Is(err, betting.ErrEmptyBet):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		writeError(w, http.StatusInternalServerError, "betting operation failed", err)
	}
}

func (h *Handlers) getWallet(w http.ResponseWriter, r *http.Request) {
	id, ok := deviceID(w, r)
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
	id, ok := deviceID(w, r)
	if !ok {
		return
	}
	var req amountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	wallet, err := h.betting.TopUp(id, req.Amount, req.Method)
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wallet)
}

func (h *Handlers) withdraw(w http.ResponseWriter, r *http.Request) {
	id, ok := deviceID(w, r)
	if !ok {
		return
	}
	var req amountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	wallet, err := h.betting.Withdraw(id, req.Amount, req.Method)
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wallet)
}

type placeBetRequest struct {
	Items []struct {
		Selection domain.BetSelection `json:"selection"`
		Wager     domain.Money        `json:"wager"`
	} `json:"items"`
}

func (h *Handlers) placeBet(w http.ResponseWriter, r *http.Request) {
	id, ok := deviceID(w, r)
	if !ok {
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
	id, ok := deviceID(w, r)
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

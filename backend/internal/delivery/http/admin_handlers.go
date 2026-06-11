package http

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/admin"
)

// AdminService is the use case port for the admin dashboard.
type AdminService interface {
	Stats() (admin.Stats, error)
	Users() ([]admin.UserRow, error)
	Bets() ([]admin.BetRow, error)
}

// ConfigRepository is the repository port interface for settings config.
type ConfigRepository interface {
	GetConfig() (*domain.BookmakerConfig, error)
	SaveConfig(cfg *domain.BookmakerConfig) error
}

// requireAdmin grants access to a verified Firebase user whose email is in the
// admin allow-list, or (fallback) a valid shared admin key.
func (h *Handlers) requireAdmin(w http.ResponseWriter, r *http.Request) bool {
	if h.auth != nil && len(h.adminEmails) > 0 {
		if tok := bearer(r); tok != "" {
			if _, email, err := h.auth.Verify(r.Context(), tok); err == nil && h.adminEmails[strings.ToLower(email)] {
				return true
			}
		}
	}
	if h.adminKey != "" && subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Admin-Key")), []byte(h.adminKey)) == 1 {
		return true
	}
	writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "admin authorization required"})
	return false
}

func (h *Handlers) adminStats(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	stats, err := h.admin.Stats()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load stats", err)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *Handlers) adminUsers(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	users, err := h.admin.Users()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load users", err)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (h *Handlers) adminBets(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	bets, err := h.admin.Bets()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load bets", err)
		return
	}
	writeJSON(w, http.StatusOK, bets)
}

func (h *Handlers) adminWithdrawals(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	wds, err := h.betting.PendingWithdrawals()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load withdrawals", err)
		return
	}
	writeJSON(w, http.StatusOK, wds)
}

func (h *Handlers) adminApproveWithdrawal(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	wd, err := h.betting.ApproveWithdrawal(r.PathValue("id"))
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wd)
}

func (h *Handlers) adminRejectWithdrawal(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	wd, err := h.betting.RejectWithdrawal(r.PathValue("id"), "rejected by admin")
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wd)
}

func (h *Handlers) adminAdjustUserBalance(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	deviceID := r.PathValue("deviceId")
	var req struct {
		Amount      domain.Money `json:"amount"`
		Description string       `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	wallet, err := h.betting.AdjustBalance(deviceID, req.Amount, req.Description)
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wallet)
}

func (h *Handlers) adminSetUserKyc(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	deviceID := r.PathValue("deviceId")
	var req struct {
		Verified bool `json:"verified"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if err := h.kyc.SetVerified(deviceID, req.Verified); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update kyc status", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"verified": req.Verified})
}

func (h *Handlers) adminSetUserSuspended(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	deviceID := r.PathValue("deviceId")
	var req struct {
		Suspended bool `json:"suspended"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	wallet, err := h.betting.SetSuspended(deviceID, req.Suspended)
	if err != nil {
		bettingError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wallet)
}

func (h *Handlers) adminGetConfig(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	l := h.betting.Limits()
	margin := h.oddsEngine.Margin()
	writeJSON(w, http.StatusOK, map[string]any{
		"houseMargin":   margin,
		"minBet":        l.MinBet,
		"maxBet":        l.MaxBet,
		"minWithdrawal": l.MinWithdrawal,
		"maxWithdrawal": l.MaxWithdrawal,
		"maxLiability":  l.MaxLiability,
	})
}

func (h *Handlers) adminSetConfig(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	var req struct {
		HouseMargin   *float64 `json:"houseMargin"`
		MinBet        *int64   `json:"minBet"`
		MaxBet        *int64   `json:"maxBet"`
		MinWithdrawal *int64   `json:"minWithdrawal"`
		MaxWithdrawal *int64   `json:"maxWithdrawal"`
		MaxLiability  *int64   `json:"maxLiability"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	if req.HouseMargin != nil {
		h.oddsEngine.SetMargin(*req.HouseMargin)
	}

	l := h.betting.Limits()
	if req.MinBet != nil {
		l.MinBet = *req.MinBet
	}
	if req.MaxBet != nil {
		l.MaxBet = *req.MaxBet
	}
	if req.MinWithdrawal != nil {
		l.MinWithdrawal = *req.MinWithdrawal
	}
	if req.MaxWithdrawal != nil {
		l.MaxWithdrawal = *req.MaxWithdrawal
	}
	if req.MaxLiability != nil {
		l.MaxLiability = *req.MaxLiability
	}
	h.betting.SetLimits(l)

	// Persist the updated configuration to database repository
	updatedCfg := &domain.BookmakerConfig{
		HouseMargin:   h.oddsEngine.Margin(),
		MinBet:        l.MinBet,
		MaxBet:        l.MaxBet,
		MinWithdrawal: l.MinWithdrawal,
		MaxWithdrawal: l.MaxWithdrawal,
		MaxLiability:  l.MaxLiability,
	}
	if err := h.configRepo.SaveConfig(updatedCfg); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to persist bookmaker config", err)
		return
	}

	// Return updated config
	writeJSON(w, http.StatusOK, map[string]any{
		"houseMargin":   updatedCfg.HouseMargin,
		"minBet":        updatedCfg.MinBet,
		"maxBet":        updatedCfg.MaxBet,
		"minWithdrawal": updatedCfg.MinWithdrawal,
		"maxWithdrawal": updatedCfg.MaxWithdrawal,
		"maxLiability":  updatedCfg.MaxLiability,
	})
}

func (h *Handlers) adminGetUserWallet(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	deviceID := r.PathValue("deviceId")
	wallet, err := h.betting.Wallet(deviceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load user wallet", err)
		return
	}
	writeJSON(w, http.StatusOK, wallet)
}

// adminSettleBet manually resolves a pending bet as WON or LOST.
func (h *Handlers) adminSettleBet(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	betID := r.PathValue("id")
	var req struct {
		Outcome string `json:"outcome"` // "WON" or "LOST"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	var status domain.BetStatus
	switch strings.ToUpper(req.Outcome) {
	case "WON":
		status = domain.BetWon
	case "LOST":
		status = domain.BetLost
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "outcome must be WON or LOST"})
		return
	}
	bet, err := h.betting.SettleBet(betID, status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to settle bet", err)
		return
	}
	writeJSON(w, http.StatusOK, bet)
}


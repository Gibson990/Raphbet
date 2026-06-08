package http

import (
	"net/http"
	"strings"

	"github.com/Gibson990/Raphbet/backend/internal/usecase/admin"
)

// AdminService is the use case port for the admin dashboard.
type AdminService interface {
	Stats() (admin.Stats, error)
	Users() ([]admin.UserRow, error)
	Bets() ([]admin.BetRow, error)
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
	if h.adminKey != "" && r.Header.Get("X-Admin-Key") == h.adminKey {
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

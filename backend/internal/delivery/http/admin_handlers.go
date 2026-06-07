package http

import (
	"net/http"

	"github.com/Gibson990/Raphbet/backend/internal/usecase/admin"
)

// AdminService is the use case port for the admin dashboard.
type AdminService interface {
	Stats() (admin.Stats, error)
	Users() ([]admin.UserRow, error)
	Bets() ([]admin.BetRow, error)
}

// requireAdmin gates admin endpoints with the configured admin key (sandbox
// auth). Replaced by a Firebase admin role claim when real auth lands.
func (h *Handlers) requireAdmin(w http.ResponseWriter, r *http.Request) bool {
	if h.adminKey == "" || r.Header.Get("X-Admin-Key") != h.adminKey {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "admin authorization required"})
		return false
	}
	return true
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

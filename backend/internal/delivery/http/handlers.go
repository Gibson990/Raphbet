// Package http is the delivery layer: it adapts HTTP requests to use case calls
// and serializes the results as JSON. It contains no business logic.
package http

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// FootballService is the use case port the handlers depend on.
type FootballService interface {
	Leagues(ctx context.Context) ([]domain.League, error)
	Matches(ctx context.Context, leagueID string) ([]domain.Match, error)
	Standings(ctx context.Context, leagueID string) ([]domain.Standing, error)
}

// Handlers holds the dependencies for the HTTP handlers.
type Handlers struct {
	football FootballService
	betting  BettingService
	payments PaymentsService
	kyc      KycService
	admin            AdminService
	adminKey         string
	kycWebhookSecret string
}

// NewHandlers wires the handlers to their use case services.
func NewHandlers(football FootballService, betting BettingService, payments PaymentsService, kyc KycService, admin AdminService, adminKey, kycWebhookSecret string) *Handlers {
	return &Handlers{football: football, betting: betting, payments: payments, kyc: kyc, admin: admin, adminKey: adminKey, kycWebhookSecret: kycWebhookSecret}
}

func (h *Handlers) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handlers) leagues(w http.ResponseWriter, r *http.Request) {
	leagues, err := h.football.Leagues(r.Context())
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to load leagues", err)
		return
	}
	writeJSON(w, http.StatusOK, leagues)
}

func (h *Handlers) matches(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	matches, err := h.football.Matches(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to load matches", err)
		return
	}
	writeJSON(w, http.StatusOK, matches)
}

func (h *Handlers) standings(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	standings, err := h.football.Standings(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to load standings", err)
		return
	}
	writeJSON(w, http.StatusOK, standings)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("write json: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string, err error) {
	log.Printf("%s: %v", msg, err)
	writeJSON(w, status, map[string]string{"error": msg})
}

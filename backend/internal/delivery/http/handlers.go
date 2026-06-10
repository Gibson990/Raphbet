// Package http is the delivery layer: it adapts HTTP requests to use case calls
// and serializes the results as JSON. It contains no business logic.
package http

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/odds"
)

// FootballService is the use case port the handlers depend on.
type FootballService interface {
	Leagues(ctx context.Context) ([]domain.League, error)
	Matches(ctx context.Context, leagueID string) ([]domain.Match, error)
	Standings(ctx context.Context, leagueID string) ([]domain.Standing, error)
}

// TokenVerifier verifies a Firebase ID token, returning the uid + email.
type TokenVerifier interface {
	Verify(ctx context.Context, idToken string) (uid, email string, err error)
}

// Handlers holds the dependencies for the HTTP handlers.
type Handlers struct {
	football             FootballService
	betting              BettingService
	payments             PaymentsService
	kyc                  KycService
	admin                AdminService
	support              SupportService
	oddsEngine           *odds.GeneratedEngine
	adminKey             string
	kycWebhookSecret     string
	nowpaymentsIPNSecret string
	auth                 TokenVerifier   // nil until Firebase is configured
	adminEmails          map[string]bool // admin role allow-list
	configRepo           domain.ConfigRepository
}

// NewHandlers wires the handlers to their use case services.
func NewHandlers(football FootballService, betting BettingService, payments PaymentsService, kyc KycService, admin AdminService, support SupportService, oddsEngine *odds.GeneratedEngine, adminKey, kycWebhookSecret, nowpaymentsIPNSecret string, configRepo domain.ConfigRepository) *Handlers {
	return &Handlers{
		football:             football,
		betting:              betting,
		payments:             payments,
		kyc:                  kyc,
		admin:                admin,
		support:              support,
		oddsEngine:           oddsEngine,
		adminKey:             adminKey,
		kycWebhookSecret:     kycWebhookSecret,
		nowpaymentsIPNSecret: nowpaymentsIPNSecret,
		adminEmails:          map[string]bool{},
		configRepo:           configRepo,
	}
}

// SetAuth enables Firebase token verification + the admin email allow-list.
func (h *Handlers) SetAuth(v TokenVerifier, adminEmails []string) {
	h.auth = v
	h.adminEmails = map[string]bool{}
	for _, e := range adminEmails {
		h.adminEmails[strings.ToLower(strings.TrimSpace(e))] = true
	}
}

// bearer extracts the token from an Authorization: Bearer header.
func bearer(r *http.Request) string {
	const p = "Bearer "
	if a := r.Header.Get("Authorization"); strings.HasPrefix(a, p) {
		return strings.TrimSpace(a[len(p):])
	}
	return ""
}

// identity resolves the caller: a verified Firebase UID when a token is present
// (invalid tokens are rejected), otherwise the X-Device-Id (guest fallback).
func (h *Handlers) identity(w http.ResponseWriter, r *http.Request) (string, bool) {
	if h.auth != nil {
		if tok := bearer(r); tok != "" {
			uid, email, err := h.auth.Verify(r.Context(), tok)
			if err != nil {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid or expired session"})
				return "", false
			}
			// Remember the signed-in user's email for the admin view (best-effort).
			if email != "" {
				_ = h.betting.RecordEmail(uid, email)
			}
			return uid, true
		}
	}
	id := r.Header.Get("X-Device-Id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing identity"})
		return "", false
	}
	return id, true
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

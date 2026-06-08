package http

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/payments"
)

// PaymentsService is the use case port for deposits.
type PaymentsService interface {
	Deposit(ctx context.Context, deviceID string, amount domain.Money, method payments.Method) (payments.Intent, *domain.Wallet, error)
}

// KycService is the use case port for identity verification.
type KycService interface {
	Start(ctx context.Context, deviceID string) (url string, verified bool, err error)
	Check(ctx context.Context, deviceID string) (bool, error)
	Status(deviceID string) (bool, error)
	MarkVerifiedBySession(sessionID string, approved bool) error
}

func (h *Handlers) kycStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := deviceID(w, r)
	if !ok {
		return
	}
	verified, err := h.kyc.Status(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load KYC status", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"verified": verified})
}

// kycStart begins verification: returns a hosted URL to redirect to, or
// verified:true when already verified / the sandbox approves instantly.
func (h *Handlers) kycStart(w http.ResponseWriter, r *http.Request) {
	id, ok := deviceID(w, r)
	if !ok {
		return
	}
	url, verified, err := h.kyc.Start(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not start verification", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": url, "verified": verified})
}

// kycCheck polls the provider for the latest decision.
func (h *Handlers) kycCheck(w http.ResponseWriter, r *http.Request) {
	id, ok := deviceID(w, r)
	if !ok {
		return
	}
	verified, err := h.kyc.Check(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not check verification", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"verified": verified})
}

// kycWebhook receives Didit's signed decision callback (HMAC-SHA256 of the raw
// body with the webhook secret).
func (h *Handlers) kycWebhook(w http.ResponseWriter, r *http.Request) {
	if h.kycWebhookSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "webhook not configured"})
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if !validHMAC(body, r.Header.Get("x-signature"), h.kycWebhookSecret) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid signature"})
		return
	}
	var payload struct {
		SessionID string `json:"session_id"`
		Status    string `json:"status"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	approved := equalFold(payload.Status, "Approved")
	if err := h.kyc.MarkVerifiedBySession(payload.SessionID, approved); err != nil {
		writeError(w, http.StatusInternalServerError, "webhook processing failed", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

func validHMAC(body []byte, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func equalFold(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		ca, cb := a[i], b[i]
		if 'A' <= ca && ca <= 'Z' {
			ca += 'a' - 'A'
		}
		if 'A' <= cb && cb <= 'Z' {
			cb += 'a' - 'A'
		}
		if ca != cb {
			return false
		}
	}
	return true
}

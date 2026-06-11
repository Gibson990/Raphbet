package http

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/payments"
)

// PaymentsService is the use case port for deposits.
type PaymentsService interface {
	Deposit(ctx context.Context, deviceID string, amount domain.Money, method payments.Method) (payments.Intent, *domain.Wallet, error)
	ConfirmDeposit(paymentID, deviceID string, amount domain.Money, method string) error
}

// nowpaymentsWebhook receives NOWPayments' signed IPN. The body is HMAC-SHA512
// signed over the JSON with sorted keys; Go's json.Marshal of a map sorts keys,
// matching NOWPayments' canonicalisation.
func (h *Handlers) nowpaymentsWebhook(w http.ResponseWriter, r *http.Request) {
	if h.nowpaymentsIPNSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ipn not configured"})
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	var m map[string]any
	if err := json.Unmarshal(body, &m); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	sorted, _ := json.Marshal(m) // keys sorted -> NOWPayments canonical form
	mac := hmac.New(sha512.New, []byte(h.nowpaymentsIPNSecret))
	mac.Write(sorted)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(r.Header.Get("x-nowpayments-sig"))) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid signature"})
		return
	}

	status, _ := m["payment_status"].(string)
	orderID, _ := m["order_id"].(string)
	paymentID := asString(m["payment_id"])
	if (status == "finished" || status == "confirmed") && paymentID != "" {
		if deviceID, amount, ok := payments.DecodeOrderID(orderID); ok {
			if err := h.payments.ConfirmDeposit(paymentID, deviceID, amount, "Crypto top-up via NOWPayments"); err != nil {
				writeError(w, http.StatusInternalServerError, "credit failed", err)
				return
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

// KycService is the use case port for identity verification.
type KycService interface {
	Start(ctx context.Context, deviceID string) (url string, verified bool, err error)
	Check(ctx context.Context, deviceID string) (bool, error)
	Status(deviceID string) (bool, error)
	MarkVerifiedBySession(sessionID string, approved bool) error
	SetVerified(deviceID string, verified bool) error
}

func (h *Handlers) kycStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
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
	id, ok := h.identity(w, r)
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
	id, ok := h.identity(w, r)
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

// kycSandboxApprove allows the frontend mock verification screen to approve a sandbox session.
func (h *Handlers) kycSandboxApprove(w http.ResponseWriter, r *http.Request) {
	if !h.kycSandbox {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "sandbox approval is disabled"})
		return
	}
	var req struct {
		SessionID string `json:"session_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if !(len(req.SessionID) >= 8 && req.SessionID[:8] == "sandbox_") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "only sandbox sessions can be auto-approved"})
		return
	}
	if err := h.kyc.MarkVerifiedBySession(req.SessionID, true); err != nil {
		writeError(w, http.StatusInternalServerError, "sandbox approval failed", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

// asString coerces a JSON value (string or number) to a string id.
func asString(v any) string {
	switch x := v.(type) {
	case string:
		return x
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	case nil:
		return ""
	default:
		return fmt.Sprintf("%v", x)
	}
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

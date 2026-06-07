package http

import (
	"context"
	"encoding/json"
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
	Submit(ctx context.Context, deviceID, documentName string) (bool, error)
	Status(deviceID string) (bool, error)
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

func (h *Handlers) kycSubmit(w http.ResponseWriter, r *http.Request) {
	id, ok := deviceID(w, r)
	if !ok {
		return
	}
	var req struct {
		DocumentName string `json:"documentName"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req) // body optional

	verified, err := h.kyc.Submit(r.Context(), id, req.DocumentName)
	if err != nil {
		writeError(w, http.StatusBadGateway, "verification failed", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"verified": verified})
}

// Package kyc models identity verification behind a Verifier interface, so a
// real provider (Didit's free tier, or Sumsub/Veriff) drops in without changing
// callers. A sandbox verifier auto-approves for local/dev use.
package kyc

import "context"

// Verifier checks an identity document and returns whether it is approved.
// Real providers create a verification session and poll/await a webhook; the
// sandbox approves immediately.
type Verifier interface {
	Name() string
	Verify(ctx context.Context, deviceID, documentName string) (approved bool, err error)
}

// Store persists per-identity KYC status (keyed by device id until auth lands).
type Store interface {
	SetVerified(deviceID string) error
	IsVerified(deviceID string) (bool, error)
}

// Service runs verification and records the result.
type Service struct {
	verifier Verifier
	store    Store
}

// New builds a KYC service.
func New(verifier Verifier, store Store) *Service {
	return &Service{verifier: verifier, store: store}
}

// Submit verifies a document and, if approved, marks the identity verified.
func (s *Service) Submit(ctx context.Context, deviceID, documentName string) (bool, error) {
	approved, err := s.verifier.Verify(ctx, deviceID, documentName)
	if err != nil {
		return false, err
	}
	if approved {
		if err := s.store.SetVerified(deviceID); err != nil {
			return false, err
		}
	}
	return approved, nil
}

// Status reports whether an identity is verified.
func (s *Service) Status(deviceID string) (bool, error) {
	return s.store.IsVerified(deviceID)
}

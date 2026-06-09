// Package kyc models identity verification behind a Verifier interface. The real
// provider (Didit) uses a hosted session the user completes, with the result
// delivered by webhook and/or polled; the sandbox auto-approves. Callers (HTTP)
// don't change when the provider does.
package kyc

import "context"

// Verifier creates verification sessions and reports their decision.
type Verifier interface {
	Name() string
	// StartSession creates a session for the identity (vendorData) and returns
	// the hosted URL the user verifies at, plus the provider session id.
	// The sandbox returns ("", "", nil) to signal instant approval.
	StartSession(ctx context.Context, vendorData, callbackURL string) (url, sessionID string, err error)
	// Decision returns the current decision for a session.
	Decision(ctx context.Context, sessionID string) (approved, final bool, err error)
}

// Store persists KYC status and the device<->session mapping.
type Store interface {
	SetVerified(deviceID string, verified bool) error
	IsVerified(deviceID string) (bool, error)
	LinkSession(deviceID, sessionID string) error
	DeviceForSession(sessionID string) (string, error)
	SessionForDevice(deviceID string) (string, error)
}

// Service runs the verification lifecycle.
type Service struct {
	verifier    Verifier
	store       Store
	callbackURL string
}

// New builds a KYC service. callbackURL is where the provider returns the user.
func New(verifier Verifier, store Store, callbackURL string) *Service {
	return &Service{verifier: verifier, store: store, callbackURL: callbackURL}
}

// Start begins verification. Returns a hosted URL to redirect to, or verified=true
// when already verified or when the sandbox approves instantly.
func (s *Service) Start(ctx context.Context, deviceID string) (url string, verified bool, err error) {
	if v, _ := s.store.IsVerified(deviceID); v {
		return "", true, nil
	}
	url, sessionID, err := s.verifier.StartSession(ctx, deviceID, s.callbackURL)
	if err != nil {
		return "", false, err
	}
	if sessionID == "" { // sandbox: instant approval
		return "", true, s.store.SetVerified(deviceID, true)
	}
	if err := s.store.LinkSession(deviceID, sessionID); err != nil {
		return "", false, err
	}
	return url, false, nil
}

// Check polls the provider for the device's session and updates status.
func (s *Service) Check(ctx context.Context, deviceID string) (bool, error) {
	if v, _ := s.store.IsVerified(deviceID); v {
		return true, nil
	}
	sessionID, _ := s.store.SessionForDevice(deviceID)
	if sessionID == "" {
		return false, nil
	}
	approved, final, err := s.verifier.Decision(ctx, sessionID)
	if err != nil {
		return false, err
	}
	if final && approved {
		return true, s.store.SetVerified(deviceID, true)
	}
	return false, nil
}

// Status reports whether an identity is verified.
func (s *Service) Status(deviceID string) (bool, error) {
	return s.store.IsVerified(deviceID)
}

// MarkVerifiedBySession is invoked by the webhook handler once a session is
// approved, mapping the provider session back to the device.
func (s *Service) MarkVerifiedBySession(sessionID string, approved bool) error {
	if !approved {
		return nil
	}
	deviceID, err := s.store.DeviceForSession(sessionID)
	if err != nil || deviceID == "" {
		return err
	}
	return s.store.SetVerified(deviceID, true)
}

// SetVerified manually sets the KYC status of a user.
func (s *Service) SetVerified(deviceID string, verified bool) error {
	return s.store.SetVerified(deviceID, verified)
}

// Package kyc holds Verifier implementations. SandboxVerifier approves instantly
// so the flow works end to end without a provider account.
package kyc

import "context"

// SandboxVerifier approves every identity immediately (no hosted session).
type SandboxVerifier struct{}

// NewSandboxVerifier returns an auto-approving verifier.
func NewSandboxVerifier() *SandboxVerifier { return &SandboxVerifier{} }

func (v *SandboxVerifier) Name() string { return "sandbox" }

// StartSession returns a simulated hosted URL to the sandbox flow.
func (v *SandboxVerifier) StartSession(_ context.Context, vendorData, callbackURL string) (string, string, error) {
	sessionID := "sandbox_" + vendorData
	url := callbackURL + "/sandbox?session_id=" + sessionID
	return url, sessionID, nil
}

// Decision is unused for the sandbox (sessions are never created).
func (v *SandboxVerifier) Decision(_ context.Context, _ string) (bool, bool, error) {
	return true, true, nil
}

// Package kyc holds Verifier implementations. SandboxVerifier approves instantly
// so the flow works end to end without a provider account.
package kyc

import "context"

// SandboxVerifier approves every identity immediately (no hosted session).
type SandboxVerifier struct{}

// NewSandboxVerifier returns an auto-approving verifier.
func NewSandboxVerifier() *SandboxVerifier { return &SandboxVerifier{} }

func (v *SandboxVerifier) Name() string { return "sandbox" }

// StartSession returns an empty session id, signalling instant approval.
func (v *SandboxVerifier) StartSession(_ context.Context, _ /*vendorData*/, _ /*callbackURL*/ string) (string, string, error) {
	return "", "", nil
}

// Decision is unused for the sandbox (sessions are never created).
func (v *SandboxVerifier) Decision(_ context.Context, _ string) (bool, bool, error) {
	return true, true, nil
}

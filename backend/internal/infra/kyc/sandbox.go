// Package kyc holds Verifier implementations. SandboxVerifier auto-approves so
// the verification flow works end to end without a provider key.
//
// A real Didit verifier would implement the same interface: create a
// verification session via the Didit API (free tier), return the session URL to
// the client, and confirm the result via a webhook or status poll. It needs a
// DIDIT_API_KEY. Swap it in at startup with no changes to callers.
package kyc

import "context"

// SandboxVerifier approves any submitted document.
type SandboxVerifier struct{}

// NewSandboxVerifier returns an auto-approving verifier.
func NewSandboxVerifier() *SandboxVerifier { return &SandboxVerifier{} }

func (v *SandboxVerifier) Name() string { return "sandbox" }

func (v *SandboxVerifier) Verify(_ context.Context, _ /*deviceID*/, _ /*documentName*/ string) (bool, error) {
	return true, nil
}

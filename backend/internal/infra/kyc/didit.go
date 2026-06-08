package kyc

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// DiditVerifier integrates Didit's hosted KYC (v3). It creates a verification
// session (workflow = KYC + AML) and reads the decision. Auth is the x-api-key
// header. Docs: https://docs.didit.me
type DiditVerifier struct {
	baseURL    string
	apiKey     string
	workflowID string
	http       *http.Client
}

// NewDiditVerifier builds the Didit verifier.
func NewDiditVerifier(baseURL, apiKey, workflowID string) *DiditVerifier {
	return &DiditVerifier{
		baseURL:    strings.TrimRight(baseURL, "/"),
		apiKey:     apiKey,
		workflowID: workflowID,
		http:       &http.Client{Timeout: 15 * time.Second},
	}
}

func (v *DiditVerifier) Name() string { return "didit" }

func (v *DiditVerifier) do(ctx context.Context, method, path string, body any, out any) error {
	var reader *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		reader = bytes.NewReader(b)
	} else {
		reader = bytes.NewReader(nil)
	}
	req, err := http.NewRequestWithContext(ctx, method, v.baseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("x-api-key", v.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := v.http.Do(req)
	if err != nil {
		return fmt.Errorf("didit request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		var e struct {
			Detail string `json:"detail"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&e)
		if e.Detail != "" {
			return fmt.Errorf("didit %d: %s", resp.StatusCode, e.Detail)
		}
		return fmt.Errorf("didit returned status %d", resp.StatusCode)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// StartSession creates a verification session and returns its hosted URL + id.
func (v *DiditVerifier) StartSession(ctx context.Context, vendorData, callbackURL string) (string, string, error) {
	reqBody := map[string]string{
		"workflow_id": v.workflowID,
		"vendor_data": vendorData,
		"callback":    callbackURL,
	}
	var out struct {
		SessionID string `json:"session_id"`
		URL       string `json:"url"`
	}
	if err := v.do(ctx, http.MethodPost, "/v3/session/", reqBody, &out); err != nil {
		return "", "", err
	}
	return out.URL, out.SessionID, nil
}

// Decision reads the session's current decision. Didit statuses include
// "Approved", "Declined", "In Review", "In Progress", "Not Started".
func (v *DiditVerifier) Decision(ctx context.Context, sessionID string) (approved, final bool, err error) {
	var out struct {
		Status string `json:"status"`
	}
	if err := v.do(ctx, http.MethodGet, "/v3/session/"+sessionID+"/decision/", nil, &out); err != nil {
		return false, false, err
	}
	switch strings.ToLower(out.Status) {
	case "approved":
		return true, true, nil
	case "declined", "rejected", "expired", "abandoned":
		return false, true, nil
	default:
		return false, false, nil // still in progress
	}
}

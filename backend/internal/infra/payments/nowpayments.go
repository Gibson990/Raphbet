package payments

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	uc "github.com/Gibson990/Raphbet/backend/internal/usecase/payments"
)

// NowPaymentsProvider creates crypto invoices via NOWPayments. The wallet amount
// (TZS) is priced in USD for the invoice; the original TZS amount is carried in
// the order_id so the IPN webhook can credit the exact amount on confirmation.
// Docs: https://api.nowpayments.io
type NowPaymentsProvider struct {
	baseURL     string
	apiKey      string
	callbackURL string // public IPN webhook URL
	successURL  string
	tzsPerUSD   float64
	http        *http.Client
}

// NewNowPaymentsProvider builds the provider.
func NewNowPaymentsProvider(baseURL, apiKey, callbackURL, successURL string, tzsPerUSD float64) *NowPaymentsProvider {
	if tzsPerUSD <= 0 {
		tzsPerUSD = 2600
	}
	return &NowPaymentsProvider{
		baseURL:     strings.TrimRight(baseURL, "/"),
		apiKey:      apiKey,
		callbackURL: callbackURL,
		successURL:  successURL,
		tzsPerUSD:   tzsPerUSD,
		http:        &http.Client{Timeout: 15 * time.Second},
	}
}

func (p *NowPaymentsProvider) Name() string { return "nowpayments" }

func (p *NowPaymentsProvider) Charge(ctx context.Context, in uc.Intent) (uc.Intent, error) {
	usd := math.Round(float64(in.Amount)/p.tzsPerUSD*100) / 100
	if usd < 1 {
		usd = 1 // NOWPayments minimum invoice price
	}
	reqBody := map[string]any{
		"price_amount":      usd,
		"price_currency":    "usd",
		"order_id":          uc.EncodeOrderID(in.DeviceID, in.Amount),
		"order_description": "Raphbet wallet top-up",
		"success_url":       p.successURL,
		"cancel_url":        p.successURL,
	}
	if p.callbackURL != "" { // omit until a public IPN URL (ngrok/deploy) is set
		reqBody["ipn_callback_url"] = p.callbackURL
	}
	b, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/v1/invoice", bytes.NewReader(b))
	if err != nil {
		return uc.Intent{}, err
	}
	req.Header.Set("x-api-key", p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.http.Do(req)
	if err != nil {
		return uc.Intent{}, fmt.Errorf("nowpayments request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return uc.Intent{}, fmt.Errorf("nowpayments returned status %d", resp.StatusCode)
	}
	var out struct {
		ID         string `json:"id"`
		InvoiceURL string `json:"invoice_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return uc.Intent{}, err
	}
	in.ID = out.ID
	in.Status = uc.StatusPending // crypto is async; confirmed by the IPN webhook
	in.CheckoutURL = out.InvoiceURL
	return in, nil
}

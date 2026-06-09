// Package payments models the wallet-first custodial deposit flow behind a
// Provider interface, so real rails (M-Pesa/Airtel via an aggregator, card via
// Stripe, crypto via NOWPayments/BTCPay) drop in without touching the wallet
// logic. A sandbox provider implements the same interface for local/dev use.
package payments

import (
	"context"
	"strconv"
	"strings"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// EncodeOrderID carries the device id + TZS amount through a crypto invoice so
// the IPN webhook can credit the exact amount without extra storage.
func EncodeOrderID(deviceID string, amountTZS domain.Money) string {
	return "raphbet:" + deviceID + ":" + strconv.FormatInt(amountTZS, 10)
}

// DecodeOrderID parses an order id back into (deviceID, amountTZS, ok).
func DecodeOrderID(orderID string) (string, domain.Money, bool) {
	parts := strings.Split(orderID, ":")
	if len(parts) != 3 || parts[0] != "raphbet" {
		return "", 0, false
	}
	amt, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		return "", 0, false
	}
	return parts[1], amt, true
}

// Method is a deposit channel.
type Method string

const (
	MethodMpesa  Method = "mpesa"
	MethodAirtel Method = "airtel"
	MethodCard   Method = "card"
	MethodCrypto Method = "crypto"
)

// Status is the lifecycle of a payment intent.
type Status string

const (
	StatusPending   Status = "pending"   // awaiting user action / provider webhook
	StatusSucceeded Status = "succeeded" // funds captured
	StatusFailed    Status = "failed"
)

// Intent is a single deposit attempt.
type Intent struct {
	ID          string       `json:"id"`
	DeviceID    string       `json:"-"`
	Amount      domain.Money `json:"amount"`
	Method      Method       `json:"method"`
	Status      Status       `json:"status"`
	CheckoutURL string       `json:"checkoutUrl,omitempty"` // for redirect/STK flows
}

// Provider charges a deposit. Synchronous providers return StatusSucceeded;
// asynchronous ones return StatusPending plus a CheckoutURL and confirm later
// via a webhook.
type Provider interface {
	Name() string
	Charge(ctx context.Context, in Intent) (Intent, error)
}

// Crediter applies confirmed funds to the wallet (satisfied by betting.Service).
type Crediter interface {
	TopUp(deviceID string, amount domain.Money, method string) (*domain.Wallet, error)
}

// Idempotency dedupes async confirmations (webhooks can be retried).
type Idempotency interface {
	MarkProcessed(key string) (bool, error)
}

// Service orchestrates deposits: charge via the right provider for the method,
// credit the wallet on success. The wallet is the source of truth; providers
// only move money. Crypto routes to a dedicated provider; everything else uses
// the fallback (sandbox until real mobile-money/card rails are added).
type Service struct {
	crypto    Provider // optional; used for MethodCrypto
	fallback  Provider
	crediter  Crediter
	processed Idempotency
}

// New builds a payments service. crypto may be nil (then crypto uses fallback).
func New(crypto, fallback Provider, crediter Crediter, processed Idempotency) *Service {
	return &Service{crypto: crypto, fallback: fallback, crediter: crediter, processed: processed}
}

func (s *Service) providerFor(method Method) Provider {
	if method == MethodCrypto && s.crypto != nil {
		return s.crypto
	}
	return s.fallback
}

// Deposit starts (and, for synchronous providers, completes) a top-up.
// Returns the intent and, when funds are captured, the updated wallet.
func (s *Service) Deposit(ctx context.Context, deviceID string, amount domain.Money, method Method) (Intent, *domain.Wallet, error) {
	provider := s.providerFor(method)
	intent := Intent{DeviceID: deviceID, Amount: amount, Method: method, Status: StatusPending}
	intent, err := provider.Charge(ctx, intent)
	if err != nil {
		return Intent{}, nil, err
	}
	if intent.Status == StatusSucceeded {
		wallet, err := s.crediter.TopUp(deviceID, amount, string(method)+" via "+provider.Name())
		if err != nil {
			return Intent{}, nil, err
		}
		return intent, wallet, nil
	}
	// Pending (async rails, e.g. crypto): the webhook credits on confirmation.
	return intent, nil, nil
}

// ConfirmDeposit credits a wallet once an async payment is confirmed (webhook).
// It is idempotent on paymentID so retried webhooks don't double-credit.
func (s *Service) ConfirmDeposit(paymentID, deviceID string, amount domain.Money, method string) error {
	first, err := s.processed.MarkProcessed("nowpay:" + paymentID)
	if err != nil {
		return err
	}
	if !first {
		return nil // already credited
	}
	_, err = s.crediter.TopUp(deviceID, amount, method)
	return err
}

// CryptoName reports the crypto provider name (for logging/health).
func (s *Service) CryptoName() string {
	if s.crypto != nil {
		return s.crypto.Name()
	}
	return "none"
}

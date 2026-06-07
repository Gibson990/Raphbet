// Package payments models the wallet-first custodial deposit flow behind a
// Provider interface, so real rails (M-Pesa/Airtel via an aggregator, card via
// Stripe, crypto via NOWPayments/BTCPay) drop in without touching the wallet
// logic. A sandbox provider implements the same interface for local/dev use.
package payments

import (
	"context"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

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

// Service orchestrates deposits: charge via the provider, credit the wallet on
// success. The wallet is the source of truth; the provider only moves money.
type Service struct {
	provider Provider
	crediter Crediter
}

// New builds a payments service.
func New(provider Provider, crediter Crediter) *Service {
	return &Service{provider: provider, crediter: crediter}
}

// Deposit starts (and, for synchronous providers, completes) a top-up.
// Returns the intent and, when funds are captured, the updated wallet.
func (s *Service) Deposit(ctx context.Context, deviceID string, amount domain.Money, method Method) (Intent, *domain.Wallet, error) {
	intent := Intent{DeviceID: deviceID, Amount: amount, Method: method, Status: StatusPending}
	intent, err := s.provider.Charge(ctx, intent)
	if err != nil {
		return Intent{}, nil, err
	}
	if intent.Status == StatusSucceeded {
		wallet, err := s.crediter.TopUp(deviceID, amount, string(method)+" via "+s.provider.Name())
		if err != nil {
			return Intent{}, nil, err
		}
		return intent, wallet, nil
	}
	// Pending (async rails): the webhook will credit later.
	return intent, nil, nil
}

// ProviderName exposes the configured provider's name (for logging/health).
func (s *Service) ProviderName() string { return s.provider.Name() }

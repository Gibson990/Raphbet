// Command api is the Raphbet backend HTTP server.
//
// At this stage it exposes read-only football data (leagues, fixtures, live
// scores, standings) for the FIFA World Cup, with betting odds generated using
// a configurable house margin. Wallet, bets, payments and auth are added in
// later phases behind the same clean architecture.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/config"
	httpdelivery "github.com/Gibson990/Raphbet/backend/internal/delivery/http"
	"github.com/Gibson990/Raphbet/backend/internal/domain"
	footballinfra "github.com/Gibson990/Raphbet/backend/internal/infra/football"
	kycinfra "github.com/Gibson990/Raphbet/backend/internal/infra/kyc"
	paymentsinfra "github.com/Gibson990/Raphbet/backend/internal/infra/payments"
	"github.com/Gibson990/Raphbet/backend/internal/infra/store"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/admin"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/betting"
	footballuc "github.com/Gibson990/Raphbet/backend/internal/usecase/football"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/kyc"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/odds"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/payments"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/settlement"
)

func main() {
	cfg := config.Load()

	// Choose the data source: the real api-football provider when a key is
	// present, otherwise a mock so the app runs end-to-end with zero setup.
	// When a key is present we still wrap it with the mock as a fallback, so an
	// inaccessible season (e.g. on the free plan) degrades to the bettable mock
	// slate instead of an empty board.
	mock := footballinfra.NewMockProvider()
	var provider domain.FootballProvider
	if cfg.HasUpstream() {
		real := footballinfra.NewAPISportsProvider(cfg.APISportsBaseURL, cfg.APISportsKey, cfg.Season)
		provider = footballinfra.NewFallbackProvider(real, mock)
		log.Printf("football: using api-football (season %s) with mock fallback", cfg.Season)
	} else {
		provider = mock
		log.Printf("football: API_SPORTS_KEY not set — using mock World Cup data")
	}

	// Cache every provider behind the same TTL policy to respect free-tier limits.
	provider = footballinfra.NewCachingProvider(provider, cfg.FixturesTTL, cfg.LiveTTL, cfg.StandingsTTL)

	oddsEngine := odds.NewGeneratedEngine(cfg.HouseMargin)
	footballService := footballuc.New(provider, oddsEngine)

	// Wallet + bets persistence: MongoDB when configured, else in-memory.
	var wallets domain.WalletRepository
	var bets domain.BetRepository
	var withdrawals domain.WithdrawalRepository
	var kycStore kyc.Store
	var processed payments.Idempotency
	if cfg.HasMongo() {
		mongoStore, err := store.NewMongoStore(context.Background(), cfg.MongoURI, cfg.MongoDB)
		if err != nil {
			log.Fatalf("mongo connection failed: %v", err)
		}
		defer mongoStore.Close(context.Background())
		wallets, bets, withdrawals, kycStore, processed = mongoStore, mongoStore, mongoStore, mongoStore, mongoStore
		log.Printf("store: MongoDB (db %q)", cfg.MongoDB)
	} else {
		memStore := store.NewMemoryStore()
		wallets, bets, withdrawals, kycStore, processed = memStore, memStore, memStore, memStore, memStore
		log.Printf("store: in-memory (set MONGO_URI to persist)")
	}
	bettingService := betting.New(wallets, bets, withdrawals, cfg.InitialBalance)

	// Front-end base URL (for provider success/return redirects).
	frontendBase := "http://localhost:3000"
	if len(cfg.AllowedOrigins) > 0 {
		frontendBase = cfg.AllowedOrigins[0]
	}

	// Payments: crypto via NOWPayments when configured, sandbox otherwise.
	var cryptoProvider payments.Provider
	if cfg.HasNowPayments() {
		cryptoProvider = paymentsinfra.NewNowPaymentsProvider(cfg.NowPaymentsBaseURL, cfg.NowPaymentsAPIKey, cfg.NowPaymentsCallbackURL, frontendBase+"/wallet")
	}
	paymentService := payments.New(cryptoProvider, paymentsinfra.NewSandboxProvider(), bettingService, processed)
	log.Printf("payments: crypto provider %q", paymentService.CryptoName())

	// KYC: real Didit verifier when configured, else sandbox auto-approve.
	var kycVerifier kyc.Verifier
	if cfg.HasDidit() {
		kycVerifier = kycinfra.NewDiditVerifier(cfg.DiditBaseURL, cfg.DiditAPIKey, cfg.DiditWorkflowID)
		log.Printf("kyc: using Didit (workflow %s)", cfg.DiditWorkflowID)
	} else {
		kycVerifier = kycinfra.NewSandboxVerifier()
		log.Printf("kyc: sandbox verifier (auto-approve)")
	}
	kycService := kyc.New(kycVerifier, kycStore, frontendBase+"/kyc")

	// Admin dashboard read models (computed from live data).
	adminService := admin.New(wallets, bets, kycStore)

	// Settlement worker: settle pending bets from real World Cup results.
	results := settlement.NewFootballResults(footballService, "1")
	worker := settlement.New(bets, results, bettingService, cfg.SettlementInterval)

	handlers := httpdelivery.NewHandlers(footballService, bettingService, paymentService, kycService, adminService, cfg.AdminKey, cfg.DiditWebhookSecret, cfg.NowPaymentsIPNSecret)
	router := httpdelivery.NewRouter(handlers, cfg.AllowedOrigins, cfg.RateLimitPerMin)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	// Settlement runs in the background until shutdown.
	workerCtx, cancelWorker := context.WithCancel(context.Background())
	defer cancelWorker()
	go worker.Run(workerCtx)
	log.Printf("settlement worker running every %s", cfg.SettlementInterval)

	// Run the server and shut it down gracefully on SIGINT/SIGTERM.
	go func() {
		log.Printf("listening on :%s (house margin %.0f%%)", cfg.Port, cfg.HouseMargin*100)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
	log.Println("server stopped")
}

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
	authinfra "github.com/Gibson990/Raphbet/backend/internal/infra/auth"
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
	"github.com/Gibson990/Raphbet/backend/internal/usecase/support"
)

// oddsResolver adapts the football use case to betting.OddsResolver. It searches
// the curated leagues for the selection's match so a bet on any offered league
// is repriced server-side (match ids are unique across leagues).
type oddsResolver struct {
	fs      *footballuc.Service
	leagues []string
}

func (r oddsResolver) OddsForSelection(matchID, marketCode string) (float64, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for _, lg := range r.leagues {
		if price, ok := r.fs.OddsForSelection(ctx, lg, matchID, marketCode); ok {
			return price, true
		}
	}
	return 0, false
}

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

	// Wallet + bets persistence: MongoDB when configured, else in-memory.
	var wallets domain.WalletRepository
	var bets domain.BetRepository
	var withdrawals domain.WithdrawalRepository
	var kycStore kyc.Store
	var processed payments.Idempotency
	var configRepo domain.ConfigRepository
	var tickets domain.SupportRepository

	var mongoStore *store.MongoStore
	var memStore *store.MemoryStore

	if cfg.HasMongo() {
		var err error
		mongoStore, err = store.NewMongoStore(context.Background(), cfg.MongoURI, cfg.MongoDB)
		if err != nil {
			log.Fatalf("mongo connection failed: %v", err)
		}
		defer mongoStore.Close(context.Background())
		wallets, bets, withdrawals, kycStore, processed = mongoStore, mongoStore, mongoStore, mongoStore, mongoStore
		configRepo = mongoStore
		tickets = mongoStore
		log.Printf("store: MongoDB (db %q)", cfg.MongoDB)
	} else {
		memStore = store.NewMemoryStore()
		wallets, bets, withdrawals, kycStore, processed = memStore, memStore, memStore, memStore, memStore
		configRepo = memStore
		tickets = memStore
		log.Printf("store: in-memory (set MONGO_URI to persist)")
	}

	// Load dynamic config settings from database configuration repository
	houseMargin := cfg.HouseMargin
	minBet := cfg.MinBet
	maxBet := cfg.MaxBet
	minWithdrawal := cfg.MinWithdrawal
	maxWithdrawal := cfg.MaxWithdrawal
	maxLiability := cfg.MaxLiability

	dbCfg, err := configRepo.GetConfig()
	if err != nil {
		log.Printf("failed to load bookmaker configuration from database: %v", err)
	}
	if dbCfg != nil {
		log.Printf("loaded bookmaker configuration from database: houseMargin=%.2f%%, minBet=$%.2f, maxBet=$%.2f", dbCfg.HouseMargin*100, float64(dbCfg.MinBet)/100, float64(dbCfg.MaxBet)/100)
		houseMargin = dbCfg.HouseMargin
		minBet = dbCfg.MinBet
		maxBet = dbCfg.MaxBet
		minWithdrawal = dbCfg.MinWithdrawal
		maxWithdrawal = dbCfg.MaxWithdrawal
		if dbCfg.MaxLiability > 0 { // older configs predate this field; keep the env default
			maxLiability = dbCfg.MaxLiability
		}
	} else {
		log.Printf("seeding database with initial bookmaker configuration from environment")
		initialCfg := &domain.BookmakerConfig{
			HouseMargin:   houseMargin,
			MinBet:        minBet,
			MaxBet:        maxBet,
			MinWithdrawal: minWithdrawal,
			MaxWithdrawal: maxWithdrawal,
			MaxLiability:  maxLiability,
		}
		if err := configRepo.SaveConfig(initialCfg); err != nil {
			log.Printf("failed to seed initial configuration in database: %v", err)
		}
	}

	oddsEngine := odds.NewGeneratedEngine(houseMargin)
	footballService := footballuc.New(provider, oddsEngine)

	bettingService := betting.New(wallets, bets, withdrawals, cfg.InitialBalance, betting.Limits{
		MinBet:        minBet,
		MaxBet:        maxBet,
		MinWithdrawal: minWithdrawal,
		MaxWithdrawal: maxWithdrawal,
		MaxLiability:  maxLiability,
	})
	// Authoritative odds: reprice every placed selection server-side so a forged
	// "odds" field in a bet request can never inflate the payout. The World Cup is
	// league "1"; the resolver looks selections up on the live market board.
	bettingService.SetOddsResolver(oddsResolver{fs: footballService, leagues: footballinfra.LeagueIDs()})

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

	// Customer support tickets (registered users <-> agents).
	supportService := support.New(tickets)

	// Settlement worker: settle pending bets from real World Cup results.
	results := settlement.NewFootballResults(footballService, footballinfra.LeagueIDs()...)
	worker := settlement.New(bets, results, bettingService, cfg.SettlementInterval)

	handlers := httpdelivery.NewHandlers(footballService, bettingService, paymentService, kycService, adminService, supportService, oddsEngine, cfg.AdminKey, cfg.DiditWebhookSecret, cfg.NowPaymentsIPNSecret, configRepo)
	if cfg.FirebaseProjectID != "" {
		handlers.SetAuth(authinfra.NewFirebaseVerifier(cfg.FirebaseProjectID), cfg.AdminEmails)
		log.Printf("auth: Firebase token verification (project %q, %d admin email(s))", cfg.FirebaseProjectID, len(cfg.AdminEmails))
	} else {
		log.Printf("auth: device-id identity (Firebase not configured)")
	}
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

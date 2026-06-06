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
	footballuc "github.com/Gibson990/Raphbet/backend/internal/usecase/football"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/odds"
)

func main() {
	cfg := config.Load()

	// Choose the data source: the real api-football provider when a key is
	// present, otherwise a mock so the app runs end-to-end with zero setup.
	var provider domain.FootballProvider
	if cfg.HasUpstream() {
		provider = footballinfra.NewAPISportsProvider(cfg.APISportsBaseURL, cfg.APISportsKey, cfg.Season)
		log.Printf("football: using api-football (season %s)", cfg.Season)
	} else {
		provider = footballinfra.NewMockProvider()
		log.Printf("football: API_SPORTS_KEY not set — using mock World Cup data")
	}

	// Cache every provider behind the same TTL policy to respect free-tier limits.
	provider = footballinfra.NewCachingProvider(provider, cfg.FixturesTTL, cfg.LiveTTL, cfg.StandingsTTL)

	oddsEngine := odds.NewGeneratedEngine(cfg.HouseMargin)
	footballService := footballuc.New(provider, oddsEngine)

	handlers := httpdelivery.NewHandlers(footballService)
	router := httpdelivery.NewRouter(handlers, cfg.AllowedOrigins)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

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

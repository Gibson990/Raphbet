// Package config loads runtime configuration from environment variables.
// Keeping configuration in one place makes the service easy to deploy on any
// host (Render, Railway, Fly.io, a VPS) without code changes.
package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all runtime settings for the API service.
type Config struct {
	// Port the HTTP server listens on.
	Port string

	// AllowedOrigins is the list of front-end origins permitted by CORS.
	AllowedOrigins []string

	// APISportsKey is the secret key for api-football (api-sports.io).
	// When empty, the service falls back to a built-in mock provider so the
	// app still runs locally without any credentials.
	APISportsKey string

	// APISportsBaseURL is the api-football v3 base URL.
	APISportsBaseURL string

	// Season is the competition season to query (World Cup 2026 => "2026").
	Season string

	// HouseMargin is the bookmaker overround applied to generated odds.
	// 0.07 == a 7% built-in house edge. This is the core profit lever and is
	// configurable without touching code. See internal/usecase/odds.
	HouseMargin float64

	// Cache TTLs keep us comfortably inside the 100-requests/day free tier by
	// serving every user from one upstream fetch.
	FixturesTTL  time.Duration
	LiveTTL      time.Duration
	StandingsTTL time.Duration
}

// Load reads configuration from the environment, applying sensible defaults.
// It first loads a .env file (if present) so local development needs no manual
// exporting. Real environment variables always take precedence over the file.
func Load() Config {
	loadDotEnv(".env")
	return Config{
		Port:             getEnv("PORT", "8080"),
		AllowedOrigins:   splitCSV(getEnv("ALLOWED_ORIGINS", "http://localhost:3000")),
		APISportsKey:     strings.TrimSpace(os.Getenv("API_SPORTS_KEY")),
		APISportsBaseURL: getEnv("API_SPORTS_BASE_URL", "https://v3.football.api-sports.io"),
		Season:           getEnv("SEASON", "2026"),
		HouseMargin:      getEnvFloat("HOUSE_MARGIN", 0.07),
		FixturesTTL:      getEnvDuration("FIXTURES_TTL", time.Hour),
		LiveTTL:          getEnvDuration("LIVE_TTL", 30*time.Second),
		StandingsTTL:     getEnvDuration("STANDINGS_TTL", 6*time.Hour),
	}
}

// HasUpstream reports whether a real api-football key is configured.
func (c Config) HasUpstream() bool { return c.APISportsKey != "" }

// loadDotEnv loads KEY=VALUE lines from a .env file into the process
// environment without overriding variables already set. Missing file is a
// no-op. Supports # comments, blank lines, optional "export " prefix and
// quoted values. Implemented with the standard library only.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return // no .env file — that's fine
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		val = strings.Trim(val, `"'`)
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, val)
		}
	}
}

func getEnv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

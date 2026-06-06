package football

import (
	"context"
	"sync"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// CachingProvider wraps any FootballProvider with in-memory, time-based caching
// so that one upstream fetch serves every connected user. This is what keeps
// the app comfortably inside api-football's 100-requests/day free tier.
//
// Matches use an adaptive TTL: while a league has a live fixture we refresh
// quickly (LiveTTL) to keep scores current; otherwise we refresh slowly
// (FixturesTTL) because schedules barely change.
type CachingProvider struct {
	next domain.FootballProvider

	fixturesTTL  time.Duration
	liveTTL      time.Duration
	standingsTTL time.Duration

	mu        sync.RWMutex
	leagues   cacheEntry[[]domain.League]
	matches   map[string]cacheEntry[[]domain.Match]
	standings map[string]cacheEntry[[]domain.Standing]
}

type cacheEntry[T any] struct {
	data      T
	expiresAt time.Time
}

func (e cacheEntry[T]) valid() bool { return !e.expiresAt.IsZero() && time.Now().Before(e.expiresAt) }

// NewCachingProvider decorates next with caching using the given TTLs.
func NewCachingProvider(next domain.FootballProvider, fixturesTTL, liveTTL, standingsTTL time.Duration) *CachingProvider {
	return &CachingProvider{
		next:         next,
		fixturesTTL:  fixturesTTL,
		liveTTL:      liveTTL,
		standingsTTL: standingsTTL,
		matches:      make(map[string]cacheEntry[[]domain.Match]),
		standings:    make(map[string]cacheEntry[[]domain.Standing]),
	}
}

func (c *CachingProvider) Leagues(ctx context.Context) ([]domain.League, error) {
	c.mu.RLock()
	if c.leagues.valid() {
		defer c.mu.RUnlock()
		return c.leagues.data, nil
	}
	c.mu.RUnlock()

	data, err := c.next.Leagues(ctx)
	if err != nil {
		return nil, err
	}
	c.mu.Lock()
	c.leagues = cacheEntry[[]domain.League]{data: data, expiresAt: time.Now().Add(24 * time.Hour)}
	c.mu.Unlock()
	return data, nil
}

func (c *CachingProvider) Matches(ctx context.Context, leagueID string) ([]domain.Match, error) {
	c.mu.RLock()
	if e, ok := c.matches[leagueID]; ok && e.valid() {
		defer c.mu.RUnlock()
		return e.data, nil
	}
	c.mu.RUnlock()

	data, err := c.next.Matches(ctx, leagueID)
	if err != nil {
		return nil, err
	}
	ttl := c.fixturesTTL
	if hasLive(data) {
		ttl = c.liveTTL
	}
	c.mu.Lock()
	c.matches[leagueID] = cacheEntry[[]domain.Match]{data: data, expiresAt: time.Now().Add(ttl)}
	c.mu.Unlock()
	return data, nil
}

func (c *CachingProvider) Standings(ctx context.Context, leagueID string) ([]domain.Standing, error) {
	c.mu.RLock()
	if e, ok := c.standings[leagueID]; ok && e.valid() {
		defer c.mu.RUnlock()
		return e.data, nil
	}
	c.mu.RUnlock()

	data, err := c.next.Standings(ctx, leagueID)
	if err != nil {
		return nil, err
	}
	c.mu.Lock()
	c.standings[leagueID] = cacheEntry[[]domain.Standing]{data: data, expiresAt: time.Now().Add(c.standingsTTL)}
	c.mu.Unlock()
	return data, nil
}

func hasLive(matches []domain.Match) bool {
	for _, m := range matches {
		if m.Status == domain.StatusLive {
			return true
		}
	}
	return false
}

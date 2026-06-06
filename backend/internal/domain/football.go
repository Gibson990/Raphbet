// Package domain holds the core business entities and the ports (interfaces)
// the rest of the application depends on. It has no knowledge of HTTP, JSON
// wire formats, or any specific data provider — that lives in the outer layers.
package domain

import (
	"context"
	"time"
)

// MatchStatus mirrors the front-end union type in types.ts.
type MatchStatus string

const (
	StatusUpcoming MatchStatus = "UPCOMING"
	StatusLive     MatchStatus = "LIVE"
	StatusFinished MatchStatus = "FINISHED"
)

// Team is a single club or national team.
type Team struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Logo string `json:"logo"`
}

// League is a competition (e.g. the FIFA World Cup).
type League struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Country string `json:"country"`
	Logo    string `json:"logo"`
}

// Score is the current/final goals for a match.
type Score struct {
	Home int `json:"home"`
	Away int `json:"away"`
}

// Odds are the three 1X2 prices for a match.
type Odds struct {
	HomeWin float64 `json:"homeWin"`
	Draw    float64 `json:"draw"`
	AwayWin float64 `json:"awayWin"`
}

// Match is a single fixture with teams, status, optional score and odds.
type Match struct {
	ID       string      `json:"id"`
	LeagueID string      `json:"leagueId"`
	Date     time.Time   `json:"date"`
	Status   MatchStatus `json:"status"`
	HomeTeam Team        `json:"homeTeam"`
	AwayTeam Team        `json:"awayTeam"`
	Score    *Score      `json:"score,omitempty"`
	Time     string      `json:"time,omitempty"` // "HT", "FT", "68'"
	Odds     Odds        `json:"odds"`
}

// Standing is one row of a league table.
type Standing struct {
	Rank           int  `json:"rank"`
	Team           Team `json:"team"`
	Played         int  `json:"played"`
	Win            int  `json:"win"`
	Draw           int  `json:"draw"`
	Loss           int  `json:"loss"`
	Points         int  `json:"points"`
	GoalDifference int  `json:"goalDifference"`
}

// FootballProvider is the port for any upstream football data source
// (api-football, a mock, or a future alternative). The use case layer depends
// only on this interface, so providers are swappable without code changes.
type FootballProvider interface {
	Leagues(ctx context.Context) ([]League, error)
	Matches(ctx context.Context, leagueID string) ([]Match, error)
	Standings(ctx context.Context, leagueID string) ([]Standing, error)
}

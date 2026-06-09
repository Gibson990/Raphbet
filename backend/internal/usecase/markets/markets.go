// Package markets defines the betting markets the app offers (beyond 1X2),
// their outcome codes, and how to settle a code against a match result. Both
// the odds engine (to price markets) and the settlement worker (to grade bets)
// depend on this single source of truth so codes never drift.
package markets

import (
	"strconv"
	"strings"
)

// Lines offered for total-goals and first-half-goals Over/Under markets.
var (
	OULines   = []float64{1.5, 2.5, 3.5}
	FHOULines = []float64{0.5, 1.5}
)

func fmtLine(line float64) string { return strconv.FormatFloat(line, 'f', -1, 64) }

// ---- Outcome code builders ----

func OUCode(line float64, over bool) string   { return "OU_" + fmtLine(line) + "_" + overUnder(over) }
func FHOUCode(line float64, over bool) string { return "FH_OU_" + fmtLine(line) + "_" + overUnder(over) }
func BTTSCode(yes bool) string                { return "BTTS_" + yesNo(yes) }

// ---- Human labels ----

func OULabel(line float64, over bool) string   { return overUnderWord(over) + " " + fmtLine(line) + " Goals" }
func FHOULabel(line float64, over bool) string { return overUnderWord(over) + " " + fmtLine(line) + " (1st Half)" }
func BTTSLabel(yes bool) string {
	if yes {
		return "Both Teams To Score: Yes"
	}
	return "Both Teams To Score: No"
}

// Result carries the scores needed to grade any market.
type Result struct {
	FTHome, FTAway int
	HTHome, HTAway int
	HasHT          bool
}

// Evaluate grades an outcome code against a result.
// won  — whether the bet wins.
// done — whether the market can be settled yet (false if it needs data we lack,
//
//	e.g. a first-half market with no half-time score, or an unknown code).
func Evaluate(code string, r Result) (won bool, done bool) {
	switch code {
	case "1":
		return r.FTHome > r.FTAway, true
	case "X":
		return r.FTHome == r.FTAway, true
	case "2":
		return r.FTAway > r.FTHome, true
	case BTTSCode(true):
		return r.FTHome > 0 && r.FTAway > 0, true
	case BTTSCode(false):
		return !(r.FTHome > 0 && r.FTAway > 0), true
	}

	// ── Double Chance ──────────────────────────────────────────────────────────
	switch code {
	case "1X":
		return r.FTHome >= r.FTAway, true // home win or draw
	case "12":
		return r.FTHome != r.FTAway, true // any team wins (no draw)
	case "X2":
		return r.FTAway >= r.FTHome, true // away win or draw
	}

	// ── Half-Time Result ───────────────────────────────────────────────────────
	if r.HasHT {
		switch code {
		case "HT1":
			return r.HTHome > r.HTAway, true
		case "HTX":
			return r.HTHome == r.HTAway, true
		case "HT2":
			return r.HTAway > r.HTHome, true
		}
	}

	// ── Correct Score (CS_h_a) ─────────────────────────────────────────────────
	if strings.HasPrefix(code, "CS_") {
		parts2 := strings.Split(code, "_")
		if len(parts2) == 3 {
			h, eh := strconv.Atoi(parts2[1])
			a, ea := strconv.Atoi(parts2[2])
			if eh == nil && ea == nil {
				return r.FTHome == h && r.FTAway == a, true
			}
		}
	}

	parts := strings.Split(code, "_")
	switch {
	case strings.HasPrefix(code, "FH_OU_") && len(parts) == 4:
		if !r.HasHT {
			return false, false
		}
		line, err := strconv.ParseFloat(parts[2], 64)
		if err != nil {
			return false, false
		}
		return overUnderResult(float64(r.HTHome+r.HTAway), line, parts[3]), true
	case strings.HasPrefix(code, "OU_") && len(parts) == 3:
		line, err := strconv.ParseFloat(parts[1], 64)
		if err != nil {
			return false, false
		}
		return overUnderResult(float64(r.FTHome+r.FTAway), line, parts[2]), true
	}
	return false, false // unknown code — never settle silently
}

func overUnderResult(total, line float64, side string) bool {
	if side == "OVER" {
		return total > line
	}
	return total < line
}

func overUnder(over bool) string {
	if over {
		return "OVER"
	}
	return "UNDER"
}

func overUnderWord(over bool) string {
	if over {
		return "Over"
	}
	return "Under"
}

func yesNo(yes bool) string {
	if yes {
		return "YES"
	}
	return "NO"
}

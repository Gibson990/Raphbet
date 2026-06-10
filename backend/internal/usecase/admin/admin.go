// Package admin provides read models for the admin dashboard, computed entirely
// from the live data stores (no hardcoded values).
package admin

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// isRegistered reports whether a wallet key belongs to a signed-in user rather
// than an anonymous guest browser. Signed-in users are keyed by their Firebase
// UID (alphanumeric, no hyphens); guests are keyed by a UUID device id (which
// always contains hyphens). Registered accounts are shown in the admin even
// before they deposit or bet; empty guest wallets are not.
func isRegistered(walletID string) bool {
	return walletID != "" && !strings.Contains(walletID, "-")
}

// KycChecker reports whether a device/identity is KYC-verified.
type KycChecker interface {
	IsVerified(deviceID string) (bool, error)
}

type DailyStat struct {
	Date     string       `json:"date"` // "YYYY-MM-DD"
	Wagers   domain.Money `json:"wagers"`
	Payouts  domain.Money `json:"payouts"`
	GGR      domain.Money `json:"ggr"`
	Deposits domain.Money `json:"deposits"`
}

// Stats are the headline KPIs.
type Stats struct {
	Users        int          `json:"users"`
	TotalBalance domain.Money `json:"totalBalance"`
	TotalStaked  domain.Money `json:"totalStaked"`
	TotalPayouts domain.Money `json:"totalPayouts"`
	GGR          domain.Money `json:"ggr"` // gross gaming revenue = staked - payouts (the house profit)
	Deposits     domain.Money `json:"deposits"`
	Withdrawals  domain.Money `json:"withdrawals"`
	// PendingLiability is the maximum the house would owe if every currently
	// open (PENDING) bet were to win — the key real-time risk exposure number.
	PendingLiability domain.Money `json:"pendingLiability"`
	BetsPending      int          `json:"betsPending"`
	BetsWon      int          `json:"betsWon"`
	BetsLost     int          `json:"betsLost"`
	Daily        []DailyStat  `json:"daily"`
}

// UserRow is one row of the users table.
type UserRow struct {
	DeviceID    string       `json:"deviceId"`
	Email       string       `json:"email,omitempty"`
	Balance     domain.Money `json:"balance"`
	Verified    bool         `json:"verified"`
	TotalStaked domain.Money `json:"totalStaked"`
	Bets        int          `json:"bets"`
	Suspended   bool         `json:"suspended"`
}

// BetRow is one row of the bets table.
type BetRow struct {
	ID         string           `json:"id"`
	DeviceID   string           `json:"deviceId"`
	Match      string           `json:"match"`
	Market     string           `json:"market"`
	Wager      domain.Money     `json:"wager"`
	Odds       float64          `json:"odds"`
	Status     domain.BetStatus `json:"status"`
	Payout     domain.Money     `json:"payout"`
	PlacedDate time.Time        `json:"placedDate"`
}

// Service aggregates admin read models.
type Service struct {
	wallets domain.WalletRepository
	bets    domain.BetRepository
	kyc     KycChecker
}

// New builds an admin service.
func New(wallets domain.WalletRepository, bets domain.BetRepository, kyc KycChecker) *Service {
	return &Service{wallets: wallets, bets: bets, kyc: kyc}
}

// Stats computes the headline KPIs from wallets + bets.
func (s *Service) Stats() (Stats, error) {
	wallets, err := s.wallets.AllWallets()
	if err != nil {
		return Stats{}, err
	}
	bets, err := s.bets.AllBets()
	if err != nil {
		return Stats{}, err
	}

	// A wallet is auto-created for every device that merely loads the app, so
	// len(wallets) over-counts. "Players" = wallets that actually transacted or
	// bet; empty guest/seed wallets don't count.
	betDevices := make(map[string]bool)
	for _, b := range bets {
		betDevices[b.DeviceID] = true
	}

	st := Stats{}
	dailyMap := make(map[string]*DailyStat)
	now := time.Now()
	for i := 0; i < 7; i++ {
		dStr := now.AddDate(0, 0, -i).Format("2006-01-02")
		dailyMap[dStr] = &DailyStat{Date: dStr}
	}

	for _, w := range wallets {
		if isRegistered(w.DeviceID) || len(w.Transactions) > 0 || betDevices[w.DeviceID] {
			st.Users++
		}
		st.TotalBalance += w.Balance
		for _, t := range w.Transactions {
			dStr := t.Date.Format("2006-01-02")
			day, exists := dailyMap[dStr]
			switch t.Type {
			case domain.TxTopUp:
				st.Deposits += t.Amount
				if exists {
					day.Deposits += t.Amount
				}
			case domain.TxWithdrawal:
				st.Withdrawals += -t.Amount // stored negative
			}
		}
	}
	for _, b := range bets {
		st.TotalStaked += b.Wager
		st.TotalPayouts += b.Payout
		dStr := b.PlacedDate.Format("2006-01-02")
		day, exists := dailyMap[dStr]
		if exists {
			day.Wagers += b.Wager
			day.Payouts += b.Payout
			day.GGR += (b.Wager - b.Payout)
		}
		switch b.Status {
		case domain.BetPending:
			st.BetsPending++
			st.PendingLiability += potentialPayout(b)
		case domain.BetWon:
			st.BetsWon++
		case domain.BetLost:
			st.BetsLost++
		}
	}
	st.GGR = st.TotalStaked - st.TotalPayouts

	st.Daily = make([]DailyStat, 0, 7)
	for i := 6; i >= 0; i-- {
		dStr := now.AddDate(0, 0, -i).Format("2006-01-02")
		if ds, ok := dailyMap[dStr]; ok {
			st.Daily = append(st.Daily, *ds)
		}
	}
	return st, nil
}

// potentialPayout is the amount a pending bet would pay if it wins: stake × odds
// for a single, or stake × combined multiplier × (1 + boost) for an accumulator.
func potentialPayout(b *domain.Bet) domain.Money {
	if b.IsMulti {
		return domain.Money(float64(b.Wager) * b.Multiplier * (1.0 + b.WinBoost))
	}
	return domain.Money(float64(b.Wager) * b.Selection.Odds)
}

// Users returns the users table (one row per wallet/device).
func (s *Service) Users() ([]UserRow, error) {
	wallets, err := s.wallets.AllWallets()
	if err != nil {
		return nil, err
	}
	bets, err := s.bets.AllBets()
	if err != nil {
		return nil, err
	}
	stakedBy := map[string]domain.Money{}
	countBy := map[string]int{}
	for _, b := range bets {
		stakedBy[b.DeviceID] += b.Wager
		countBy[b.DeviceID]++
	}

	rows := make([]UserRow, 0, len(wallets))
	for _, w := range wallets {
		// Show registered accounts (signed-in users) always; skip only anonymous
		// guest wallets that have no activity, so the table reflects real players
		// without the auto-created guest clutter.
		if !isRegistered(w.DeviceID) && len(w.Transactions) == 0 && countBy[w.DeviceID] == 0 {
			continue
		}
		verified, _ := s.kyc.IsVerified(w.DeviceID)
		rows = append(rows, UserRow{
			DeviceID:    w.DeviceID,
			Email:       w.Email,
			Balance:     w.Balance,
			Verified:    verified,
			TotalStaked: stakedBy[w.DeviceID],
			Bets:        countBy[w.DeviceID],
			Suspended:   w.Suspended,
		})
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].TotalStaked > rows[j].TotalStaked })
	return rows, nil
}

// Bets returns all bets, newest first.
func (s *Service) Bets() ([]BetRow, error) {
	bets, err := s.bets.AllBets()
	if err != nil {
		return nil, err
	}
	rows := make([]BetRow, 0, len(bets))
	for _, b := range bets {
		match := b.Selection.MatchDescription
		market := b.Selection.MarketLabel
		odds := b.Selection.Odds
		if b.IsMulti {
			match = fmt.Sprintf("Accumulator (%d Selections)", len(b.Selections))
			market = fmt.Sprintf("Boost: %.0f%%", b.WinBoost*100)
			odds = b.Multiplier
		}
		rows = append(rows, BetRow{
			ID:         b.ID,
			DeviceID:   b.DeviceID,
			Match:      match,
			Market:     market,
			Wager:      b.Wager,
			Odds:       odds,
			Status:     b.Status,
			Payout:     b.Payout,
			PlacedDate: b.PlacedDate,
		})
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].PlacedDate.After(rows[j].PlacedDate) })
	return rows, nil
}

// Package admin provides read models for the admin dashboard, computed entirely
// from the live data stores (no hardcoded values).
package admin

import (
	"sort"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// KycChecker reports whether a device/identity is KYC-verified.
type KycChecker interface {
	IsVerified(deviceID string) (bool, error)
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
	BetsPending  int          `json:"betsPending"`
	BetsWon      int          `json:"betsWon"`
	BetsLost     int          `json:"betsLost"`
}

// UserRow is one row of the users table.
type UserRow struct {
	DeviceID    string       `json:"deviceId"`
	Balance     domain.Money `json:"balance"`
	Verified    bool         `json:"verified"`
	TotalStaked domain.Money `json:"totalStaked"`
	Bets        int          `json:"bets"`
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

	st := Stats{Users: len(wallets)}
	for _, w := range wallets {
		st.TotalBalance += w.Balance
		for _, t := range w.Transactions {
			switch t.Type {
			case domain.TxTopUp:
				st.Deposits += t.Amount
			case domain.TxWithdrawal:
				st.Withdrawals += -t.Amount // stored negative
			}
		}
	}
	for _, b := range bets {
		st.TotalStaked += b.Wager
		st.TotalPayouts += b.Payout
		switch b.Status {
		case domain.BetPending:
			st.BetsPending++
		case domain.BetWon:
			st.BetsWon++
		case domain.BetLost:
			st.BetsLost++
		}
	}
	st.GGR = st.TotalStaked - st.TotalPayouts
	return st, nil
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
		verified, _ := s.kyc.IsVerified(w.DeviceID)
		rows = append(rows, UserRow{
			DeviceID:    w.DeviceID,
			Balance:     w.Balance,
			Verified:    verified,
			TotalStaked: stakedBy[w.DeviceID],
			Bets:        countBy[w.DeviceID],
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
		rows = append(rows, BetRow{
			ID:         b.ID,
			DeviceID:   b.DeviceID,
			Match:      b.Selection.MatchDescription,
			Market:     b.Selection.MarketLabel,
			Wager:      b.Wager,
			Odds:       b.Selection.Odds,
			Status:     b.Status,
			Payout:     b.Payout,
			PlacedDate: b.PlacedDate,
		})
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].PlacedDate.After(rows[j].PlacedDate) })
	return rows, nil
}

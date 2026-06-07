package domain

import "time"

// Money is a whole-unit amount in the base currency (TZS). Cents are not used.
type Money = int64

// TxType is the kind of wallet transaction.
type TxType string

const (
	TxWager      TxType = "Wager"
	TxPayout     TxType = "Payout"
	TxTopUp      TxType = "Top-up"
	TxWithdrawal TxType = "Withdrawal"
)

// Transaction is a single entry in a wallet's history.
type Transaction struct {
	ID          string    `json:"id"`
	Type        TxType    `json:"type"`
	Amount      Money     `json:"amount"` // signed: credits positive, debits negative
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
}

// Wallet is a player's server-authoritative balance, keyed by device id until
// real auth (Phase 5) replaces it with a user id.
type Wallet struct {
	DeviceID     string        `json:"-"`
	Balance      Money         `json:"balance"`
	Transactions []Transaction `json:"transactions"`
}

// BetStatus is the lifecycle state of a placed bet.
type BetStatus string

const (
	BetPending BetStatus = "PENDING"
	BetWon     BetStatus = "WON"
	BetLost    BetStatus = "LOST"
)

// BetSelection mirrors the front-end selection on a 1X2 market.
type BetSelection struct {
	MatchID          string  `json:"matchId"`
	MatchDescription string  `json:"matchDescription"`
	MarketLabel      string  `json:"marketLabel"`
	Market           string  `json:"market"` // "1" | "X" | "2"
	Odds             float64 `json:"odds"`
}

// Bet is a single placed wager.
type Bet struct {
	ID         string       `json:"id"`
	DeviceID   string       `json:"-"`
	Selection  BetSelection `json:"selection"`
	Wager      Money        `json:"wager"`
	Status     BetStatus    `json:"status"`
	PlacedDate time.Time    `json:"placedDate"`
	Payout     Money        `json:"payout"`
}

// WalletRepository persists wallets. Get returns (nil, nil) when not found.
type WalletRepository interface {
	Get(deviceID string) (*Wallet, error)
	Save(w *Wallet) error
}

// BetRepository persists bets.
type BetRepository interface {
	Add(b *Bet) error
	ListByDevice(deviceID string) ([]*Bet, error)
	ListPending() ([]*Bet, error)
	Update(b *Bet) error
}

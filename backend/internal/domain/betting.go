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
	Suspended    bool          `json:"suspended"`
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

// WithdrawalStatus is the lifecycle of a withdrawal request.
type WithdrawalStatus string

const (
	WdPending  WithdrawalStatus = "PENDING"  // awaiting admin approval (funds held)
	WdPaid     WithdrawalStatus = "PAID"      // approved + paid out
	WdRejected WithdrawalStatus = "REJECTED"  // rejected, funds refunded
)

// Withdrawal is a request to cash out to a crypto address.
type Withdrawal struct {
	ID          string           `json:"id"`
	DeviceID    string           `json:"-"`
	Amount      Money            `json:"amount"`  // USD cents
	Address     string           `json:"address"` // destination crypto address
	Status      WithdrawalStatus `json:"status"`
	CreatedDate time.Time        `json:"createdDate"`
	Note        string           `json:"note,omitempty"` // payout id or reason
}

// WithdrawalRepository persists withdrawal requests. (Distinct method names so a
// single store type can also implement the bet/wallet repositories.)
type WithdrawalRepository interface {
	AddWithdrawal(w *Withdrawal) error
	GetWithdrawal(id string) (*Withdrawal, error)
	ListWithdrawalsByDevice(deviceID string) ([]*Withdrawal, error)
	ListPendingWithdrawals() ([]*Withdrawal, error)
	UpdateWithdrawal(w *Withdrawal) error
}

// WalletRepository persists wallets. Get returns (nil, nil) when not found.
type WalletRepository interface {
	Get(deviceID string) (*Wallet, error)
	Save(w *Wallet) error
	AllWallets() ([]*Wallet, error) // admin
}

// BetRepository persists bets.
type BetRepository interface {
	Add(b *Bet) error
	ListByDevice(deviceID string) ([]*Bet, error)
	ListPending() ([]*Bet, error)
	Update(b *Bet) error
	AllBets() ([]*Bet, error) // admin
}

// BookmakerConfig holds the dynamic settings for the platform.
type BookmakerConfig struct {
	HouseMargin   float64 `bson:"houseMargin" json:"houseMargin"`
	MinBet        int64   `bson:"minBet" json:"minBet"`
	MaxBet        int64   `bson:"maxBet" json:"maxBet"`
	MinWithdrawal int64   `bson:"minWithdrawal" json:"minWithdrawal"`
	MaxWithdrawal int64   `bson:"maxWithdrawal" json:"maxWithdrawal"`
}

// ConfigRepository persists platform configurations.
type ConfigRepository interface {
	GetConfig() (*BookmakerConfig, error)
	SaveConfig(cfg *BookmakerConfig) error
}


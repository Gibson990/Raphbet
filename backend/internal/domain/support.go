package domain

import "time"

// SupportStatus is the lifecycle state of a support ticket.
type SupportStatus string

const (
	SupportOpen     SupportStatus = "OPEN"     // awaiting an agent reply
	SupportAnswered SupportStatus = "ANSWERED" // an agent has replied
	SupportClosed   SupportStatus = "CLOSED"   // resolved
)

// SupportMessage is one entry in a ticket thread, from the player or an agent.
type SupportMessage struct {
	ID     string    `json:"id"`
	From   string    `json:"from"` // "user" | "admin"
	Body   string    `json:"body"`
	Date   time.Time `json:"date"`
}

// SupportTicket is a customer-service conversation opened by a registered user.
// BetRef optionally links the ticket to one of the user's bets (referenced with
// a #hashtag in the message) so an agent has the full context to hand.
type SupportTicket struct {
	ID          string           `json:"id"`
	DeviceID    string           `json:"-"`
	Subject     string           `json:"subject"`
	BetRef      string           `json:"betRef,omitempty"`
	Status      SupportStatus    `json:"status"`
	Messages    []SupportMessage `json:"messages"`
	CreatedDate time.Time        `json:"createdDate"`
	UpdatedDate time.Time        `json:"updatedDate"`
}

// SupportRepository persists support tickets. (Distinct method names so one
// store type can also implement the wallet/bet/withdrawal repositories.)
type SupportRepository interface {
	AddTicket(t *SupportTicket) error
	GetTicket(id string) (*SupportTicket, error)
	ListTicketsByDevice(deviceID string) ([]*SupportTicket, error)
	AllTickets() ([]*SupportTicket, error)
	UpdateTicket(t *SupportTicket) error
}

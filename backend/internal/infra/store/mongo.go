package store

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// MongoStore implements WalletRepository and BetRepository on MongoDB. It is a
// drop-in replacement for MemoryStore (same interfaces), selected at startup
// when MONGO_URI is configured.
type MongoStore struct {
	client  *mongo.Client
	wallets *mongo.Collection
	bets    *mongo.Collection
	kyc     *mongo.Collection
}

const opTimeout = 8 * time.Second

// NewMongoStore connects, verifies the connection and ensures indexes.
func NewMongoStore(ctx context.Context, uri, dbName string) (*MongoStore, error) {
	connectCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(connectCtx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(connectCtx, nil); err != nil {
		return nil, err
	}

	db := client.Database(dbName)
	s := &MongoStore{client: client, wallets: db.Collection("wallets"), bets: db.Collection("bets"), kyc: db.Collection("kyc")}

	// Indexes for the access patterns we use.
	_, _ = s.bets.Indexes().CreateMany(connectCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "deviceId", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
	})
	return s, nil
}

// Close disconnects the client.
func (s *MongoStore) Close(ctx context.Context) error { return s.client.Disconnect(ctx) }

// ---- BSON documents (keep domain free of storage tags) ----

type walletDoc struct {
	DeviceID     string               `bson:"_id"`
	Balance      domain.Money         `bson:"balance"`
	Transactions []domain.Transaction `bson:"transactions"`
}

type betDoc struct {
	ID         string              `bson:"_id"`
	DeviceID   string              `bson:"deviceId"`
	Selection  domain.BetSelection `bson:"selection"`
	Wager      domain.Money        `bson:"wager"`
	Status     domain.BetStatus    `bson:"status"`
	PlacedDate time.Time           `bson:"placedDate"`
	Payout     domain.Money        `bson:"payout"`
}

func toBetDoc(b *domain.Bet) betDoc {
	return betDoc{ID: b.ID, DeviceID: b.DeviceID, Selection: b.Selection, Wager: b.Wager, Status: b.Status, PlacedDate: b.PlacedDate, Payout: b.Payout}
}

func (d betDoc) toDomain() *domain.Bet {
	return &domain.Bet{ID: d.ID, DeviceID: d.DeviceID, Selection: d.Selection, Wager: d.Wager, Status: d.Status, PlacedDate: d.PlacedDate, Payout: d.Payout}
}

// ---- WalletRepository ----

func (s *MongoStore) Get(deviceID string) (*domain.Wallet, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()

	var doc walletDoc
	err := s.wallets.FindOne(ctx, bson.M{"_id": deviceID}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if doc.Transactions == nil {
		doc.Transactions = []domain.Transaction{}
	}
	return &domain.Wallet{DeviceID: doc.DeviceID, Balance: doc.Balance, Transactions: doc.Transactions}, nil
}

func (s *MongoStore) Save(w *domain.Wallet) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()

	doc := walletDoc{DeviceID: w.DeviceID, Balance: w.Balance, Transactions: w.Transactions}
	_, err := s.wallets.ReplaceOne(ctx, bson.M{"_id": w.DeviceID}, doc, options.Replace().SetUpsert(true))
	return err
}

// ---- BetRepository ----

func (s *MongoStore) Add(b *domain.Bet) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	_, err := s.bets.InsertOne(ctx, toBetDoc(b))
	return err
}

func (s *MongoStore) ListByDevice(deviceID string) ([]*domain.Bet, error) {
	return s.find(bson.M{"deviceId": deviceID})
}

func (s *MongoStore) ListPending() ([]*domain.Bet, error) {
	return s.find(bson.M{"status": domain.BetPending})
}

func (s *MongoStore) Update(b *domain.Bet) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	_, err := s.bets.ReplaceOne(ctx, bson.M{"_id": b.ID}, toBetDoc(b), options.Replace().SetUpsert(true))
	return err
}

// ---- kyc.Store ----

func (s *MongoStore) SetVerified(deviceID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	_, err := s.kyc.ReplaceOne(ctx, bson.M{"_id": deviceID}, bson.M{"_id": deviceID, "verified": true}, options.Replace().SetUpsert(true))
	return err
}

func (s *MongoStore) IsVerified(deviceID string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	var doc struct {
		Verified bool `bson:"verified"`
	}
	err := s.kyc.FindOne(ctx, bson.M{"_id": deviceID}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return doc.Verified, nil
}

func (s *MongoStore) find(filter bson.M) ([]*domain.Bet, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()

	cur, err := s.bets.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	out := []*domain.Bet{}
	for cur.Next(ctx) {
		var d betDoc
		if err := cur.Decode(&d); err != nil {
			return nil, err
		}
		out = append(out, d.toDomain())
	}
	return out, cur.Err()
}

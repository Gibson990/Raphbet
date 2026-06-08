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
	client      *mongo.Client
	wallets     *mongo.Collection
	bets        *mongo.Collection
	kyc         *mongo.Collection
	withdrawals *mongo.Collection
	processed   *mongo.Collection
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
	s := &MongoStore{client: client, wallets: db.Collection("wallets"), bets: db.Collection("bets"), kyc: db.Collection("kyc"), withdrawals: db.Collection("withdrawals"), processed: db.Collection("processed")}

	// Indexes for the access patterns we use.
	_, _ = s.bets.Indexes().CreateMany(connectCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "deviceId", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
	})
	return s, nil
}

// Close disconnects the client.
func (s *MongoStore) Close(ctx context.Context) error { return s.client.Disconnect(ctx) }

// MarkProcessed records an idempotency key via a unique-_id insert; a duplicate
// means it was already processed.
func (s *MongoStore) MarkProcessed(key string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	_, err := s.processed.InsertOne(ctx, bson.M{"_id": key, "at": time.Now()})
	if mongo.IsDuplicateKeyError(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

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

func (s *MongoStore) AllWallets() ([]*domain.Wallet, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()

	cur, err := s.wallets.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	out := []*domain.Wallet{}
	for cur.Next(ctx) {
		var d walletDoc
		if err := cur.Decode(&d); err != nil {
			return nil, err
		}
		if d.Transactions == nil {
			d.Transactions = []domain.Transaction{}
		}
		out = append(out, &domain.Wallet{DeviceID: d.DeviceID, Balance: d.Balance, Transactions: d.Transactions})
	}
	return out, cur.Err()
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

func (s *MongoStore) AllBets() ([]*domain.Bet, error) {
	return s.find(bson.M{})
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
	_, err := s.kyc.UpdateOne(ctx, bson.M{"_id": deviceID}, bson.M{"$set": bson.M{"verified": true}}, options.Update().SetUpsert(true))
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

func (s *MongoStore) LinkSession(deviceID, sessionID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	_, err := s.kyc.UpdateOne(ctx, bson.M{"_id": deviceID}, bson.M{"$set": bson.M{"sessionId": sessionID}}, options.Update().SetUpsert(true))
	return err
}

func (s *MongoStore) DeviceForSession(sessionID string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	var doc struct {
		ID string `bson:"_id"`
	}
	err := s.kyc.FindOne(ctx, bson.M{"sessionId": sessionID}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return "", nil
	}
	return doc.ID, err
}

func (s *MongoStore) SessionForDevice(deviceID string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	var doc struct {
		SessionID string `bson:"sessionId"`
	}
	err := s.kyc.FindOne(ctx, bson.M{"_id": deviceID}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return "", nil
	}
	return doc.SessionID, err
}

// ---- WithdrawalRepository ----

type withdrawalDoc struct {
	ID          string                  `bson:"_id"`
	DeviceID    string                  `bson:"deviceId"`
	Amount      domain.Money            `bson:"amount"`
	Address     string                  `bson:"address"`
	Status      domain.WithdrawalStatus `bson:"status"`
	CreatedDate time.Time               `bson:"createdDate"`
	Note        string                  `bson:"note"`
}

func toWithdrawalDoc(w *domain.Withdrawal) withdrawalDoc {
	return withdrawalDoc{ID: w.ID, DeviceID: w.DeviceID, Amount: w.Amount, Address: w.Address, Status: w.Status, CreatedDate: w.CreatedDate, Note: w.Note}
}

func (d withdrawalDoc) toDomain() *domain.Withdrawal {
	return &domain.Withdrawal{ID: d.ID, DeviceID: d.DeviceID, Amount: d.Amount, Address: d.Address, Status: d.Status, CreatedDate: d.CreatedDate, Note: d.Note}
}

func (s *MongoStore) AddWithdrawal(w *domain.Withdrawal) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	_, err := s.withdrawals.InsertOne(ctx, toWithdrawalDoc(w))
	return err
}

func (s *MongoStore) GetWithdrawal(id string) (*domain.Withdrawal, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	var d withdrawalDoc
	err := s.withdrawals.FindOne(ctx, bson.M{"_id": id}).Decode(&d)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return d.toDomain(), nil
}

func (s *MongoStore) ListWithdrawalsByDevice(deviceID string) ([]*domain.Withdrawal, error) {
	return s.findWithdrawals(bson.M{"deviceId": deviceID})
}

func (s *MongoStore) ListPendingWithdrawals() ([]*domain.Withdrawal, error) {
	return s.findWithdrawals(bson.M{"status": domain.WdPending})
}

func (s *MongoStore) UpdateWithdrawal(w *domain.Withdrawal) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	_, err := s.withdrawals.ReplaceOne(ctx, bson.M{"_id": w.ID}, toWithdrawalDoc(w), options.Replace().SetUpsert(true))
	return err
}

func (s *MongoStore) findWithdrawals(filter bson.M) ([]*domain.Withdrawal, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	cur, err := s.withdrawals.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []*domain.Withdrawal{}
	for cur.Next(ctx) {
		var d withdrawalDoc
		if err := cur.Decode(&d); err != nil {
			return nil, err
		}
		out = append(out, d.toDomain())
	}
	return out, cur.Err()
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

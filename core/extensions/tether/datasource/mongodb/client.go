package mongodb

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Client wraps a MongoDB client and database.
type Client struct {
	client *mongo.Client
	db     *mongo.Database
}

// NewClient creates a new MongoDB client.
// Returns nil if uri is empty (optional connection).
func NewClient(ctx context.Context, uri, dbName string) (*Client, error) {
	if uri == "" || dbName == "" {
		return nil, nil
	}

	clientOpts := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to mongo: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		_ = client.Disconnect(ctx)
		return nil, fmt.Errorf("failed to ping mongo: %w", err)
	}

	return &Client{
		client: client,
		db:     client.Database(dbName),
	}, nil
}

// Database returns the underlying database.
func (c *Client) Database() *mongo.Database {
	return c.db
}

// DatabaseByName returns a database handle from the same connection.
func (c *Client) DatabaseByName(name string) *mongo.Database {
	return c.client.Database(name)
}

// Close disconnects from MongoDB.
func (c *Client) Close(ctx context.Context) {
	if c.client != nil {
		_ = c.client.Disconnect(ctx)
	}
}

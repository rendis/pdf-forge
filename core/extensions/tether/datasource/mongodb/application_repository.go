package mongodb

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// ApplicationRepository provides access to the crm applications collection.
type ApplicationRepository struct {
	coll *mongo.Collection
}

// NewApplicationRepository creates a new repository for applications.
func NewApplicationRepository(coll *mongo.Collection) *ApplicationRepository {
	return &ApplicationRepository{coll: coll}
}

// ExistsByOwner checks whether a case (application) belongs to the given user.
func (r *ApplicationRepository) ExistsByOwner(ctx context.Context, caseID, userID string) (bool, error) {
	objID, err := primitive.ObjectIDFromHex(caseID)
	if err != nil {
		return false, fmt.Errorf("invalid case ID: %w", err)
	}

	count, err := r.coll.CountDocuments(ctx, bson.M{
		"_id":    objID,
		"userId": userID,
	})
	if err != nil {
		return false, fmt.Errorf("check application ownership: %w", err)
	}

	return count > 0, nil
}

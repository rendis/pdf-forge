package mongodb

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/rendis/pdf-forge/extensions/tether/datasource/mongodb/entities"
)

// SurveyRepository provides access to the surveys collection.
type SurveyRepository struct {
	coll *mongo.Collection
}

// NewSurveyRepository creates a new repository for surveys.
func NewSurveyRepository(coll *mongo.Collection) *SurveyRepository {
	return &SurveyRepository{coll: coll}
}

// FindByCaseID retrieves surveys for a given case (externalId) and operations.
func (r *SurveyRepository) FindByCaseID(ctx context.Context, caseID string, operations []string) ([]entities.SurveyDoc, error) {
	filter := bson.M{
		"externalId": caseID,
		"operation":  bson.M{"$in": operations},
	}

	proj := options.Find().SetProjection(bson.M{
		"templateType": 1,
		"answers":      1,
	})

	cursor, err := r.coll.Find(ctx, filter, proj)
	if err != nil {
		return nil, fmt.Errorf("find surveys by case: %w", err)
	}
	defer cursor.Close(ctx)

	var results []entities.SurveyDoc
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("decode surveys: %w", err)
	}

	return results, nil
}

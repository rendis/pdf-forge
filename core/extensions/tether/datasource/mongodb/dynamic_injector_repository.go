package mongodb

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/rendis/pdf-forge/extensions/tether/datasource/mongodb/entities"
)

// DynamicInjectorRepository provides access to pdf_forge_dynamic_injectors collection.
type DynamicInjectorRepository struct {
	coll *mongo.Collection
}

// NewDynamicInjectorRepository creates a new repository for dynamic injectors.
func NewDynamicInjectorRepository(coll *mongo.Collection) *DynamicInjectorRepository {
	return &DynamicInjectorRepository{coll: coll}
}

// FindByCampus retrieves non-removed injector docs for system and optionally a specific campus.
func (r *DynamicInjectorRepository) FindByCampus(ctx context.Context, campusID string) ([]entities.DynamicInjectorDoc, error) {
	var filter bson.M

	if campusID == "" {
		filter = bson.M{
			"removed": false,
			"system":  true,
		}
	} else {
		filter = bson.M{
			"removed": false,
			"$or": []bson.M{
				{"system": true},
				{"campusId": campusID},
			},
		}
	}

	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("find dynamic injectors: %w", err)
	}
	defer cursor.Close(ctx)

	var results []entities.DynamicInjectorDoc
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("decode dynamic injectors: %w", err)
	}

	return results, nil
}

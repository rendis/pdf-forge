package entities

import "go.mongodb.org/mongo-driver/bson/primitive"

// SurveyDoc represents a projected document from the surveys collection.
type SurveyDoc struct {
	ID           primitive.ObjectID `bson:"_id"`
	TemplateType string             `bson:"templateType"`
	Answers      map[string][]any   `bson:"answers"`
}

package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DynamicInjector represents an individual injector extracted from survey templates.
type DynamicInjector struct {
	Code        string            `bson:"code"`
	Label       map[string]string `bson:"label"`
	Description map[string]string `bson:"description,omitempty"`
	DataType    string            `bson:"dataType"`
	Group       string            `bson:"group"`
}

// InjectorGroup holds group metadata stored in the document.
type InjectorGroup struct {
	Key  string            `bson:"key"`
	Name map[string]string `bson:"name"`
}

// DynamicInjectorDoc is the document stored in pdf_forge_dynamic_injectors collection.
type DynamicInjectorDoc struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	System    bool               `bson:"system"`
	CampusID  *string            `bson:"campusId"`
	Operation string             `bson:"operation"`
	Groups    []InjectorGroup    `bson:"groups"`
	Injectors []DynamicInjector  `bson:"injectors"`
	Removed   bool               `bson:"removed"`
	SyncedAt  time.Time          `bson:"syncedAt"`
}

// IsSystem returns true if this is a system-level document.
func (d *DynamicInjectorDoc) IsSystem() bool {
	return d.System
}

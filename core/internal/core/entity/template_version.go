package entity

import (
	"encoding/json"
	"time"
)

// TemplateVersion represents a specific version of a template with content and lifecycle management.
type TemplateVersion struct {
	ID                 string          `json:"id"`
	TemplateID         string          `json:"templateId"`
	VersionNumber      int             `json:"versionNumber"`
	Name               string          `json:"name"`
	Description        *string         `json:"description,omitempty"`
	ContentStructure   json.RawMessage `json:"contentStructure,omitempty"`
	Status             VersionStatus   `json:"status"`
	ScheduledPublishAt *time.Time      `json:"scheduledPublishAt,omitempty"`
	ScheduledArchiveAt *time.Time      `json:"scheduledArchiveAt,omitempty"`
	PublishedAt        *time.Time      `json:"publishedAt,omitempty"`
	ArchivedAt         *time.Time      `json:"archivedAt,omitempty"`
	PublishedBy        *string         `json:"publishedBy,omitempty"`
	ArchivedBy         *string         `json:"archivedBy,omitempty"`
	CreatedBy          *string         `json:"createdBy,omitempty"`
	CreatedAt          time.Time       `json:"createdAt"`
	UpdatedAt          *time.Time      `json:"updatedAt,omitempty"`
}

// NewTemplateVersion creates a new template version with DRAFT status.
func NewTemplateVersion(templateID string, versionNumber int, name string, createdBy *string) *TemplateVersion {
	return &TemplateVersion{
		TemplateID:    templateID,
		VersionNumber: versionNumber,
		Name:          name,
		Status:        VersionStatusDraft,
		CreatedBy:     createdBy,
		CreatedAt:     time.Now().UTC(),
	}
}

// IsDraft returns true if the version is in draft status.
func (tv *TemplateVersion) IsDraft() bool {
	return tv.Status == VersionStatusDraft
}

// IsScheduled returns true if the version is scheduled for publication.
func (tv *TemplateVersion) IsScheduled() bool {
	return tv.Status == VersionStatusScheduled
}

// IsPublished returns true if the version is currently published.
func (tv *TemplateVersion) IsPublished() bool {
	return tv.Status == VersionStatusPublished
}

// IsArchived returns true if the version has been archived.
func (tv *TemplateVersion) IsArchived() bool {
	return tv.Status == VersionStatusArchived
}

// CanEdit returns an error if the version cannot be edited.
func (tv *TemplateVersion) CanEdit() error {
	if tv.IsPublished() {
		return ErrCannotEditPublished
	}
	if tv.IsArchived() {
		return ErrCannotEditArchived
	}
	if tv.IsScheduled() {
		return ErrCannotEditScheduled
	}
	return nil
}

// CanPublish returns an error if the version cannot be published.
func (tv *TemplateVersion) CanPublish() error {
	if tv.IsPublished() {
		return ErrVersionAlreadyPublished
	}
	if tv.IsArchived() {
		return ErrCannotEditArchived
	}
	return nil
}

// CanSchedulePublish returns an error if the version cannot be scheduled for publication.
func (tv *TemplateVersion) CanSchedulePublish(publishAt time.Time) error {
	if err := tv.CanPublish(); err != nil {
		return err
	}
	if publishAt.Before(time.Now().UTC()) {
		return ErrScheduledTimeInPast
	}
	return nil
}

// CanArchive returns an error if the version cannot be archived.
func (tv *TemplateVersion) CanArchive() error {
	if !tv.IsPublished() {
		return ErrVersionNotPublished
	}
	return nil
}

// Publish changes the version status to PUBLISHED.
func (tv *TemplateVersion) Publish(userID string) {
	now := time.Now().UTC()
	tv.Status = VersionStatusPublished
	tv.PublishedAt = &now
	tv.PublishedBy = &userID
	tv.ScheduledPublishAt = nil
	tv.UpdatedAt = &now
}

// Archive changes the version status to ARCHIVED.
func (tv *TemplateVersion) Archive(userID string) {
	now := time.Now().UTC()
	tv.Status = VersionStatusArchived
	tv.ArchivedAt = &now
	tv.ArchivedBy = &userID
	tv.ScheduledArchiveAt = nil
	tv.UpdatedAt = &now
}

// SchedulePublish sets the scheduled publication time.
func (tv *TemplateVersion) SchedulePublish(publishAt time.Time) error {
	if err := tv.CanSchedulePublish(publishAt); err != nil {
		return err
	}
	tv.Status = VersionStatusScheduled
	tv.ScheduledPublishAt = &publishAt
	now := time.Now().UTC()
	tv.UpdatedAt = &now
	return nil
}

// ScheduleArchive sets the scheduled archive time (only for PUBLISHED versions).
func (tv *TemplateVersion) ScheduleArchive(archiveAt time.Time) error {
	if !tv.IsPublished() {
		return ErrVersionNotPublished
	}
	if archiveAt.Before(time.Now().UTC()) {
		return ErrScheduledTimeInPast
	}
	tv.ScheduledArchiveAt = &archiveAt
	now := time.Now().UTC()
	tv.UpdatedAt = &now
	return nil
}

// CancelSchedule removes any scheduled publication or archive.
func (tv *TemplateVersion) CancelSchedule() error {
	if tv.IsScheduled() {
		tv.Status = VersionStatusDraft
		tv.ScheduledPublishAt = nil
	}
	tv.ScheduledArchiveAt = nil
	now := time.Now().UTC()
	tv.UpdatedAt = &now
	return nil
}

// Validate checks if the template version data is valid.
func (tv *TemplateVersion) Validate() error {
	if tv.TemplateID == "" {
		return ErrRequiredField
	}
	if tv.Name == "" {
		return ErrRequiredField
	}
	if len(tv.Name) > 100 {
		return ErrFieldTooLong
	}
	if tv.VersionNumber < 1 {
		return ErrInvalidVersionNumber
	}
	if !tv.Status.IsValid() {
		return ErrInvalidVersionStatus
	}
	return nil
}

// TemplateVersionWithDetails represents a template version with all its related data.
type TemplateVersionWithDetails struct {
	TemplateVersion
	Injectables []*VersionInjectableWithDefinition `json:"injectables,omitempty"`
}

// TemplateWithDetails represents a template with its published version and metadata.
type TemplateWithDetails struct {
	Template
	PublishedVersion *TemplateVersionWithDetails `json:"publishedVersion,omitempty"`
	Tags             []*Tag                      `json:"tags,omitempty"`
	Folder           *Folder                     `json:"folder,omitempty"`
}

// TemplateWithAllVersions represents a template with all its versions.
type TemplateWithAllVersions struct {
	Template
	Versions     []*TemplateVersionWithDetails `json:"versions,omitempty"`
	Tags         []*Tag                        `json:"tags,omitempty"`
	Folder       *Folder                       `json:"folder,omitempty"`
	DocumentType *DocumentType                 `json:"documentType,omitempty"`
}

// TemplateVersionListItem represents a template version in list views (without full content).
type TemplateVersionListItem struct {
	ID                 string        `json:"id"`
	TemplateID         string        `json:"templateId"`
	VersionNumber      int           `json:"versionNumber"`
	Name               string        `json:"name"`
	Description        *string       `json:"description,omitempty"`
	Status             VersionStatus `json:"status"`
	ScheduledPublishAt *time.Time    `json:"scheduledPublishAt,omitempty"`
	ScheduledArchiveAt *time.Time    `json:"scheduledArchiveAt,omitempty"`
	PublishedAt        *time.Time    `json:"publishedAt,omitempty"`
	CreatedAt          time.Time     `json:"createdAt"`
	UpdatedAt          *time.Time    `json:"updatedAt,omitempty"`
}

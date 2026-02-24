package entity

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVersionStatus_StagingIsValid(t *testing.T) {
	assert.True(t, VersionStatusStaging.IsValid())
}

func TestVersionStatus_StagingTransitions(t *testing.T) {
	tests := []struct {
		from    VersionStatus
		to      VersionStatus
		allowed bool
	}{
		// DRAFT → STAGING: allowed
		{VersionStatusDraft, VersionStatusStaging, true},
		// STAGING → DRAFT: allowed (unstage)
		{VersionStatusStaging, VersionStatusDraft, true},
		// STAGING → PUBLISHED: allowed (promote)
		{VersionStatusStaging, VersionStatusPublished, true},
		// STAGING → ARCHIVED: not allowed (must publish first)
		{VersionStatusStaging, VersionStatusArchived, false},
		// STAGING → SCHEDULED: not allowed
		{VersionStatusStaging, VersionStatusScheduled, false},
		// STAGING → STAGING: not allowed (already staging)
		{VersionStatusStaging, VersionStatusStaging, false},
		// PUBLISHED → STAGING: not allowed
		{VersionStatusPublished, VersionStatusStaging, false},
		// ARCHIVED → STAGING: not allowed
		{VersionStatusArchived, VersionStatusStaging, false},
		// SCHEDULED → STAGING: not allowed
		{VersionStatusScheduled, VersionStatusStaging, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.from)+"->"+string(tt.to), func(t *testing.T) {
			assert.Equal(t, tt.allowed, tt.from.CanTransitionTo(tt.to))
		})
	}
}

func TestTemplateVersion_CanStage_OnlyFromDraft(t *testing.T) {
	statuses := []struct {
		status VersionStatus
		canErr bool
	}{
		{VersionStatusDraft, false},
		{VersionStatusStaging, true},
		{VersionStatusScheduled, true},
		{VersionStatusPublished, true},
		{VersionStatusArchived, true},
	}

	for _, tt := range statuses {
		t.Run(string(tt.status), func(t *testing.T) {
			v := &TemplateVersion{Status: tt.status}
			err := v.CanStage()
			if tt.canErr {
				require.ErrorIs(t, err, ErrCannotStage)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestTemplateVersion_Stage(t *testing.T) {
	v := &TemplateVersion{Status: VersionStatusDraft}
	v.Stage()
	assert.Equal(t, VersionStatusStaging, v.Status)
	assert.NotNil(t, v.UpdatedAt)
}

func TestTemplateVersion_Unstage(t *testing.T) {
	v := &TemplateVersion{Status: VersionStatusStaging}
	v.Unstage()
	assert.Equal(t, VersionStatusDraft, v.Status)
	assert.NotNil(t, v.UpdatedAt)
}

func TestTemplateVersion_IsStaging(t *testing.T) {
	assert.True(t, (&TemplateVersion{Status: VersionStatusStaging}).IsStaging())
	assert.False(t, (&TemplateVersion{Status: VersionStatusDraft}).IsStaging())
	assert.False(t, (&TemplateVersion{Status: VersionStatusPublished}).IsStaging())
}

func TestTemplateVersion_StagingIsEditable(t *testing.T) {
	v := &TemplateVersion{Status: VersionStatusStaging}
	assert.NoError(t, v.CanEdit(), "STAGING versions should be editable")
}

func TestTemplateVersion_CanPublishFromStaging(t *testing.T) {
	v := &TemplateVersion{Status: VersionStatusStaging}
	assert.NoError(t, v.CanPublish(), "STAGING versions should be publishable")
}

func TestTemplateVersion_CannotArchiveFromStaging(t *testing.T) {
	v := &TemplateVersion{Status: VersionStatusStaging}
	assert.ErrorIs(t, v.CanArchive(), ErrVersionNotPublished)
}

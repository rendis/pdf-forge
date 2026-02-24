package entity

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEnvironment_IsDev(t *testing.T) {
	assert.True(t, EnvironmentDev.IsDev())
	assert.False(t, EnvironmentProd.IsDev())
	assert.False(t, Environment("").IsDev())
}

func TestEnvironment_IsProd(t *testing.T) {
	assert.True(t, EnvironmentProd.IsProd())
	assert.False(t, EnvironmentDev.IsProd())
	assert.False(t, Environment("").IsProd())
}

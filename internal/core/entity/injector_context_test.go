package entity

import "testing"

func TestHeader_CaseInsensitive(t *testing.T) {
	headers := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer token123",
		"X-Custom-Key":  "custom-value",
	}

	ctx := NewInjectorContext("ext-1", "tpl-1", "tx-1", "render", headers, nil)

	tests := []struct {
		key  string
		want string
	}{
		{"Content-Type", "application/json"},
		{"content-type", "application/json"},
		{"CONTENT-TYPE", "application/json"},
		{"CoNtEnT-TyPe", "application/json"},
		{"authorization", "Bearer token123"},
		{"AUTHORIZATION", "Bearer token123"},
		{"x-custom-key", "custom-value"},
		{"X-CUSTOM-KEY", "custom-value"},
		{"nonexistent", ""},
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			got := ctx.Header(tt.key)
			if got != tt.want {
				t.Errorf("Header(%q) = %q, want %q", tt.key, got, tt.want)
			}
		})
	}
}

func TestHeader_NilHeaders(t *testing.T) {
	ctx := NewInjectorContext("ext-1", "tpl-1", "tx-1", "render", nil, nil)
	if got := ctx.Header("any-key"); got != "" {
		t.Errorf("Header on nil headers = %q, want empty", got)
	}
}

func TestGetHeaders_ReturnsNormalizedKeys(t *testing.T) {
	headers := map[string]string{
		"Content-Type": "application/json",
		"X-API-KEY":    "secret",
	}

	ctx := NewInjectorContext("ext-1", "tpl-1", "tx-1", "render", headers, nil)
	got := ctx.GetHeaders()

	// Keys should be normalized to lowercase
	if _, ok := got["content-type"]; !ok {
		t.Error("expected lowercase key 'content-type'")
	}
	if _, ok := got["x-api-key"]; !ok {
		t.Error("expected lowercase key 'x-api-key'")
	}
}

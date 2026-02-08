package logging

import (
	"context"
	"log/slog"
)

type ctxKey string

// LogAttrsKey is the context key for storing log attributes.
const LogAttrsKey ctxKey = "log_attrs"

// ContextHandler is a slog.Handler that extracts attributes from context.
type ContextHandler struct {
	slog.Handler
}

// NewContextHandler creates a new ContextHandler wrapping the given handler.
func NewContextHandler(h slog.Handler) *ContextHandler {
	return &ContextHandler{Handler: h}
}

// Handle extracts attributes from context and adds them to the log record.
func (h *ContextHandler) Handle(ctx context.Context, r slog.Record) error {
	if attrs, ok := ctx.Value(LogAttrsKey).([]slog.Attr); ok {
		r.AddAttrs(attrs...)
	}
	return h.Handler.Handle(ctx, r)
}

// WithAttrs adds attributes to the context for automatic inclusion in logs.
func WithAttrs(ctx context.Context, attrs ...slog.Attr) context.Context {
	existing, _ := ctx.Value(LogAttrsKey).([]slog.Attr)
	return context.WithValue(ctx, LogAttrsKey, append(existing, attrs...))
}

// WithGroup returns a new ContextHandler with the given group.
func (h *ContextHandler) WithGroup(name string) slog.Handler {
	return &ContextHandler{Handler: h.Handler.WithGroup(name)}
}

// WithAttrsHandler returns a new ContextHandler with the given attributes.
func (h *ContextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &ContextHandler{Handler: h.Handler.WithAttrs(attrs)}
}

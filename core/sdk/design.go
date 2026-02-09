package sdk

import "github.com/rendis/pdf-forge/internal/core/service/rendering/pdfrenderer"

// TypstDesignTokens holds all configurable design values for Typst PDF output.
// Customize via engine.SetDesignTokens().
type TypstDesignTokens = pdfrenderer.TypstDesignTokens

// DefaultDesignTokens returns the built-in design tokens.
var DefaultDesignTokens = pdfrenderer.DefaultDesignTokens

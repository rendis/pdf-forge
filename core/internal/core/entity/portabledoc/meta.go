package portabledoc

// Meta contains document metadata.
type Meta struct {
	Title        string            `json:"title"`
	Description  *string           `json:"description,omitempty"`
	Language     string            `json:"language"` // "en" | "es"
	CustomFields map[string]string `json:"customFields,omitempty"`
}

// PageConfig contains page configuration.
type PageConfig struct {
	FormatID        string  `json:"formatId"` // "A4" | "LETTER" | "LEGAL" | "CUSTOM"
	Width           float64 `json:"width"`
	Height          float64 `json:"height"`
	Margins         Margins `json:"margins"`
	ShowPageNumbers bool    `json:"showPageNumbers"`
	PageGap         float64 `json:"pageGap"`
}

// Margins defines page margins in pixels.
type Margins struct {
	Top    float64 `json:"top"`
	Bottom float64 `json:"bottom"`
	Left   float64 `json:"left"`
	Right  float64 `json:"right"`
}

// Language constants.
const (
	LanguageEnglish = "en"
	LanguageSpanish = "es"
)

// ValidLanguages contains allowed language codes.
var ValidLanguages = Set[string]{
	LanguageEnglish: {},
	LanguageSpanish: {},
}

// Page format constants.
const (
	PageFormatA4     = "A4"
	PageFormatLetter = "LETTER"
	PageFormatLegal  = "LEGAL"
	PageFormatCustom = "CUSTOM"
)

// ValidPageFormats contains allowed page format IDs.
var ValidPageFormats = Set[string]{
	PageFormatA4:     {},
	PageFormatLetter: {},
	PageFormatLegal:  {},
	PageFormatCustom: {},
}

// Line spacing constants.
const (
	LineSpacingTight   = "tight"
	LineSpacingCompact = "compact"
	LineSpacingNormal  = "normal"
	LineSpacingRelaxed = "relaxed"
	LineSpacingLoose   = "loose"
)

// ValidLineSpacings contains allowed line spacing presets.
var ValidLineSpacings = Set[string]{
	LineSpacingTight:   {},
	LineSpacingCompact: {},
	LineSpacingNormal:  {},
	LineSpacingRelaxed: {},
	LineSpacingLoose:   {},
}

// NormalizeLineSpacing returns the default preset when empty or invalid.
func NormalizeLineSpacing(value string) string {
	if _, ok := ValidLineSpacings[value]; ok {
		return value
	}
	return LineSpacingNormal
}

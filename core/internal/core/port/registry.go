package port

// GroupConfig represents a resolved group with localized name.
type GroupConfig struct {
	Key   string
	Name  string
	Icon  string
	Order int
}

// InjectorRegistry gestiona el registro de inyectores.
type InjectorRegistry interface {
	// Register registra un inyector en el registry.
	Register(injector Injector) error

	// Get obtiene un inyector por su code.
	Get(code string) (Injector, bool)

	// GetAll retorna todos los inyectores registrados.
	GetAll() []Injector

	// Codes retorna todos los codes de inyectores registrados.
	Codes() []string

	// GetName retorna el nombre traducido del inyector.
	// Si no existe traducción, retorna el code.
	GetName(code, locale string) string

	// GetDescription retorna la descripción traducida del inyector.
	// Si no existe traducción, retorna cadena vacía.
	GetDescription(code, locale string) string

	// GetAllNames retorna todas las traducciones del nombre para un code.
	GetAllNames(code string) map[string]string

	// GetAllDescriptions retorna todas las traducciones de la descripción para un code.
	GetAllDescriptions(code string) map[string]string

	// GetGroup retorna el grupo al que pertenece un inyector.
	// Retorna nil si el inyector no tiene grupo asignado.
	GetGroup(code string) *string

	// GetGroups retorna todos los grupos traducidos al locale especificado.
	GetGroups(locale string) []GroupConfig

	// SetInitFunc registra la función de inicialización GLOBAL.
	// Se ejecuta UNA vez antes de todos los inyectores.
	SetInitFunc(fn InitFunc)

	// GetInitFunc retorna la función de inicialización registrada.
	GetInitFunc() InitFunc
}

// MapperRegistry manages a single request mapper.
// Only ONE mapper is allowed; if multiple document types are needed,
// the user handles routing internally in their mapper implementation.
type MapperRegistry interface {
	// Set registers the request mapper.
	// Returns error if mapper is nil or already set.
	Set(mapper RequestMapper) error

	// Get returns the registered mapper.
	// Returns false if no mapper is registered.
	Get() (RequestMapper, bool)
}

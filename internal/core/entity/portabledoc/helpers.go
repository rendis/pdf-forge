package portabledoc

// Set is a generic set implementation using map with empty struct values.
type Set[T comparable] map[T]struct{}

// NewSet creates a new set from a slice.
func NewSet[T comparable](items []T) Set[T] {
	s := make(Set[T], len(items))
	for _, item := range items {
		s[item] = struct{}{}
	}
	return s
}

// Contains checks if item exists in set.
func (s Set[T]) Contains(item T) bool {
	_, ok := s[item]
	return ok
}

// Add adds an item to the set.
func (s Set[T]) Add(item T) {
	s[item] = struct{}{}
}

// Remove removes an item from the set.
func (s Set[T]) Remove(item T) {
	delete(s, item)
}

// ToSlice converts set to slice.
func (s Set[T]) ToSlice() []T {
	result := make([]T, 0, len(s))
	for k := range s {
		result = append(result, k)
	}
	return result
}

// Len returns the number of items in the set.
func (s Set[T]) Len() int {
	return len(s)
}

// Clone creates a copy of the set.
func (s Set[T]) Clone() Set[T] {
	clone := make(Set[T], len(s))
	for k := range s {
		clone[k] = struct{}{}
	}
	return clone
}

// Union returns a new set containing all items from both sets.
func (s Set[T]) Union(other Set[T]) Set[T] {
	result := s.Clone()
	for k := range other {
		result[k] = struct{}{}
	}
	return result
}

// Intersection returns a new set containing items present in both sets.
func (s Set[T]) Intersection(other Set[T]) Set[T] {
	result := make(Set[T])
	for k := range s {
		if other.Contains(k) {
			result[k] = struct{}{}
		}
	}
	return result
}

// Difference returns a new set containing items in s but not in other.
func (s Set[T]) Difference(other Set[T]) Set[T] {
	result := make(Set[T])
	for k := range s {
		if !other.Contains(k) {
			result[k] = struct{}{}
		}
	}
	return result
}

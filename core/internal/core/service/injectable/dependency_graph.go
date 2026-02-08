package injectable

import (
	"fmt"
	"maps"
	"strings"
)

// DependencyGraph is a directed acyclic graph (DAG) that manages dependencies
// between injectors for determining execution order.
//
// Purpose:
// When resolving injectable values, injectors may depend on the results of
// other injectors. The DependencyGraph ensures injectors are executed in the
// correct order by performing topological sorting.
//
// How it works:
//  1. Each injector is a node in the graph
//  2. An edge from A to B means "A depends on B" (B must execute before A)
//  3. TopologicalSort groups nodes into levels where:
//     - Level 0: nodes with no dependencies (can run in parallel)
//     - Level 1: nodes depending only on level 0 (can run in parallel)
//     - And so on...
//
// Example:
//
//	Injectors: client_name, calculated_price (depends on base_price), base_price
//
//	Graph:
//	  calculated_price -> base_price
//	  client_name (no dependencies)
//	  base_price (no dependencies)
//
//	Levels after TopologicalSort:
//	  Level 0: [client_name, base_price] - run in parallel
//	  Level 1: [calculated_price] - runs after level 0
//
// Cycle Detection:
// If a dependency cycle is detected (A -> B -> C -> A), TopologicalSort
// returns an error with the cycle path for debugging.
type DependencyGraph struct {
	nodes    map[string]bool
	edges    map[string][]string // node -> dependencies
	inDegree map[string]int
}

// NewDependencyGraph creates a new dependency graph.
func NewDependencyGraph() *DependencyGraph {
	return &DependencyGraph{
		nodes:    make(map[string]bool),
		edges:    make(map[string][]string),
		inDegree: make(map[string]int),
	}
}

// AddNode adds a node to the graph.
func (g *DependencyGraph) AddNode(code string) {
	if !g.nodes[code] {
		g.nodes[code] = true
		g.inDegree[code] = 0
	}
}

// AddEdge adds a dependency: 'from' depends on 'to'.
// This means 'to' must execute before 'from'.
func (g *DependencyGraph) AddEdge(from, to string) {
	g.AddNode(from)
	g.AddNode(to)

	g.edges[from] = append(g.edges[from], to)
	g.inDegree[to]++
}

// TopologicalSort returns the nodes ordered by dependency levels.
// Each level contains nodes that can be executed in parallel.
// Returns an error if cycles are detected.
func (g *DependencyGraph) TopologicalSort() ([][]string, error) {
	if len(g.nodes) == 0 {
		return nil, nil
	}

	// Copy inDegree to avoid modifying the original
	inDegree := make(map[string]int, len(g.inDegree))
	maps.Copy(inDegree, g.inDegree)

	var levels [][]string
	processed := 0

	for processed < len(g.nodes) {
		// Find nodes with inDegree 0
		var currentLevel []string
		for node := range g.nodes {
			if inDegree[node] == 0 {
				currentLevel = append(currentLevel, node)
			}
		}

		if len(currentLevel) == 0 {
			// Cycle detected - find the involved nodes
			cycle := g.findCycle()
			return nil, fmt.Errorf("dependency cycle detected: %s", strings.Join(cycle, " -> "))
		}

		// Mark as processed
		for _, node := range currentLevel {
			delete(g.nodes, node)
			processed++

			// Decrement inDegree of dependent nodes
			for _, dep := range g.edges[node] {
				inDegree[dep]--
			}
		}

		levels = append(levels, currentLevel)
	}

	// Reverse the levels because we built them backwards
	// (we first find those without dependencies,
	// but those must be executed first)
	reversed := make([][]string, len(levels))
	for i, level := range levels {
		reversed[len(levels)-1-i] = level
	}

	return reversed, nil
}

// buildCyclePath constructs the cycle path from cycleStart to currentNode using the parent map.
// Returns the path with cycleStart at both start and end (representing the cycle).
func buildCyclePath(currentNode, cycleStart string, parent map[string]string) []string {
	path := []string{cycleStart}
	for curr := currentNode; curr != cycleStart; curr = parent[curr] {
		path = append(path, curr)
	}
	path = append(path, cycleStart)

	// Reverse the path
	for i, j := 0, len(path)-1; i < j; i, j = i+1, j-1 {
		path[i], path[j] = path[j], path[i]
	}

	return path
}

// findCycle searches for a cycle in the graph using DFS.
func (g *DependencyGraph) findCycle() []string {
	visited := make(map[string]bool)
	recStack := make(map[string]bool)
	parent := make(map[string]string)

	var cyclePath []string

	var dfs func(node string) bool
	dfs = func(node string) bool {
		visited[node] = true
		recStack[node] = true

		for _, dep := range g.edges[node] {
			if !visited[dep] {
				parent[dep] = node
				if dfs(dep) {
					return true
				}
			} else if recStack[dep] {
				cyclePath = buildCyclePath(node, dep, parent)
				return true
			}
		}

		recStack[node] = false
		return false
	}

	for node := range g.nodes {
		if !visited[node] && dfs(node) {
			return cyclePath
		}
	}

	return nil
}

// BuildFromInjectors builds the dependency graph from injectors.
// Only includes injectors whose codes are in referencedCodes.
func (g *DependencyGraph) BuildFromInjectors(
	getInjector func(code string) (dependencies []string, exists bool),
	referencedCodes []string,
) error {
	// Set of referenced codes for fast lookup
	referenced := make(map[string]bool)
	for _, code := range referencedCodes {
		referenced[code] = true
	}

	// Add nodes for the referenced injectors
	for _, code := range referencedCodes {
		deps, exists := getInjector(code)
		if !exists {
			continue // Injector not registered, skip
		}

		g.AddNode(code)

		// Add dependencies only if they are also referenced
		for _, dep := range deps {
			if referenced[dep] {
				g.AddEdge(code, dep)
			}
		}
	}

	return nil
}

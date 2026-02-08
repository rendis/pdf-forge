package portabledoc

import "iter"

// AllNodes returns an iterator over all nodes in the document using BFS traversal.
func (d *Document) AllNodes() iter.Seq[Node] {
	return func(yield func(Node) bool) {
		if d.Content == nil || len(d.Content.Content) == 0 {
			return
		}

		queue := make([]Node, 0, len(d.Content.Content))
		queue = append(queue, d.Content.Content...)

		for len(queue) > 0 {
			node := queue[0]
			queue = queue[1:]

			if !yield(node) {
				return
			}

			if len(node.Content) > 0 {
				queue = append(queue, node.Content...)
			}
		}
	}
}

// NodesOfType returns an iterator over nodes of a specific type with their index.
func (d *Document) NodesOfType(nodeType string) iter.Seq2[int, Node] {
	return func(yield func(int, Node) bool) {
		i := 0
		for node := range d.AllNodes() {
			if node.Type == nodeType {
				if !yield(i, node) {
					return
				}
				i++
			}
		}
	}
}

// CollectNodesOfType collects all nodes of a specific type into a slice.
func (d *Document) CollectNodesOfType(nodeType string) []Node {
	nodes := make([]Node, 0, 8) // Pre-allocate small capacity; unknown final size
	for _, node := range d.NodesOfType(nodeType) {
		nodes = append(nodes, node)
	}
	return nodes
}

// CountNodesOfType counts nodes of a specific type.
func (d *Document) CountNodesOfType(nodeType string) int {
	count := 0
	for range d.NodesOfType(nodeType) {
		count++
	}
	return count
}

// HasNodeOfType checks if document has at least one node of the specified type.
func (d *Document) HasNodeOfType(nodeType string) bool {
	for range d.NodesOfType(nodeType) {
		return true
	}
	return false
}

// AllNodesRecursive returns an iterator over all nodes using DFS traversal.
func (d *Document) AllNodesRecursive() iter.Seq[Node] {
	return func(yield func(Node) bool) {
		if d.Content == nil {
			return
		}

		var traverse func(nodes []Node) bool
		traverse = func(nodes []Node) bool {
			for _, node := range nodes {
				if !yield(node) {
					return false
				}
				if len(node.Content) > 0 {
					if !traverse(node.Content) {
						return false
					}
				}
			}
			return true
		}

		traverse(d.Content.Content)
	}
}

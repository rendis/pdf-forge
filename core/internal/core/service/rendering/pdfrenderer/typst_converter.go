package pdfrenderer

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/entity/portabledoc"
)

// TypstConverter converts ProseMirror/TipTap nodes to Typst markup.
type TypstConverter struct {
	injectables              map[string]any
	injectableDefaults       map[string]string
	tokens                   TypstDesignTokens
	contentWidthPx           float64 // page content area width in pixels (for table column calculations)
	currentPage              int
	currentTableHeaderStyles *entity.TableStyles
	currentTableBodyStyles   *entity.TableStyles
	remoteImages             map[string]string // URL → local filename
	imageCounter             int
	listDepth                int // tracks nesting depth for user-built lists
}

// NewTypstConverter creates a new Typst node converter.
func NewTypstConverter(
	injectables map[string]any,
	injectableDefaults map[string]string,
	tokens TypstDesignTokens,
) *TypstConverter {
	return &TypstConverter{
		injectables:        injectables,
		injectableDefaults: injectableDefaults,
		tokens:             tokens,
		currentPage:        1,
		remoteImages:       make(map[string]string),
	}
}

// GetCurrentPage returns the current page number.
func (c *TypstConverter) GetCurrentPage() int {
	return c.currentPage
}

// RemoteImages returns the map of remote image URLs to local filenames.
func (c *TypstConverter) RemoteImages() map[string]string {
	return c.remoteImages
}

// registerRemoteImage registers a remote URL or data URL and returns a local filename.
func (c *TypstConverter) registerRemoteImage(url string) string {
	if existing, ok := c.remoteImages[url]; ok {
		return existing
	}
	c.imageCounter++
	ext := detectExtFromURL(url)
	filename := fmt.Sprintf("img_%d%s", c.imageCounter, ext)
	c.remoteImages[url] = filename
	return filename
}

// ConvertNodes converts a slice of nodes to Typst markup.
// It uses look-ahead to group inline images with their following paragraphs
// for text wrapping via the wrap-it package.
func (c *TypstConverter) ConvertNodes(nodes []portabledoc.Node) string {
	var sb strings.Builder
	for i := 0; i < len(nodes); i++ {
		node := nodes[i]
		if c.isInlineImage(node) {
			// Collect consecutive paragraphs after the inline image as wrap body
			var body []portabledoc.Node
			for j := i + 1; j < len(nodes) && nodes[j].Type == portabledoc.NodeTypeParagraph; j++ {
				body = append(body, nodes[j])
			}
			if len(body) > 0 {
				sb.WriteString(c.wrapImage(node, body))
				i += len(body) // skip consumed paragraphs
			} else {
				sb.WriteString(c.image(node)) // no body, fallback to block
			}
		} else {
			sb.WriteString(c.ConvertNode(node))
		}
	}
	return sb.String()
}

// ConvertNode converts a single node to Typst markup.
func (c *TypstConverter) ConvertNode(node portabledoc.Node) string {
	if handler := c.getNodeHandler(node.Type); handler != nil {
		return handler(node)
	}
	return c.handleUnknownNode(node)
}

type typstNodeHandler func(node portabledoc.Node) string

func (c *TypstConverter) getNodeHandler(nodeType string) typstNodeHandler {
	handlers := map[string]typstNodeHandler{
		portabledoc.NodeTypeParagraph:     c.paragraph,
		portabledoc.NodeTypeHeading:       c.heading,
		portabledoc.NodeTypeBlockquote:    c.blockquote,
		portabledoc.NodeTypeCodeBlock:     c.codeBlock,
		portabledoc.NodeTypeHR:            c.horizontalRule,
		portabledoc.NodeTypeBulletList:    c.bulletList,
		portabledoc.NodeTypeOrderedList:   c.orderedList,
		portabledoc.NodeTypeTaskList:      c.taskList,
		portabledoc.NodeTypeListItem:      c.listItem,
		portabledoc.NodeTypeTaskItem:      c.taskItem,
		portabledoc.NodeTypeInjector:      c.injector,
		portabledoc.NodeTypeConditional:   c.conditional,
		portabledoc.NodeTypePageBreak:     c.pageBreak,
		portabledoc.NodeTypeImage:         c.image,
		portabledoc.NodeTypeCustomImage:   c.image,
		portabledoc.NodeTypeText:          c.text,
		portabledoc.NodeTypeListInjector:  c.listInjector,
		portabledoc.NodeTypeTableInjector: c.tableInjector,
		portabledoc.NodeTypeTable:         c.table,
		portabledoc.NodeTypeTableRow:      c.tableRow,
		portabledoc.NodeTypeTableCell:     c.tableCellData,
		portabledoc.NodeTypeTableHeader:   c.tableCellHeader,
		portabledoc.NodeTypeHardBreak:     c.hardBreak,
	}
	return handlers[nodeType]
}

func (c *TypstConverter) handleUnknownNode(node portabledoc.Node) string {
	if len(node.Content) > 0 {
		return c.ConvertNodes(node.Content)
	}
	return ""
}

// --- Content Nodes ---

func (c *TypstConverter) paragraph(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	if content == "" {
		return "#v(1.5em)\n" // Match typst_builder.go paragraph spacing
	}
	if align, ok := node.Attrs["textAlign"].(string); ok {
		if align == "justify" {
			return fmt.Sprintf("#par(justify: true)[%s]\n\n", content)
		}
		if typstAlign := toTypstAlign(align); typstAlign != "" {
			return fmt.Sprintf("#align(%s)[%s]\n\n", typstAlign, content)
		}
	}
	return content + "\n\n"
}

func (c *TypstConverter) heading(node portabledoc.Node) string {
	level := c.parseHeadingLevel(node.Attrs)
	content := c.ConvertNodes(node.Content)
	prefix := strings.Repeat("=", level)
	heading := fmt.Sprintf("%s %s\n", prefix, content)
	if align, ok := node.Attrs["textAlign"].(string); ok {
		if align == "justify" {
			return fmt.Sprintf("#par(justify: true)[%s]\n", strings.TrimSuffix(heading, "\n"))
		}
		if typstAlign := toTypstAlign(align); typstAlign != "" {
			return fmt.Sprintf("#align(%s)[%s]\n", typstAlign, strings.TrimSuffix(heading, "\n"))
		}
	}
	return heading
}

func (c *TypstConverter) parseHeadingLevel(attrs map[string]any) int {
	level := 1
	if l, ok := attrs["level"].(float64); ok {
		level = int(l)
	}
	return clamp(level, 1, 6)
}

func (c *TypstConverter) blockquote(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("#block(width: 100%%, inset: (left: 1em, top: 0.5em, bottom: 0.5em, right: 1em), stroke: (left: 2pt + %s), fill: rgb(\"%s\"), above: 0.75em, below: 0.75em)[#emph[%s]]\n", c.tokens.BlockquoteStrokeColor, c.tokens.BlockquoteFill, content)
}

func (c *TypstConverter) codeBlock(node portabledoc.Node) string {
	language, _ := node.Attrs["language"].(string)
	content := c.ConvertNodes(node.Content)

	if language != "" {
		return fmt.Sprintf("```%s\n%s\n```\n", language, content)
	}
	return fmt.Sprintf("```\n%s\n```\n", content)
}

func (c *TypstConverter) horizontalRule(_ portabledoc.Node) string {
	return fmt.Sprintf("#line(length: 100%%, stroke: 0.5pt + %s)\n", c.tokens.HRStrokeColor)
}

// --- List Nodes ---

func (c *TypstConverter) bulletList(node portabledoc.Node) string {
	var sb strings.Builder
	for _, child := range node.Content {
		c.renderUserListItem(&sb, child, "- ")
	}
	if c.listDepth == 0 {
		sb.WriteString("\n")
	}
	return sb.String()
}

func (c *TypstConverter) orderedList(node portabledoc.Node) string {
	start := 1
	if s, ok := node.Attrs["start"].(float64); ok {
		start = int(s)
	}

	var sb strings.Builder
	needsBlock := start != 1 && c.listDepth == 0
	if needsBlock {
		sb.WriteString("#block[\n")
	}
	if start != 1 {
		fmt.Fprintf(&sb, "#set enum(start: %d)\n", start)
	}
	for _, child := range node.Content {
		c.renderUserListItem(&sb, child, "+ ")
	}
	if needsBlock {
		sb.WriteString("]\n")
	} else if c.listDepth == 0 {
		sb.WriteString("\n")
	}
	return sb.String()
}

func (c *TypstConverter) taskList(node portabledoc.Node) string {
	var sb strings.Builder
	for _, child := range node.Content {
		checked, _ := child.Attrs["checked"].(bool)
		marker := "- ☐ "
		if checked {
			marker = "- ☑ "
		}
		c.renderUserListItem(&sb, child, marker)
	}
	if c.listDepth == 0 {
		sb.WriteString("\n")
	}
	return sb.String()
}

// renderUserListItem renders a listItem/taskItem node with depth-aware indentation.
// It separates text content from nested lists to produce proper Typst nesting.
func (c *TypstConverter) renderUserListItem(sb *strings.Builder, node portabledoc.Node, marker string) {
	indent := strings.Repeat("  ", c.listDepth)

	var textParts []string
	var nestedLists []portabledoc.Node

	for _, child := range node.Content {
		switch child.Type {
		case portabledoc.NodeTypeBulletList, portabledoc.NodeTypeOrderedList, portabledoc.NodeTypeTaskList:
			nestedLists = append(nestedLists, child)
		default:
			textParts = append(textParts, strings.TrimSpace(c.ConvertNode(child)))
		}
	}

	text := strings.Join(textParts, " ")
	fmt.Fprintf(sb, "%s%s%s\n", indent, marker, text)

	c.listDepth++
	for _, nested := range nestedLists {
		sb.WriteString(c.ConvertNode(nested))
	}
	c.listDepth--
}

// listItem is a fallback — normally handled inline by bulletList/orderedList.
func (c *TypstConverter) listItem(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("- %s\n", strings.TrimSpace(content))
}

// taskItem is a fallback — normally handled inline by taskList.
func (c *TypstConverter) taskItem(node portabledoc.Node) string {
	checked, _ := node.Attrs["checked"].(bool)
	content := c.ConvertNodes(node.Content)
	marker := "☐"
	if checked {
		marker = "☑"
	}
	return fmt.Sprintf("- %s %s\n", marker, strings.TrimSpace(content))
}

// --- Dynamic Nodes ---

func (c *TypstConverter) injector(node portabledoc.Node) string {
	variableID, _ := node.Attrs["variableId"].(string)
	prefix, _ := node.Attrs["prefix"].(string)
	suffix, _ := node.Attrs["suffix"].(string)
	showLabelIfEmpty, _ := node.Attrs["showLabelIfEmpty"].(bool)
	nodeDefaultValue, _ := node.Attrs["defaultValue"].(string)

	// Resolve value with priority: injected > node default > global default
	value := c.resolveRegularInjectable(variableID, node.Attrs)
	if value == "" {
		if nodeDefaultValue != "" {
			value = nodeDefaultValue
		} else {
			value = c.getDefaultValue(variableID)
		}
	}

	// Empty value handling
	if value == "" {
		if showLabelIfEmpty {
			// Show labels without value
			return escapeTypst(prefix) + escapeTypst(suffix)
		}
		return ""
	}

	// Build output: prefix + value + suffix
	var parts []string
	if prefix != "" {
		parts = append(parts, escapeTypst(prefix))
	}
	parts = append(parts, escapeTypst(value))
	if suffix != "" {
		parts = append(parts, escapeTypst(suffix))
	}

	return strings.Join(parts, "")
}

func (c *TypstConverter) resolveRegularInjectable(variableID string, attrs map[string]any) string {
	if v, ok := c.injectables[variableID]; ok {
		return c.formatInjectableValue(v, attrs)
	}
	return ""
}

func (c *TypstConverter) getDefaultValue(variableID string) string {
	if defaultVal, ok := c.injectableDefaults[variableID]; ok && defaultVal != "" {
		return defaultVal
	}
	return ""
}

func (c *TypstConverter) formatInjectableValue(value any, attrs map[string]any) string {
	injectorType, _ := attrs["type"].(string)
	format, _ := attrs["format"].(string)

	switch v := value.(type) {
	case string:
		return v
	case float64:
		return c.formatFloat64(v, injectorType, format)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case bool:
		return formatBool(v)
	default:
		return fmt.Sprintf("%v", v)
	}
}

func (c *TypstConverter) formatFloat64(v float64, injectorType, format string) string {
	if injectorType == portabledoc.InjectorTypeCurrency {
		if format != "" {
			return fmt.Sprintf("%s %.2f", format, v)
		}
		return fmt.Sprintf("%.2f", v)
	}

	if v == float64(int64(v)) {
		return strconv.FormatInt(int64(v), 10)
	}
	return strconv.FormatFloat(v, 'f', -1, 64)
}

func (c *TypstConverter) conditional(node portabledoc.Node) string {
	if c.evaluateCondition(node.Attrs) {
		return c.ConvertNodes(node.Content)
	}
	return ""
}

func (c *TypstConverter) pageBreak(_ portabledoc.Node) string {
	c.currentPage++
	return "#pagebreak()\n"
}

// --- Image Nodes ---

// resolveImagePath resolves the final local image path from node attributes.
// Handles injectable bindings, remote URLs, and data URLs.
func (c *TypstConverter) resolveImagePath(attrs map[string]any) string {
	src, _ := attrs["src"].(string)

	if injectableId, ok := attrs["injectableId"].(string); ok && injectableId != "" {
		if resolved, exists := c.injectables[injectableId]; exists {
			src = fmt.Sprintf("%v", resolved)
		} else if defaultVal, exists := c.injectableDefaults[injectableId]; exists {
			src = defaultVal
		}
	}

	if src == "" {
		return ""
	}

	if strings.HasPrefix(src, "http://") || strings.HasPrefix(src, "https://") || strings.HasPrefix(src, "data:") {
		return c.registerRemoteImage(src)
	}
	return src
}

// isInlineImage checks if a node is an image with displayMode "inline" (text wrapping).
func (c *TypstConverter) isInlineImage(node portabledoc.Node) bool {
	if node.Type != portabledoc.NodeTypeImage && node.Type != portabledoc.NodeTypeCustomImage {
		return false
	}
	dm, _ := node.Attrs["displayMode"].(string)
	return dm == "inline"
}

// imageMarkup generates just the Typst image/box markup without alignment wrapping.
func (c *TypstConverter) imageMarkup(node portabledoc.Node) string {
	imgPath := c.resolveImagePath(node.Attrs)
	if imgPath == "" {
		return ""
	}

	width, _ := node.Attrs["width"].(float64)
	shape, _ := node.Attrs["shape"].(string)

	var markup string
	if width > 0 {
		markup = fmt.Sprintf("#image(\"%s\", width: %.0fpt)", escapeTypstString(imgPath), width*0.75)
	} else {
		markup = fmt.Sprintf("#image(\"%s\", width: 100%%)", escapeTypstString(imgPath))
	}

	if shape == "circle" {
		height, _ := node.Attrs["height"].(float64)
		if height <= 0 {
			height = width
		}
		size := math.Min(width, height) * 0.75
		if size > 0 {
			markup = fmt.Sprintf(
				"#box(width: %.0fpt, height: %.0fpt, clip: true, radius: 50%%)[#image(\"%s\", width: 100%%, height: 100%%)]",
				size, size, escapeTypstString(imgPath),
			)
		}
	}

	return markup
}

// wrapImage generates a wrap-content block: image + following paragraphs as body.
func (c *TypstConverter) wrapImage(imgNode portabledoc.Node, bodyNodes []portabledoc.Node) string {
	markup := c.imageMarkup(imgNode)
	if markup == "" {
		return ""
	}

	align, _ := imgNode.Attrs["align"].(string)
	typstAlign := "top + left"
	if align == "right" {
		typstAlign = "top + right"
	}

	var body strings.Builder
	for _, n := range bodyNodes {
		body.WriteString(c.ConvertNode(n))
	}

	return fmt.Sprintf("#wrap-content([%s], align: %s, column-gutter: 0.75em)[%s]\n", markup, typstAlign, body.String())
}

// image converts an image node to block-mode Typst markup.
func (c *TypstConverter) image(node portabledoc.Node) string {
	markup := c.imageMarkup(node)
	if markup == "" {
		return ""
	}

	align, _ := node.Attrs["align"].(string)

	switch align {
	case "center":
		return fmt.Sprintf("#align(center)[%s]\n", markup)
	case "right":
		return fmt.Sprintf("#align(right)[%s]\n", markup)
	default:
		return markup + "\n"
	}
}

// --- Hard Break Node ---

func (c *TypstConverter) hardBreak(_ portabledoc.Node) string {
	// Typst line break: backslash at end of line
	// This creates a hard line break within the same paragraph
	return "\\\n"
}

// --- Text Node ---

func (c *TypstConverter) text(node portabledoc.Node) string {
	if node.Text == nil {
		return ""
	}

	text := escapeTypst(*node.Text)
	for _, mark := range node.Marks {
		text = c.applyMark(text, mark)
	}
	return text
}

func (c *TypstConverter) applyMark(text string, mark portabledoc.Mark) string {
	switch mark.Type {
	case portabledoc.MarkTypeBold:
		return fmt.Sprintf("#strong[%s]", text)
	case portabledoc.MarkTypeItalic:
		return fmt.Sprintf("#emph[%s]", text)
	case portabledoc.MarkTypeStrike:
		return fmt.Sprintf("#strike[%s]", text)
	case portabledoc.MarkTypeCode:
		// Undo escaping for raw code
		return fmt.Sprintf("`%s`", unescapeTypst(text))
	case portabledoc.MarkTypeUnderline:
		return fmt.Sprintf("#underline[%s]", text)
	case portabledoc.MarkTypeHighlight:
		return c.applyHighlightMark(text, mark)
	case portabledoc.MarkTypeLink:
		return c.applyLinkMark(text, mark)
	case portabledoc.MarkTypeTextStyle:
		return c.applyTextStyleMark(text, mark)
	default:
		return text
	}
}

func (c *TypstConverter) applyHighlightMark(text string, mark portabledoc.Mark) string {
	color := c.tokens.HighlightDefaultColor
	if clr, ok := mark.Attrs["color"].(string); ok && clr != "" {
		color = clr
	}
	return fmt.Sprintf("#highlight(fill: rgb(\"%s\"))[%s]", escapeTypstString(color), text)
}

func (c *TypstConverter) applyLinkMark(text string, mark portabledoc.Mark) string {
	href, _ := mark.Attrs["href"].(string)
	if href == "" {
		return text
	}
	return fmt.Sprintf("#link(\"%s\")[%s]", escapeTypstString(href), text)
}

func (c *TypstConverter) applyTextStyleMark(text string, mark portabledoc.Mark) string {
	var params []string

	if color, ok := mark.Attrs["color"].(string); ok && color != "" {
		params = append(params, fmt.Sprintf("fill: rgb(\"%s\")", escapeTypstString(color)))
	}
	if fontSize, ok := mark.Attrs["fontSize"].(string); ok && fontSize != "" {
		// Convert CSS px to Typst pt (1px ≈ 0.75pt)
		size := strings.TrimSuffix(fontSize, "px")
		if n, err := strconv.ParseFloat(size, 64); err == nil {
			params = append(params, fmt.Sprintf("size: %.1fpt", n*0.75))
		}
	}
	if fontFamily, ok := mark.Attrs["fontFamily"].(string); ok && fontFamily != "" {
		// Use first font in the family list (e.g., "Times New Roman, serif" → "Times New Roman")
		family := strings.Split(fontFamily, ",")[0]
		family = strings.TrimSpace(family)
		params = append(params, fmt.Sprintf("font: \"%s\"", escapeTypstString(family)))
	}

	if len(params) == 0 {
		return text
	}
	return fmt.Sprintf("#text(%s)[%s]", strings.Join(params, ", "), text)
}

// --- List Injector Nodes ---

func (c *TypstConverter) listInjector(node portabledoc.Node) string {
	variableID, _ := node.Attrs["variableId"].(string)
	lang, _ := node.Attrs["lang"].(string)
	if lang == "" {
		lang = "en"
	}

	listData := c.resolveListValue(variableID)
	if listData == nil {
		return ""
	}

	// Override symbol from editor attrs
	if sym, ok := node.Attrs["symbol"].(string); ok && sym != "" {
		listData.Symbol = entity.ListSymbol(sym)
	}

	// Override header label from editor attrs
	if label, ok := node.Attrs["label"].(string); ok && label != "" {
		if listData.HeaderLabel == nil {
			listData.HeaderLabel = make(map[string]string)
		}
		listData.HeaderLabel[lang] = label
	}

	// Merge styles: injector data styles as base, node attrs as override
	headerStyles := c.parseListStylesFromAttrs(node.Attrs, "header")
	itemStyles := c.parseListStylesFromAttrs(node.Attrs, "item")

	if listData.HeaderStyles != nil {
		headerStyles = c.mergeListStyles(listData.HeaderStyles, headerStyles)
	}
	if listData.ItemStyles != nil {
		itemStyles = c.mergeListStyles(listData.ItemStyles, itemStyles)
	}

	return c.renderTypstList(listData, lang, headerStyles, itemStyles)
}

func (c *TypstConverter) resolveListValue(variableID string) *entity.ListValue {
	if v, ok := c.injectables[variableID]; ok {
		if listVal, ok := v.(*entity.ListValue); ok {
			return listVal
		}
		if mapVal, ok := v.(map[string]any); ok {
			return c.parseListFromMap(mapVal)
		}
	}
	return nil
}

func (c *TypstConverter) parseListFromMap(m map[string]any) *entity.ListValue {
	list := entity.NewListValue()

	if symbol, ok := m["symbol"].(string); ok {
		list.WithSymbol(entity.ListSymbol(symbol))
	}
	if headerLabel, ok := m["headerLabel"].(map[string]any); ok {
		labels := make(map[string]string)
		for k, v := range headerLabel {
			if s, ok := v.(string); ok {
				labels[k] = s
			}
		}
		list.WithHeaderLabel(labels)
	}
	if items, ok := m["items"].([]any); ok {
		for _, itemAny := range items {
			if itemMap, ok := itemAny.(map[string]any); ok {
				list.Items = append(list.Items, c.parseListItemFromMap(itemMap))
			}
		}
	}
	return list
}

func (c *TypstConverter) parseListItemFromMap(m map[string]any) entity.ListItem {
	item := entity.ListItem{}
	if valueMap, ok := m["value"].(map[string]any); ok {
		cell := c.parseInjectableValue(valueMap)
		item.Value = cell.Value
	} else if strVal, ok := m["value"].(string); ok {
		v := entity.StringValue(strVal)
		item.Value = &v
	}
	if children, ok := m["children"].([]any); ok {
		for _, childAny := range children {
			if childMap, ok := childAny.(map[string]any); ok {
				item.Children = append(item.Children, c.parseListItemFromMap(childMap))
			}
		}
	}
	return item
}

func (c *TypstConverter) renderTypstList(listData *entity.ListValue, lang string, headerStyles, itemStyles *entity.ListStyles) string {
	var sb strings.Builder
	sb.WriteString("#block[\n") // content block to scope #set rules

	// Render header label if present
	if len(listData.HeaderLabel) > 0 {
		label := c.getListHeaderLabel(listData.HeaderLabel, lang)
		if label != "" {
			sb.WriteString(c.renderListHeader(label, headerStyles))
		}
	}

	// Emit symbol config
	isEnum, config := typstListConfig(listData.Symbol)
	if config != "" {
		sb.WriteString(config)
	}

	// Apply item styles via #set text if needed
	if itemStyles != nil {
		if rule := c.buildListTextSetRule(itemStyles); rule != "" {
			sb.WriteString(rule)
		}
	}

	// Blank line to separate #set rules from list content
	sb.WriteString("\n")

	// Render items recursively
	for _, item := range listData.Items {
		c.renderListItem(&sb, item, isEnum, 0)
	}
	sb.WriteString("]\n") // close content block

	return sb.String()
}

func (c *TypstConverter) renderListHeader(label string, styles *entity.ListStyles) string {
	var sb strings.Builder
	sb.WriteString("#text(")
	parts := c.collectListStyleParts(styles)
	sb.WriteString(strings.Join(parts, ", "))
	sb.WriteString(")[")
	sb.WriteString(escapeTypst(label))
	sb.WriteString("]\n\n")
	return sb.String()
}

func (c *TypstConverter) renderListItem(sb *strings.Builder, item entity.ListItem, isEnum bool, depth int) {
	indent := strings.Repeat("  ", depth)
	marker := "- "
	if isEnum {
		marker = "+ "
	}

	value := ""
	if item.Value != nil {
		value = c.formatCellValue(item.Value, "")
	}

	fmt.Fprintf(sb, "%s%s%s\n", indent, marker, strings.TrimSpace(value))

	for _, child := range item.Children {
		c.renderListItem(sb, child, isEnum, depth+1)
	}
}

func (c *TypstConverter) getListHeaderLabel(labels map[string]string, lang string) string {
	if label, ok := labels[lang]; ok {
		return label
	}
	if label, ok := labels["en"]; ok {
		return label
	}
	for _, label := range labels {
		return label
	}
	return ""
}

// --- Table Nodes ---

func (c *TypstConverter) tableCellData(node portabledoc.Node) string {
	return c.tableCell(node, false)
}

func (c *TypstConverter) tableCellHeader(node portabledoc.Node) string {
	return c.tableCell(node, true)
}

func (c *TypstConverter) tableInjector(node portabledoc.Node) string {
	variableID, _ := node.Attrs["variableId"].(string)
	lang, _ := node.Attrs["lang"].(string)
	if lang == "" {
		lang = "en"
	}

	tableData := c.resolveTableValue(variableID)
	if tableData == nil {
		return ""
	}

	headerStyles := c.parseTableStylesFromAttrs(node.Attrs, "header")
	bodyStyles := c.parseTableStylesFromAttrs(node.Attrs, "body")

	if tableData.HeaderStyles != nil {
		headerStyles = c.mergeTableStyles(tableData.HeaderStyles, headerStyles)
	}
	if tableData.BodyStyles != nil {
		bodyStyles = c.mergeTableStyles(tableData.BodyStyles, bodyStyles)
	}

	return c.renderTypstTable(tableData, lang, headerStyles, bodyStyles)
}

func (c *TypstConverter) resolveTableValue(variableID string) *entity.TableValue {
	if v, ok := c.injectables[variableID]; ok {
		if tableVal, ok := v.(*entity.TableValue); ok {
			return tableVal
		}
		if mapVal, ok := v.(map[string]any); ok {
			return c.parseTableFromMap(mapVal)
		}
	}
	return nil
}

func (c *TypstConverter) parseTableFromMap(m map[string]any) *entity.TableValue {
	table := entity.NewTableValue()
	c.parseColumnsFromMap(m, table)
	c.parseRowsFromMap(m, table)
	return table
}

func (c *TypstConverter) parseColumnsFromMap(m map[string]any, table *entity.TableValue) {
	cols, ok := m["columns"].([]any)
	if !ok {
		return
	}
	for _, colAny := range cols {
		col, ok := colAny.(map[string]any)
		if !ok {
			continue
		}
		c.addColumnFromMap(col, table)
	}
}

func (c *TypstConverter) addColumnFromMap(col map[string]any, table *entity.TableValue) {
	key, _ := col["key"].(string)
	dataTypeStr, _ := col["dataType"].(string)
	labels := c.parseLabelsFromMap(col)
	dataType := c.parseDataType(dataTypeStr)

	if width, ok := col["width"].(string); ok && width != "" {
		table.AddColumnWithWidth(key, labels, dataType, width)
	} else {
		table.AddColumn(key, labels, dataType)
	}
}

func (c *TypstConverter) parseLabelsFromMap(col map[string]any) map[string]string {
	labels := make(map[string]string)
	labelsMap, ok := col["labels"].(map[string]any)
	if !ok {
		return labels
	}
	for lang, label := range labelsMap {
		if labelStr, ok := label.(string); ok {
			labels[lang] = labelStr
		}
	}
	return labels
}

func (c *TypstConverter) parseRowsFromMap(m map[string]any, table *entity.TableValue) {
	rows, ok := m["rows"].([]any)
	if !ok {
		return
	}
	for _, rowAny := range rows {
		row, ok := rowAny.(map[string]any)
		if !ok {
			continue
		}
		cells := c.parseCellsFromRow(row)
		if len(cells) > 0 {
			table.AddRow(cells...)
		}
	}
}

func (c *TypstConverter) parseCellsFromRow(row map[string]any) []entity.TableCell {
	cellsAny, ok := row["cells"].([]any)
	if !ok {
		return nil
	}
	cells := make([]entity.TableCell, 0, len(cellsAny))
	for _, cellAny := range cellsAny {
		if cell, ok := cellAny.(map[string]any); ok {
			cells = append(cells, c.parseCellFromMap(cell))
		}
	}
	return cells
}

func (c *TypstConverter) parseCellFromMap(cell map[string]any) entity.TableCell {
	valueMap, ok := cell["value"].(map[string]any)
	if !ok || valueMap == nil {
		return entity.EmptyCell()
	}
	return c.parseInjectableValue(valueMap)
}

func (c *TypstConverter) parseInjectableValue(valueMap map[string]any) entity.TableCell {
	typeStr, _ := valueMap["type"].(string)

	switch typeStr {
	case "STRING":
		return c.parseStringCell(valueMap)
	case "NUMBER":
		return c.parseNumberCell(valueMap)
	case "BOOLEAN":
		return c.parseBoolCell(valueMap)
	case "DATE":
		return c.parseDateCell(valueMap)
	default:
		return entity.EmptyCell()
	}
}

func (c *TypstConverter) parseStringCell(valueMap map[string]any) entity.TableCell {
	if strVal, ok := valueMap["strVal"].(string); ok {
		return entity.Cell(entity.StringValue(strVal))
	}
	return entity.EmptyCell()
}

func (c *TypstConverter) parseNumberCell(valueMap map[string]any) entity.TableCell {
	if numVal, ok := valueMap["numVal"].(float64); ok {
		return entity.Cell(entity.NumberValue(numVal))
	}
	return entity.EmptyCell()
}

func (c *TypstConverter) parseBoolCell(valueMap map[string]any) entity.TableCell {
	if boolVal, ok := valueMap["boolVal"].(bool); ok {
		return entity.Cell(entity.BoolValue(boolVal))
	}
	return entity.EmptyCell()
}

func (c *TypstConverter) parseDateCell(valueMap map[string]any) entity.TableCell {
	timeStr, ok := valueMap["timeVal"].(string)
	if !ok || timeStr == "" {
		return entity.EmptyCell()
	}

	layouts := []string{"2006-01-02", "2006-01-02T15:04:05Z07:00", "2006-01-02T15:04:05"}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, timeStr); err == nil {
			return entity.Cell(entity.TimeValue(t))
		}
	}
	return entity.Cell(entity.StringValue(timeStr))
}

func (c *TypstConverter) parseDataType(s string) entity.ValueType {
	switch s {
	case "NUMBER", "CURRENCY":
		return entity.ValueTypeNumber
	case "BOOLEAN":
		return entity.ValueTypeBool
	case "DATE":
		return entity.ValueTypeTime
	case "TABLE":
		return entity.ValueTypeTable
	default:
		return entity.ValueTypeString
	}
}

// renderTypstTable generates Typst table markup for a TableValue (tableInjector).
func (c *TypstConverter) renderTypstTable(tableData *entity.TableValue, lang string, headerStyles, bodyStyles *entity.TableStyles) string {
	if len(tableData.Columns) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("#block[\n") // content block to scope #show rules
	sb.WriteString("#show table.cell: set par(spacing: 0pt, leading: 0.65em)\n")

	sb.WriteString(c.buildTableStyleRules(headerStyles))
	sb.WriteString(c.buildTableBodyStyleRules(bodyStyles))

	colWidths := c.buildTypstColumnWidths(tableData.Columns)
	headerFill := c.getTableHeaderFillColor(headerStyles)
	sb.WriteString(fmt.Sprintf("#table(\n  columns: (%s),\n  inset: (x: 0pt, y: 0pt),\n  stroke: 0.5pt + %s,\n  fill: (x, y) => if y == 0 { rgb(\"%s\") },\n", colWidths, c.tokens.TableStrokeColor, headerFill))
	sb.WriteString(c.buildTableAlignParam(headerStyles, bodyStyles))
	sb.WriteString(c.renderTypstTableHeader(tableData.Columns, lang))
	sb.WriteString(c.renderTypstTableRows(tableData))
	sb.WriteString(")\n")
	sb.WriteString("]\n") // close content block
	return sb.String()
}

func (c *TypstConverter) renderTypstTableHeader(columns []entity.TableColumn, lang string) string {
	var sb strings.Builder
	sb.WriteString("  table.header(")
	for i, col := range columns {
		if i > 0 {
			sb.WriteString(", ")
		}
		sb.WriteString(fmt.Sprintf("table.cell(inset: %s)[%s]", c.tokens.TableHeaderCellInset, escapeTypst(c.getColumnLabel(col, lang))))
	}
	sb.WriteString("),\n")
	return sb.String()
}

func (c *TypstConverter) renderTypstTableRows(tableData *entity.TableValue) string {
	var sb strings.Builder
	for _, row := range tableData.Rows {
		for i, cell := range row.Cells {
			if cell.Value == nil && cell.Colspan == 0 && cell.Rowspan == 0 {
				continue
			}
			format := c.getColumnFormat(tableData.Columns, i)
			sb.WriteString(c.renderTypstDataCell(cell, format))
		}
	}
	return sb.String()
}

func (c *TypstConverter) getColumnFormat(columns []entity.TableColumn, idx int) string {
	if idx < len(columns) && columns[idx].Format != nil {
		return *columns[idx].Format
	}
	return ""
}

func (c *TypstConverter) renderTypstDataCell(cell entity.TableCell, format string) string {
	content := escapeTypst(c.formatCellValue(cell.Value, format))
	if cell.Colspan > 1 || cell.Rowspan > 1 {
		attrs := c.buildTypstCellSpanAttrs(cell.Colspan, cell.Rowspan)
		return fmt.Sprintf("  table.cell(%s, inset: %s)[%s],\n", attrs, c.tokens.TableBodyCellInset, content)
	}
	return fmt.Sprintf("  table.cell(inset: %s)[%s],\n", c.tokens.TableBodyCellInset, content)
}

func (c *TypstConverter) buildTypstColumnWidths(columns []entity.TableColumn) string {
	widths := make([]string, len(columns))
	for i, col := range columns {
		widths[i] = c.convertColumnWidth(col.Width)
	}
	return strings.Join(widths, ", ")
}

func (c *TypstConverter) convertColumnWidth(width *string) string {
	if width == nil {
		return "1fr"
	}
	w := *width
	switch {
	case strings.HasSuffix(w, "%"):
		return strings.TrimSuffix(w, "%") + "%"
	case strings.HasSuffix(w, "px"):
		px := strings.TrimSuffix(w, "px")
		if f, err := strconv.ParseFloat(px, 64); err == nil {
			return fmt.Sprintf("%.1fpt", f*0.75)
		}
		return "1fr"
	default:
		return "1fr"
	}
}

func (c *TypstConverter) buildTypstCellSpanAttrs(colspan, rowspan int) string {
	var parts []string
	if colspan > 1 {
		parts = append(parts, fmt.Sprintf("colspan: %d", colspan))
	}
	if rowspan > 1 {
		parts = append(parts, fmt.Sprintf("rowspan: %d", rowspan))
	}
	return strings.Join(parts, ", ")
}

func (c *TypstConverter) getColumnLabel(col entity.TableColumn, lang string) string {
	if label, ok := col.Labels[lang]; ok {
		return label
	}
	if label, ok := col.Labels["en"]; ok {
		return label
	}
	for _, label := range col.Labels {
		return label
	}
	return col.Key
}

func (c *TypstConverter) formatCellValue(value *entity.InjectableValue, format string) string {
	if value == nil {
		return ""
	}

	switch value.Type() {
	case entity.ValueTypeString:
		s, _ := value.String()
		return s
	case entity.ValueTypeNumber:
		n, _ := value.Number()
		if format != "" {
			return fmt.Sprintf(format, n)
		}
		if n == float64(int64(n)) {
			return strconv.FormatInt(int64(n), 10)
		}
		return strconv.FormatFloat(n, 'f', 2, 64)
	case entity.ValueTypeBool:
		b, _ := value.Bool()
		if b {
			return "Yes"
		}
		return "No"
	case entity.ValueTypeTime:
		t, _ := value.Time()
		if format != "" {
			return t.Format(format)
		}
		return t.Format("2006-01-02")
	default:
		return ""
	}
}

// table renders a user-created editable table.
func (c *TypstConverter) table(node portabledoc.Node) string {
	c.currentTableHeaderStyles = c.parseTableStylesFromAttrs(node.Attrs, "header")
	c.currentTableBodyStyles = c.parseTableStylesFromAttrs(node.Attrs, "body")
	defer func() {
		c.currentTableHeaderStyles = nil
		c.currentTableBodyStyles = nil
	}()

	numCols := c.countTableColumns(node)
	colWidths := c.parseEditableTableColumnWidths(node, numCols)

	var sb strings.Builder

	sb.WriteString("#block[\n") // scope #show rules to this table
	sb.WriteString("#show table.cell: set par(spacing: 0pt, leading: 0.65em)\n")
	sb.WriteString(c.buildTableStyleRules(c.currentTableHeaderStyles))
	sb.WriteString(c.buildTableBodyStyleRules(c.currentTableBodyStyles))

	headerFill := c.getTableHeaderFillColor(c.currentTableHeaderStyles)
	sb.WriteString(fmt.Sprintf("#table(\n  columns: (%s),\n  inset: %s,\n  stroke: 0.5pt + %s,\n  fill: (x, y) => if y == 0 { rgb(\"%s\") },\n", colWidths, c.tokens.TableCellInset, c.tokens.TableStrokeColor, headerFill))
	sb.WriteString(c.buildTableAlignParam(c.currentTableHeaderStyles, c.currentTableBodyStyles))

	isFirstRow := true
	for _, row := range node.Content {
		if row.Type != portabledoc.NodeTypeTableRow {
			continue
		}
		for _, cell := range row.Content {
			sb.WriteString(c.renderEditableTableCell(cell, isFirstRow))
		}
		isFirstRow = false
	}

	sb.WriteString(")\n")
	sb.WriteString("]\n") // close block
	return sb.String()
}

func (c *TypstConverter) countTableColumns(node portabledoc.Node) int {
	maxCols := 1
	for _, row := range node.Content {
		cols := 0
		for _, cell := range row.Content {
			cols += getIntAttr(cell.Attrs, "colspan", 1)
		}
		if cols > maxCols {
			maxCols = cols
		}
	}
	return maxCols
}

// parseEditableTableColumnWidths extracts colwidth from first-row cells and converts to proportional Typst fr units.
// TipTap stores colwidth on each cell node (not the table node) as an array of pixel widths (length = colspan).
// prosemirror-tables only sets colwidth on explicitly resized columns; unresized columns stay nil.
// For nil columns, we compute their width from the content area: missing = contentWidth - sum(known).
func (c *TypstConverter) parseEditableTableColumnWidths(node portabledoc.Node, numCols int) string {
	fallback := func() string {
		specs := make([]string, numCols)
		for i := range specs {
			specs[i] = "1fr"
		}
		return strings.Join(specs, ", ")
	}

	// Find first row
	var firstRow *portabledoc.Node
	for i := range node.Content {
		if node.Content[i].Type == portabledoc.NodeTypeTableRow {
			firstRow = &node.Content[i]
			break
		}
	}
	if firstRow == nil {
		return fallback()
	}

	// Extract colwidth from each cell in the first row.
	// Cells without colwidth (not resized) get 0 as placeholder.
	var colwidths []float64
	var missingIdx []int
	hasAny := false

	for _, cell := range firstRow.Content {
		colspan := getIntAttr(cell.Attrs, "colspan", 1)
		cwAttr, ok := cell.Attrs["colwidth"]
		if !ok || cwAttr == nil {
			for range colspan {
				missingIdx = append(missingIdx, len(colwidths))
				colwidths = append(colwidths, 0)
			}
			continue
		}

		// Parse colwidth array (JSON unmarshals as []interface{})
		var cellWidths []float64
		switch v := cwAttr.(type) {
		case []interface{}:
			for _, val := range v {
				if num, ok := val.(float64); ok && num > 0 {
					cellWidths = append(cellWidths, num)
				} else {
					return fallback()
				}
			}
		case []float64:
			cellWidths = v
		default:
			return fallback()
		}

		if len(cellWidths) != colspan {
			return fallback()
		}
		colwidths = append(colwidths, cellWidths...)
		hasAny = true
	}

	if !hasAny || len(colwidths) != numCols {
		return fallback()
	}

	// Fill in missing columns: compute from content area width
	if len(missingIdx) > 0 && c.contentWidthPx > 0 {
		var knownSum float64
		for _, w := range colwidths {
			knownSum += w
		}
		remaining := c.contentWidthPx - knownSum
		perMissing := remaining / float64(len(missingIdx))
		if perMissing < 1 {
			perMissing = 1
		}
		for _, idx := range missingIdx {
			colwidths[idx] = perMissing
		}
	} else if len(missingIdx) > 0 {
		return fallback()
	}

	// Use pixel values as fractional units — preserves editor column proportions
	// regardless of differences between editor width and PDF page width.
	specs := make([]string, numCols)
	for i, w := range colwidths {
		specs[i] = fmt.Sprintf("%.0ffr", w)
	}
	return strings.Join(specs, ", ")
}

func (c *TypstConverter) renderEditableTableCell(cell portabledoc.Node, isFirstRow bool) string {
	content := c.ConvertNodes(cell.Content)
	// Strip empty-paragraph vertical spacing — #v() inflates cell height in tables
	content = strings.ReplaceAll(content, "#v(1.5em)", "")
	// Preserve paragraph structure, trim line whitespace
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimSpace(line)
	}
	content = strings.Join(lines, "\n")
	content = strings.TrimSpace(content)
	if content == "" {
		content = "~" // Typst non-breaking space — has text line height
	}

	// Note: bold/styling for header cells is handled by the user's own text marks
	// (processed by ConvertNodes), not forced here.

	colspan := getIntAttr(cell.Attrs, "colspan", 1)
	rowspan := getIntAttr(cell.Attrs, "rowspan", 1)

	if colspan > 1 || rowspan > 1 {
		attrs := c.buildTypstCellSpanAttrs(colspan, rowspan)
		return fmt.Sprintf("  table.cell(%s)[%s],\n", attrs, content)
	}
	return fmt.Sprintf("  [%s],\n", content)
}

// tableRow is a fallback — normally handled inline by table().
func (c *TypstConverter) tableRow(node portabledoc.Node) string {
	var sb strings.Builder
	for _, child := range node.Content {
		sb.WriteString(c.ConvertNode(child))
	}
	return sb.String()
}

// tableCell renders a cell — used as fallback when not inside table().
func (c *TypstConverter) tableCell(node portabledoc.Node, _ bool) string {
	content := c.ConvertNodes(node.Content)
	if content == "" {
		content = " "
	}
	return fmt.Sprintf("[%s], ", strings.TrimSpace(content))
}

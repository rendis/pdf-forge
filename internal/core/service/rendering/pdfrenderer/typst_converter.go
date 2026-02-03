package pdfrenderer

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/entity/portabledoc"
)

// TypstConverter converts ProseMirror/TipTap nodes to Typst markup.
type TypstConverter struct {
	injectables              map[string]any
	injectableDefaults       map[string]string
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
) *TypstConverter {
	return &TypstConverter{
		injectables:        injectables,
		injectableDefaults: injectableDefaults,
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

// registerRemoteImage registers a remote URL and returns a local filename.
func (c *TypstConverter) registerRemoteImage(url string) string {
	if existing, ok := c.remoteImages[url]; ok {
		return existing
	}
	c.imageCounter++
	ext := ".png"
	for _, candidate := range []string{".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"} {
		if strings.Contains(strings.ToLower(url), candidate) {
			ext = candidate
			break
		}
	}
	filename := fmt.Sprintf("img_%d%s", c.imageCounter, ext)
	c.remoteImages[url] = filename
	return filename
}

// ConvertNodes converts a slice of nodes to Typst markup.
func (c *TypstConverter) ConvertNodes(nodes []portabledoc.Node) string {
	var sb strings.Builder
	for _, node := range nodes {
		sb.WriteString(c.ConvertNode(node))
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
		return "#v(0.75em)\n"
	}
	if align, ok := node.Attrs["textAlign"].(string); ok {
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
	return fmt.Sprintf("%s %s\n", prefix, content)
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
	return fmt.Sprintf("#block(inset: (left: 1em), stroke: (left: 2pt + luma(200)), fill: rgb(\"#f9f9f9\"))[#emph[%s]]\n", content)
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
	return "#line(length: 100%, stroke: 0.5pt + luma(200))\n"
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
	label, _ := node.Attrs["label"].(string)

	value := c.resolveRegularInjectable(variableID, node.Attrs)
	if value == "" {
		value = c.getDefaultValue(variableID)
	}

	if value == "" {
		placeholder := fmt.Sprintf("[%s]", label)
		return fmt.Sprintf("#text(fill: luma(136), style: \"italic\")[%s]", escapeTypst(placeholder))
	}
	return escapeTypst(value)
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

// evaluateCondition and all comparison logic is identical to NodeConverter.
func (c *TypstConverter) evaluateCondition(attrs map[string]any) bool {
	conditionsRaw, ok := attrs["conditions"]
	if !ok {
		return true
	}
	conditionsMap, ok := conditionsRaw.(map[string]any)
	if !ok {
		return true
	}
	return c.evaluateLogicGroup(conditionsMap)
}

func (c *TypstConverter) evaluateLogicGroup(group map[string]any) bool {
	logic, _ := group["logic"].(string)
	childrenRaw, _ := group["children"].([]any)

	if len(childrenRaw) == 0 {
		return true
	}

	for _, childRaw := range childrenRaw {
		child, ok := childRaw.(map[string]any)
		if !ok {
			continue
		}

		result := c.evaluateChild(child)

		if logic == portabledoc.LogicAND && !result {
			return false
		}
		if logic == portabledoc.LogicOR && result {
			return true
		}
	}

	return logic == portabledoc.LogicAND
}

func (c *TypstConverter) evaluateChild(child map[string]any) bool {
	childType, _ := child["type"].(string)
	switch childType {
	case portabledoc.LogicTypeGroup:
		return c.evaluateLogicGroup(child)
	case portabledoc.LogicTypeRule:
		return c.evaluateRule(child)
	default:
		return false
	}
}

func (c *TypstConverter) evaluateRule(rule map[string]any) bool {
	variableID, _ := rule["variableId"].(string)
	operator, _ := rule["operator"].(string)
	valueObj, _ := rule["value"].(map[string]any)

	actualValue := c.injectables[variableID]
	compareValue := c.resolveCompareValue(valueObj)

	return c.compareValues(actualValue, compareValue, operator)
}

func (c *TypstConverter) resolveCompareValue(valueObj map[string]any) any {
	valueMode, _ := valueObj["mode"].(string)
	compareValue := valueObj["value"]

	if valueMode == portabledoc.RuleModeVariable {
		compareVarID, _ := compareValue.(string)
		return c.injectables[compareVarID]
	}
	return compareValue
}

func (c *TypstConverter) compareValues(actual, compare any, operator string) bool {
	actualStr := fmt.Sprintf("%v", actual)
	compareStr := fmt.Sprintf("%v", compare)

	if result, ok := c.compareStringOps(actualStr, compareStr, actual, operator); ok {
		return result
	}
	return c.compareNumericOps(actual, compare, operator)
}

func (c *TypstConverter) compareStringOps(actualStr, compareStr string, actual any, operator string) (bool, bool) {
	switch operator {
	case portabledoc.OpEqual:
		return actualStr == compareStr, true
	case portabledoc.OpNotEqual:
		return actualStr != compareStr, true
	case portabledoc.OpEmpty:
		return actual == nil || actualStr == "", true
	case portabledoc.OpNotEmpty:
		return actual != nil && actualStr != "", true
	case portabledoc.OpStartsWith:
		return strings.HasPrefix(actualStr, compareStr), true
	case portabledoc.OpEndsWith:
		return strings.HasSuffix(actualStr, compareStr), true
	case portabledoc.OpContains:
		return strings.Contains(actualStr, compareStr), true
	case portabledoc.OpIsTrue:
		return actualStr == "true" || actualStr == "1", true
	case portabledoc.OpIsFalse:
		return actualStr == "false" || actualStr == "0" || actualStr == "", true
	default:
		return false, false
	}
}

func (c *TypstConverter) compareNumericOps(actual, compare any, operator string) bool {
	switch operator {
	case portabledoc.OpGreater, portabledoc.OpAfter:
		return c.compareNumeric(actual, compare) > 0
	case portabledoc.OpLess, portabledoc.OpBefore:
		return c.compareNumeric(actual, compare) < 0
	case portabledoc.OpGreaterEq:
		return c.compareNumeric(actual, compare) >= 0
	case portabledoc.OpLessEq:
		return c.compareNumeric(actual, compare) <= 0
	default:
		return false
	}
}

func (c *TypstConverter) compareNumeric(a, b any) int {
	aNum := toFloat64(a)
	bNum := toFloat64(b)

	if aNum < bNum {
		return -1
	}
	if aNum > bNum {
		return 1
	}
	return 0
}

func (c *TypstConverter) pageBreak(_ portabledoc.Node) string {
	c.currentPage++
	return "#pagebreak()\n"
}

// --- Image Nodes ---

func (c *TypstConverter) image(node portabledoc.Node) string {
	src, _ := node.Attrs["src"].(string)

	// Check for injectable binding
	if injectableId, ok := node.Attrs["injectableId"].(string); ok && injectableId != "" {
		if resolved, exists := c.injectables[injectableId]; exists {
			src = fmt.Sprintf("%v", resolved)
		} else if defaultVal, exists := c.injectableDefaults[injectableId]; exists {
			src = defaultVal
		}
	}

	if src == "" {
		return ""
	}

	// Remote images need to be downloaded; use local filename
	imgPath := src
	if strings.HasPrefix(src, "http://") || strings.HasPrefix(src, "https://") {
		imgPath = c.registerRemoteImage(src)
	}

	width, _ := node.Attrs["width"].(float64)
	align, _ := node.Attrs["align"].(string)

	var imgMarkup string
	if width > 0 {
		imgMarkup = fmt.Sprintf("#image(\"%s\", width: %.0fpt)", escapeTypstString(imgPath), width*0.75)
	} else {
		imgMarkup = fmt.Sprintf("#image(\"%s\", width: 100%%)", escapeTypstString(imgPath))
	}

	switch align {
	case "center":
		return fmt.Sprintf("#align(center)[%s]\n", imgMarkup)
	case "right":
		return fmt.Sprintf("#align(right)[%s]\n", imgMarkup)
	default:
		return imgMarkup + "\n"
	}
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
		return fmt.Sprintf("*%s*", text)
	case portabledoc.MarkTypeItalic:
		return fmt.Sprintf("_%s_", text)
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
	default:
		return text
	}
}

func (c *TypstConverter) applyHighlightMark(text string, mark portabledoc.Mark) string {
	color := "#ffeb3b"
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

// --- List Injector Nodes ---

func (c *TypstConverter) listInjector(node portabledoc.Node) string {
	variableID, _ := node.Attrs["variableId"].(string)
	lang, _ := node.Attrs["lang"].(string)
	if lang == "" {
		lang = "en"
	}

	listData := c.resolveListValue(variableID)
	if listData == nil {
		label, _ := node.Attrs["label"].(string)
		if label == "" {
			label = variableID
		}
		return fmt.Sprintf("#block(fill: rgb(\"#fff3cd\"), stroke: (dash: \"dashed\", paint: rgb(\"#ffc107\")), inset: 1em, width: 100%%)[#text(fill: rgb(\"#856404\"), style: \"italic\")[\\[List: %s\\]]]\n", escapeTypst(label))
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

// typstListConfig returns whether the symbol maps to an enum (vs list) and the #set rule.
func typstListConfig(symbol entity.ListSymbol) (isEnum bool, config string) {
	switch symbol {
	case entity.ListSymbolNumber:
		return true, "#set enum(numbering: \"1.\")\n"
	case entity.ListSymbolRoman:
		return true, "#set enum(numbering: \"i.\")\n"
	case entity.ListSymbolLetter:
		return true, "#set enum(numbering: \"a)\")\n"
	case entity.ListSymbolDash:
		return false, "#set list(marker: [–])\n"
	default: // bullet
		return false, ""
	}
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

func (c *TypstConverter) collectListStyleParts(styles *entity.ListStyles) []string {
	parts := make([]string, 0)
	if styles == nil {
		return parts
	}
	if styles.FontSize != nil {
		parts = append(parts, fmt.Sprintf("size: %dpt", *styles.FontSize))
	}
	if styles.FontWeight != nil && *styles.FontWeight == "bold" {
		parts = append(parts, "weight: \"bold\"")
	}
	if styles.TextColor != nil {
		parts = append(parts, fmt.Sprintf("fill: rgb(\"%s\")", *styles.TextColor))
	}
	if styles.FontFamily != nil {
		parts = append(parts, fmt.Sprintf("font: \"%s\"", *styles.FontFamily))
	}
	return parts
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

func (c *TypstConverter) buildListTextSetRule(styles *entity.ListStyles) string {
	parts := make([]string, 0)
	if styles.FontSize != nil {
		parts = append(parts, fmt.Sprintf("size: %dpt", *styles.FontSize))
	}
	if styles.FontWeight != nil && *styles.FontWeight == "bold" {
		parts = append(parts, "weight: \"bold\"")
	}
	if styles.TextColor != nil {
		parts = append(parts, fmt.Sprintf("fill: rgb(\"%s\")", *styles.TextColor))
	}
	if styles.FontFamily != nil {
		parts = append(parts, fmt.Sprintf("font: \"%s\"", *styles.FontFamily))
	}
	if len(parts) == 0 {
		return ""
	}
	return fmt.Sprintf("#set text(%s)\n", strings.Join(parts, ", "))
}

func (c *TypstConverter) parseListStylesFromAttrs(attrs map[string]any, prefix string) *entity.ListStyles {
	styles := &entity.ListStyles{}
	hasValue := false

	if v, ok := attrs[prefix+"FontFamily"].(string); ok && v != "" {
		styles.FontFamily = &v
		hasValue = true
	}
	if v, ok := attrs[prefix+"FontSize"].(float64); ok && v > 0 {
		intVal := int(v)
		styles.FontSize = &intVal
		hasValue = true
	}
	if v, ok := attrs[prefix+"FontWeight"].(string); ok && v != "" {
		styles.FontWeight = &v
		hasValue = true
	}
	if v, ok := attrs[prefix+"TextColor"].(string); ok && v != "" {
		styles.TextColor = &v
		hasValue = true
	}
	if v, ok := attrs[prefix+"TextAlign"].(string); ok && v != "" {
		styles.TextAlign = &v
		hasValue = true
	}

	if !hasValue {
		return nil
	}
	return styles
}

func (c *TypstConverter) mergeListStyles(base, override *entity.ListStyles) *entity.ListStyles {
	if base == nil {
		return override
	}
	if override == nil {
		return base
	}

	result := *base
	if override.FontFamily != nil {
		result.FontFamily = override.FontFamily
	}
	if override.FontSize != nil {
		result.FontSize = override.FontSize
	}
	if override.FontWeight != nil {
		result.FontWeight = override.FontWeight
	}
	if override.TextColor != nil {
		result.TextColor = override.TextColor
	}
	if override.TextAlign != nil {
		result.TextAlign = override.TextAlign
	}
	return &result
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
		label, _ := node.Attrs["label"].(string)
		if label == "" {
			label = variableID
		}
		return fmt.Sprintf("#block(fill: rgb(\"#fff3cd\"), stroke: (dash: \"dashed\", paint: rgb(\"#ffc107\")), inset: 1em, width: 100%%)[#text(fill: rgb(\"#856404\"), style: \"italic\")[\\[Table: %s\\]]]\n", escapeTypst(label))
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

	sb.WriteString(c.buildTableStyleRules(headerStyles))

	colWidths := c.buildTypstColumnWidths(tableData.Columns)
	headerFill := c.getTableHeaderFillColor(headerStyles)
	sb.WriteString(fmt.Sprintf("#table(\n  columns: (%s),\n  stroke: 0.5pt + luma(200),\n  fill: (x, y) => if y == 0 { rgb(\"%s\") },\n", colWidths, headerFill))
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
		sb.WriteString(fmt.Sprintf("[%s]", escapeTypst(c.getColumnLabel(col, lang))))
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
		return fmt.Sprintf("  table.cell(%s)[%s],\n", attrs, content)
	}
	return fmt.Sprintf("  [%s],\n", content)
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

func (c *TypstConverter) getTableHeaderFillColor(styles *entity.TableStyles) string {
	if styles != nil && styles.Background != nil {
		return *styles.Background
	}
	return "#f5f5f5"
}

// buildTableStyleRules generates Typst show rules for header text styling.
func (c *TypstConverter) buildTableStyleRules(headerStyles *entity.TableStyles) string {
	if headerStyles == nil {
		return ""
	}

	var sb strings.Builder

	if headerStyles.FontWeight != nil {
		sb.WriteString(fmt.Sprintf("#show table.cell.where(y: 0): set text(weight: \"%s\")\n", *headerStyles.FontWeight))
	}
	if headerStyles.TextColor != nil {
		sb.WriteString(fmt.Sprintf("#show table.cell.where(y: 0): set text(fill: rgb(\"%s\"))\n", *headerStyles.TextColor))
	}

	return sb.String()
}

// buildTableAlignParam generates the align parameter for a Typst table.
func (c *TypstConverter) buildTableAlignParam(headerStyles, bodyStyles *entity.TableStyles) string {
	headerAlign := getTypstAlignment(headerStyles)
	bodyAlign := getTypstAlignment(bodyStyles)

	if headerAlign != "" && bodyAlign != "" {
		return fmt.Sprintf("  align: (x, y) => if y == 0 { %s } else { %s },\n", headerAlign, bodyAlign)
	}
	if headerAlign != "" {
		return fmt.Sprintf("  align: (x, y) => if y == 0 { %s } else { auto },\n", headerAlign)
	}
	if bodyAlign != "" {
		return fmt.Sprintf("  align: %s,\n", bodyAlign)
	}
	return ""
}

// toTypstAlign maps a ProseMirror textAlign value to a Typst align value.
// Returns "" for values that don't need explicit alignment (left, justify).
func toTypstAlign(align string) string {
	switch align {
	case "center":
		return "center"
	case "right":
		return "right"
	default:
		return ""
	}
}

// getTypstAlignment converts a CSS text-align value to Typst alignment.
func getTypstAlignment(styles *entity.TableStyles) string {
	if styles == nil || styles.TextAlign == nil {
		return ""
	}
	switch *styles.TextAlign {
	case "left":
		return "left"
	case "center":
		return "center"
	case "right":
		return "right"
	default:
		return ""
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

	var sb strings.Builder
	colSpec := make([]string, numCols)
	for i := range colSpec {
		colSpec[i] = "1fr"
	}

	sb.WriteString(c.buildTableStyleRules(c.currentTableHeaderStyles))

	headerFill := c.getTableHeaderFillColor(c.currentTableHeaderStyles)
	sb.WriteString(fmt.Sprintf("#table(\n  columns: (%s),\n  stroke: 0.5pt + luma(200),\n  fill: (x, y) => if y == 0 { rgb(\"%s\") },\n", strings.Join(colSpec, ", "), headerFill))
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
	return sb.String()
}

func (c *TypstConverter) countTableColumns(node portabledoc.Node) int {
	if len(node.Content) > 0 {
		if n := len(node.Content[0].Content); n > 0 {
			return n
		}
	}
	return 1
}

func (c *TypstConverter) renderEditableTableCell(cell portabledoc.Node, isFirstRow bool) string {
	content := c.ConvertNodes(cell.Content)
	if content == "" {
		content = " "
	}
	content = strings.TrimSpace(content)

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

// --- Style helpers (shared with NodeConverter) ---

func (c *TypstConverter) parseTableStylesFromAttrs(attrs map[string]any, prefix string) *entity.TableStyles {
	styles := &entity.TableStyles{}
	hasStyles := false

	if v, ok := attrs[prefix+"FontFamily"].(string); ok && v != "" {
		styles.FontFamily = &v
		hasStyles = true
	}
	if v, ok := attrs[prefix+"FontSize"].(float64); ok && v > 0 {
		i := int(v)
		styles.FontSize = &i
		hasStyles = true
	}
	if v, ok := attrs[prefix+"FontWeight"].(string); ok && v != "" {
		styles.FontWeight = &v
		hasStyles = true
	}
	if v, ok := attrs[prefix+"TextColor"].(string); ok && v != "" {
		styles.TextColor = &v
		hasStyles = true
	}
	if v, ok := attrs[prefix+"TextAlign"].(string); ok && v != "" {
		styles.TextAlign = &v
		hasStyles = true
	}
	if v, ok := attrs[prefix+"Background"].(string); ok && v != "" {
		styles.Background = &v
		hasStyles = true
	}

	if !hasStyles {
		return nil
	}
	return styles
}

func (c *TypstConverter) mergeTableStyles(base, override *entity.TableStyles) *entity.TableStyles {
	if base == nil {
		return override
	}
	if override == nil {
		return base
	}

	result := *base
	if override.FontFamily != nil {
		result.FontFamily = override.FontFamily
	}
	if override.FontSize != nil {
		result.FontSize = override.FontSize
	}
	if override.FontWeight != nil {
		result.FontWeight = override.FontWeight
	}
	if override.TextColor != nil {
		result.TextColor = override.TextColor
	}
	if override.TextAlign != nil {
		result.TextAlign = override.TextAlign
	}
	if override.Background != nil {
		result.Background = override.Background
	}
	return &result
}

// --- Typst escaping ---

// escapeTypst escapes special Typst characters in content text.
func escapeTypst(s string) string {
	replacer := strings.NewReplacer(
		"\\", "\\\\",
		"#", "\\#",
		"*", "\\*",
		"_", "\\_",
		"@", "\\@",
		"$", "\\$",
		"<", "\\<",
		">", "\\>",
		"[", "\\[",
		"]", "\\]",
	)
	return replacer.Replace(s)
}

// unescapeTypst reverses escapeTypst (used for code blocks where we want raw content).
func unescapeTypst(s string) string {
	replacer := strings.NewReplacer(
		"\\\\", "\\",
		"\\#", "#",
		"\\*", "*",
		"\\_", "_",
		"\\@", "@",
		"\\$", "$",
		"\\<", "<",
		"\\>", ">",
		"\\[", "[",
		"\\]", "]",
	)
	return replacer.Replace(s)
}

// escapeTypstString escapes a string for use inside Typst string literals (double-quoted).
func escapeTypstString(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, "\\", "\\\\"), "\"", "\\\"")
}

// clamp restricts a value to the range [min, max].
func clamp(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

// formatBool returns a localized string for a boolean value.
func formatBool(v bool) string {
	if v {
		return "Sí"
	}
	return "No"
}

// toFloat64 converts a value to float64, returning 0 on failure.
func toFloat64(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case float32:
		return float64(n)
	case int:
		return float64(n)
	case int64:
		return float64(n)
	case string:
		f, _ := strconv.ParseFloat(n, 64)
		return f
	default:
		return 0
	}
}

// getIntAttr extracts an integer attribute from a map, returning defaultVal if not found.
func getIntAttr(attrs map[string]any, key string, defaultVal int) int {
	v, ok := attrs[key]
	if !ok {
		return defaultVal
	}
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	case int64:
		return int(n)
	default:
		return defaultVal
	}
}

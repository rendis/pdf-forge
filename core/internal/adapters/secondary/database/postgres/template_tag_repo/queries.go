package templatetagrepo

// SQL queries for template tag operations.
const (
	queryAddTag = `
		INSERT INTO content.template_tags (template_id, tag_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING`

	queryRemoveTag = `
		DELETE FROM content.template_tags
		WHERE template_id = $1 AND tag_id = $2`

	queryFindTagsByTemplate = `
		SELECT t.id, t.workspace_id, t.name, t.color, t.created_at, t.updated_at
		FROM organizer.tags t
		JOIN content.template_tags tt ON t.id = tt.tag_id
		WHERE tt.template_id = $1
		ORDER BY t.name`

	queryFindTemplatesByTag = `
		SELECT template_id FROM content.template_tags WHERE tag_id = $1`

	queryExists = `
		SELECT EXISTS(SELECT 1 FROM content.template_tags WHERE template_id = $1 AND tag_id = $2)`

	queryDeleteByTemplate = `
		DELETE FROM content.template_tags WHERE template_id = $1`
)

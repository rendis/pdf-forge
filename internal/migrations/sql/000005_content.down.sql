-- Reverse migration 000005: Drop content schema and all objects

DROP TRIGGER IF EXISTS trigger_template_versions_updated_at ON content.template_versions;
DROP TRIGGER IF EXISTS trigger_templates_updated_at ON content.templates;
DROP TRIGGER IF EXISTS trigger_document_types_protect_code ON content.document_types;
DROP TRIGGER IF EXISTS trigger_document_types_updated_at ON content.document_types;
DROP TRIGGER IF EXISTS trigger_injectable_definitions_updated_at ON content.injectable_definitions;
DROP TRIGGER IF EXISTS trigger_system_injectable_definitions_updated_at ON content.system_injectable_definitions;
DROP FUNCTION IF EXISTS content.protect_document_type_code();

DROP TABLE IF EXISTS content.system_injectable_assignments CASCADE;
DROP TABLE IF EXISTS content.template_tags CASCADE;
DROP TABLE IF EXISTS content.template_version_injectables CASCADE;
DROP TABLE IF EXISTS content.system_injectable_definitions CASCADE;
DROP TABLE IF EXISTS content.template_versions CASCADE;
DROP TABLE IF EXISTS content.templates CASCADE;
DROP TABLE IF EXISTS content.document_types CASCADE;
DROP TABLE IF EXISTS content.injectable_definitions CASCADE;
DROP SCHEMA IF EXISTS content CASCADE;

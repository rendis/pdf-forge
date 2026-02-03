-- Reverse migration 000004: Drop organizer schema and all objects

DROP TRIGGER IF EXISTS trigger_tags_updated_at ON organizer.tags;
DROP TRIGGER IF EXISTS trigger_folders_path ON organizer.folders;
DROP TRIGGER IF EXISTS trigger_folders_updated_at ON organizer.folders;
DROP FUNCTION IF EXISTS organizer.populate_folder_paths();
DROP FUNCTION IF EXISTS organizer.compute_folder_path();

DROP TABLE IF EXISTS organizer.tags CASCADE;
DROP TABLE IF EXISTS organizer.folders CASCADE;
DROP SCHEMA IF EXISTS organizer CASCADE;

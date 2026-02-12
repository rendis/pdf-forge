-- Remove FK constraint to allow provider injectable keys
-- Provider injectables use system_injectable_key but their keys are NOT in system_injectable_definitions
-- This is intentional - provider keys are validated at runtime by provider implementation
ALTER TABLE content.template_version_injectables
DROP CONSTRAINT IF EXISTS fk_template_version_injectables_system_injectable_key;

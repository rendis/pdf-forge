-- Restore FK constraint for system_injectable_key
ALTER TABLE content.template_version_injectables
ADD CONSTRAINT fk_template_version_injectables_system_injectable_key
FOREIGN KEY (system_injectable_key)
REFERENCES content.system_injectable_definitions(key)
ON DELETE RESTRICT;

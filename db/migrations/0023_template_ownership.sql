BEGIN;
ALTER TABLE locations ADD CONSTRAINT location_workspace_identity UNIQUE(id,workspace_id);
ALTER TABLE schedule_templates ADD COLUMN workspace_id text REFERENCES workspaces(id);
UPDATE schedule_templates SET workspace_id=(SELECT id FROM workspaces WHERE singleton=true);
ALTER TABLE schedule_templates ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE schedule_templates ADD CONSTRAINT schedule_templates_workspace_key UNIQUE(id,workspace_id);
ALTER TABLE schedule_template_shifts ADD COLUMN workspace_id text REFERENCES workspaces(id);
UPDATE schedule_template_shifts s SET workspace_id=t.workspace_id FROM schedule_templates t WHERE t.id=s.template_id;
ALTER TABLE schedule_template_shifts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE schedule_template_shifts ADD CONSTRAINT template_child_owner FOREIGN KEY(template_id,workspace_id) REFERENCES schedule_templates(id,workspace_id);
ALTER TABLE positions ADD CONSTRAINT position_workspace_identity UNIQUE(id,workspace_id);
ALTER TABLE schedule_template_shifts ADD CONSTRAINT template_position_owner FOREIGN KEY(position_id,workspace_id) REFERENCES positions(id,workspace_id);
ALTER TABLE schedule_template_shifts ADD CONSTRAINT template_location_owner FOREIGN KEY(location_id,workspace_id) REFERENCES locations(id,workspace_id);
CREATE FUNCTION nevora_template_ownership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR (TG_TABLE_NAME='schedule_template_shifts' AND to_jsonb(NEW)->>'template_id' IS DISTINCT FROM to_jsonb(OLD)->>'template_id')) THEN RAISE EXCEPTION 'template ownership is immutable'; END IF;
 IF NEW.workspace_id IS NULL THEN NEW.workspace_id:=(SELECT id FROM workspaces WHERE singleton=true AND active); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER template_owner BEFORE INSERT OR UPDATE ON schedule_templates FOR EACH ROW EXECUTE FUNCTION nevora_template_ownership();
CREATE TRIGGER template_child_owner BEFORE INSERT OR UPDATE ON schedule_template_shifts FOR EACH ROW EXECUTE FUNCTION nevora_template_ownership();
COMMIT;

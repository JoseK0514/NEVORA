CREATE TABLE clocker_review_requests (
 request_id uuid PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 device_id text NOT NULL REFERENCES clocker_devices(id),
 requester_id text NOT NULL REFERENCES employees(id),
 location_id text NOT NULL REFERENCES locations(id),
 command_id uuid,
 requested_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX clocker_review_requests_owner_page ON clocker_review_requests(workspace_id,requested_at DESC,request_id DESC);
CREATE TRIGGER clocker_review_requests_append_only BEFORE UPDATE OR DELETE ON clocker_review_requests
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();

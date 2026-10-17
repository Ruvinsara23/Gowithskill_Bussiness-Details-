CREATE TABLE IF NOT EXISTS submissions (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL,
 business_name TEXT NOT NULL,
 contact_email TEXT NOT NULL,
 customer_reference TEXT,
 payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_created ON submissions(created_at);
CREATE INDEX IF NOT EXISTS submissions_reference ON submissions(customer_reference);
CREATE TABLE IF NOT EXISTS email_notifications (
 submission_id TEXT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0,
 provider_id TEXT,
 last_error TEXT,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS email_notifications_status ON email_notifications(status);
CREATE TRIGGER IF NOT EXISTS queue_submission_email AFTER INSERT ON submissions
BEGIN
 INSERT INTO email_notifications (submission_id,status,updated_at) VALUES (NEW.id,'pending',NEW.created_at);
END;

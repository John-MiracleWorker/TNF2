ALTER TABLE sermon_summaries
ADD COLUMN key_points TEXT[];

ALTER TABLE sermon_summaries
ADD COLUMN application_to_faith TEXT;

ALTER TABLE sermon_summaries
ADD COLUMN biblical_themes TEXT[];

ALTER TABLE sermon_summaries
ADD COLUMN biblical_characters TEXT[];

ALTER TABLE sermon_summaries
ADD COLUMN historical_context TEXT;

-- Optional: If you want to migrate existing key_points data from ai_context
-- This assumes ai_context is jsonb and key_points within it is a JSON array of strings.
-- Adjust this update statement based on your actual data structure in ai_context.
-- UPDATE sermon_summaries
-- SET key_points = (ai_context->>'key_points')::text[]
-- WHERE ai_context IS NOT NULL AND ai_context->>'key_points' IS NOT NULL;

-- Drop key_points from ai_context if it's no longer needed there
-- ALTER TABLE sermon_summaries
-- ALTER COLUMN ai_context DROP KEY 'key_points'; -- This syntax is illustrative, actual syntax depends on Postgres version and how jsonb is handled. You might need to rebuild the jsonb.

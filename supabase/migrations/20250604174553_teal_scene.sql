/*
  # Update journal_entries table schema
  
  1. New Columns
    - `title` (text) - A concise title for the journal entry
    - `summary` (text) - A brief summary of the journal entry
    - `tags` (text array) - Keywords for categorizing entries
    - `source_thread_id` (text) - Reference to the chat thread that generated this entry

  2. Security
    - Preserve existing RLS policies
*/

-- Add new columns to journal_entries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'title'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'summary'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN summary text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'tags'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN tags text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'source_thread_id'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN source_thread_id text;
  END IF;
END $$;
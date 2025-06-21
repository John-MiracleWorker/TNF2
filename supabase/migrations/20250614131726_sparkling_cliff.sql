/*
  # Add metadata column to faith_communities table

  1. Changes
    - Add `metadata` column to `faith_communities` table
    - Column type: JSONB to store questionnaire responses and recommendations
    - Nullable: true (existing communities won't have metadata)

  2. Purpose
    - Store community setup questionnaire responses
    - Store generated recommendations for reading plans, prayer circles, and challenges
    - Enable personalized community features based on user preferences
*/

ALTER TABLE faith_communities ADD COLUMN IF NOT EXISTS metadata JSONB;
-- Add new columns to existing stories table
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS story_title TEXT,
ADD COLUMN IF NOT EXISTS learning_objectives TEXT[],
ADD COLUMN IF NOT EXISTS quiz_questions JSONB,
ADD COLUMN IF NOT EXISTS is_continuation BOOLEAN DEFAULT FALSE; 
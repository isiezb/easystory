-- Drop existing table if needed (uncomment if you want to start fresh)
-- DROP TABLE IF EXISTS stories;

-- Create the stories table
CREATE TABLE IF NOT EXISTS stories (
    id BIGSERIAL PRIMARY KEY,
    academic_grade TEXT NOT NULL,
    subject TEXT NOT NULL,
    subject_specification TEXT,
    setting TEXT,
    main_character TEXT,
    word_count INTEGER NOT NULL,
    language TEXT NOT NULL,
    story_text TEXT NOT NULL,
    story_title TEXT,
    learning_objectives TEXT[],
    quiz_questions JSONB,
    vocabulary_list JSONB,
    story_summary TEXT,
    is_continuation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS (Row Level Security) policies
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Allow insert for authenticated users
CREATE POLICY "Allow insert for authenticated users" ON stories
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow select for all users
CREATE POLICY "Allow select for all users" ON stories
    FOR SELECT
    TO public
    USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stories_academic_grade ON stories(academic_grade);
CREATE INDEX IF NOT EXISTS idx_stories_subject ON stories(subject);
CREATE INDEX IF NOT EXISTS idx_stories_language ON stories(language);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);

-- Add any missing columns (migration)
DO $$ 
BEGIN
    -- Add story_title if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'stories' AND column_name = 'story_title') THEN
        ALTER TABLE stories ADD COLUMN story_title TEXT;
    END IF;

    -- Add learning_objectives if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'stories' AND column_name = 'learning_objectives') THEN
        ALTER TABLE stories ADD COLUMN learning_objectives TEXT[];
    END IF;

    -- Add quiz_questions if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'stories' AND column_name = 'quiz_questions') THEN
        ALTER TABLE stories ADD COLUMN quiz_questions JSONB;
    END IF;

    -- Add vocabulary_list if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'stories' AND column_name = 'vocabulary_list') THEN
        ALTER TABLE stories ADD COLUMN vocabulary_list JSONB;
    END IF;

    -- Add story_summary if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'stories' AND column_name = 'story_summary') THEN
        ALTER TABLE stories ADD COLUMN story_summary TEXT;
    END IF;

    -- Add is_continuation if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'stories' AND column_name = 'is_continuation') THEN
        ALTER TABLE stories ADD COLUMN is_continuation BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comments to columns for better documentation
COMMENT ON TABLE stories IS 'Stores educational stories with their associated metadata and quizzes';
COMMENT ON COLUMN stories.id IS 'Unique identifier for each story';
COMMENT ON COLUMN stories.academic_grade IS 'Target academic grade level for the story';
COMMENT ON COLUMN stories.subject IS 'Main subject area of the story';
COMMENT ON COLUMN stories.subject_specification IS 'Specific topic or focus within the subject';
COMMENT ON COLUMN stories.setting IS 'Story setting or environment';
COMMENT ON COLUMN stories.main_character IS 'Main character or protagonist of the story';
COMMENT ON COLUMN stories.word_count IS 'Approximate number of words in the story';
COMMENT ON COLUMN stories.language IS 'Language in which the story is written';
COMMENT ON COLUMN stories.story_text IS 'The actual content of the story';
COMMENT ON COLUMN stories.story_title IS 'Title of the story';
COMMENT ON COLUMN stories.learning_objectives IS 'Array of learning objectives for the story';
COMMENT ON COLUMN stories.quiz_questions IS 'JSON array of quiz questions and answers';
COMMENT ON COLUMN stories.vocabulary_list IS 'JSON array of vocabulary words and their definitions';
COMMENT ON COLUMN stories.story_summary IS 'Brief summary of the story''s key theme and main points';
COMMENT ON COLUMN stories.is_continuation IS 'Whether this story is a continuation of a previous story';
COMMENT ON COLUMN stories.created_at IS 'Timestamp when the story was created'; 
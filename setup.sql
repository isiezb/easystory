-- Drop existing table if needed (uncomment if you want to start fresh)
DROP TABLE IF EXISTS stories;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create users table
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT NOT NULL,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    is_super_admin BOOLEAN DEFAULT FALSE,
    role TEXT,
    confirmation_token TEXT,
    email_change_token_new TEXT,
    recovery_token TEXT
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    factor_id UUID,
    aal AUTHENTICATION_ASSURANCE_LEVEL,
    not_after TIMESTAMP WITH TIME ZONE
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    revoked BOOLEAN DEFAULT FALSE,
    parent TEXT,
    session_id UUID REFERENCES auth.sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create identities table
CREATE TABLE IF NOT EXISTS auth.identities (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    identity_data JSONB NOT NULL,
    provider TEXT NOT NULL,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS auth.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payload JSONB,
    ip_address INET DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mfa_amr_claims table
CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES auth.sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    authentication_method TEXT NOT NULL,
    constraint session_auth_method_pkey UNIQUE (session_id, authentication_method)
);

-- Create mfa_challenges table
CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factor_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    ip_address INET
);

-- Create mfa_factors table
CREATE TABLE IF NOT EXISTS auth.mfa_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    friendly_name TEXT,
    factor_type TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    secret TEXT
);

-- Create saml_providers table
CREATE TABLE IF NOT EXISTS auth.saml_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sso_provider_id TEXT NOT NULL,
    entity_id TEXT,
    metadata_xml TEXT,
    metadata_url TEXT,
    attribute_mapping JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saml_relay_states table
CREATE TABLE IF NOT EXISTS auth.saml_relay_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sso_provider_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    for_email TEXT,
    redirect_to TEXT,
    from_ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sso_providers table
CREATE TABLE IF NOT EXISTS auth.sso_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sso_domains table
CREATE TABLE IF NOT EXISTS auth.sso_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sso_provider_id UUID REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stories table with user_id
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_grade TEXT NOT NULL,
    subject TEXT NOT NULL,
    subject_specification TEXT,
    setting TEXT,
    main_character TEXT,
    word_count INTEGER NOT NULL,
    language TEXT NOT NULL,
    story_text TEXT NOT NULL,
    story_title TEXT NOT NULL,
    learning_objectives TEXT[] NOT NULL,
    quiz_questions JSONB NOT NULL,
    vocabulary_list JSONB,
    story_summary TEXT,
    is_continuation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);
CREATE INDEX IF NOT EXISTS idx_stories_subject ON stories(subject);
CREATE INDEX IF NOT EXISTS idx_stories_academic_grade ON stories(academic_grade);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own stories"
    ON stories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories"
    ON stories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
    ON stories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
    ON stories FOR DELETE
    USING (auth.uid() = user_id);

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_user_deletion ON auth.users;
DROP FUNCTION IF EXISTS handle_user_deletion() CASCADE;

-- Create function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM stories WHERE user_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user deletion
CREATE TRIGGER on_user_deletion
    AFTER DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- Add comments to columns for better documentation
COMMENT ON TABLE stories IS 'Stores educational stories with their associated metadata and quizzes';
COMMENT ON COLUMN stories.id IS 'Unique identifier for each story';
COMMENT ON COLUMN stories.user_id IS 'Reference to the user who created the story';
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
COMMENT ON COLUMN stories.updated_at IS 'Timestamp when the story was last updated'; 
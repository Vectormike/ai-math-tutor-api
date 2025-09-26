-- AI Math Tutor Database Schema
-- Designed to handle tutoring workflows with optimal performance

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'other'
        CHECK (question_type IN ('algebra', 'calculus', 'geometry', 'arithmetic', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    steps JSONB NOT NULL, -- Store AI steps as JSON for flexibility
    final_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    processing_time_ms INTEGER NOT NULL DEFAULT 0,
    ai_model_used VARCHAR(100) NOT NULL DEFAULT 'gpt-4',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimal query performance
-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Question indexes
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_user_created ON questions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_text_gin ON questions USING gin(to_tsvector('english', question_text)); -- Full text search

-- Answer indexes
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_processing_time ON answers(processing_time_ms);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE VIEW question_history AS
SELECT
    q.id,
    q.user_id,
    q.question_text,
    q.question_type,
    q.status,
    q.created_at as question_created_at,
    q.updated_at as question_updated_at,
    a.id as answer_id,
    a.steps,
    a.final_answer,
    a.explanation,
    a.processing_time_ms,
    a.ai_model_used,
    a.created_at as answer_created_at
FROM questions q
LEFT JOIN answers a ON q.id = a.question_id
ORDER BY q.created_at DESC;

-- Create a function to get question statistics
CREATE OR REPLACE FUNCTION get_question_stats()
RETURNS TABLE(
    total_questions BIGINT,
    completed_questions BIGINT,
    pending_questions BIGINT,
    failed_questions BIGINT,
    avg_processing_time_ms NUMERIC,
    questions_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_questions,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_questions,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_questions,
        COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_questions,
        COALESCE(AVG(a.processing_time_ms), 0)::NUMERIC as avg_processing_time_ms,
        COUNT(*) FILTER (WHERE DATE(q.created_at) = CURRENT_DATE)::BIGINT as questions_today
    FROM questions q
    LEFT JOIN answers a ON q.id = a.question_id;
END;
$$ LANGUAGE plpgsql;

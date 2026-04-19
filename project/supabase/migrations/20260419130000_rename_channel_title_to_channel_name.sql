-- Migration: Rename channel_title to channel_name in video_sessions table
-- This aligns the database schema with the TypeScript types and application code
-- Date: 2026-04-19

-- Rename the column
ALTER TABLE video_sessions
RENAME COLUMN channel_title TO channel_name;

-- Update indexes if needed (PostgreSQL handles this automatically, but explicit is better)
-- The existing index on video_sessions doesn't reference this column, so no changes needed

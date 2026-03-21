-- RPC functions to bypass PostgREST schema cache for the jobs table.
-- Run this in the Supabase SQL Editor on your production project.

-- Create a job and return its ID
CREATE OR REPLACE FUNCTION create_job(
  p_athlete_id UUID,
  p_template_id UUID,
  p_status TEXT DEFAULT 'queued',
  p_assembled_prompt TEXT DEFAULT NULL,
  p_output_filename TEXT DEFAULT NULL,
  p_retry_count INTEGER DEFAULT 0,
  p_face_score FLOAT DEFAULT NULL,
  p_video_url TEXT DEFAULT NULL,
  p_engine_used TEXT DEFAULT NULL,
  p_file_name TEXT DEFAULT NULL,
  p_reviewed_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO jobs (
    athlete_id, template_id, status, assembled_prompt, output_filename,
    retry_count, face_score, video_url, engine_used, file_name, reviewed_at
  ) VALUES (
    p_athlete_id, p_template_id, p_status, p_assembled_prompt, p_output_filename,
    p_retry_count, p_face_score, p_video_url, p_engine_used, p_file_name, p_reviewed_at
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Update a job's mutable fields
CREATE OR REPLACE FUNCTION update_job(
  p_id UUID,
  p_status TEXT DEFAULT NULL,
  p_face_score FLOAT DEFAULT NULL,
  p_video_url TEXT DEFAULT NULL,
  p_engine_used TEXT DEFAULT NULL,
  p_file_name TEXT DEFAULT NULL,
  p_retry_count INTEGER DEFAULT NULL,
  p_reviewed_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE jobs SET
    status        = COALESCE(p_status, status),
    face_score    = COALESCE(p_face_score, face_score),
    video_url     = COALESCE(p_video_url, video_url),
    engine_used   = COALESCE(p_engine_used, engine_used),
    file_name     = COALESCE(p_file_name, file_name),
    retry_count   = COALESCE(p_retry_count, retry_count),
    reviewed_at   = COALESCE(p_reviewed_at, reviewed_at)
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Batch-insert mock jobs (accepts a JSONB array)
CREATE OR REPLACE FUNCTION create_mock_jobs(p_jobs JSONB)
RETURNS SETOF UUID AS $$
DECLARE
  j JSONB;
BEGIN
  FOR j IN SELECT * FROM jsonb_array_elements(p_jobs)
  LOOP
    RETURN NEXT (
      INSERT INTO jobs (
        athlete_id, template_id, status, assembled_prompt, face_score,
        video_url, engine_used, file_name, output_filename, retry_count, reviewed_at
      ) VALUES (
        (j->>'athlete_id')::UUID,
        (j->>'template_id')::UUID,
        j->>'status',
        j->>'assembled_prompt',
        (j->>'face_score')::FLOAT,
        j->>'video_url',
        j->>'engine_used',
        j->>'file_name',
        j->>'output_filename',
        COALESCE((j->>'retry_count')::INTEGER, 0),
        CASE WHEN j->>'reviewed_at' IS NOT NULL THEN (j->>'reviewed_at')::TIMESTAMPTZ ELSE NULL END
      )
      RETURNING id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

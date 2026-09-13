ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS cover_letter_file_name text,
  ADD COLUMN IF NOT EXISTS cover_letter_file_path text,
  ADD COLUMN IF NOT EXISTS cover_letter_text text;

ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS cover_letter_score numeric,
  ADD COLUMN IF NOT EXISTS confidence text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS confidence_reason text;

ALTER TABLE public.job_descriptions
  ADD COLUMN IF NOT EXISTS industry_average_score numeric;
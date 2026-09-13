CREATE TABLE public.job_descriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  raw_text TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_skills TEXT[] NOT NULL DEFAULT '{}',
  min_experience_years NUMERIC,
  max_experience_years NUMERIC,
  education_requirement TEXT,
  role_summary TEXT,
  job_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_description_id UUID NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT,
  raw_text TEXT,
  parsed_skills TEXT[] NOT NULL DEFAULT '{}',
  parsed_education JSONB NOT NULL DEFAULT '[]'::jsonb,
  parsed_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_experience_years NUMERIC,
  current_position TEXT,
  current_company TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyzed_at TIMESTAMPTZ
);

CREATE TABLE public.match_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_description_id UUID NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  keyword_score NUMERIC NOT NULL DEFAULT 0,
  semantic_score NUMERIC NOT NULL DEFAULT 0,
  matched_skills TEXT[] NOT NULL DEFAULT '{}',
  missing_skills TEXT[] NOT NULL DEFAULT '{}',
  bonus_skills TEXT[] NOT NULL DEFAULT '{}',
  ai_summary TEXT,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  concerns TEXT[] NOT NULL DEFAULT '{}',
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id)
);

CREATE INDEX idx_candidates_jd ON public.candidates(job_description_id);
CREATE INDEX idx_match_results_jd ON public.match_results(job_description_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_descriptions TO anon, authenticated;
GRANT ALL ON public.job_descriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO anon, authenticated;
GRANT ALL ON public.candidates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_results TO anon, authenticated;
GRANT ALL ON public.match_results TO service_role;

ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public demo access to job descriptions" ON public.job_descriptions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public demo access to candidates" ON public.candidates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public demo access to match results" ON public.match_results FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_job_descriptions_updated_at BEFORE UPDATE ON public.job_descriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_match_results_updated_at BEFORE UPDATE ON public.match_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
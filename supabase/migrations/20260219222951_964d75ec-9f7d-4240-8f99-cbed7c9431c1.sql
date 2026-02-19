
-- People table
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Avatars table
CREATE TABLE public.avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE UNIQUE,
  hat_color TEXT NOT NULL DEFAULT 'none',
  top_color TEXT NOT NULL DEFAULT 'red',
  bottom_color TEXT NOT NULL DEFAULT 'blue',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Answers table (stores all prompt responses)
CREATE TABLE public.answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  room TEXT NOT NULL,
  prompt_key TEXT NOT NULL,
  value_text TEXT,
  value_number NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Votes table
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(answer_id, person_id)
);

-- Presence table
CREATE TABLE public.presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE UNIQUE,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

-- Open RLS policies (this is a family app with no auth - access controlled by password gate)
-- People
CREATE POLICY "Anyone can read people" ON public.people FOR SELECT USING (true);
CREATE POLICY "Anyone can insert people" ON public.people FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update people" ON public.people FOR UPDATE USING (true);

-- Avatars
CREATE POLICY "Anyone can read avatars" ON public.avatars FOR SELECT USING (true);
CREATE POLICY "Anyone can insert avatars" ON public.avatars FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update avatars" ON public.avatars FOR UPDATE USING (true);

-- Answers
CREATE POLICY "Anyone can read answers" ON public.answers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert answers" ON public.answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete answers" ON public.answers FOR DELETE USING (true);

-- Votes
CREATE POLICY "Anyone can read votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert votes" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete votes" ON public.votes FOR DELETE USING (true);

-- Presence
CREATE POLICY "Anyone can read presence" ON public.presence FOR SELECT USING (true);
CREATE POLICY "Anyone can upsert presence" ON public.presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update presence" ON public.presence FOR UPDATE USING (true);

-- Enable realtime for answers (notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;

-- QUIZZES
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options text[] NOT NULL,
  correct_index int NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  category text NOT NULL DEFAULT 'Bible',
  reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quizzes TO anon;
GRANT SELECT ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes are publicly readable" ON public.quizzes FOR SELECT TO anon, authenticated USING (true);

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  bio text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- QUIZ ATTEMPTS
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score int NOT NULL,
  total int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add their own attempts" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- BOOK DOWNLOADS
CREATE TABLE public.book_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  book_title text NOT NULL,
  format text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.book_downloads TO authenticated;
GRANT ALL ON public.book_downloads TO service_role;
ALTER TABLE public.book_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own downloads" ON public.book_downloads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add their own downloads" ON public.book_downloads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- TIMESTAMP TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quiz_attempts_updated_at BEFORE UPDATE ON public.quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_book_downloads_updated_at BEFORE UPDATE ON public.book_downloads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUTO PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED QUESTIONS
INSERT INTO public.quizzes (question, options, correct_index, category, reference) VALUES
('Who built the ark?', ARRAY['Moses','Noah','Abraham','David'], 1, 'Old Testament', 'Genesis 6:14'),
('How many books are in the New Testament?', ARRAY['27','39','66','24'], 0, 'Bible Basics', NULL),
('Who was thrown into the lions den?', ARRAY['Daniel','Joseph','Elijah','Jonah'], 0, 'Old Testament', 'Daniel 6'),
('What is the first book of the Bible?', ARRAY['Exodus','Psalms','Genesis','Matthew'], 2, 'Bible Basics', NULL),
('Who baptized Jesus?', ARRAY['Peter','John the Baptist','Paul','Andrew'], 1, 'New Testament', 'Matthew 3:13'),
('How many disciples did Jesus choose?', ARRAY['7','10','12','70'], 2, 'New Testament', 'Luke 6:13'),
('Which sea did Moses part?', ARRAY['Dead Sea','Red Sea','Sea of Galilee','Mediterranean'], 1, 'Old Testament', 'Exodus 14'),
('Who wrote most of the New Testament letters?', ARRAY['Paul','Peter','James','Luke'], 0, 'New Testament', NULL),
('In which town was Jesus born?', ARRAY['Nazareth','Jerusalem','Bethlehem','Capernaum'], 2, 'New Testament', 'Luke 2:4'),
('What is the shortest verse in the Bible?', ARRAY['Jesus wept.','God is love.','Pray always.','Rejoice!'], 0, 'Bible Basics', 'John 11:35'),
('Who denied Jesus three times?', ARRAY['Judas','Thomas','Peter','John'], 2, 'New Testament', 'Luke 22:34'),
('What did God create on the first day?', ARRAY['Light','Water','Animals','Man'], 0, 'Old Testament', 'Genesis 1:3');
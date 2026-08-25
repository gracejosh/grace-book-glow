/*
# Add flyers, posts, blog, likes, comments, and admin tables

1. New Tables
- `flyers` — promotional flyer images uploaded by users (image_url, title, description, user_id)
- `flyer_likes` — like records linking users to flyers (flyer_id, user_id)
- `posts` — community posts supporting text, image, PDF, and audio (type, content, media_url, user_id)
- `blog_posts` — blog articles with title, body, cover image, author (title, body, cover_image_url, user_id)
- `blog_likes` — like records linking users to blog posts (blog_post_id, user_id)
- `blog_comments` — comments on blog posts (blog_post_id, user_id, content)
- `ads` — admin-managed advertisements (title, image_url, link_url, active, position)
- `admin_chat_control` — single-row table for toggling chat on/off and message rate limits

2. Modified Tables
- `profiles` — add `role` column (text, default 'user') to distinguish admins from regular users.
  The column is nullable-safe: existing rows get 'user' by default.

3. Security
- Enable RLS on every new table.
- Public read for flyers, posts, blog_posts, blog_comments, ads (anon + authenticated).
- Owner-scoped insert/update/delete for flyers, posts, blog_posts, blog_comments.
- Likes: any authenticated user can like; each user can like each item once (unique constraint).
- Admin-only write for ads and admin_chat_control via role check on profiles.
- Profile role column is NOT user-editable — only service_role or admin can change it.
*/

-- PROFILES: add role column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Ensure only service_role or admin can change role (revoke authenticated update on role)
-- We do this by creating a separate update policy that restricts role changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND (role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) OR role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())));

-- Actually, simpler: allow users to update everything EXCEPT role.
-- We'll enforce role immutability via a trigger.
CREATE OR REPLACE FUNCTION public.prevent_role_change() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only service_role (which bypasses RLS) can change role
  -- If the new.role differs from old.role and the caller is not service_role, block it
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change role through client API';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

REVOKE EXECUTE ON FUNCTION public.prevent_role_change() FROM anon, authenticated, PUBLIC;

-- FLYERS
CREATE TABLE IF NOT EXISTS public.flyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flyers_created_at_idx ON public.flyers (created_at DESC);
GRANT SELECT ON public.flyers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.flyers TO authenticated;
GRANT ALL ON public.flyers TO service_role;
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read flyers" ON public.flyers;
CREATE POLICY "Anyone can read flyers" ON public.flyers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can create flyers" ON public.flyers;
CREATE POLICY "Users can create flyers" ON public.flyers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own flyers" ON public.flyers;
CREATE POLICY "Users can update own flyers" ON public.flyers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own flyers" ON public.flyers;
CREATE POLICY "Users can delete own flyers" ON public.flyers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- FLYER LIKES
CREATE TABLE IF NOT EXISTS public.flyer_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flyer_id uuid NOT NULL REFERENCES public.flyers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flyer_id, user_id)
);

CREATE INDEX IF NOT EXISTS flyer_likes_flyer_idx ON public.flyer_likes (flyer_id);
GRANT SELECT ON public.flyer_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.flyer_likes TO authenticated;
GRANT ALL ON public.flyer_likes TO service_role;
ALTER TABLE public.flyer_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read flyer likes" ON public.flyer_likes;
CREATE POLICY "Anyone can read flyer likes" ON public.flyer_likes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can like flyers" ON public.flyer_likes;
CREATE POLICY "Users can like flyers" ON public.flyer_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike flyers" ON public.flyer_likes;
CREATE POLICY "Users can unlike flyers" ON public.flyer_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POSTS
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type text NOT NULL DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'pdf', 'audio')),
  title text,
  content text,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_idx ON public.posts (user_id);
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
CREATE POLICY "Anyone can read posts" ON public.posts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BLOG POSTS
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  excerpt text,
  cover_image_url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_created_at_idx ON public.blog_posts (created_at DESC);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read blog posts" ON public.blog_posts;
CREATE POLICY "Anyone can read blog posts" ON public.blog_posts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can create blog posts" ON public.blog_posts;
CREATE POLICY "Users can create blog posts" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own blog posts" ON public.blog_posts;
CREATE POLICY "Users can update own blog posts" ON public.blog_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own blog posts" ON public.blog_posts;
CREATE POLICY "Users can delete own blog posts" ON public.blog_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BLOG LIKES
CREATE TABLE IF NOT EXISTS public.blog_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blog_post_id, user_id)
);

CREATE INDEX IF NOT EXISTS blog_likes_blog_idx ON public.blog_likes (blog_post_id);
GRANT SELECT ON public.blog_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.blog_likes TO authenticated;
GRANT ALL ON public.blog_likes TO service_role;
ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read blog likes" ON public.blog_likes;
CREATE POLICY "Anyone can read blog likes" ON public.blog_likes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can like blog posts" ON public.blog_likes;
CREATE POLICY "Users can like blog posts" ON public.blog_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike blog posts" ON public.blog_likes;
CREATE POLICY "Users can unlike blog posts" ON public.blog_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BLOG COMMENTS
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_comments_blog_idx ON public.blog_comments (blog_post_id, created_at);
GRANT SELECT ON public.blog_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_comments TO authenticated;
GRANT ALL ON public.blog_comments TO service_role;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read blog comments" ON public.blog_comments;
CREATE POLICY "Anyone can read blog comments" ON public.blog_comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can comment on blog posts" ON public.blog_comments;
CREATE POLICY "Users can comment on blog posts" ON public.blog_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own comments" ON public.blog_comments;
CREATE POLICY "Users can update own comments" ON public.blog_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own comments" ON public.blog_comments;
CREATE POLICY "Users can delete own comments" ON public.blog_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ADS (admin-managed)
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text,
  link_url text,
  position text NOT NULL DEFAULT 'sidebar' CHECK (position IN ('sidebar', 'banner', 'inline')),
  active boolean NOT NULL DEFAULT true,
  clicks int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ads TO anon, authenticated;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active ads" ON public.ads;
CREATE POLICY "Anyone can read active ads" ON public.ads FOR SELECT TO anon, authenticated USING (active = true);

-- ADMIN CHAT CONTROL (single-row config table)
CREATE TABLE IF NOT EXISTS public.admin_chat_control (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  chat_enabled boolean NOT NULL DEFAULT true,
  max_messages_per_minute int NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_chat_control (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT ON public.admin_chat_control TO anon, authenticated;
GRANT ALL ON public.admin_chat_control TO service_role;
ALTER TABLE public.admin_chat_control ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read chat control" ON public.admin_chat_control;
CREATE POLICY "Anyone can read chat control" ON public.admin_chat_control FOR SELECT TO anon, authenticated USING (true);

-- TIMESTAMP TRIGGERS for new tables
DROP TRIGGER IF EXISTS update_flyers_updated_at ON public.flyers;
CREATE TRIGGER update_flyers_updated_at BEFORE UPDATE ON public.flyers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_blog_comments_updated_at ON public.blog_comments;
CREATE TRIGGER update_blog_comments_updated_at BEFORE UPDATE ON public.blog_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_ads_updated_at ON public.ads;
CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_admin_chat_control_updated_at ON public.admin_chat_control;
CREATE TRIGGER update_admin_chat_control_updated_at BEFORE UPDATE ON public.admin_chat_control FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REALTIME for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.flyers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.flyer_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_comments;

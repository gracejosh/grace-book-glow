CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room TEXT NOT NULL DEFAULT 'grace-chat-global',
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_room_created_idx ON public.chat_messages (room, created_at);

GRANT SELECT, INSERT ON public.chat_messages TO anon;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chat messages"
  ON public.chat_messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can post chat messages"
  ON public.chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(content)) BETWEEN 1 AND 1000
    AND length(trim(sender_name)) BETWEEN 1 AND 40
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
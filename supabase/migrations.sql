-- ============================================================
-- FocusSync — Feature Migration
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. chat_messages에 sender 정보 추가 (realtime 메시지에서 사용자 정보 보여주기)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS sender_name   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sender_avatar TEXT;

-- 2. users에 목표 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS daily_goal_minutes    INTEGER NOT NULL DEFAULT 360,
  ADD COLUMN IF NOT EXISTS weekly_goal_sessions  INTEGER NOT NULL DEFAULT 10;

-- 3. 친구 관계 테이블
CREATE TABLE IF NOT EXISTS public.friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY IF NOT EXISTS "Users send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY IF NOT EXISTS "Addressee can update status"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id);

-- 4. 알림 테이블
CREATE TABLE IF NOT EXISTS public.notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL, -- 'friend_studying', 'friend_joined_room', 'friend_request', 'request_accepted'
  from_user_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  from_user_name TEXT,
  message        TEXT NOT NULL,
  read           BOOLEAN NOT NULL DEFAULT FALSE,
  room_id        UUID REFERENCES public.study_rooms(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Anyone insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Users mark own read"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 5. Realtime 활성화 (필수!)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;

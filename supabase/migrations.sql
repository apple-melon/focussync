-- ============================================================
-- FocusSync — Feature Migration v1
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
  type           TEXT NOT NULL,
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

-- ============================================================
-- Migration v2: 스트릭·레벨·집중시간·채팅 버그 수정
-- ============================================================

-- 2-1. update_streak 버그 수정: 연속 날짜 로직 교정
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_date DATE;
  v_today     DATE := CURRENT_DATE;
BEGIN
  SELECT last_study_date INTO v_last_date FROM public.users WHERE id = p_user_id;

  IF v_last_date = v_today THEN
    -- 오늘 이미 업데이트됨 → 스킵
    RETURN;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    -- 어제 공부함 → 연속 +1
    UPDATE public.users
    SET streak_days = streak_days + 1, last_study_date = v_today, updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- 처음이거나 스트릭 끊김 → 1로 리셋
    UPDATE public.users
    SET streak_days = 1, last_study_date = v_today, updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- 2-2. award_xp 수정: level 컬럼도 함께 업데이트
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id    UUID,
  p_amount     INTEGER,
  p_reason     TEXT,
  p_session_id UUID DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_xp INTEGER;
BEGIN
  UPDATE public.users
  SET xp = xp + p_amount,
      level = FLOOR(SQRT((xp + p_amount)::NUMERIC / 100)) + 1,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  INSERT INTO public.xp_logs (user_id, amount, reason, session_id)
  VALUES (p_user_id, p_amount, p_reason, p_session_id);

  PERFORM public.update_streak(p_user_id);
  RETURN v_new_xp;
END;
$$;

-- 2-3. 세션 종료 RPC: study_sessions 업데이트 + total_focus_minutes 누적
CREATE OR REPLACE FUNCTION public.end_study_session(
  p_session_id    UUID,
  p_user_id       UUID,
  p_focus_minutes INTEGER
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.study_sessions
  SET ended_at = NOW(), focus_minutes = p_focus_minutes
  WHERE id = p_session_id AND user_id = p_user_id;

  IF p_focus_minutes > 0 THEN
    UPDATE public.users
    SET total_focus_minutes = total_focus_minutes + p_focus_minutes, updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- 2-4. 일일 방문 체크인: 스트릭 업데이트 + 현재 streak 반환
CREATE OR REPLACE FUNCTION public.daily_checkin(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_streak INTEGER;
BEGIN
  PERFORM public.update_streak(p_user_id);
  SELECT streak_days INTO v_streak FROM public.users WHERE id = p_user_id;
  RETURN jsonb_build_object('streak_days', v_streak);
END;
$$;

-- 2-5. 업적 체크 수정: level 기반 체크 + marathon·room_host 추가
CREATE OR REPLACE FUNCTION public.check_and_grant_achievements(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user          public.users%ROWTYPE;
  v_achievement   public.achievement_definitions%ROWTYPE;
  v_new           JSONB := '[]'::JSONB;
  v_session_count INTEGER;
  v_has_room      BOOLEAN;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  SELECT COUNT(*) INTO v_session_count
    FROM public.study_sessions WHERE user_id = p_user_id AND focus_minutes > 0;
  SELECT EXISTS(SELECT 1 FROM public.study_rooms WHERE host_id = p_user_id LIMIT 1)
    INTO v_has_room;

  FOR v_achievement IN SELECT * FROM public.achievement_definitions LOOP
    IF EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) THEN
      CONTINUE;
    END IF;

    IF (v_achievement.key = 'first_session'  AND v_session_count >= 1)          OR
       (v_achievement.key = 'streak_3'       AND v_user.streak_days >= 3)       OR
       (v_achievement.key = 'streak_7'       AND v_user.streak_days >= 7)       OR
       (v_achievement.key = 'streak_30'      AND v_user.streak_days >= 30)      OR
       (v_achievement.key = 'level_5'        AND v_user.level >= 5)             OR
       (v_achievement.key = 'level_10'       AND v_user.level >= 10)            OR
       (v_achievement.key = 'level_25'       AND v_user.level >= 25)            OR
       (v_achievement.key = 'room_host'      AND v_has_room)                    OR
       (v_achievement.key = 'marathon'       AND v_user.total_focus_minutes >= 240)
    THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id) ON CONFLICT DO NOTHING;
      UPDATE public.users
        SET xp = xp + v_achievement.xp_reward,
            level = FLOOR(SQRT((xp + v_achievement.xp_reward)::NUMERIC / 100)) + 1
        WHERE id = p_user_id;
      v_new := v_new || jsonb_build_object(
        'id', v_achievement.id, 'key', v_achievement.key,
        'name', v_achievement.name, 'icon', v_achievement.icon, 'xp_reward', v_achievement.xp_reward
      );
    END IF;
  END LOOP;

  RETURN v_new;
END;
$$;

-- 2-6. 채팅 메시지 24시간 자동 정리 함수
CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  DELETE FROM public.chat_messages WHERE created_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN COALESCE(v_count, 0);
END;
$$;

-- 채팅 삭제 정책 (cleanup 함수용)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_messages' AND policyname = 'Service cleanup old messages'
  ) THEN
    CREATE POLICY "Service cleanup old messages"
      ON public.chat_messages FOR DELETE USING (true);
  END IF;
END $$;

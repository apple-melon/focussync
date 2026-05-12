-- ============================================================
-- FocusSync Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Users (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  display_name    TEXT NOT NULL DEFAULT 'Anonymous',
  avatar_url      TEXT,
  xp              INTEGER NOT NULL DEFAULT 0,
  level           INTEGER NOT NULL DEFAULT 1,
  streak_days     INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  total_focus_minutes INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Study rooms
CREATE TABLE IF NOT EXISTS public.study_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  host_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  max_participants INTEGER NOT NULL DEFAULT 20,
  status          TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','ended')),
  topic           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Study sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID REFERENCES public.study_rooms(id) ON DELETE SET NULL,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  focus_minutes   INTEGER NOT NULL DEFAULT 0,
  xp_earned       INTEGER NOT NULL DEFAULT 0
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- XP logs
CREATE TABLE IF NOT EXISTS public.xp_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  session_id      UUID REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Achievement definitions
CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  icon            TEXT NOT NULL DEFAULT '🏆',
  xp_reward       INTEGER NOT NULL DEFAULT 0,
  rarity          TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary'))
);

-- User achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Rankings
CREATE TABLE IF NOT EXISTS public.rankings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period          TEXT NOT NULL CHECK (period IN ('daily','weekly','all_time')),
  rank            INTEGER NOT NULL,
  xp              INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles"       ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"      ON public.users FOR UPDATE USING (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Public rooms are viewable"         ON public.study_rooms FOR SELECT USING (is_public OR host_id = auth.uid());
CREATE POLICY "Authenticated users can create"    ON public.study_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their rooms"      ON public.study_rooms FOR UPDATE USING (auth.uid() = host_id);

-- Chat policies
CREATE POLICY "Room members can read chat"        ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated can send messages"   ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users view own sessions"           ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own sessions"         ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions"         ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id);

-- XP logs
CREATE POLICY "Users view own xp logs"            ON public.xp_logs FOR SELECT USING (auth.uid() = user_id);

-- Achievements
CREATE POLICY "Achievements are public"           ON public.achievement_definitions FOR SELECT USING (true);
CREATE POLICY "Users view own achievements"       ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Rankings
CREATE POLICY "Rankings are public"               ON public.rankings FOR SELECT USING (true);

-- ============================================================
-- Functions
-- ============================================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Award XP
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id   UUID,
  p_amount    INTEGER,
  p_reason    TEXT,
  p_session_id UUID DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_xp INTEGER;
BEGIN
  UPDATE public.users SET xp = xp + p_amount, updated_at = NOW()
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  INSERT INTO public.xp_logs (user_id, amount, reason, session_id)
  VALUES (p_user_id, p_amount, p_reason, p_session_id);

  PERFORM public.update_streak(p_user_id);

  RETURN v_new_xp;
END;
$$;

-- Update streak
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_date DATE;
  v_today     DATE := CURRENT_DATE;
BEGIN
  SELECT last_study_date INTO v_last_date FROM public.users WHERE id = p_user_id;

  IF v_last_date IS NULL OR v_last_date < v_today - INTERVAL '1 day' THEN
    UPDATE public.users
    SET streak_days = CASE WHEN v_last_date = v_today - INTERVAL '1 day' THEN streak_days + 1 ELSE 1 END,
        last_study_date = v_today,
        total_focus_minutes = total_focus_minutes,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Check and grant achievements
CREATE OR REPLACE FUNCTION public.check_and_grant_achievements(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user          public.users%ROWTYPE;
  v_achievement   public.achievement_definitions%ROWTYPE;
  v_new           JSONB := '[]'::JSONB;
  v_session_count INTEGER;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  SELECT COUNT(*) INTO v_session_count FROM public.study_sessions WHERE user_id = p_user_id AND focus_minutes > 0;

  FOR v_achievement IN SELECT * FROM public.achievement_definitions LOOP
    IF EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = v_achievement.id) THEN
      CONTINUE;
    END IF;

    IF (v_achievement.key = 'first_session'   AND v_session_count >= 1)   OR
       (v_achievement.key = 'streak_3'        AND v_user.streak_days >= 3) OR
       (v_achievement.key = 'streak_7'        AND v_user.streak_days >= 7) OR
       (v_achievement.key = 'streak_30'       AND v_user.streak_days >= 30) OR
       (v_achievement.key = 'level_5'         AND v_user.level >= 5)       OR
       (v_achievement.key = 'level_10'        AND v_user.level >= 10)      OR
       (v_achievement.key = 'level_25'        AND v_user.level >= 25)
    THEN
      INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (p_user_id, v_achievement.id);
      UPDATE public.users SET xp = xp + v_achievement.xp_reward WHERE id = p_user_id;
      v_new := v_new || jsonb_build_object(
        'id', v_achievement.id, 'key', v_achievement.key,
        'name', v_achievement.name, 'icon', v_achievement.icon, 'xp_reward', v_achievement.xp_reward
      );
    END IF;
  END LOOP;

  RETURN v_new;
END;
$$;

-- ============================================================
-- Seed: Achievement definitions
-- ============================================================

INSERT INTO public.achievement_definitions (key, name, description, icon, xp_reward, rarity) VALUES
  ('first_session',    '첫 집중!',          '첫 번째 공부 세션을 완료했어요.',         '🎯', 100, 'common'),
  ('streak_3',         '3일 연속',          '3일 연속으로 공부했어요.',               '🔥', 150, 'common'),
  ('streak_7',         '일주일 챔피언',      '7일 연속으로 공부했어요.',               '🏅', 300, 'rare'),
  ('streak_30',        '한 달의 전사',       '30일 연속으로 공부했어요!',              '💎', 1000, 'legendary'),
  ('level_5',          '레벨 5 달성',        '레벨 5에 도달했어요.',                  '⭐', 200, 'common'),
  ('level_10',         '레벨 10 달성',       '레벨 10에 도달했어요.',                 '🌟', 500, 'rare'),
  ('level_25',         '레벨 25 달성',       '레벨 25에 도달했어요. 에픽 달성!',       '✨', 1500, 'epic'),
  ('room_host',        '첫 방장',           '처음으로 집중방을 만들었어요.',            '🏠', 100, 'common'),
  ('marathon',         '마라토너',           '하루 4시간 이상 공부했어요.',             '🏃', 500, 'rare')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- FocusSync — Feature Migration v1
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. chat_messages에 sender 정보 추가
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='Users see own friendships') THEN
    CREATE POLICY "Users see own friendships" ON public.friendships FOR SELECT
      USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='Users send friend requests') THEN
    CREATE POLICY "Users send friend requests" ON public.friendships FOR INSERT
      WITH CHECK (auth.uid() = requester_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='Addressee can update status') THEN
    CREATE POLICY "Addressee can update status" ON public.friendships FOR UPDATE
      USING (auth.uid() = addressee_id);
  END IF;
END $$;

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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users see own notifications') THEN
    CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Anyone insert notifications') THEN
    CREATE POLICY "Anyone insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users mark own read') THEN
    CREATE POLICY "Users mark own read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Realtime 활성화 (필수!)
DO $$ BEGIN
  PERFORM pg_catalog.set_config('search_path', 'public', false);
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
    RETURN; -- 오늘 이미 업데이트됨
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    UPDATE public.users
    SET streak_days = streak_days + 1, last_study_date = v_today, updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
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
DECLARE v_streak INTEGER;
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

    IF (v_achievement.key = 'first_session'  AND v_session_count >= 1)               OR
       (v_achievement.key = 'streak_3'       AND v_user.streak_days >= 3)            OR
       (v_achievement.key = 'streak_7'       AND v_user.streak_days >= 7)            OR
       (v_achievement.key = 'streak_30'      AND v_user.streak_days >= 30)           OR
       (v_achievement.key = 'level_5'        AND v_user.level >= 5)                  OR
       (v_achievement.key = 'level_10'       AND v_user.level >= 10)                 OR
       (v_achievement.key = 'level_25'       AND v_user.level >= 25)                 OR
       (v_achievement.key = 'room_host'      AND v_has_room)                         OR
       (v_achievement.key = 'marathon'       AND v_user.total_focus_minutes >= 240)
    THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id) ON CONFLICT DO NOTHING;
      UPDATE public.users
        SET xp    = xp + v_achievement.xp_reward,
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

-- ============================================================
-- Migration v3: 코인 시스템 + 상점
-- ============================================================

-- 3-1. users 테이블 코인 관련 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS coins                INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_boost_until       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coin_boost_until     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS streak_shield        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_coin_claim_date DATE;

-- 3-2. 코인 거래 로그
CREATE TABLE IF NOT EXISTS public.coin_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.coin_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coin_logs' AND policyname='Users see own coin logs') THEN
    CREATE POLICY "Users see own coin logs" ON public.coin_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3-3. 상점 아이템 카탈로그
CREATE TABLE IF NOT EXISTS public.shop_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key            TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL,
  icon           TEXT NOT NULL,
  price          INTEGER NOT NULL,
  category       TEXT NOT NULL DEFAULT 'consumable',
  duration_hours INTEGER,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shop_items' AND policyname='Anyone can read shop items') THEN
    CREATE POLICY "Anyone can read shop items" ON public.shop_items FOR SELECT USING (TRUE);
  END IF;
END $$;

-- 3-4. 유저 구매 아이템
CREATE TABLE IF NOT EXISTS public.user_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id      UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_items' AND policyname='Users see own items') THEN
    CREATE POLICY "Users see own items" ON public.user_items FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3-5. 코인 지급 함수 (부스터 적용)
CREATE OR REPLACE FUNCTION public.award_coins(
  p_user_id UUID,
  p_amount  INTEGER,
  p_reason  TEXT
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_coins INTEGER;
  v_boosted   INTEGER;
BEGIN
  SELECT CASE WHEN coin_boost_until IS NOT NULL AND coin_boost_until > NOW()
              THEN p_amount * 2 ELSE p_amount END
    INTO v_boosted FROM public.users WHERE id = p_user_id;

  UPDATE public.users
  SET coins = coins + v_boosted, updated_at = NOW()
  WHERE id = p_user_id
  RETURNING coins INTO v_new_coins;

  INSERT INTO public.coin_logs (user_id, amount, reason)
  VALUES (p_user_id, v_boosted, p_reason);

  RETURN COALESCE(v_new_coins, 0);
END;
$$;

-- 3-6. update_streak 재정의 (방패 소비 + 10일 마일스톤 코인)
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_date  DATE;
  v_today      DATE := CURRENT_DATE;
  v_new_streak INTEGER;
  v_has_shield BOOLEAN;
BEGIN
  SELECT last_study_date, streak_shield > 0
    INTO v_last_date, v_has_shield
    FROM public.users WHERE id = p_user_id;

  IF v_last_date = v_today THEN
    RETURN;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    UPDATE public.users
    SET streak_days = streak_days + 1, last_study_date = v_today, updated_at = NOW()
    WHERE id = p_user_id
    RETURNING streak_days INTO v_new_streak;
    IF v_new_streak % 10 = 0 THEN
      PERFORM public.award_coins(p_user_id, 50, 'streak_milestone_' || v_new_streak);
    END IF;
  ELSE
    IF v_has_shield THEN
      UPDATE public.users
      SET streak_shield = streak_shield - 1, last_study_date = v_today, updated_at = NOW()
      WHERE id = p_user_id;
    ELSE
      UPDATE public.users
      SET streak_days = 1, last_study_date = v_today, updated_at = NOW()
      WHERE id = p_user_id;
    END IF;
  END IF;
END;
$$;

-- 3-7. award_xp 재정의 (XP 부스터 1.5배 적용)
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id    UUID,
  p_amount     INTEGER,
  p_reason     TEXT,
  p_session_id UUID DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_xp  INTEGER;
  v_boosted INTEGER;
BEGIN
  SELECT CASE WHEN xp_boost_until IS NOT NULL AND xp_boost_until > NOW()
              THEN ROUND(p_amount * 1.5) ELSE p_amount END
    INTO v_boosted FROM public.users WHERE id = p_user_id;

  UPDATE public.users
  SET xp = xp + v_boosted,
      level = FLOOR(SQRT((xp + v_boosted)::NUMERIC / 100)) + 1,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  INSERT INTO public.xp_logs (user_id, amount, reason, session_id)
  VALUES (p_user_id, v_boosted, p_reason, p_session_id);

  PERFORM public.update_streak(p_user_id);
  RETURN COALESCE(v_new_xp, 0);
END;
$$;

-- 3-8. daily_checkin 재정의 (일일 코인 +10, 중복 방지)
CREATE OR REPLACE FUNCTION public.daily_checkin(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_streak     INTEGER;
  v_coins      INTEGER;
  v_today      DATE := CURRENT_DATE;
  v_last_claim DATE;
BEGIN
  PERFORM public.update_streak(p_user_id);
  SELECT streak_days, coins, last_coin_claim_date
    INTO v_streak, v_coins, v_last_claim
    FROM public.users WHERE id = p_user_id;

  IF v_last_claim IS DISTINCT FROM v_today THEN
    UPDATE public.users SET last_coin_claim_date = v_today WHERE id = p_user_id;
    PERFORM public.award_coins(p_user_id, 10, 'daily_login');
    SELECT coins INTO v_coins FROM public.users WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object('streak_days', v_streak, 'coins', v_coins);
END;
$$;

-- 3-9. end_study_session 재정의 (세션 코인 +5, 목표 달성 코인 +20)
CREATE OR REPLACE FUNCTION public.end_study_session(
  p_session_id    UUID,
  p_user_id       UUID,
  p_focus_minutes INTEGER
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_goal_minutes INTEGER;
  v_today_total  INTEGER;
BEGIN
  UPDATE public.study_sessions
  SET ended_at = NOW(), focus_minutes = p_focus_minutes
  WHERE id = p_session_id AND user_id = p_user_id;

  IF p_focus_minutes > 0 THEN
    UPDATE public.users
    SET total_focus_minutes = total_focus_minutes + p_focus_minutes, updated_at = NOW()
    WHERE id = p_user_id;

    PERFORM public.award_coins(p_user_id, 5, 'session_complete');

    SELECT daily_goal_minutes INTO v_goal_minutes FROM public.users WHERE id = p_user_id;
    SELECT COALESCE(SUM(ss.focus_minutes), 0) INTO v_today_total
      FROM public.study_sessions ss
      WHERE ss.user_id = p_user_id
        AND ss.started_at >= CURRENT_DATE::TIMESTAMPTZ
        AND ss.focus_minutes IS NOT NULL;

    IF v_today_total >= v_goal_minutes AND (v_today_total - p_focus_minutes) < v_goal_minutes THEN
      PERFORM public.award_coins(p_user_id, 20, 'daily_goal');
    END IF;
  END IF;
END;
$$;

-- 3-10. check_and_grant_achievements 재정의 (업적당 코인 +15)
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
    ) THEN CONTINUE; END IF;

    IF (v_achievement.key = 'first_session'  AND v_session_count >= 1)      OR
       (v_achievement.key = 'streak_3'       AND v_user.streak_days >= 3)   OR
       (v_achievement.key = 'streak_7'       AND v_user.streak_days >= 7)   OR
       (v_achievement.key = 'streak_30'      AND v_user.streak_days >= 30)  OR
       (v_achievement.key = 'level_5'        AND v_user.level >= 5)         OR
       (v_achievement.key = 'level_10'       AND v_user.level >= 10)        OR
       (v_achievement.key = 'level_25'       AND v_user.level >= 25)        OR
       (v_achievement.key = 'room_host'      AND v_has_room)                OR
       (v_achievement.key = 'marathon'       AND v_user.total_focus_minutes >= 240)
    THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id) ON CONFLICT DO NOTHING;
      UPDATE public.users
        SET xp    = xp + v_achievement.xp_reward,
            level = FLOOR(SQRT((xp + v_achievement.xp_reward)::NUMERIC / 100)) + 1
        WHERE id = p_user_id;
      PERFORM public.award_coins(p_user_id, 15, 'achievement:' || v_achievement.key);
      v_new := v_new || jsonb_build_object(
        'id', v_achievement.id, 'key', v_achievement.key,
        'name', v_achievement.name, 'icon', v_achievement.icon, 'xp_reward', v_achievement.xp_reward
      );
    END IF;
  END LOOP;
  RETURN v_new;
END;
$$;

-- 3-11. 아이템 구매 RPC (auth.uid() 기반 보안)
CREATE OR REPLACE FUNCTION public.purchase_item(p_item_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item    public.shop_items%ROWTYPE;
  v_coins   INTEGER;
  v_expires TIMESTAMPTZ;
  v_item_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_item FROM public.shop_items WHERE key = p_item_key AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  SELECT coins INTO v_coins FROM public.users WHERE id = v_user_id;
  IF v_coins < v_item.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough coins');
  END IF;

  UPDATE public.users SET coins = coins - v_item.price, updated_at = NOW() WHERE id = v_user_id;
  INSERT INTO public.coin_logs (user_id, amount, reason)
  VALUES (v_user_id, -v_item.price, 'purchase:' || p_item_key);

  IF v_item.duration_hours IS NOT NULL THEN
    v_expires := NOW() + (v_item.duration_hours || ' hours')::INTERVAL;
  END IF;

  INSERT INTO public.user_items (user_id, item_id, expires_at, is_active)
  VALUES (v_user_id, v_item.id, v_expires, TRUE)
  RETURNING id INTO v_item_id;

  IF p_item_key = 'xp_booster' THEN
    UPDATE public.users SET xp_boost_until =
      CASE WHEN xp_boost_until IS NOT NULL AND xp_boost_until > NOW()
           THEN xp_boost_until + (v_item.duration_hours || ' hours')::INTERVAL
           ELSE NOW() + (v_item.duration_hours || ' hours')::INTERVAL END
    WHERE id = v_user_id;
  ELSIF p_item_key = 'coin_booster' THEN
    UPDATE public.users SET coin_boost_until =
      CASE WHEN coin_boost_until IS NOT NULL AND coin_boost_until > NOW()
           THEN coin_boost_until + (v_item.duration_hours || ' hours')::INTERVAL
           ELSE NOW() + (v_item.duration_hours || ' hours')::INTERVAL END
    WHERE id = v_user_id;
  ELSIF p_item_key = 'streak_shield' THEN
    UPDATE public.users SET streak_shield = streak_shield + 1 WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'item_id', v_item_id,
    'remaining_coins', (SELECT coins FROM public.users WHERE id = v_user_id)
  );
END;
$$;

-- 3-12. 상점 아이템 시드
INSERT INTO public.shop_items (key, name, description, icon, price, category, duration_hours, sort_order)
VALUES
  ('streak_shield', '스트릭 방패',   '스트릭이 끊길 위기에서 한 번 보호해줘요. 여러 개 보유 가능해요.',  '🛡️', 100, 'consumable', NULL, 1),
  ('xp_booster',    'XP 부스터',     '24시간 동안 XP를 1.5배 획득해요. 중복 구매 시 시간이 연장돼요.',    '⚡',  150, 'consumable', 24,   2),
  ('coin_booster',  '코인 부스터',   '24시간 동안 코인을 2배로 획득해요. 중복 구매 시 시간이 연장돼요.',  '💰',  100, 'consumable', 24,   3),
  ('timer_flame',   '불꽃 타이머',   '활활 타오르는 불꽃 테마 타이머예요. (출시 예정)',                    '🔥',  300, 'cosmetic',  NULL,  4),
  ('timer_ocean',   '오션 타이머',   '파도치는 오션 테마 타이머예요. (출시 예정)',                         '🌊',  300, 'cosmetic',  NULL,  5),
  ('timer_sakura',  '벚꽃 타이머',   '흩날리는 벚꽃 테마 타이머예요. (출시 예정)',                        '🌸',  300, 'cosmetic',  NULL,  6),
  ('gold_nickname', '골드 닉네임',   '닉네임이 금빛으로 빛나요. (출시 예정)',                             '✨',  500, 'cosmetic',  NULL,  7)
ON CONFLICT (key) DO NOTHING;

-- 3-13. Realtime 활성화
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Migration v4: 스킨 시스템 + 스트릭 코인 스케일링 + 구매 제한
-- ============================================================

-- 4-1. active_skin 컬럼 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_skin TEXT NOT NULL DEFAULT 'default';

-- 4-2. 스킨 "(출시 예정)" 텍스트 제거 (이제 실제 작동)
UPDATE public.shop_items
SET description = REPLACE(description, '. (출시 예정)', '')
WHERE category = 'cosmetic';

-- 4-3. update_streak 재정의: 스트릭 × 1.2 비례 코인 (최대 500)
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_date       DATE;
  v_today           DATE := CURRENT_DATE;
  v_new_streak      INTEGER;
  v_has_shield      BOOLEAN;
  v_milestone_coins INTEGER;
BEGIN
  SELECT last_study_date, streak_shield > 0
    INTO v_last_date, v_has_shield
    FROM public.users WHERE id = p_user_id;

  IF v_last_date = v_today THEN
    RETURN;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    UPDATE public.users
    SET streak_days = streak_days + 1, last_study_date = v_today, updated_at = NOW()
    WHERE id = p_user_id
    RETURNING streak_days INTO v_new_streak;
    IF v_new_streak % 10 = 0 THEN
      v_milestone_coins := LEAST(ROUND(v_new_streak::NUMERIC * 1.2)::INTEGER, 500);
      PERFORM public.award_coins(p_user_id, v_milestone_coins, 'streak_milestone_' || v_new_streak);
    END IF;
  ELSE
    IF v_has_shield THEN
      UPDATE public.users
      SET streak_shield = streak_shield - 1, last_study_date = v_today, updated_at = NOW()
      WHERE id = p_user_id;
    ELSE
      UPDATE public.users
      SET streak_days = 1, last_study_date = v_today, updated_at = NOW()
      WHERE id = p_user_id;
    END IF;
  END IF;
END;
$$;

-- 4-4. purchase_item 재정의: 최대 보유 제한 + 스킨 자동 활성화
CREATE OR REPLACE FUNCTION public.purchase_item(p_item_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_item        public.shop_items%ROWTYPE;
  v_coins       INTEGER;
  v_expires     TIMESTAMPTZ;
  v_item_id     UUID;
  v_shield_count INTEGER;
  v_already_owns BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_item FROM public.shop_items WHERE key = p_item_key AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- 스킨: 이미 보유 중이면 구매 불가
  IF v_item.category = 'cosmetic' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_items ui
      WHERE ui.user_id = v_user_id AND ui.item_id = v_item.id AND ui.is_active = TRUE
    ) INTO v_already_owns;
    IF v_already_owns THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already owned');
    END IF;
  END IF;

  -- 소모품 최대 보유 제한
  IF p_item_key = 'streak_shield' THEN
    SELECT streak_shield INTO v_shield_count FROM public.users WHERE id = v_user_id;
    IF v_shield_count >= 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Max shields reached (5)');
    END IF;
  ELSIF p_item_key = 'xp_booster' THEN
    IF (SELECT xp_boost_until IS NOT NULL AND xp_boost_until > NOW() FROM public.users WHERE id = v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'XP booster already active');
    END IF;
  ELSIF p_item_key = 'coin_booster' THEN
    IF (SELECT coin_boost_until IS NOT NULL AND coin_boost_until > NOW() FROM public.users WHERE id = v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Coin booster already active');
    END IF;
  END IF;

  SELECT coins INTO v_coins FROM public.users WHERE id = v_user_id;
  IF v_coins < v_item.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough coins');
  END IF;

  UPDATE public.users SET coins = coins - v_item.price, updated_at = NOW() WHERE id = v_user_id;
  INSERT INTO public.coin_logs (user_id, amount, reason)
  VALUES (v_user_id, -v_item.price, 'purchase:' || p_item_key);

  IF v_item.duration_hours IS NOT NULL THEN
    v_expires := NOW() + (v_item.duration_hours || ' hours')::INTERVAL;
  END IF;

  INSERT INTO public.user_items (user_id, item_id, expires_at, is_active)
  VALUES (v_user_id, v_item.id, v_expires, TRUE)
  RETURNING id INTO v_item_id;

  IF p_item_key = 'xp_booster' THEN
    UPDATE public.users SET xp_boost_until = v_expires WHERE id = v_user_id;
  ELSIF p_item_key = 'coin_booster' THEN
    UPDATE public.users SET coin_boost_until = v_expires WHERE id = v_user_id;
  ELSIF p_item_key = 'streak_shield' THEN
    UPDATE public.users SET streak_shield = streak_shield + 1 WHERE id = v_user_id;
  ELSIF v_item.category = 'cosmetic' THEN
    UPDATE public.users SET active_skin = p_item_key WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'item_id', v_item_id,
    'remaining_coins', (SELECT coins FROM public.users WHERE id = v_user_id)
  );
END;
$$;

-- 4-5. 스킨 활성화 RPC
CREATE OR REPLACE FUNCTION public.activate_skin(p_skin_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owned   BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_skin_key = 'default' THEN
    UPDATE public.users SET active_skin = 'default' WHERE id = v_user_id;
    RETURN jsonb_build_object('success', true);
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_items ui
    JOIN public.shop_items si ON ui.item_id = si.id
    WHERE ui.user_id = v_user_id AND si.key = p_skin_key AND si.category = 'cosmetic' AND ui.is_active = TRUE
  ) INTO v_owned;

  IF NOT v_owned THEN
    RETURN jsonb_build_object('success', false, 'error', 'Skin not owned');
  END IF;

  UPDATE public.users SET active_skin = p_skin_key WHERE id = v_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

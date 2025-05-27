-- Migration: create rewards, user_levels, reward_redemptions and redeem_reward RPC

-- 1. rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text NOT NULL,
  points_cost integer NOT NULL CHECK (points_cost > 0),
  category text NOT NULL,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. user_levels table
CREATE TABLE IF NOT EXISTS user_levels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_name text NOT NULL,
  threshold integer NOT NULL CHECK (threshold >= 0),
  benefits text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. reward_redemptions table
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_id uuid REFERENCES rewards(id) ON DELETE CASCADE NOT NULL,
  points_used integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  redemption_date timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Row level security
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Allow all users to select rewards & user_levels
CREATE POLICY rewards_select ON rewards FOR SELECT USING (true);
CREATE POLICY user_levels_select ON user_levels FOR SELECT USING (true);

-- Users can select/insert their own redemptions
CREATE POLICY reward_redemptions_select ON reward_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY reward_redemptions_insert ON reward_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. RPC: redeem_reward
-- Safe atomic procedure deducting points and inserting redemption
CREATE OR REPLACE FUNCTION public.redeem_reward(p_user_id uuid, p_reward_id uuid)
RETURNS void AS $$
DECLARE
  v_points_cost integer;
  v_total_points integer;
BEGIN
  -- Get reward cost
  SELECT points_cost INTO v_points_cost FROM rewards WHERE id = p_reward_id AND active = true;
  IF v_points_cost IS NULL THEN
    RAISE EXCEPTION 'Reward not found or inactive';
  END IF;

  -- Calculate user total points
  SELECT COALESCE(sum(points),0) INTO v_total_points FROM fee_points WHERE user_id = p_user_id;
  IF v_total_points < v_points_cost THEN
    RAISE EXCEPTION 'Not enough points';
  END IF;

  -- Insert redemption record
  INSERT INTO reward_redemptions (user_id, reward_id, points_used, status)
  VALUES (p_user_id, p_reward_id, v_points_cost, 'completed');

  -- Deduct points by inserting negative transaction
  INSERT INTO fee_points (id, points, user_id, request_id)
  VALUES (uuid_generate_v4(), -v_points_cost, p_user_id, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon & authenticated
GRANT EXECUTE ON FUNCTION redeem_reward(uuid, uuid) TO anon, authenticated;

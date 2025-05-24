-- Create user_locations table
CREATE TABLE IF NOT EXISTS "user_locations" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid REFERENCES auth.users(id) NOT NULL,
  "location_name" text NOT NULL,
  "address" text NOT NULL,
  "coordinates" geography NOT NULL,
  "location_type" text NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "notes" text,
  "pickup_instructions" text,
  "last_pickup_date" timestamp with time zone,
  "photo_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS user_locations_user_id_idx ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS user_locations_is_default_idx ON user_locations(is_default);

-- Add row-level security policies
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Policy for users to see only their own locations
CREATE POLICY user_locations_select_policy ON user_locations
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert only their own locations
CREATE POLICY user_locations_insert_policy ON user_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update only their own locations
CREATE POLICY user_locations_update_policy ON user_locations
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete only their own locations
CREATE POLICY user_locations_delete_policy ON user_locations
  FOR DELETE USING (auth.uid() = user_id);

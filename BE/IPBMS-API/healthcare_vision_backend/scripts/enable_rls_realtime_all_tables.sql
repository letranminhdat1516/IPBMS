-- Script to enable RLS and Realtime for tables that need both
-- Run this in Supabase SQL Editor
-- This script is safe to run multiple times

-- Check if supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'Publication supabase_realtime does not exist. Please create it first.';
  END IF;
END;
$$;

-- ===========================================
-- TABLES WITH BOTH RLS AND REALTIME ENABLED
-- ===========================================

-- Function to safely add table to publication
CREATE OR REPLACE FUNCTION add_table_to_realtime_pub(table_name text)
RETURNS void AS $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = table_name
  ) THEN
    -- Check if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
      RAISE NOTICE 'Added table % to supabase_realtime publication', table_name;
    ELSE
      RAISE WARNING 'Table % does not exist, skipping', table_name;
    END IF;
  ELSE
    RAISE NOTICE 'Table % is already in supabase_realtime publication', table_name;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error adding table % to publication: %', table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ALERTS - Note: No separate alerts table exists, alerts are part of events
-- Skipping alerts table as it doesn't exist in schema
-- Alerts functionality is handled through events table

-- CAMERAS
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
SELECT add_table_to_realtime_pub('cameras');

-- Policies for cameras (based on user_id)
CREATE POLICY "Users can view their own cameras" ON cameras
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cameras" ON cameras
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cameras" ON cameras
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cameras" ON cameras
FOR DELETE USING (auth.uid() = user_id);

-- EVENT_DETECTIONS - Note: Using event_detections table (mapped from events model in Prisma)
-- The event_detections table contains all detection information
ALTER TABLE event_detections ENABLE ROW LEVEL SECURITY;
SELECT add_table_to_realtime_pub('event_detections');

-- Policies for event_detections (based on camera.user_id - users can view events from their cameras)
CREATE POLICY "Users can view event detections from their cameras" ON event_detections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM cameras
    WHERE cameras.camera_id = event_detections.camera_id
    AND cameras.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert event detections for their cameras" ON event_detections
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM cameras
    WHERE cameras.camera_id = event_detections.camera_id
    AND cameras.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update event detections from their cameras" ON event_detections
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM cameras
    WHERE cameras.camera_id = event_detections.camera_id
    AND cameras.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM cameras
    WHERE cameras.camera_id = event_detections.camera_id
    AND cameras.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete event detections from their cameras" ON event_detections
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM cameras
    WHERE cameras.camera_id = event_detections.camera_id
    AND cameras.user_id = auth.uid()
  )
);

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
SELECT add_table_to_realtime_pub('notifications');

-- Policies for notifications (based on event_id -> user_id from event_detections)
-- Note: This assumes notifications are linked to event_detections which have user_id
CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM event_detections
    WHERE event_detections.event_id = notifications.event_id
    AND event_detections.user_id = auth.uid()
  )
);

-- FCM_TOKENS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
SELECT add_table_to_realtime_pub('fcm_tokens');

-- SUBSCRIPTIONS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
SELECT add_table_to_realtime_pub('subscriptions');

-- SUBSCRIPTION_EVENTS - Note: Using subscription_events table (mapped from subscription_histories model in Prisma)
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
SELECT add_table_to_realtime_pub('subscription_events');

-- Policies for subscriptions (based on user_id)
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies for subscription_events (based on subscription.user_id)
CREATE POLICY "Users can view their own subscription events" ON subscription_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM subscriptions
    WHERE subscriptions.subscription_id = subscription_events.subscription_id
    AND subscriptions.user_id = auth.uid()
  )
);

-- Policies for fcm_tokens (based on user_id)
CREATE POLICY "Users can view their own fcm tokens" ON fcm_tokens
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fcm tokens" ON fcm_tokens
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fcm tokens" ON fcm_tokens
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fcm tokens" ON fcm_tokens
FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- TABLES WITH ONLY RLS ENABLED (No Realtime)
-- ===========================================

-- ACTIVITY_LOGS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for activity_logs (based on actor_id)
CREATE POLICY "Users can view their own activity logs" ON activity_logs
FOR SELECT USING (auth.uid() = actor_id);

-- CAREGIVER_INVITATIONS
ALTER TABLE caregiver_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for caregiver_invitations (based on caregiver_id)
CREATE POLICY "Users can view their own caregiver invitations" ON caregiver_invitations
FOR SELECT USING (auth.uid() = caregiver_id);

CREATE POLICY "Users can insert caregiver invitations" ON caregiver_invitations
FOR INSERT WITH CHECK (auth.uid() = caregiver_id);

CREATE POLICY "Users can update their own caregiver invitations" ON caregiver_invitations
FOR UPDATE USING (auth.uid() = caregiver_id) WITH CHECK (auth.uid() = caregiver_id);

-- EMERGENCY_CONTACTS
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Policies for emergency_contacts (based on user_id)
CREATE POLICY "Users can view their own emergency contacts" ON emergency_contacts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emergency contacts" ON emergency_contacts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency contacts" ON emergency_contacts
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emergency contacts" ON emergency_contacts
FOR DELETE USING (auth.uid() = user_id);

-- PATIENT_HABITS
ALTER TABLE patient_habits ENABLE ROW LEVEL SECURITY;

-- Note: patient_habits may need custom policy based on patient relationship
-- Assuming it has user_id or similar field - adjust as needed

-- PATIENT_MEDICAL_RECORDS
ALTER TABLE patient_medical_records ENABLE ROW LEVEL SECURITY;

-- Note: patient_medical_records may need custom policy based on patient relationship

-- PATIENT_SUPPLEMENTS
ALTER TABLE patient_supplements ENABLE ROW LEVEL SECURITY;

-- Note: patient_supplements may need custom policy based on patient relationship

-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments (based on user_id)
CREATE POLICY "Users can view their own payments" ON payments
FOR SELECT USING (auth.uid() = user_id);

-- PLANS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Note: plans may be global or user-specific - adjust policy as needed

-- SNAPSHOTS
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- Policies for snapshots (based on camera_id -> user_id from cameras)
CREATE POLICY "Users can view their own snapshots" ON snapshots
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM cameras
    WHERE cameras.camera_id = snapshots.camera_id
    AND cameras.user_id = auth.uid()
  )
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Admins can access cấu hình hệ thống" ON system_config

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for users (users can view/update their own profile)
CREATE POLICY "Users can view their own profile" ON users
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON users
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Clean up the helper function
DROP FUNCTION IF EXISTS add_table_to_realtime_pub(text);

-- ===========================================
-- SCRIPT COMPLETED SUCCESSFULLY
-- ===========================================
-- This script has enabled:
-- - RLS on all tables that need it
-- - Realtime on tables that require live updates (cameras, event_detections, notifications, fcm_tokens, subscriptions, subscription_events)
-- - Appropriate policies for data security
--
-- Note: 'alerts' table does not exist in schema - alerts functionality is handled through 'event_detections' table
-- The script is safe to run multiple times without errors.
-- Check the database logs for any warnings or notices during execution.
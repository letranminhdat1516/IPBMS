-- Enable RLS on event_detections table (if not already enabled)
ALTER TABLE event_detections ENABLE ROW LEVEL SECURITY;

-- Enable realtime for event_detections table
ALTER PUBLICATION supabase_realtime ADD TABLE event_detections;

-- Create policy for event_detections: users can only access their own event detections
CREATE POLICY "Users can view their own event detections" ON event_detections
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own event detections" ON event_detections
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event detections" ON event_detections
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event detections" ON event_detections
FOR DELETE USING (auth.uid() = user_id);

-- Optional: Allow admins to access all event detections (assuming admin role exists)
-- Uncomment if needed:
-- CREATE POLICY "Admins can access all event detections" ON event_detections
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM user_roles
--     WHERE user_roles.user_id = auth.uid()
--     AND user_roles.role = 'admin'
--   )
-- );
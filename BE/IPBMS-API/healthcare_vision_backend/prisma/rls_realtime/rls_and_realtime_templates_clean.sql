-- rls_and_realtime_templates_clean.sql
--
-- Action-specific RLS + Realtime template
-- This file consolidates the conservative helper-based template with the
-- per-action policies used in scripts/enable_rls_realtime_all_tables.sql.
-- It is intended to be safe to run multiple times.
--
-- Guidance:
-- 1) Review each ALTER / CREATE POLICY block and adapt the USING / WITH CHECK expressions to your
--    business logic (caregiver access, admin roles, service roles, etc.).
-- 2) Deploy to a staging DB first. Verify app behavior and logs. Then deploy to production in a
--    maintenance window.
-- 3) Supabase realtime: adding tables to replication/publication is optional if you want realtime
--    change feeds on those tables. Supabase can manage publications automatically; below are stubs.

-- NOTE: This template assumes Supabase style auth functions like auth.uid() are available in policies.

-- Ensure old function signature is removed so we can safely create/replace it
DROP FUNCTION IF EXISTS public.add_table_to_realtime_pub(text);
CREATE OR REPLACE FUNCTION public.add_table_to_realtime_pub(p_table_name text)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE NOTICE 'Publication supabase_realtime not present; skipping publication steps.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = p_table_name
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = p_table_name
    ) THEN
  -- Schema-qualify to avoid ambiguity when same table name exists in other schemas
  EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', 'public', p_table_name);
  RAISE NOTICE 'Added table % to supabase_realtime publication', p_table_name;
    ELSE
      RAISE WARNING 'Table % does not exist, skipping publication add', p_table_name;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error adding % to publication: %', p_table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to common runtime roles if they exist (guarded to avoid errors)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.add_table_to_realtime_pub(text) TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.add_table_to_realtime_pub(text) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal: if grant fails, leave a notice but continue
  RAISE NOTICE 'Granting execute on add_table_to_realtime_pub skipped: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Users policies (per-action)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users FOR SELECT USING (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users FOR UPDATE USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- ===== Example: event_detections (events) =====
ALTER TABLE IF EXISTS public.event_detections ENABLE ROW LEVEL SECURITY;
-- Customers (owners) can access their own events. Caregivers require additional business logic
-- (e.g., caregiver assignments). For now, provide owner+admin policy and a placeholder for caregiver access.
-- A conservative, robust helper function to determine caregiver access.
-- This function is defensive: it returns false when the expected table/columns don't exist
-- so it's safe to include in a template or run on databases that don't yet have
-- a `shared_permissions` (access_grants) table.
-- Helper: determine caregiver access using access_grants or fallback shared_permissions
CREATE OR REPLACE FUNCTION public.has_caregiver_access(caregiver_uuid text, patient_uuid text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tbl_exists boolean;
  has_grantee_col boolean;
  has_resource_col boolean;
  has_type_col boolean;
  sql text;
  result boolean := false;
BEGIN
  -- Check whether the conventional shared_permissions table exists
  -- Prefer project-specific `access_grants` table if it exists (caregiver_id/customer_id)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'access_grants'
  ) INTO tbl_exists;

  IF tbl_exists THEN
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.access_grants ag WHERE ag.caregiver_id::text = $1 AND ag.customer_id::text = $2)' INTO result USING caregiver_uuid, patient_uuid;
    RETURN result;
  END IF;

  -- Fallback: check for legacy/shared_permissions table
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shared_permissions'
  ) INTO tbl_exists;

  IF NOT tbl_exists THEN
    RETURN false;
  END IF;

  -- Detect whether likely column names exist; adapt if your schema uses different names
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_permissions' AND column_name = 'grantee_user_id'
  ) INTO has_grantee_col;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_permissions' AND column_name = 'resource_user_id'
  ) INTO has_resource_col;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_permissions' AND column_name = 'type'
  ) INTO has_type_col;

  -- If the most likely columns exist, run a targeted existence check.
  IF has_grantee_col AND has_resource_col THEN
    -- older convention: grantee_user_id / resource_user_id
    sql := 'SELECT EXISTS(SELECT 1 FROM public.shared_permissions sp WHERE sp.grantee_user_id::text = $1 AND sp.resource_user_id::text = $2';
    IF has_type_col THEN
      sql := sql || ' AND (sp.type = ''caregiver'' OR sp.role = ''caregiver'')';
    END IF;
    sql := sql || ')';
    EXECUTE sql INTO result USING caregiver_uuid, patient_uuid;
    RETURN result;
  END IF;

  -- Fallback: check the more domain-specific naming used in this project
  -- (caregiver_id / customer_id). If those exist, treat the presence of a
  -- shared_permissions row as granting access; the permissions flags
  -- (stream_view/alert_read/etc.) can be applied at the policy level if
  -- you need finer-grained checks.
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_permissions' AND column_name = 'caregiver_id'
  ) INTO has_grantee_col;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_permissions' AND column_name = 'customer_id'
  ) INTO has_resource_col;

  IF has_grantee_col AND has_resource_col THEN
    sql := 'SELECT EXISTS(SELECT 1 FROM public.shared_permissions sp WHERE sp.caregiver_id::text = $1 AND sp.customer_id::text = $2)';
    EXECUTE sql INTO result USING caregiver_uuid, patient_uuid;
    RETURN result;
  END IF;

  RETURN false;
EXCEPTION WHEN others THEN
  -- On any unexpected error, default to denying caregiver access in the policy template.
  RETURN false;
END;
$$;

-- EVENT_DETECTIONS: per-action policies using camera ownership relationship
ALTER TABLE IF EXISTS public.event_detections ENABLE ROW LEVEL SECURITY;
SELECT public.add_table_to_realtime_pub('event_detections');

DROP POLICY IF EXISTS event_detections_select_own ON public.event_detections;
CREATE POLICY event_detections_select_own ON public.event_detections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cameras c WHERE c.camera_id = event_detections.camera_id AND c.user_id::text = auth.uid()::text
  )
  OR has_caregiver_access(auth.uid()::text, event_detections.user_id::text)
  OR (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
);

DROP POLICY IF EXISTS event_detections_insert_own ON public.event_detections;
CREATE POLICY event_detections_insert_own ON public.event_detections FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cameras c WHERE c.camera_id = camera_id AND c.user_id::text = auth.uid()::text
  )
);

DROP POLICY IF EXISTS event_detections_update_own ON public.event_detections;
CREATE POLICY event_detections_update_own ON public.event_detections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cameras c WHERE c.camera_id = event_detections.camera_id AND c.user_id::text = auth.uid()::text
  )
  OR has_caregiver_access(auth.uid()::text, event_detections.user_id::text)
)
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.cameras c WHERE c.camera_id = camera_id AND c.user_id::text = auth.uid()::text
    )
  )
  OR has_caregiver_access(auth.uid()::text, event_detections.user_id::text)
);

DROP POLICY IF EXISTS event_detections_delete_own ON public.event_detections;
CREATE POLICY event_detections_delete_own ON public.event_detections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cameras c WHERE c.camera_id = event_detections.camera_id AND c.user_id::text = auth.uid()::text
  )
  OR has_caregiver_access(auth.uid()::text, event_detections.user_id::text)
);

-- Note: If your shared permissions model/table uses different names (e.g., `access_grants`),
-- adapt the function above to query the correct table/column names or create a view
-- `public.shared_permissions` that maps to your real table.

-- ===== Example: cameras =====
-- CAMERAS: per-action
ALTER TABLE IF EXISTS public.cameras ENABLE ROW LEVEL SECURITY;
SELECT public.add_table_to_realtime_pub('cameras');
DROP POLICY IF EXISTS cameras_select_own ON public.cameras;
CREATE POLICY cameras_select_own ON public.cameras FOR SELECT USING (auth.uid()::text = user_id::text OR (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin'));
DROP POLICY IF EXISTS cameras_insert_own ON public.cameras;
CREATE POLICY cameras_insert_own ON public.cameras FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS cameras_update_own ON public.cameras;
CREATE POLICY cameras_update_own ON public.cameras FOR UPDATE USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS cameras_delete_own ON public.cameras;
CREATE POLICY cameras_delete_own ON public.cameras FOR DELETE USING (auth.uid()::text = user_id::text);

-- ===== Example: snapshots & snapshot_images =====
-- SNAPSHOTS: per-action using camera ownership
ALTER TABLE IF EXISTS public.snapshots ENABLE ROW LEVEL SECURITY;
SELECT public.add_table_to_realtime_pub('snapshots');
DROP POLICY IF EXISTS snapshots_select_own ON public.snapshots;
CREATE POLICY snapshots_select_own ON public.snapshots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cameras c WHERE c.camera_id = snapshots.camera_id AND c.user_id::text = auth.uid()::text
  ) OR (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
);
DROP POLICY IF EXISTS snapshots_insert_own ON public.snapshots;
CREATE POLICY snapshots_insert_own ON public.snapshots FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cameras c WHERE c.camera_id = camera_id AND c.user_id::text = auth.uid()::text
  )
);

-- SNAPSHOT_IMAGES: linked to snapshots
ALTER TABLE IF EXISTS public.snapshot_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS snapshot_images_linked_snapshot_select ON public.snapshot_images;
CREATE POLICY snapshot_images_linked_snapshot_select ON public.snapshot_images FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.snapshots s WHERE s.snapshot_id = snapshot_images.snapshot_id
      AND (
        s.user_id::text = auth.uid()::text OR (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
      )
  )
);

-- ===== Example: notifications =====
-- NOTIFICATIONS: per-action (publication added)
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
SELECT public.add_table_to_realtime_pub('notifications');
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (auth.uid()::text = user_id::text OR (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin'));
DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
CREATE POLICY notifications_insert_own ON public.notifications FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- ===== Example: patient_habits, emergency_contacts =====
-- PATIENT_HABITS
ALTER TABLE IF EXISTS public.patient_habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patient_habits_select_own ON public.patient_habits;
CREATE POLICY patient_habits_select_own ON public.patient_habits FOR SELECT USING (auth.uid()::text = user_id::text OR (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin'));
DROP POLICY IF EXISTS patient_habits_insert_own ON public.patient_habits;
CREATE POLICY patient_habits_insert_own ON public.patient_habits FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- EMERGENCY_CONTACTS
ALTER TABLE IF EXISTS public.emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emergency_contacts_select_own ON public.emergency_contacts;
CREATE POLICY emergency_contacts_select_own ON public.emergency_contacts FOR SELECT USING (auth.uid()::text = user_id::text OR (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin'));
DROP POLICY IF EXISTS emergency_contacts_insert_own ON public.emergency_contacts;
CREATE POLICY emergency_contacts_insert_own ON public.emergency_contacts FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);


-- ===== Realtime publication stubs =====
-- Create a publication for realtime if needed. Supabase by default uses publications managed by the platform;
-- only run the following if you understand the replication impact.
--
-- CREATE PUBLICATION IF NOT EXISTS supabase_realtime_all_tables;
-- ALTER PUBLICATION supabase_realtime_all_tables ADD TABLE public.event_detections, public.snapshots, public.cameras, public.notifications;

-- End of template. Review & adapt for your environment.

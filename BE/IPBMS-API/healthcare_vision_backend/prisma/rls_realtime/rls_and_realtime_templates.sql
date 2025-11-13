-- rls_and_realtime_templates.sql
--
-- Template SQL to enable Row-Level Security (RLS) and prepare tables for Supabase Realtime.
-- This file is a *template* with conservative, reviewable policies. Do NOT apply to production
-- without reviewing the logic and testing in a staging environment.
--
-- Guidance:
-- 1) Review each ALTER / CREATE POLICY block and adapt the USING / WITH CHECK expressions to your
--    business logic (caregiver access, admin roles, service roles, etc.).
-- 2) Deploy to a staging DB first. Verify app behavior and logs. Then deploy to production in a
--    maintenance window.
-- 3) Supabase realtime: adding tables to replication/publication is optional if you want realtime
--    change feeds on those tables. Supabase can manage publications automatically; below are stubs.

-- NOTE: This template assumes Supabase style auth functions like auth.uid() are available in policies.

-- ===== Example: users (sensitive) =====
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
-- Only allow users to read/update their own profile. Admins (role = 'admin') can read/write all.
CREATE POLICY IF NOT EXISTS rls_users_owner_or_admin ON public.users
  USING (
    -- allow if owner
    auth.uid() = users.user_id::text
    -- or if jwt role claim indicates admin (this depends on your JWT claims)
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = users.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  );

-- ===== Example: event_detections (events) =====
ALTER TABLE IF EXISTS public.event_detections ENABLE ROW LEVEL SECURITY;
-- Customers (owners) can access their own events. Caregivers require additional business logic
-- (e.g., caregiver assignments). For now, provide owner+admin policy and a placeholder for caregiver access.
-- A conservative, robust helper function to determine caregiver access.
-- This function is defensive: it returns false when the expected table/columns don't exist
-- so it's safe to include in a template or run on databases that don't yet have
-- a `shared_permissions` (access_grants) table.
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

CREATE POLICY IF NOT EXISTS rls_event_detections_owner_or_admin ON public.event_detections
  USING (
    auth.uid() = event_detections.user_id::text
    OR has_caregiver_access(auth.uid(), event_detections.user_id::text)
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = event_detections.user_id::text
    OR has_caregiver_access(auth.uid(), event_detections.user_id::text)
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  );

-- Note: If your shared permissions model/table uses different names (e.g., `access_grants`),
-- adapt the function above to query the correct table/column names or create a view
-- `public.shared_permissions` that maps to your real table.

-- ===== Example: cameras =====
ALTER TABLE IF EXISTS public.cameras ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS rls_cameras_owner_or_admin ON public.cameras
  USING (
    auth.uid() = cameras.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = cameras.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  );

-- ===== Example: snapshots & snapshot_images =====
ALTER TABLE IF EXISTS public.snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS rls_snapshots_owner_or_admin ON public.snapshots
  USING (
    auth.uid() = snapshots.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = snapshots.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  );

ALTER TABLE IF EXISTS public.snapshot_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS rls_snapshot_images_linked_snapshot ON public.snapshot_images
  USING (
    -- allow access if the parent snapshot is accessible by the user; implement via join
    EXISTS (
      SELECT 1 FROM public.snapshots s WHERE s.snapshot_id = snapshot_images.snapshot_id
        AND (
          auth.uid() = s.user_id::text
          OR (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
        )
    )
  )
  WITH CHECK (true);

-- ===== Example: notifications =====
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS rls_notifications_owner_or_admin ON public.notifications
  USING (
    auth.uid() = notifications.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = notifications.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  );

-- ===== Example: patient_habits, emergency_contacts =====
ALTER TABLE IF EXISTS public.patient_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS rls_patient_habits_owner_or_admin ON public.patient_habits
  USING (
    auth.uid() = patient_habits.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = patient_habits.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  );

ALTER TABLE IF EXISTS public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS rls_emergency_contacts_owner_or_admin ON public.emergency_contacts
  USING (
    auth.uid() = emergency_contacts.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = emergency_contacts.user_id::text
    OR (
      (current_setting('jwt.claims.role', true) IS NOT NULL AND current_setting('jwt.claims.role', true) = 'admin')
    )
  );

-- ===== Realtime publication stubs =====
-- Create a publication for realtime if needed. Supabase by default uses publications managed by the platform;
-- only run the following if you understand the replication impact.
--
-- CREATE PUBLICATION IF NOT EXISTS supabase_realtime_all_tables;
-- ALTER PUBLICATION supabase_realtime_all_tables ADD TABLE public.event_detections, public.snapshots, public.cameras, public.notifications;

-- End of template. Review & adapt for your environment.

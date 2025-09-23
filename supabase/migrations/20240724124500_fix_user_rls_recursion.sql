-- Drop the old, faulty policies that cause recursion
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;
DROP POLICY IF EXISTS "Admins can update users in their org" ON public.users;

-- Helper function to get the current user's organization ID
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT org_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Re-create policies using the helper functions to prevent recursion

-- Users can view other users within their own organization.
CREATE POLICY "Users can view users in their organization" ON public.users
    FOR SELECT USING (org_id = public.current_user_org_id());

-- Admins can update users within their own organization.
CREATE POLICY "Admins can update users in their org" ON public.users
    FOR UPDATE USING (
        org_id = public.current_user_org_id() AND
        public.current_user_role() = 'admin'
    ) WITH CHECK (
        org_id = public.current_user_org_id()
    );

-- Drop the old, incorrect policies
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow public read access to organizations" ON public.organizations;

-- Allow anyone to read organization names (necessary for signup dropdowns and name checks)
CREATE POLICY "Allow public read access for all users" ON public.organizations
    FOR SELECT USING (true);

-- Allow any authenticated user to create a new organization record.
-- This is the crucial step for the admin signup flow.
CREATE POLICY "Allow authenticated users to create organizations" ON public.organizations
    FOR INSERT TO authenticated WITH CHECK (true);

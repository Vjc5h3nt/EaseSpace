-- Drop the old, restrictive policy that was causing issues.
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create a new, more permissive policy that allows any authenticated user to insert a new organization.
-- This is necessary for the initial admin signup flow to succeed.
CREATE POLICY "Allow authenticated users to create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow any user (authenticated or anonymous) to read the list of organizations.
-- This is necessary for the user signup page where a user needs to select an organization to join.
-- The organizations table contains non-sensitive public data.

-- Drop the existing restrictive policy first
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

-- Create a new, more permissive policy
CREATE POLICY "Users can view all organizations" ON organizations
    FOR SELECT USING (true);

-- Drop the incorrect policy that requires an authenticated role
DROP POLICY IF EXISTS "Allow authenticated users to create organizations" ON "public"."organizations";

-- Create a new, public policy for inserting into organizations
CREATE POLICY "Allow public insert for organizations"
ON "public"."organizations"
FOR INSERT
TO public
WITH CHECK (true);

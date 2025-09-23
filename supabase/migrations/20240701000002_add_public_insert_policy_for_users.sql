-- Create a policy to allow public insert access to the users table.
-- This is necessary for the signup flow where a user record needs to be created.
-- The data being inserted is controlled and validated by the application's backend logic.
CREATE POLICY "Allow public insert access for new user creation"
ON public.users
FOR INSERT
WITH CHECK (true);

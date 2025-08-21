-- Block all access to reservations table for security
DROP POLICY IF EXISTS "Users can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can delete reservations" ON public.reservations;

-- Create restrictive deny-all policies until proper authentication is implemented
CREATE POLICY "Block all access - authentication required" ON public.reservations
FOR ALL USING (false);

-- Add indexes for performance when queries are re-enabled
CREATE INDEX IF NOT EXISTS idx_reservations_cabin_checkout ON public.reservations (cabin_type, check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations (check_in, check_out);
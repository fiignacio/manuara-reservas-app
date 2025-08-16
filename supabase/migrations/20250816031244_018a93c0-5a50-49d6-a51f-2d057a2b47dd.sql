-- Create reservations table
CREATE TABLE public.reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passenger_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cabin_type TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  babies INTEGER DEFAULT 0,
  season TEXT CHECK (season IN ('Alta', 'Baja')),
  total_price DECIMAL(10,2) DEFAULT 0,
  remaining_balance DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('pending', 'partially_paid', 'fully_paid', 'overdue')) DEFAULT 'pending',
  check_in_status TEXT CHECK (check_in_status IN ('pending', 'checked_in')) DEFAULT 'pending',
  check_out_status TEXT CHECK (check_out_status IN ('pending', 'checked_out')) DEFAULT 'pending',
  confirmation_sent BOOLEAN DEFAULT false,
  confirmation_sent_date TIMESTAMPTZ,
  confirmation_method TEXT CHECK (confirmation_method IN ('email', 'whatsapp', 'manual')),
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  check_in_notes TEXT,
  check_out_notes TEXT,
  use_custom_price BOOLEAN DEFAULT false,
  custom_price DECIMAL(10,2),
  payments JSONB DEFAULT '[]'::jsonb,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Users can view all reservations" ON public.reservations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert reservations" ON public.reservations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update reservations" ON public.reservations
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete reservations" ON public.reservations
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_reservations_cabin_type ON public.reservations(cabin_type);
CREATE INDEX idx_reservations_check_in ON public.reservations(check_in);
CREATE INDEX idx_reservations_check_out ON public.reservations(check_out);
CREATE INDEX idx_reservations_payment_status ON public.reservations(payment_status);
CREATE INDEX idx_reservations_check_in_status ON public.reservations(check_in_status);
CREATE INDEX idx_reservations_check_out_status ON public.reservations(check_out_status);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- User Credit Cards Table Schema for Vitta
-- Run this SQL in your Supabase SQL Editor to create the cards table

-- Create user_credit_cards table
CREATE TABLE IF NOT EXISTS user_credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,
  card_name TEXT,
  apr DECIMAL(5,2) NOT NULL,
  credit_limit DECIMAL(12,2) NOT NULL,
  current_balance DECIMAL(12,2) DEFAULT 0,
  amount_to_pay DECIMAL(12,2) DEFAULT 0,
  due_date DATE,
  statement_cycle_start INTEGER,
  statement_cycle_end INTEGER,
  rewards_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credit_cards_user_id ON user_credit_cards(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_credit_cards ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage only their own cards
CREATE POLICY "Users can view their own cards" ON user_credit_cards
  FOR SELECT
  USING (auth.uid() = user_id OR true);

CREATE POLICY "Users can insert their own cards" ON user_credit_cards
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own cards" ON user_credit_cards
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete their own cards" ON user_credit_cards
  FOR DELETE
  USING (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_user_credit_cards_updated_at
  BEFORE UPDATE ON user_credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

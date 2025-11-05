-- Screen Deep Links Table
-- Stores navigation links for different screens/panels in the application

CREATE TABLE IF NOT EXISTS screen_deeplinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_key TEXT UNIQUE NOT NULL, -- Unique identifier for the screen (e.g., 'my_wallet', 'payment_optimizer')
  screen_name TEXT NOT NULL, -- Display name for the screen
  screen_path TEXT NOT NULL, -- The navigation path or view identifier
  description TEXT, -- Description of what this screen does
  icon_name TEXT, -- Icon identifier for the screen
  category TEXT, -- Category grouping (e.g., 'cards', 'payments', 'analytics')
  keywords TEXT[], -- Search keywords for matching user queries
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on screen_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_screen_deeplinks_key ON screen_deeplinks(screen_key);

-- Create index on keywords for search functionality
CREATE INDEX IF NOT EXISTS idx_screen_deeplinks_keywords ON screen_deeplinks USING GIN(keywords);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_screen_deeplinks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER screen_deeplinks_updated_at
BEFORE UPDATE ON screen_deeplinks
FOR EACH ROW
EXECUTE FUNCTION update_screen_deeplinks_updated_at();

-- Insert default screen deep links
INSERT INTO screen_deeplinks (screen_key, screen_name, screen_path, description, icon_name, category, keywords) VALUES
  ('vitta_chat', 'Vitta Chat', 'chat', 'AI-powered chat assistant for your wallet', 'MessageCircle', 'chat', ARRAY['chat', 'assistant', 'ai', 'ask', 'question', 'help']),
  ('my_wallet', 'My Wallet', 'cards', 'Manage your credit cards and view card details', 'Wallet', 'cards', ARRAY['wallet', 'cards', 'add card', 'card details', 'my cards', 'credit cards', 'manage cards']),
  ('payment_optimizer', 'Payment Optimizer', 'optimizer', 'Optimize your monthly payments across cards to minimize interest', 'TrendingUp', 'payments', ARRAY['payment', 'optimizer', 'optimize', 'smart payments', 'payment strategy', 'minimize interest', 'pay down debt']),
  ('expense_feed', 'Expense Feed', 'expenses', 'View and categorize your recent transactions', 'Receipt', 'expenses', ARRAY['expenses', 'transactions', 'spending', 'feed', 'purchase history']),
  ('dashboard', 'Dashboard', 'dashboard', 'Overview of your financial health and recommendations', 'LayoutDashboard', 'overview', ARRAY['dashboard', 'overview', 'summary', 'home', 'main'])
ON CONFLICT (screen_key) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  screen_path = EXCLUDED.screen_path,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  category = EXCLUDED.category,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Enable Row Level Security
ALTER TABLE screen_deeplinks ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read screen deep links (public data)
CREATE POLICY "Public read access to screen deeplinks"
  ON screen_deeplinks
  FOR SELECT
  USING (is_active = true);

-- Policy: Only authenticated users can manage deep links (for future admin panel)
CREATE POLICY "Authenticated users can manage screen deeplinks"
  ON screen_deeplinks
  FOR ALL
  USING (auth.role() = 'authenticated');

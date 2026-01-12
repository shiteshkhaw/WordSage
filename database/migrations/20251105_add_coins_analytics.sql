-- Add coins and analytics tracking to user profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins_balance INTEGER DEFAULT 100,
  total_ai_requests INTEGER DEFAULT 0,
  words_processed INTEGER DEFAULT 0,
  daily_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coins transactions table
CREATE TABLE IF NOT EXISTS public.coins_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earn', 'spend', 'bonus', 'refund'
  action_type TEXT, -- 'fix_grammar', 'improve', 'summarize', etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI usage analytics table
CREATE TABLE IF NOT EXISTS public.ai_usage_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  input_length INTEGER,
  output_length INTEGER,
  coins_spent INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_coins_transactions_user_id ON public.coins_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_user_id ON public.ai_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_created_at ON public.ai_usage_analytics(created_at);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coins_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for coins_transactions
CREATE POLICY "Users can view own transactions"
  ON public.coins_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.coins_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_usage_analytics
CREATE POLICY "Users can view own analytics"
  ON public.ai_usage_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON public.ai_usage_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, coins_balance, total_ai_requests, words_processed, daily_streak)
  VALUES (NEW.id, 100, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

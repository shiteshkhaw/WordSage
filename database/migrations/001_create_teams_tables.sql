-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'teams', -- teams or enterprise
  max_members INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, editor, member
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, active, inactive
  UNIQUE(team_id, user_id)
);

-- Team style guide (USP #1: Real-Time Team Style Sync)
CREATE TABLE team_style_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  brand_voice TEXT, -- casual, professional, technical, etc.
  tone TEXT, -- friendly, formal, persuasive
  approved_terms JSONB DEFAULT '[]', -- ["AI-powered", "machine learning"]
  forbidden_terms JSONB DEFAULT '[]', -- ["utilize", "leverage"]
  custom_rules JSONB DEFAULT '{}',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team content library (USP #2: Shared Knowledge Base)
CREATE TABLE team_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- product_descriptions, blog_intros, emails, etc.
  tags JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_style_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_content_library ENABLE ROW LEVEL SECURITY;

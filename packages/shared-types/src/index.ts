// Database Types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  coin_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: string;
  metadata?: DocumentMetadata;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentMetadata {
  word_count?: number;
  reading_time?: number;
  tags?: string[];
  language?: string;
}

export interface Revision {
  id: string;
  document_id: string;
  content: string;
  intent?: string;
  tone?: string;
  tokens_used?: number;
  cost_usd?: number;
  model?: string;
  created_at: string;
}

export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earn' | 'spend';
  reason: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// API Types
export interface RewriteRequest {
  content: string;
  intent: 'clarify' | 'expand' | 'simplify' | 'professional' | 'casual';
  tone?: 'formal' | 'informal' | 'friendly' | 'authoritative';
  audience?: string;
  max_length?: number;
}

export interface RewriteResponse {
  rewritten_content: string;
  tokens_used: number;
  cost_usd: number;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  document_context?: string;
}

export interface TranscribeRequest {
  audio_blob: string; // base64 encoded
  language?: string;
}

export interface TranscribeResponse {
  transcript: string;
  confidence?: number;
  duration?: number;
}

// Utility Types
export type APIResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

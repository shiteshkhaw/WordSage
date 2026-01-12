// Local type definitions (replaces @worksage/shared-types)

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




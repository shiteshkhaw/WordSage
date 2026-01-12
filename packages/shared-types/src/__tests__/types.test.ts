import type { User, Document, RewriteRequest } from '../index';

describe('Shared Types', () => {
  test('User type has required fields', () => {
    const user: User = {
      id: '123',
      email: 'test@example.com',
      subscription_tier: 'free',
      coin_balance: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(user.id).toBe('123');
    expect(user.email).toBe('test@example.com');
    expect(user.subscription_tier).toBe('free');
  });

  test('Document type has correct structure', () => {
    const doc: Document = {
      id: '123',
      user_id: 'user-123',
      title: 'Test Document',
      content: 'Test content',
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(doc.title).toBe('Test Document');
    expect(doc.is_public).toBe(false);
  });

  test('RewriteRequest has valid intent values', () => {
    const request: RewriteRequest = {
      content: 'Test content',
      intent: 'clarify',
      tone: 'formal',
    };

    expect(['clarify', 'expand', 'simplify', 'professional', 'casual']).toContain(
      request.intent
    );
  });
});

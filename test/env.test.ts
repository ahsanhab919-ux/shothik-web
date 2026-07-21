import { describe, it, expect, beforeEach } from 'vitest';
import { validateClientEnv, validateServerEnv } from '@/lib/config/env';

describe('Environment Validation', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/shothik';
    process.env.NEXT_PUBLIC_INSFORGE_URL = 'https://example.insforge.app';
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'anon_test_key';
    process.env.KIMI_API_KEY = 'valid-kimi-key';
    delete process.env.GEMINI_API_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_CREDITS_WEBHOOK_SECRET;
    delete process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.CONVEX_DEPLOYMENT;
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.CONVEX_DEPLOY_KEY;
    delete process.env.CONVEX_SITE_URL;
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  });

  it('should validate required InsForge server environment variables', () => {
    expect(() => validateServerEnv()).not.toThrow();
  });

  it('should allow legacy compatibility variables when InsForge core config is present', () => {
    process.env.CONVEX_DEPLOYMENT = 'test-deployment';
    process.env.CLERK_SECRET_KEY = 'sk_test_valid';
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_valid';
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud';

    expect(() => validateServerEnv()).not.toThrow();
    expect(() => validateClientEnv()).not.toThrow();
  });

  it('should throw if required vars are missing', () => {
    delete process.env.DATABASE_URL;

    expect(() => validateServerEnv()).toThrow();
  });

  it('should throw if no LLM provider is configured', () => {
    delete process.env.KIMI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    expect(() => validateServerEnv()).toThrow('At least one LLM provider');
  });

  it('should validate InsForge client environment variables', () => {
    expect(() => validateClientEnv()).not.toThrow();
  });

  it('should allow Stripe env vars to be entirely absent', () => {
    expect(() => validateServerEnv()).not.toThrow();
    expect(() => validateClientEnv()).not.toThrow();
  });

  it('should require STRIPE_SECRET_KEY when Stripe public key is configured', () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_valid';

    expect(() => validateServerEnv()).toThrow('STRIPE_SECRET_KEY is required');
  });

  it('should validate when Gemini is the only configured LLM provider', () => {
    delete process.env.KIMI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    process.env.GEMINI_API_KEY = 'valid-gemini-key';

    expect(() => validateServerEnv()).not.toThrow();
  });

  it('should validate when OpenRouter is the only configured LLM provider', () => {
    delete process.env.KIMI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    process.env.OPENROUTER_API_KEY = 'valid-openrouter-key';

    expect(() => validateServerEnv()).not.toThrow();
  });

  it('should require Stripe secret when webhook secrets are configured', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_valid';

    expect(() => validateServerEnv()).toThrow('STRIPE_SECRET_KEY is required');
  });

  it('should throw if no supported client auth config is present', () => {
    delete process.env.NEXT_PUBLIC_INSFORGE_URL;
    delete process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

    expect(() => validateClientEnv()).toThrow('Client environment validation failed');
  });
});

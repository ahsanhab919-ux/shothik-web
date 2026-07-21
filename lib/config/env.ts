import { z } from 'zod';

/**
 * Validates environment variables at build/startup time
 * Throws error if required vars are missing
 */

const serverEnvSchema = z.object({
  // Legacy Convex compatibility
  CONVEX_DEPLOYMENT: z.string().min(1, 'Convex deployment name required').optional(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url('Valid Convex URL required').optional(),
  CONVEX_DEPLOY_KEY: z.string().min(1, 'Convex deploy key required').optional(),
  CONVEX_SITE_URL: z.string().url('Valid Convex site URL required').optional(),
  JWT_PRIVATE_KEY: z.string().min(1, 'JWT private key required').optional(),

  // Native InsForge platform
  DATABASE_URL: z.string().min(1, 'Database URL required').optional(),
  NEXT_PUBLIC_INSFORGE_URL: z.string().url('Valid InsForge base URL required').optional(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1, 'InsForge anon key required').optional(),

  // Legacy auth compatibility
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key required').optional(),

  // LLM APIs (at least one required)
  KIMI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),

  // Payments
  STRIPE_SECRET_KEY: z.string().min(1, 'Stripe secret key required').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'Stripe webhook secret required').optional(),
  STRIPE_CREDITS_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_SUBSCRIPTION_WEBHOOK_SECRET: z.string().min(1).optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_INSFORGE_URL: z.string().url('Valid InsForge base URL required').optional(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1, 'InsForge anon key required').optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

function hasLegacyServerConfig(env: NodeJS.ProcessEnv) {
  return Boolean(
    env.CONVEX_DEPLOYMENT ||
      env.NEXT_PUBLIC_CONVEX_URL ||
      env.CONVEX_DEPLOY_KEY ||
      env.CONVEX_SITE_URL ||
      env.JWT_PRIVATE_KEY ||
      env.CLERK_SECRET_KEY,
  );
}

function hasInsforgeServerConfig(env: NodeJS.ProcessEnv) {
  return Boolean(
    env.DATABASE_URL &&
      env.NEXT_PUBLIC_INSFORGE_URL &&
      env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  );
}

function hasLegacyClientConfig(env: NodeJS.ProcessEnv) {
  return Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

function hasInsforgeClientConfig(env: NodeJS.ProcessEnv) {
  return Boolean(env.NEXT_PUBLIC_INSFORGE_URL && env.NEXT_PUBLIC_INSFORGE_ANON_KEY);
}

/**
 * Server-side environment validation
 */
export function validateServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Server environment validation failed:\n${errors}`);
  }

  if (!hasInsforgeServerConfig(process.env)) {
    throw new Error(
      'Server environment validation failed:\n' +
        'InsForge core configuration is required ' +
        '(DATABASE_URL + NEXT_PUBLIC_INSFORGE_URL + NEXT_PUBLIC_INSFORGE_ANON_KEY).',
    );
  }

  if (hasLegacyServerConfig(process.env)) {
    console.warn(
      '[env] Legacy Convex/Clerk compatibility variables are still present. Keep them only for unmigrated feature slices.',
    );
  }

  // Ensure at least one LLM provider
  if (
    !process.env.KIMI_API_KEY &&
    !process.env.OPENAI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.GEMINI_API_KEY &&
    !process.env.OPENROUTER_API_KEY
  ) {
    throw new Error(
      'At least one LLM provider must be configured ' +
        '(KIMI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY)',
    );
  }

  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'Server environment validation failed:\n' +
        'STRIPE_SECRET_KEY is required when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set.',
    );
  }

  if (
    process.env.STRIPE_CREDITS_WEBHOOK_SECRET &&
    !process.env.STRIPE_SECRET_KEY
  ) {
    throw new Error(
      'Server environment validation failed:\n' +
        'STRIPE_SECRET_KEY is required when STRIPE_CREDITS_WEBHOOK_SECRET is set.',
    );
  }

  if (
    process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET &&
    !process.env.STRIPE_SECRET_KEY
  ) {
    throw new Error(
      'Server environment validation failed:\n' +
        'STRIPE_SECRET_KEY is required when STRIPE_SUBSCRIPTION_WEBHOOK_SECRET is set.',
    );
  }

  if (
    process.env.STRIPE_WEBHOOK_SECRET &&
    !process.env.STRIPE_SECRET_KEY
  ) {
    throw new Error(
      'Server environment validation failed:\n' +
        'STRIPE_SECRET_KEY is required when STRIPE_WEBHOOK_SECRET is set.',
    );
  }
  
  return result.data;
}

/**
 * Client-side environment validation
 */
export function validateClientEnv() {
  const result = clientEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Client environment validation failed:\n${errors}`);
  }

  if (!hasInsforgeClientConfig(process.env)) {
    throw new Error(
      'Client environment validation failed:\n' +
        'Provide the InsForge public client pair ' +
        '(NEXT_PUBLIC_INSFORGE_URL + NEXT_PUBLIC_INSFORGE_ANON_KEY).',
    );
  }

  if (hasLegacyClientConfig(process.env)) {
    console.warn(
      '[env] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is still present. Keep it only while legacy auth-dependent UI remains.',
    );
  }

  return result.data;
}

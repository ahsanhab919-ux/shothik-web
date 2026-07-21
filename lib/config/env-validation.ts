import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates all required env vars at startup
 */

const envSchema = z.object({
  // Legacy Convex compatibility
  CONVEX_DEPLOYMENT: z.string().min(1).optional(),
  CONVEX_URL: z.string().url().optional(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url().optional(),
  CONVEX_DEPLOY_KEY: z.string().min(1).optional(),
  CONVEX_SITE_URL: z.string().url().optional(),
  JWT_PRIVATE_KEY: z.string().min(1).optional(),

  // Native InsForge platform
  DATABASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_INSFORGE_URL: z.string().url().optional(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1).optional(),

  // Legacy auth compatibility
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  CLERK_SECRET_KEY: z.string().startsWith('sk_').optional(),
  
  // LLM - At least one required
  KIMI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  
  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  
  // Optional
  NEXT_PUBLIC_MCP_SERVER_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_STITCH_BASE_URL: z.string().url().default('https://api-demo.stitch-ai.co'),
  NEXT_PUBLIC_STITCH_API_KEY: z.string().optional(),
  NEXT_PUBLIC_STITCH_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  MCP_ENABLED: z.string().default('true'),
  REDIS_URL: z.string().url().optional(),
  
  // Feature flags
  ENABLE_AI_SUGGESTIONS: z.string().default('true'),
  ENABLE_NEURAL_ANALYSIS: z.string().default('true'),
  ENABLE_NOBEL_ANALYSIS: z.string().default('true'),
  ENABLE_ACCESSIBILITY_CHECK: z.string().default('true'),

  // Publishing — PublishDrive distribution (set to 'true' to activate)
  PUBLISHDRIVE_ENABLED: z.string().default('true'),
  NEXT_PUBLIC_PUBLISHDRIVE_ENABLED: z.string().default('true'),
  NEXT_PUBLIC_PUBLISHDRIVE_API_URL: z.string().url().default('https://api.publishdrive.com/v1'),
  PUBLISHDRIVE_API_KEY: z.string().optional(),
  PUBLISHDRIVE_WEBHOOK_SECRET: z.string().optional(),

  // Calibre conversion microservice
  CALIBRE_SERVICE_URL: z.string().url().default('http://localhost:3003'),
});

function hasLegacyPlatformConfig(env: NodeJS.ProcessEnv) {
  return Boolean(
    env.NEXT_PUBLIC_CONVEX_URL || env.CONVEX_DEPLOY_KEY || env.CONVEX_SITE_URL || env.JWT_PRIVATE_KEY,
  );
}

function hasInsforgePlatformConfig(env: NodeJS.ProcessEnv) {
  return Boolean(
    env.DATABASE_URL &&
      env.NEXT_PUBLIC_INSFORGE_URL &&
      env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  );
}

/**
 * Validate environment variables
 * Call this at app startup
 */
export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Environment validation failed');
  }

  if (!hasInsforgePlatformConfig(process.env)) {
    throw new Error(
      'Environment validation failed: InsForge core configuration is required ' +
        '(DATABASE_URL, NEXT_PUBLIC_INSFORGE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY).',
    );
  }

  if (hasLegacyPlatformConfig(process.env)) {
    console.warn(
      '⚠ Legacy Convex compatibility variables are still present. Keep them only for unmigrated feature slices.',
    );
  }

  // Check at least one LLM provider is configured
  if (
    !process.env.KIMI_API_KEY &&
    !process.env.OPENAI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.GEMINI_API_KEY &&
    !process.env.OPENROUTER_API_KEY
  ) {
    throw new Error(
      'At least one LLM provider (KIMI, OPENAI, ANTHROPIC, GEMINI, or OPENROUTER) must be configured',
    );
  }

  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'Environment validation failed: STRIPE_SECRET_KEY is required when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set.',
    );
  }

  console.log('✅ Environment variables validated');
  return result.data;
}

/**
 * Type-safe access to env vars
 */
export const env = validateEnv();

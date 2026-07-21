import Stripe from "stripe";

const getStripeMode = () =>
  process.env.NEXT_PUBLIC_STRIPE_MODE ||
  (process.env.NODE_ENV === "production" ? "live" : "sandbox");

const isSandboxMode = () =>
  getStripeMode() !== "live" && process.env.NODE_ENV !== "production";

export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

export const stripeConfig = {
  get mode() {
    return getStripeMode();
  },

  apiVersion: "2026-02-25.clover" as const,

  get sandbox() {
    const sandboxMode = isSandboxMode();

    return {
      enabled: sandboxMode,
      testCards: sandboxMode
        ? [
            { number: "4242424242424242", brand: "Visa", description: "Success" },
            { number: "4000000000000002", brand: "Visa", description: "Declined" },
            { number: "4000002500003155", brand: "Visa", description: "3D Secure" },
            { number: "4000003560000008", brand: "Visa", description: "India" },
            { number: "4000000000003220", brand: "Visa", description: "Subscription" },
          ]
        : [],
    };
  },

  get connect() {
    return {
      autoApprove: isSandboxMode(),
      skipOnboarding: false,
    };
  },

  webhooks: {
    localTesting: process.env.NODE_ENV === "development",
  },
};

export const isSandbox = () => stripeConfig.sandbox.enabled;

let cachedStripeClient: Stripe | null = null;
let cachedStripeSecret: string | null = null;

export function isStripeConfigurationError(
  error: unknown,
): error is StripeConfigurationError {
  return error instanceof StripeConfigurationError;
}

function validateStripeEnvironment(secretKey: string | undefined) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (isSandboxMode()) {
    throw new StripeConfigurationError(
      "Stripe sandbox mode must not be enabled in production. " +
      "Set NEXT_PUBLIC_STRIPE_MODE=live in your production environment.",
    );
  }

  if (secretKey && !secretKey.startsWith("sk_live_")) {
    throw new StripeConfigurationError(
      "Production environment requires a live Stripe secret key (sk_live_...). " +
      "Test keys (sk_test_...) are not permitted in production.",
    );
  }
}

export const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  validateStripeEnvironment(secretKey);

  if (!secretKey) {
    throw new StripeConfigurationError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY to enable Stripe-backed features.",
    );
  }

  if (!secretKey.startsWith("sk_")) {
    throw new StripeConfigurationError(
      "Stripe secret key is invalid. STRIPE_SECRET_KEY must start with sk_.",
    );
  }

  if (cachedStripeClient && cachedStripeSecret === secretKey) {
    return cachedStripeClient;
  }

  cachedStripeClient = new Stripe(secretKey, {
    apiVersion: stripeConfig.apiVersion,
  });
  cachedStripeSecret = secretKey;
  return cachedStripeClient;
};

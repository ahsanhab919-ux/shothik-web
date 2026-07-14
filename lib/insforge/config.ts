function getRequiredEnv(name: "NEXT_PUBLIC_INSFORGE_URL" | "NEXT_PUBLIC_INSFORGE_ANON_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required InsForge environment variable: ${name}`);
  }

  return value;
}

export function hasInsforgePublicConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_INSFORGE_URL && process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  );
}

export function getInsforgePublicConfig() {
  return {
    baseUrl: getRequiredEnv("NEXT_PUBLIC_INSFORGE_URL"),
    anonKey: getRequiredEnv("NEXT_PUBLIC_INSFORGE_ANON_KEY"),
  };
}

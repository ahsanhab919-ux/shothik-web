function getPublicInsforgeBaseUrl() {
  const value = process.env.NEXT_PUBLIC_INSFORGE_URL;

  if (!value) {
    throw new Error("Missing required InsForge environment variable: NEXT_PUBLIC_INSFORGE_URL");
  }

  return value;
}

function getPublicInsforgeAnonKey() {
  const value = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!value) {
    throw new Error("Missing required InsForge environment variable: NEXT_PUBLIC_INSFORGE_ANON_KEY");
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
    baseUrl: getPublicInsforgeBaseUrl(),
    anonKey: getPublicInsforgeAnonKey(),
  };
}

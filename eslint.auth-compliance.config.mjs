import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: [
      "e2e/auth-compliance.spec.ts",
      "e2e/auth-email-flows.spec.ts",
      "e2e/login-validation.spec.ts",
      "e2e/smoke.spec.ts",
      "e2e/support/auth-compliance-assertions.ts",
      "lib/auth-compliance-patterns.ts",
    ],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='toContainText'] Literal[value=/Service provider: Shothik AI|Remember email on this device|name, email address, password, country, and selected workflow intent|Google|Registration successful\\. Enter the verification code from your email before signing in\\.|Email verified\\. You can now sign in\\.|Password reset successful\\. You can now sign in\\.|Login failed\\. Please check your credentials and try again\\./]",
          message:
            "Use the shared auth compliance regex catalog or helper functions instead of brittle long-form auth disclosure/status literals.",
        },
      ],
    },
  },
];

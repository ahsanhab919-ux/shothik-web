import Link from "next/link";

type AuthComplianceNoticeProps = {
  mode: "login" | "register";
};

export default function AuthComplianceNotice({ mode }: AuthComplianceNoticeProps) {
  const isRegister = mode === "register";

  return (
    <aside
      aria-label={isRegister ? "Account creation privacy notice" : "Login privacy notice"}
      className="rounded-2xl border border-border bg-muted/30 p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Privacy and account notice
      </p>
      <p className="mt-2 text-sm leading-6 text-foreground">
        <span className="font-medium">Service provider:</span> Shothik AI. Contact{" "}
        <a className="text-primary hover:underline" href="mailto:support@shothik.ai">
          support@shothik.ai
        </a>{" "}
        for privacy, access, correction, export, or deletion requests.
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        <li>
          We collect only the account data needed to {isRegister ? "create and secure your account" : "authenticate and secure your account"}:
          {isRegister
            ? " name, email address, password, country, selected workflow intent, and related security events."
            : " email address, password, selected workflow intent, and related security events."}
        </li>
        <li>
          We use this information to authenticate you, send verification or password-reset messages, protect the service from abuse,
          and route you to the right workspace after sign-in.
        </li>
        <li>
          If you enable <span className="font-medium text-foreground">Remember email on this device</span>, your email is stored locally in
          this browser until you turn the setting off or clear browser storage.
        </li>
        <li>
          If you choose a third-party sign-in option such as Google, that provider and our authentication services process the identifiers
          needed to complete sign-in.
        </li>
        <li>
          We use security and product analytics to measure login reliability and improve account flows. See our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          ,{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms &amp; Conditions
          </Link>
          , and{" "}
          <Link href="/deletion" className="text-primary hover:underline">
            Data Deletion Policy
          </Link>{" "}
          for details.
        </li>
      </ul>
    </aside>
  );
}

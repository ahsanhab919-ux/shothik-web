import PolicyPageLayout from "@/components/(secondary-layout)/PolicyPageLayout";

export async function generateMetadata() {
  return {
    title: "Shothik AI: Privacy Policy | Shothik AI",
    description: "How Shothik AI collects, uses, shares, and protects account and product data.",
  };
}

export default function PrivacyPage() {
  const navigationItems = [
    { id: "privacy-main", label: "Shothik AI Privacy Policy" },
    { id: "section-1", label: "1. Who We Are" },
    { id: "section-2", label: "2. Information We Collect" },
    { id: "section-3", label: "3. Auth and Login Disclosures" },
    { id: "section-4", label: "4. How We Use Data" },
    { id: "section-5", label: "5. Cookies, Local Storage, and Analytics" },
    { id: "section-6", label: "6. Sharing and Service Providers" },
    { id: "section-7", label: "7. International Transfers" },
    { id: "section-8", label: "8. Retention" },
    { id: "section-9", label: "9. Security" },
    { id: "section-10", label: "10. Your Privacy Rights" },
    { id: "section-11", label: "11. Children and Changes" },
    { id: "section-12", label: "12. Contact" },
  ];

  return (
    <PolicyPageLayout
      heading="Privacy Policy"
      links={[{ name: "Legal" }, { name: "Privacy Policy" }]}
      subtitle="This Privacy Policy explains how Shothik AI collects, uses, shares, and protects account, authentication, and product data."
      navigationItems={navigationItems}
    >
      <div className="space-y-6">
        <h1 id="privacy-main" className="text-2xl font-bold md:text-3xl">
          Shothik AI Privacy Policy
        </h1>

        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-base leading-relaxed">
              <b>Effective date</b>: 2026-07-19
            </p>
            <p className="text-base leading-relaxed">
              This Privacy Policy applies to the Shothik AI website and account experience, including registration, login, password reset,
              email verification, writing workflows, and related service operations.
            </p>
          </div>

          <div className="space-y-4">
            <h2 id="section-1" className="text-2xl font-semibold">
              1. Who We Are
            </h2>
            <p className="text-base leading-relaxed">
              Shothik AI operates this service and acts as the controller for the personal data described in this policy.
            </p>
            <p className="text-base leading-relaxed">
              Questions, privacy requests, correction requests, access requests, and deletion requests can be sent to <b>support@shothik.ai</b>.
            </p>
          </div>

          <div className="space-y-4">
            <h2 id="section-2" className="text-2xl font-semibold">
              2. Information We Collect
            </h2>
            <p className="text-base leading-relaxed">
              We apply a data-minimization approach and collect only the information needed to operate and secure the service.
            </p>
            <ul className="ml-4 list-inside list-disc space-y-2">
              <li>
                <b>Account data:</b> name, email address, password, country, and selected workflow intent when you create an account.
              </li>
              <li>
                <b>Authentication data:</b> email address, login attempts, verification requests, password-reset requests, and related security signals.
              </li>
              <li>
                <b>Optional local preference data:</b> if you enable <b>Remember email on this device</b>, we store your email locally in your browser so it can be pre-filled later on the same device.
              </li>
              <li>
                <b>Usage and device data:</b> IP address, browser information, page visits, timestamps, and technical diagnostics needed to protect the service and troubleshoot failures.
              </li>
              <li>
                <b>Product and account activity data:</b> events related to login, sign-up, post-login routing, and workspace usage that help us maintain and improve the service.
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 id="section-3" className="text-2xl font-semibold">
              3. Auth and Login Disclosures
            </h2>
            <p className="text-base leading-relaxed">
              The login and registration interfaces display short-form privacy disclosures that summarize this section. Those disclosures are intended to give you clear information before you submit credentials or create an account.
            </p>
            <ul className="ml-4 list-inside list-disc space-y-2">
              <li>We use account data to create your account, authenticate you, secure the platform, and send verification or password-reset messages.</li>
              <li>We use your selected workflow intent and available account context to route you to the most relevant workspace after sign-in.</li>
              <li>We do not require marketing consent as a condition of creating an account or signing in.</li>
              <li>If you choose a third-party sign-in option such as Google, that provider and our authentication services process the identifiers needed to complete sign-in, such as your email address and basic profile identifiers.</li>
              <li>The <b>Remember email on this device</b> option is optional and stores only your email in local browser storage until you disable the option or clear browser data.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 id="section-4" className="text-2xl font-semibold">
              4. How We Use Data
            </h2>
            <ul className="ml-4 list-inside list-disc space-y-2">
              <li>to create and manage your account;</li>
              <li>to sign you in, verify your email address, and help you recover access;</li>
              <li>to detect, prevent, and investigate abuse, fraud, or technical failures;</li>
              <li>to preserve your chosen workflow context and improve post-login navigation;</li>
              <li>to provide customer support and respond to lawful requests;</li>
              <li>to measure reliability and improve account flows, security, and product usability.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 id="section-5" className="text-2xl font-semibold">
              5. Cookies, Local Storage, and Analytics
            </h2>
            <p className="text-base leading-relaxed">
              We use cookies and browser storage to keep you signed in, maintain security state, and remember limited preferences.
            </p>
            <ul className="ml-4 list-inside list-disc space-y-2">
              <li>
                <b>Authentication cookies:</b> session cookies and related security cookies are used to keep you signed in and protect the service.
              </li>
              <li>
                <b>Local storage:</b> we use local storage for optional remembered-email behavior and, when enabled, limited product analytics persistence.
              </li>
              <li>
                <b>Analytics:</b> we use PostHog to capture product analytics events such as sign-up, login, post-login routing, and feature usage. We configure it with identified profiles only and without session recording.
              </li>
            </ul>
            <p className="text-base leading-relaxed">
              You can clear browser cookies and local storage from your device settings. Doing so may sign you out or remove saved preferences.
            </p>
          </div>

          <div className="space-y-4">
            <h2 id="section-6" className="text-2xl font-semibold">
              6. Sharing and Service Providers
            </h2>
            <p className="text-base leading-relaxed">
              We share personal data only with service providers and infrastructure partners that help us operate the platform, such as authentication providers, hosting providers, analytics providers, storage providers, email-delivery providers, and payment providers when you purchase paid services.
            </p>
            <p className="text-base leading-relaxed">
              These providers may access data only as needed to deliver their services to us and are expected to protect that data under contractual, technical, or legal controls.
            </p>
            <p className="text-base leading-relaxed">
              We may also disclose information when required by law, to protect users and the platform, or as part of a merger, acquisition, financing, or sale of business assets.
            </p>
          </div>

          <div className="space-y-4">
            <h2 id="section-7" className="text-2xl font-semibold">
              7. International Transfers
            </h2>
            <p className="text-base leading-relaxed">
              Our providers may process data in countries other than your own. Where that happens, we take reasonable steps to use providers and safeguards appropriate for the data involved.
            </p>
          </div>

          <div className="space-y-4">
            <h2 id="section-8" className="text-2xl font-semibold">
              8. Retention
            </h2>
            <p className="text-base leading-relaxed">
              We keep account and authentication data for as long as needed to provide the service, comply with legal obligations, resolve disputes, enforce agreements, and maintain security.
            </p>
            <p className="text-base leading-relaxed">
              Optional remembered-email data remains in your browser until you disable it or clear browser storage. Analytics and security logs may be retained for shorter or longer periods depending on operational and legal needs.
            </p>
          </div>

          <div className="space-y-4">
            <h2 id="section-9" className="text-2xl font-semibold">
              9. Security
            </h2>
            <p className="text-base leading-relaxed">
              We use technical and organizational safeguards designed to protect account and service data, including authenticated session handling, route protection, abuse controls, and access restrictions. No Internet-based system can guarantee absolute security.
            </p>
          </div>

          <div className="space-y-4">
            <h2 id="section-10" className="text-2xl font-semibold">
              10. Your Privacy Rights
            </h2>
            <p className="text-base leading-relaxed">
              Depending on where you live, you may have rights to access, correct, delete, export, restrict, object to, or complain about our processing of your personal data.
            </p>
            <ul className="ml-4 list-inside list-disc space-y-2">
              <li>request a copy of the account data we hold about you;</li>
              <li>request correction of inaccurate or incomplete data;</li>
              <li>request deletion of your account data, subject to legal or security exceptions;</li>
              <li>request export of eligible data;</li>
              <li>object to or request restriction of certain processing where applicable;</li>
              <li>withdraw consent for optional features you previously enabled, such as remembered-email storage, by changing your browser or account settings.</li>
            </ul>
            <p className="text-base leading-relaxed">
              To exercise these rights, email <b>support@shothik.ai</b> or review our <a href="/deletion" className="text-primary hover:underline">Data Deletion Policy</a>.
            </p>
          </div>

          <div className="space-y-4">
            <h2 id="section-11" className="text-2xl font-semibold">
              11. Children and Changes
            </h2>
            <p className="text-base leading-relaxed">
              Our service is not directed to children under 13, and we do not knowingly collect personal data from children under 13 without appropriate authorization.
            </p>
            <p className="text-base leading-relaxed">
              We may update this Privacy Policy from time to time. When we do, we will update the effective date on this page and, where required, provide an additional notice.
            </p>
          </div>

          <div className="space-y-4">
            <h2 id="section-12" className="text-2xl font-semibold">
              12. Contact
            </h2>
            <p className="text-base leading-relaxed">
              If you have questions about this Privacy Policy or your privacy rights, contact us at <b>support@shothik.ai</b>.
            </p>
          </div>
        </div>
      </div>
    </PolicyPageLayout>
  );
}

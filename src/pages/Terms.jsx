import { SUPPORT_EMAIL } from "../config/app";

const Terms = () => {
  return (
    <section className="legal-page">
      <div className="legal-card">
        <p className="eyebrow mb-2">Legal</p>
        <h1>Terms of Service</h1>
        <p className="text-muted">Last updated: July 13, 2026</p>

        <p>
          These terms govern access to JobProof, a reporting tool for service
          teams. By creating an account or using JobProof, you agree to use the
          service responsibly and only for lawful business purposes.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for keeping your login details secure and for
          activity under your account. Company admins are responsible for team
          member access, roles, and client or report information entered into
          the workspace.
        </p>

        <h2>Reports and Content</h2>
        <p>
          You remain responsible for the accuracy, legality, and appropriateness
          of job reports, photos, client details, and any other content uploaded
          or shared through JobProof.
        </p>

        <h2>Subscriptions</h2>
        <p>
          Paid plans are billed through Stripe. Subscription features, limits,
          billing cycles, renewals, cancellations, and failed payment handling
          may depend on the plan selected at checkout.
        </p>

        <h2>Acceptable Use</h2>
        <p>
          You may not use JobProof to upload unlawful content, violate privacy
          rights, interfere with the service, attempt unauthorized access, or
          misuse public report links.
        </p>

        <h2>Availability</h2>
        <p>
          JobProof aims to provide a reliable service, but access may be
          interrupted by maintenance, updates, third-party providers, security
          events, or technical issues.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent allowed by law, JobProof is provided without
          warranties beyond those that cannot legally be excluded. JobProof is
          not liable for indirect losses, lost profits, or business interruption.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these terms, contact JobProof support at
          {` ${SUPPORT_EMAIL}`}.
        </p>
      </div>
    </section>
  );
};

export default Terms;

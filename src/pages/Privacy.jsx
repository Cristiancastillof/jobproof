import { SUPPORT_EMAIL } from "../config/app";

const Privacy = () => {
  return (
    <section className="legal-page">
      <div className="legal-card">
        <p className="eyebrow mb-2">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="text-muted">Last updated: July 13, 2026</p>

        <p>
          JobProof helps service teams create job reports, store job evidence,
          share report links, and manage team access. This policy explains the
          information JobProof needs to provide that service.
        </p>

        <h2>Information We Collect</h2>
        <p>
          We collect account details, company profile information, team member
          details, client records, report content, uploaded photos, billing
          status, and basic technical information needed to keep the product
          secure and reliable.
        </p>

        <h2>How We Use Information</h2>
        <p>
          We use information to provide JobProof features, authenticate users,
          generate reports, share public report links, manage subscriptions,
          prevent abuse, improve reliability, and respond to support requests.
        </p>

        <h2>Sharing</h2>
        <p>
          We do not sell personal information. We share information only with
          service providers needed to operate JobProof, such as hosting,
          authentication, storage, payment processing, and email delivery
          providers.
        </p>

        <h2>Public Report Links</h2>
        <p>
          Reports can be shared through public links. Anyone with a valid public
          report link may view the report content attached to that link. Users
          should avoid adding sensitive information that is not required for the
          job record.
        </p>

        <h2>Data Retention</h2>
        <p>
          We keep account and report information while an account is active or
          as needed to provide the service, comply with legal obligations,
          resolve disputes, and enforce agreements.
        </p>

        <h2>Your Choices</h2>
        <p>
          Users can update account and company information inside JobProof.
          Account owners can request help with account deletion, data export, or
          privacy questions by contacting JobProof support.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy questions, contact JobProof support at
          {` ${SUPPORT_EMAIL}`}.
        </p>
      </div>
    </section>
  );
};

export default Privacy;

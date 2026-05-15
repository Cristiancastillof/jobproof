import { Link } from "react-router-dom";

const Home = () => {
  return (
    <section className="home-page">
      <div className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow mb-3">Professional job reporting</p>

          <h1>
            Turn field work into clean, organised and client-ready reports.
          </h1>

          <p className="home-hero-subtitle">
            JobProof helps cleaning teams, trades and service businesses create
            professional job reports with photos, team details, workflow status
            and PDF export.
          </p>

          <div className="home-hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">
              Get started
            </Link>

            <Link to="/login" className="btn btn-outline-primary btn-lg">
              Log in
            </Link>
          </div>

          <div className="home-trust-row">
            <span>Built for service teams</span>
            <span>Photo proof</span>
            <span>PDF reports</span>
          </div>
        </div>

        <div className="home-hero-card">
          <div className="home-report-preview">
            <div className="home-report-top">
              <div>
                <span>Job report</span>
                <strong>JP-2026-0042</strong>
              </div>

              <span className="home-status-pill">Completed</span>
            </div>

            <div className="home-report-section">
              <span>Client</span>
              <strong>Michael Turner</strong>
            </div>

            <div className="home-report-section">
              <span>Service</span>
              <strong>End of lease cleaning</strong>
            </div>

            <div className="home-report-section">
              <span>Team involved</span>
              <strong>Sarah Wilson + 2 others</strong>
            </div>

            <div className="home-photo-grid">
              <div>
                <span>Before</span>
              </div>
              <div>
                <span>After</span>
              </div>
            </div>

            <div className="home-report-footer">
              Ready to download as PDF
            </div>
          </div>
        </div>
      </div>

      <div className="home-benefits-section">
        <div className="home-section-heading">
          <p className="eyebrow mb-2">What JobProof does</p>

          <h2>Simple reporting for real field work</h2>

          <p>
            Keep your business profile, job details, photos and team activity in
            one organised place.
          </p>
        </div>

        <div className="home-benefits-grid">
          <div className="home-benefit-card">
            <div className="home-benefit-icon">🏢</div>
            <h3>Create your business profile</h3>
            <p>
              Save your business name, logo, email and phone once. JobProof adds
              those details automatically to every report.
            </p>
          </div>

          <div className="home-benefit-card">
            <div className="home-benefit-icon">📸</div>
            <h3>Build reports with photos</h3>
            <p>
              Add client details, job notes, before photos, after photos, hours
              worked and the team involved in the job.
            </p>
          </div>

          <div className="home-benefit-card">
            <div className="home-benefit-icon">✅</div>
            <h3>Track job status</h3>
            <p>
              Keep work organised with Pending, Checked and Completed status so
              your team knows exactly where each job stands.
            </p>
          </div>

          <div className="home-benefit-card">
            <div className="home-benefit-icon">📄</div>
            <h3>Download professional PDFs</h3>
            <p>
              Generate polished PDF reports that look clean, structured and ready
              to share with clients or keep for internal records.
            </p>
          </div>
        </div>
      </div>

      <div className="home-workflow-section">
        <div className="home-workflow-copy">
          <p className="eyebrow mb-2">Designed for daily operations</p>

          <h2>From job details to proof of work</h2>

          <p>
            JobProof gives your team a consistent way to document completed
            work, capture visual proof, manage report status and keep everything
            searchable in one workspace.
          </p>
        </div>

        <div className="home-workflow-list">
          <div>
            <strong>Business profile</strong>
            <span>Your branding is added automatically to reports.</span>
          </div>

          <div>
            <strong>Job report</strong>
            <span>Client, address, hours, notes, photos and team involved.</span>
          </div>

          <div>
            <strong>Report management</strong>
            <span>Search, filter, update status and review saved reports.</span>
          </div>

          <div>
            <strong>PDF export</strong>
            <span>Download a clean report that is easy to send or archive.</span>
          </div>
        </div>
      </div>

      <div className="home-cta-section">
        <div>
          <p className="eyebrow mb-2">Ready to organise your reports?</p>

          <h2>Start creating professional job proof today.</h2>

          <p>
            Set up your workspace, invite your team and create your first
            client-ready report.
          </p>
        </div>

        <Link to="/register" className="btn btn-primary btn-lg">
          Create account
        </Link>
      </div>
    </section>
  );
};

export default Home;
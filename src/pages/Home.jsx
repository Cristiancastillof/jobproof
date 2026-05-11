import { Link } from "react-router-dom";

const Home = () => {
  return (
    <section className="home-page jp-home-page">
      <div className="jp-hero">
        <div className="row align-items-center g-5">
          <div className="col-lg-7">
            <span className="jp-eyebrow">
              <span className="jp-eyebrow-dot"></span>
              Professional job reporting
            </span>

            <h1 className="jp-hero-title">
              Turn job notes and photos into professional reports.
            </h1>

            <p className="jp-hero-subtitle">
              JobProof helps service businesses document completed work, capture
              before and after photos, track job details, and generate clean PDF
              reports clients can trust.
            </p>

            <div className="jp-hero-actions">
              <Link to="/create-report" className="btn btn-primary btn-lg">
                Create your first report
              </Link>

              <Link
                to="/business-profile"
                className="btn btn-outline-primary btn-lg"
              >
                Set up business profile
              </Link>
            </div>

            <div className="jp-trust-row">
              <span>Built for mobile teams</span>
              <span>Client-ready PDFs</span>
              <span>Simple to use on site</span>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="jp-report-mockup">
              <div className="jp-mockup-top">
                <div className="jp-mockup-logo">
                  <span className="jp-mockup-lines">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  <span className="jp-mockup-check">✓</span>
                </div>

                <div>
                  <p className="jp-mockup-label mb-1">JobProof Report</p>
                  <h2 className="jp-mockup-title mb-0">Service Completed</h2>
                </div>
              </div>

              <div className="jp-mockup-badge-row">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                  JP-2026-0001
                </span>
                <span className="jp-status-pill">Ready for PDF</span>
              </div>

              <div className="jp-mockup-info-grid">
                <div>
                  <p>Client</p>
                  <strong>John Smith</strong>
                </div>

                <div>
                  <p>Completed by</p>
                  <strong>Team Member</strong>
                </div>

                <div>
                  <p>Service</p>
                  <strong>End of lease clean</strong>
                </div>

                <div>
                  <p>Total hours</p>
                  <strong>3h 30m</strong>
                </div>
              </div>

              <div className="jp-photo-preview-grid">
                <div>
                  <span>Before</span>
                </div>
                <div>
                  <span>After</span>
                </div>
              </div>

              <div className="jp-mockup-summary">
                <div></div>
                <div></div>
                <div></div>
              </div>

              <div className="jp-mockup-footer">
                <span>Saved report</span>
                <strong>Professional PDF</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="jp-section">
        <div className="jp-section-heading">
          <span className="jp-eyebrow">
            <span className="jp-eyebrow-dot"></span>
            Why JobProof
          </span>

          <h2>A clearer way to prove the work was done.</h2>

          <p>
            Built for teams that need reliable documentation without adding
            complicated software to their daily workflow.
          </p>
        </div>

        <div className="row g-3">
          <div className="col-md-4">
            <div className="jp-feature-card">
              <div className="jp-feature-icon">01</div>
              <h3>Capture job details</h3>
              <p>
                Keep client information, service type, work notes, issues,
                recommendations, and working hours in one structured report.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="jp-feature-card">
              <div className="jp-feature-icon">02</div>
              <h3>Add visual proof</h3>
              <p>
                Upload before and after photos so managers and clients can
                clearly understand what was completed on site.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="jp-feature-card">
              <div className="jp-feature-icon">03</div>
              <h3>Send polished PDFs</h3>
              <p>
                Generate professional reports with your business profile, logo,
                report number, worker name, notes, and photos.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="jp-section jp-process-section">
        <div className="row g-4 align-items-center">
          <div className="col-lg-5">
            <span className="jp-eyebrow">
              <span className="jp-eyebrow-dot"></span>
              Simple workflow
            </span>

            <h2>From job site to client-ready report.</h2>

            <p>
              JobProof is designed to be simple enough for field workers and
              clear enough for supervisors, managers, and business owners.
            </p>

            <Link to="/create-report" className="btn btn-primary">
              Start a report
            </Link>
          </div>

          <div className="col-lg-7">
            <div className="jp-steps">
              <div className="jp-step">
                <span>1</span>
                <div>
                  <h3>Set up your business profile</h3>
                  <p>
                    Save your business name, logo, phone, email, and default
                    worker details once.
                  </p>
                </div>
              </div>

              <div className="jp-step">
                <span>2</span>
                <div>
                  <h3>Create a job report</h3>
                  <p>
                    Add client details, job address, date, service type, hours,
                    and notes.
                  </p>
                </div>
              </div>

              <div className="jp-step">
                <span>3</span>
                <div>
                  <h3>Attach before and after photos</h3>
                  <p>
                    Capture proof from the job site using a mobile-friendly
                    upload flow.
                  </p>
                </div>
              </div>

              <div className="jp-step">
                <span>4</span>
                <div>
                  <h3>Save, search, and download</h3>
                  <p>
                    Keep reports in history, search by client or worker, and
                    export a professional PDF.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="jp-section">
        <div className="jp-section-heading">
          <span className="jp-eyebrow">
            <span className="jp-eyebrow-dot"></span>
            Built for service businesses
          </span>

          <h2>Useful for teams that work in the field.</h2>

          <p>
            JobProof works best where clear records, photos, and professional
            client communication matter.
          </p>
        </div>

        <div className="jp-use-case-grid">
          <div className="jp-use-case">Cleaning companies</div>
          <div className="jp-use-case">Property maintenance</div>
          <div className="jp-use-case">Handyman services</div>
          <div className="jp-use-case">Inspection teams</div>
          <div className="jp-use-case">Real estate support</div>
          <div className="jp-use-case">Field service teams</div>
        </div>
      </div>

      <div className="jp-final-cta">
        <div className="jp-final-mark">
          <span className="jp-final-lines">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span className="jp-final-check">✓</span>
        </div>

        <h2>Ready to create a better job report?</h2>

        <p>
          Set up your business profile, create your first report, and download a
          professional PDF in minutes.
        </p>

        <div className="d-flex justify-content-center gap-2 flex-wrap">
          <Link to="/business-profile" className="btn btn-light btn-lg">
            Set up profile
          </Link>

          <Link to="/create-report" className="btn btn-outline-light btn-lg">
            Create report
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Home;
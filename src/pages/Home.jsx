import { Link } from "react-router-dom";

const Home = () => {
  return (
    <section>
      <div className="hero-section text-center py-5 px-3 mb-5">
        <span className="badge bg-primary-subtle text-primary mb-3">
          Simple PDF reports for service businesses
        </span>

        <h1 className="display-4 fw-bold mb-3">
          Turn job notes and photos into professional reports.
        </h1>

        <p className="lead text-muted mx-auto hero-text">
          JobProof helps cleaners, tradies, handymen and small service
          businesses create clear PDF reports with client details, work notes,
          issues, recommendations and before/after photos.
        </p>

        <div className="d-flex justify-content-center gap-3 flex-wrap mt-4">
          <Link to="/create-report" className="btn btn-primary btn-lg">
            Create a report
          </Link>

          <Link to="/reports" className="btn btn-outline-secondary btn-lg">
            View saved reports
          </Link>
        </div>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="card h-100 shadow-sm landing-card">
            <div className="card-body">
              <h2 className="h5 fw-bold">Look more professional</h2>
              <p className="text-muted mb-0">
                Send polished reports instead of messy text messages or loose
                photo dumps.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 shadow-sm landing-card">
            <div className="card-body">
              <h2 className="h5 fw-bold">Protect your work</h2>
              <p className="text-muted mb-0">
                Keep proof of what was completed, what issues were found and
                what you recommended.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 shadow-sm landing-card">
            <div className="card-body">
              <h2 className="h5 fw-bold">Save time after every job</h2>
              <p className="text-muted mb-0">
                Fill out one simple form, upload photos and download a ready to
                send PDF.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-5 landing-panel">
        <div className="card-body p-4 p-md-5">
          <div className="row g-4 align-items-center">
            <div className="col-lg-5">
              <h2 className="fw-bold mb-3">How it works</h2>
              <p className="text-muted">
                JobProof is designed to be simple enough to use on-site, right
                after finishing a job.
              </p>
            </div>

            <div className="col-lg-7">
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="step-box">
                    <span className="step-number">1</span>
                    <h3 className="h6 fw-bold mt-3">Add details</h3>
                    <p className="small text-muted mb-0">
                      Client, address, date and service type.
                    </p>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="step-box">
                    <span className="step-number">2</span>
                    <h3 className="h6 fw-bold mt-3">Upload photos</h3>
                    <p className="small text-muted mb-0">
                      Add before and after evidence.
                    </p>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="step-box">
                    <span className="step-number">3</span>
                    <h3 className="h6 fw-bold mt-3">Download PDF</h3>
                    <p className="small text-muted mb-0">
                      Save or send a professional report.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <h2 className="fw-bold mb-4 text-center">Built for practical jobs</h2>

        <div className="row g-3">
          {[
            "Airbnb cleaners",
            "Gardeners",
            "Handymen",
            "Property maintenance",
            "Inspectors",
            "Small service businesses",
          ].map((item) => (
            <div className="col-md-4" key={item}>
              <div className="use-case-pill">{item}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-section text-center p-4 p-md-5 mb-4">
        <h2 className="fw-bold mb-3">Ready to create your first report?</h2>
        <p className="text-muted mb-4">
          Start with a simple report, add photos, download the PDF and test it
          with a real customer.
        </p>

        <Link to="/create-report" className="btn btn-success btn-lg">
          Start now
        </Link>
      </div>
    </section>
  );
};

export default Home;
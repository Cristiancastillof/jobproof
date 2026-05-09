import { Link, useParams } from "react-router-dom";
import ReportPreview from "../components/ReportPreview";
import { generatePDF } from "../utils/generatePDF";

const ReportDetails = () => {
  const { id } = useParams();

  const savedReports =
    JSON.parse(localStorage.getItem("jobproofReports")) || [];

  const report = savedReports.find((savedReport) => savedReport.id === id);

  if (!report) {
    return (
      <section>
        <h1 className="mb-4">Report not found</h1>

        <div className="alert alert-warning">
          This report does not exist or may have been deleted.
        </div>

        <Link to="/reports" className="btn btn-primary">
          Back to Reports
        </Link>
      </section>
    );
  }

  const handleDownloadPDF = async () => {
    const currentReport = {
      ...report,
      beforePhotos: report.beforePhotos || [],
      afterPhotos: report.afterPhotos || [],
    };

    try {
      await generatePDF(currentReport);
    } catch (error) {
      console.error(error);
      alert("There was an error generating the PDF.");
    }
  };

  return (
    <section>
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
            <h1 className="mb-0">Report Details</h1>

            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
              {report.reportNumber || "No number"}
            </span>
          </div>

          <p className="text-muted mb-1">
            <strong>Client:</strong> {report.clientName || "Unnamed client"}
          </p>

          <p className="text-muted mb-1">
            <strong>Service:</strong> {report.serviceType || "No service type"}
          </p>

          <p className="text-muted mb-0">
            <strong>Completed by:</strong>{" "}
            {report.workerName || "No worker assigned"}
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Link to="/reports" className="btn btn-outline-secondary">
            Back
          </Link>

          <Link to={`/edit-report/${report.id}`} className="btn btn-primary">
            Edit Report
          </Link>

          <button className="btn btn-success" onClick={handleDownloadPDF}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Business and report summary</h2>

          <div className="row g-3">
            <div className="col-md-6 col-lg-4">
              <p className="text-muted mb-1 small">Business</p>
              <p className="mb-0 fw-semibold">
                {report.businessName || "No business name"}
              </p>
            </div>

            <div className="col-md-6 col-lg-4">
              <p className="text-muted mb-1 small">Business email</p>
              <p className="mb-0 fw-semibold">
                {report.businessEmail || "No business email"}
              </p>
            </div>

            <div className="col-md-6 col-lg-4">
              <p className="text-muted mb-1 small">Business phone</p>
              <p className="mb-0 fw-semibold">
                {report.businessPhone || "No business phone"}
              </p>
            </div>

            <div className="col-md-6 col-lg-4">
              <p className="text-muted mb-1 small">Report number</p>
              <p className="mb-0 fw-semibold">
                {report.reportNumber || "No report number"}
              </p>
            </div>

            <div className="col-md-6 col-lg-4">
              <p className="text-muted mb-1 small">Worker</p>
              <p className="mb-0 fw-semibold">
                {report.workerName || "No worker assigned"}
              </p>
            </div>

            <div className="col-md-6 col-lg-4">
              <p className="text-muted mb-1 small">Job date</p>
              <p className="mb-0 fw-semibold">
                {report.jobDate || "No job date"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {report.updatedAt && (
        <div className="alert alert-info">
          Last updated: {new Date(report.updatedAt).toLocaleString()}
        </div>
      )}

      <ReportPreview reportData={report} />
    </section>
  );
};

export default ReportDetails;
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

  const handleDownloadPDF = () => {
    const clientName = report.clientName || "client";
    const fileName = `${clientName}-saved-job-report.pdf`;

    generatePDF("report-preview", fileName);
  };

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">Report Details</h1>
          <p className="text-muted mb-0">
            {report.clientName || "Unnamed client"} -{" "}
            {report.serviceType || "No service type"}
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Link to="/reports" className="btn btn-outline-secondary">
            Back
          </Link>

          <button className="btn btn-success" onClick={handleDownloadPDF}>
            Download PDF
          </button>
        </div>
      </div>

      <ReportPreview reportData={report} />
    </section>
  );
};

export default ReportDetails;
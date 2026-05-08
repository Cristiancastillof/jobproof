import { calculateTotalHours } from "../utils/calculateTotalHours";

const ReportPreview = ({ reportData }) => {
  const totalHours =
    reportData.totalHours ||
    calculateTotalHours(reportData.startingHour, reportData.finishHour);

  const renderPhotos = (photos, title) => {
    if (!photos || photos.length === 0) {
      return (
        <p className="text-muted small">
          No {title.toLowerCase()} uploaded yet.
        </p>
      );
    }

    return (
      <div className="row g-3">
        {photos.map((photo, index) => (
          <div className="col-6" key={`${title}-${index}`}>
            <img
              src={photo}
              alt={`${title} ${index + 1}`}
              className="img-fluid rounded report-photo"
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div id="report-preview" className="report-preview bg-white p-4">
          <div className="border-bottom pb-3 mb-4">
            <h2 className="fw-bold mb-1">
              {reportData.businessName || "Your Business Name"}
            </h2>
            <p className="text-muted mb-0">Professional Job Report</p>
          </div>

          <div className="row mb-4">
            <div className="col-md-6">
              <h5>Client details</h5>
              <p className="mb-1">
                <strong>Client:</strong>{" "}
                {reportData.clientName || "Client name"}
              </p>
              <p className="mb-1">
                <strong>Address:</strong>{" "}
                {reportData.jobAddress || "Job address"}
              </p>
            </div>

            <div className="col-md-6">
              <h5>Job details</h5>
              <p className="mb-1">
                <strong>Date:</strong> {reportData.jobDate || "Job date"}
              </p>
              <p className="mb-1">
                <strong>Start:</strong>{" "}
                {reportData.startingHour || "Starting hour"}
              </p>
              <p className="mb-1">
                <strong>Finish:</strong>{" "}
                {reportData.finishHour || "Finish hour"}
              </p>
              <p className="mb-1">
                <strong>Total hours:</strong>{" "}
                {totalHours || "Total hours"}
              </p>
              <p className="mb-1">
                <strong>Service:</strong>{" "}
                {reportData.serviceType || "Service type"}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h5>Work completed</h5>
            <p className="preview-text">
              {reportData.workCompleted ||
                "The completed work details will appear here."}
            </p>
          </div>

          <div className="mb-4">
            <h5>Issues found</h5>
            <p className="preview-text">
              {reportData.issuesFound ||
                "Any issues found during the job will appear here."}
            </p>
          </div>

          <div className="mb-4">
            <h5>Recommendations</h5>
            <p className="preview-text">
              {reportData.recommendations ||
                "Recommendations for the client will appear here."}
            </p>
          </div>

          <div className="mb-4">
            <h5>Before photos</h5>
            {renderPhotos(reportData.beforePhotos, "Before photos")}
          </div>

          <div className="mb-4">
            <h5>After photos</h5>
            {renderPhotos(reportData.afterPhotos, "After photos")}
          </div>

          <div className="border-top pt-3 text-muted small">
            Report generated with JobProof.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;
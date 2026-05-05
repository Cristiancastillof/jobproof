import { useEffect, useState } from "react";

const Reports = () => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const savedReports =
      JSON.parse(localStorage.getItem("jobproofReports")) || [];

    setReports(savedReports);
  }, []);

  const handleDeleteReport = (reportId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this report?"
    );

    if (!confirmDelete) return;

    const updatedReports = reports.filter((report) => report.id !== reportId);

    localStorage.setItem("jobproofReports", JSON.stringify(updatedReports));
    setReports(updatedReports);
  };

  const renderSmallPhotos = (photos) => {
    if (!photos || photos.length === 0) {
      return <small className="text-muted">No photos</small>;
    }

    return (
      <div className="saved-report-photo-list">
        {photos.slice(0, 3).map((photo, index) => (
          <img
            key={`${photo.slice(0, 20)}-${index}`}
            src={photo}
            alt={`Saved report photo ${index + 1}`}
            className="saved-report-thumb"
          />
        ))}

        {photos.length > 3 && (
          <small className="text-muted align-self-center">
            +{photos.length - 3} more
          </small>
        )}
      </div>
    );
  };

  if (reports.length === 0) {
    return (
      <section>
        <h1 className="mb-4">Reports</h1>

        <div className="alert alert-secondary">
          No saved reports yet. Create a report and click Save Report to see it
          here.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1 className="mb-4">Saved Reports</h1>

      <div className="row g-3">
        {reports.map((report) => (
          <div className="col-md-6 col-lg-4" key={report.id}>
            <div className="card shadow-sm h-100 saved-report-card">
              <div className="card-body d-flex flex-column">
                <h2 className="h5 mb-2">
                  {report.clientName || "Unnamed client"}
                </h2>

                <p className="text-muted mb-1">
                  <strong>Business:</strong>{" "}
                  {report.businessName || "No business name"}
                </p>

                <p className="text-muted mb-1">
                  <strong>Service:</strong>{" "}
                  {report.serviceType || "No service type"}
                </p>

                <p className="text-muted mb-1">
                  <strong>Date:</strong> {report.jobDate || "No job date"}
                </p>

                <p className="text-muted mb-3">
                  <strong>Address:</strong>{" "}
                  {report.jobAddress || "No job address"}
                </p>

                <p className="small">
                  {report.workCompleted
                    ? report.workCompleted.slice(0, 120)
                    : "No work notes added."}
                  {report.workCompleted && report.workCompleted.length > 120
                    ? "..."
                    : ""}
                </p>

                <div className="mb-3">
                  <strong className="small d-block mb-1">Before photos</strong>
                  {renderSmallPhotos(report.beforePhotos)}
                </div>

                <div className="mb-3">
                  <strong className="small d-block mb-1">After photos</strong>
                  {renderSmallPhotos(report.afterPhotos)}
                </div>

                <div className="d-flex justify-content-between align-items-center mt-auto">
                  <small className="text-muted">
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleDateString()
                      : "No saved date"}
                  </small>

                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDeleteReport(report.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Reports;
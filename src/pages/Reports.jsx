import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const savedReports =
      JSON.parse(localStorage.getItem("jobproofReports")) || [];

    setReports(savedReports);
  }, []);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return reports;

    return reports.filter((report) => {
      const searchableText = [
        report.reportNumber,
        report.clientName,
        report.businessName,
        report.businessEmail,
        report.businessPhone,
        report.workerName,
        report.jobAddress,
        report.serviceType,
        report.jobDate,
        report.workCompleted,
        report.issuesFound,
        report.recommendations,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [reports, searchTerm]);

  const handleDeleteReport = (reportId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this report?"
    );

    if (!confirmDelete) return;

    const updatedReports = reports.filter((report) => report.id !== reportId);

    localStorage.setItem("jobproofReports", JSON.stringify(updatedReports));
    setReports(updatedReports);
  };

  const handleClearAllReports = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to delete all saved reports? This action cannot be undone."
    );

    if (!confirmClear) return;

    localStorage.removeItem("jobproofReports");
    setReports([]);
    setSearchTerm("");
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
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="mb-0">Reports</h1>

          <Link to="/create-report" className="btn btn-primary">
            Create Report
          </Link>
        </div>

        <div className="alert alert-secondary">
          No saved reports yet. Create a report and click Save Report to see it
          here.
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">Saved Reports</h1>
          <p className="text-muted mb-0">
            You have {reports.length} saved report
            {reports.length === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Link to="/create-report" className="btn btn-primary">
            Create Report
          </Link>

          <button
            className="btn btn-outline-danger"
            onClick={handleClearAllReports}
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <label htmlFor="reportsSearch" className="form-label">
            Search reports
          </label>

          <input
            id="reportsSearch"
            type="text"
            className="form-control"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by report number, client, worker, business, email, phone, address or service..."
          />

          <small className="text-muted d-block mt-2">
            Showing {filteredReports.length} of {reports.length} report
            {reports.length === 1 ? "" : "s"}.
          </small>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="alert alert-warning">
          No reports matched your search. Try another report number, client,
          worker, business, email, phone, address or service type.
        </div>
      ) : (
        <div className="row g-3">
          {filteredReports.map((report) => (
            <div className="col-md-6 col-lg-4" key={report.id}>
              <div className="card shadow-sm h-100 saved-report-card">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <h2 className="h5 mb-0">
                      {report.clientName || "Unnamed client"}
                    </h2>

                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                      {report.reportNumber || "No number"}
                    </span>
                  </div>

                  <p className="text-muted mb-1">
                    <strong>Business:</strong>{" "}
                    {report.businessName || "No business name"}
                  </p>

                  {report.businessEmail && (
                    <p className="text-muted mb-1">
                      <strong>Email:</strong> {report.businessEmail}
                    </p>
                  )}

                  {report.businessPhone && (
                    <p className="text-muted mb-1">
                      <strong>Phone:</strong> {report.businessPhone}
                    </p>
                  )}

                  <p className="text-muted mb-1">
                    <strong>Completed by:</strong>{" "}
                    {report.workerName || "No worker assigned"}
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
                    <strong className="small d-block mb-1">
                      Before photos
                    </strong>
                    {renderSmallPhotos(report.beforePhotos)}
                  </div>

                  <div className="mb-3">
                    <strong className="small d-block mb-1">
                      After photos
                    </strong>
                    {renderSmallPhotos(report.afterPhotos)}
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-auto">
                    <small className="text-muted">
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleDateString()
                        : "No saved date"}
                    </small>

                    <div className="d-flex gap-2">
                      <Link
                        to={`/reports/${report.id}`}
                        className="btn btn-sm btn-primary"
                      >
                        View
                      </Link>

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
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default Reports;
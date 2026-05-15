import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const formatDate = (dateValue) => {
  if (!dateValue) return "Not specified";

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCreatedAt = (dateValue) => {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusBadgeClass = (status) => {
  if (status === "approved") return "bg-success";
  if (status === "submitted") return "bg-primary";
  if (status === "draft") return "bg-secondary";
  if (status === "archived") return "bg-dark";

  return "bg-info text-dark";
};

const getRoleDescription = (role) => {
  if (role === "admin") {
    return "You can view and manage all company reports.";
  }

  if (role === "supervisor") {
    return "You can view and manage reports across your company.";
  }

  return "You can view and manage reports created by you.";
};

const Reports = () => {
  const { user, profile, displayRole, profileLoading } = useAuth();

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);

  const isWorker = profile?.role === "worker";

  useEffect(() => {
    const loadReports = async () => {
      if (profileLoading) return;

      if (!user?.id) {
        setLoadingReports(false);
        return;
      }

      if (!profile?.company_id) {
        setLoadingReports(false);
        setMessage({
          type: "warning",
          text: "Please complete your Business Profile before viewing reports.",
        });
        return;
      }

      setLoadingReports(true);
      setMessage(null);

      try {
        let reportsQuery = supabase
          .from("reports")
          .select(
            `
            id,
            report_number,
            client_name,
            job_address,
            job_date,
            service_type,
            total_hours,
            status,
            created_at,
            updated_at,
            created_by,
            profiles:created_by (
              full_name,
              email,
              role
            )
          `
          )
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false });

        if (profile.role === "worker") {
          reportsQuery = reportsQuery.eq("created_by", user.id);
        }

        const { data, error } = await reportsQuery;

        if (error) {
          throw error;
        }

        setReports(data || []);
      } catch (error) {
        console.error("Error loading reports:", error);

        setMessage({
          type: "danger",
          text: error.message || "There was an error loading reports.",
        });
      } finally {
        setLoadingReports(false);
      }
    };

    loadReports();
  }, [user, profile, profileLoading]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return reports;

    return reports.filter((report) => {
      const searchableText = [
        report.report_number,
        report.client_name,
        report.job_address,
        report.service_type,
        report.status,
        report.profiles?.full_name,
        report.profiles?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [reports, searchTerm]);

  if (loadingReports || profileLoading) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading reports</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof loads your workspace reports.
        </p>
      </section>
    );
  }

  if (!profile?.company_id) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <h1 className="h3 mb-3">Business Profile required</h1>

            <p className="text-muted mb-4">
              Complete your Business Profile before viewing reports.
            </p>

            <Link to="/business-profile" className="btn btn-primary">
              Complete Business Profile
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">
            {isWorker ? "My reports" : "Company reports"}
          </p>

          <h1 className="section-title mb-2">
            {isWorker ? "My job reports" : "Company job reports"}
          </h1>

          <p className="section-subtitle mb-0">
            {getRoleDescription(profile?.role)}
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Link to="/create-report" className="btn btn-primary">
            Create Report
          </Link>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="row g-3 align-items-center">
            <div className="col-lg-7">
              <label htmlFor="reportSearch" className="form-label">
                Search reports
              </label>

              <input
                id="reportSearch"
                type="search"
                className="form-control"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by report number, client, address, service or worker"
              />
            </div>

            <div className="col-lg-5">
              <div className="reports-summary-box">
                <span className="reports-summary-label">
                  {isWorker ? "My reports" : "Total reports"}
                </span>

                <strong>{reports.length}</strong>

                <span className="reports-summary-divider"></span>

                <span className="reports-summary-label">Your role</span>

                <strong>{displayRole}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <h2 className="h4 mb-3">
              {reports.length === 0 ? "No reports yet" : "No matching reports"}
            </h2>

            <p className="text-muted mb-4">
              {reports.length === 0
                ? isWorker
                  ? "Create your first job report to start building your work history."
                  : "Create your first job report to start building your company history."
                : "Try another search term or clear the search field."}
            </p>

            {reports.length === 0 && (
              <Link to="/create-report" className="btn btn-primary">
                Create First Report
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 reports-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Client</th>
                  <th>Job date</th>
                  <th>Service</th>
                  <th>Worker</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="fw-bold">
                        {report.report_number || "No report number"}
                      </div>

                      <div className="text-muted small">
                        Created {formatCreatedAt(report.created_at)}
                      </div>
                    </td>

                    <td>
                      <div className="fw-semibold">
                        {report.client_name || "Not specified"}
                      </div>

                      <div className="text-muted small">
                        {report.job_address || "No address added"}
                      </div>
                    </td>

                    <td>{formatDate(report.job_date)}</td>

                    <td>
                      <div>{report.service_type || "Not specified"}</div>

                      <div className="text-muted small">
                        {report.total_hours || "No hours recorded"}
                      </div>
                    </td>

                    <td>
                      <div>{report.profiles?.full_name || "Unknown user"}</div>

                      <div className="text-muted small">
                        {report.profiles?.role || "worker"}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge ${getStatusBadgeClass(
                          report.status
                        )}`}
                      >
                        {report.status || "completed"}
                      </span>
                    </td>

                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          to={`/reports/${report.id}`}
                          className="btn btn-outline-primary"
                        >
                          View
                        </Link>

                        <Link
                          to={`/edit-report/${report.id}`}
                          className="btn btn-outline-secondary"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default Reports;
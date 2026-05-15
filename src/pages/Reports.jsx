import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const REPORT_STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "checked",
    label: "Checked",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

const formatDate = (dateValue) => {
  if (!dateValue) return "Not provided";

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

const getStatusLabel = (status) => {
  if (status === "pending") return "Pending";
  if (status === "checked") return "Checked";
  if (status === "completed") return "Completed";

  return "Pending";
};

const getStatusBadgeClass = (status) => {
  if (status === "completed") return "bg-success";
  if (status === "checked") return "bg-primary";
  if (status === "pending") return "bg-warning text-dark";

  return "bg-secondary";
};

const getTeamSummary = (teamInvolved = [], creatorName = "") => {
  if (!teamInvolved || teamInvolved.length === 0) {
    return creatorName || "Not recorded";
  }

  const sortedTeam = [...teamInvolved].sort((a, b) => {
    if (a.roleOnJob === "lead") return -1;
    if (b.roleOnJob === "lead") return 1;
    return a.fullName.localeCompare(b.fullName);
  });

  const firstPerson = sortedTeam[0]?.fullName || creatorName || "Team member";
  const othersCount = sortedTeam.length - 1;

  if (othersCount <= 0) {
    return firstPerson;
  }

  return `${firstPerson} + ${othersCount} ${
    othersCount === 1 ? "other" : "others"
  }`;
};

const mapReportRow = (report) => {
  const creator = report.creator;

  const teamInvolved = (report.report_workers || [])
    .map((worker) => ({
      id: worker.profiles?.id || worker.profile_id,
      fullName: worker.profiles?.full_name || "Unknown user",
      email: worker.profiles?.email || "",
      role: worker.profiles?.role || "worker",
      roleOnJob: worker.role_on_job || "worker",
    }))
    .sort((a, b) => {
      if (a.roleOnJob === "lead") return -1;
      if (b.roleOnJob === "lead") return 1;
      return a.fullName.localeCompare(b.fullName);
    });

  const fallbackTeam =
    teamInvolved.length > 0
      ? teamInvolved
      : [
          {
            id: creator?.id || report.created_by,
            fullName: creator?.full_name || "Unknown user",
            email: creator?.email || "",
            role: creator?.role || "worker",
            roleOnJob: "lead",
          },
        ];

  return {
    id: report.id,
    reportNumber: report.report_number || "No number",
    clientName: report.client_name || "Not provided",
    jobAddress: report.job_address || "Not provided",
    jobDate: report.job_date || "",
    serviceType: report.service_type || "Not provided",
    totalHours: report.total_hours || "Not calculated",
    status: report.status || "pending",
    createdAt: report.created_at || "",
    createdBy: report.created_by || "",
    creatorName: creator?.full_name || "Unknown user",
    teamInvolved: fallbackTeam,
    teamSummary: getTeamSummary(fallbackTeam, creator?.full_name),
  };
};

const Reports = () => {
  const { user, profile, profileLoading } = useAuth();

  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingReports, setLoadingReports] = useState(true);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [message, setMessage] = useState(null);

  const isWorker = profile?.role === "worker";
  const canManageStatus =
    profile?.role === "admin" || profile?.role === "supervisor";

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        !normalizedSearch ||
        report.reportNumber.toLowerCase().includes(normalizedSearch) ||
        report.clientName.toLowerCase().includes(normalizedSearch) ||
        report.jobAddress.toLowerCase().includes(normalizedSearch) ||
        report.serviceType.toLowerCase().includes(normalizedSearch) ||
        report.creatorName.toLowerCase().includes(normalizedSearch) ||
        report.teamSummary.toLowerCase().includes(normalizedSearch) ||
        getStatusLabel(report.status).toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, searchTerm, statusFilter]);

  useEffect(() => {
    const loadReports = async () => {
      if (profileLoading) return;

      if (!user?.id || !profile?.company_id) {
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
        const { data, error } = await supabase
          .from("reports")
          .select(
            `
            id,
            company_id,
            created_by,
            report_number,
            client_name,
            job_address,
            job_date,
            service_type,
            total_hours,
            status,
            created_at,
            creator:created_by (
              id,
              full_name,
              email,
              role
            ),
            report_workers (
              id,
              profile_id,
              role_on_job,
              profiles:profile_id (
                id,
                full_name,
                email,
                role
              )
            )
          `
          )
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const mappedReports = (data || []).map(mapReportRow);

        setReports(mappedReports);
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

  const handleUpdateStatus = async (reportId, nextStatus) => {
    if (!canManageStatus) {
      setMessage({
        type: "warning",
        text: "Only admins and supervisors can update report status.",
      });
      return;
    }

    setUpdatingStatusId(reportId);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .eq("company_id", profile.company_id);

      if (error) {
        throw error;
      }

      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: nextStatus,
              }
            : report
        )
      );

      setMessage({
        type: "success",
        text: `Report status updated to ${getStatusLabel(nextStatus)}.`,
      });
    } catch (error) {
      console.error("Error updating report status:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error updating the report status. Please try again.",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (isWorker) {
      setMessage({
        type: "warning",
        text: "Workers cannot delete reports.",
      });
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this report? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId)
        .eq("company_id", profile.company_id);

      if (error) {
        throw error;
      }

      setReports((currentReports) =>
        currentReports.filter((report) => report.id !== reportId)
      );

      setMessage({
        type: "success",
        text: "Report deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting report:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error deleting this report. Please check your permissions.",
      });
    }
  };

  const canEditReport = (report) => {
    if (!isWorker) return true;

    return report.createdBy === user?.id;
  };

  const renderStatusControl = (report) => {
    if (!canManageStatus) {
      return (
        <span className={`badge ${getStatusBadgeClass(report.status)}`}>
          {getStatusLabel(report.status)}
        </span>
      );
    }

    return (
      <div className="reports-status-control">
        <select
          className={`form-select form-select-sm reports-status-select reports-status-${report.status}`}
          value={report.status}
          onChange={(event) => handleUpdateStatus(report.id, event.target.value)}
          disabled={updatingStatusId === report.id}
        >
          {REPORT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {updatingStatusId === report.id && (
          <small className="text-muted">Updating...</small>
        )}
      </div>
    );
  };

  if (loadingReports || profileLoading) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading reports</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof loads your saved reports.
        </p>
      </section>
    );
  }

  if (!profile?.company_id) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Reports</p>

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
            {isWorker ? "My job reports" : "Company job reports"}
          </p>

          <h1 className="section-title mb-2">Reports</h1>

          <p className="section-subtitle mb-0">
            {isWorker
              ? "View reports you created or reports where you were included as part of the job team."
              : "Review all saved reports across your company workspace."}
          </p>
        </div>

        <Link to="/create-report" className="btn btn-primary">
          Create Report
        </Link>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="row g-3 align-items-end">
            <div className="col-md-7">
              <label htmlFor="reportSearch" className="form-label">
                Search reports
              </label>

              <input
                id="reportSearch"
                type="search"
                className="form-control"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by report number, client, address, service, creator, team or status..."
              />
            </div>

            <div className="col-md-3">
              <label htmlFor="statusFilter" className="form-label">
                Status filter
              </label>

              <select
                id="statusFilter"
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="checked">Checked</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="col-md-2">
              <div className="reports-count-box">
                <span>Total reports</span>
                <strong>{filteredReports.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <h2 className="h4 mb-3">
              {searchTerm || statusFilter !== "all"
                ? "No reports found"
                : "No reports yet"}
            </h2>

            <p className="text-muted mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Try a different search term or status filter."
                : "Start by creating your first job report."}
            </p>

            {!searchTerm && statusFilter === "all" && (
              <Link to="/create-report" className="btn btn-primary">
                Create Report
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="reports-mobile-list">
            {filteredReports.map((report) => (
              <div className="reports-mobile-card" key={report.id}>
                <div className="d-flex justify-content-between gap-3 mb-2">
                  <div>
                    <p className="eyebrow mb-1">{report.reportNumber}</p>

                    <h2 className="h5 mb-1">{report.clientName}</h2>

                    <p className="text-muted small mb-0">
                      {formatDate(report.jobDate)}
                    </p>
                  </div>

                  <span className={`badge ${getStatusBadgeClass(report.status)}`}>
                    {getStatusLabel(report.status)}
                  </span>
                </div>

                <div className="reports-mobile-meta">
                  <span>Service</span>
                  <strong>{report.serviceType}</strong>

                  <span>Team</span>
                  <strong>{report.teamSummary}</strong>

                  <span>Hours</span>
                  <strong>{report.totalHours}</strong>

                  <span>Status</span>
                  <strong>{renderStatusControl(report)}</strong>
                </div>

                <div className="d-flex gap-2 flex-wrap mt-3">
                  <Link
                    to={`/reports/${report.id}`}
                    className="btn btn-sm btn-primary"
                  >
                    View
                  </Link>

                  {canEditReport(report) && (
                    <Link
                      to={`/edit-report/${report.id}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Edit
                    </Link>
                  )}

                  {!isWorker && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteReport(report.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card shadow-sm border-0 reports-table-card">
            <div className="table-responsive">
              <table className="table align-middle mb-0 reports-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Client</th>
                    <th>Job date</th>
                    <th>Service</th>
                    <th>Created by</th>
                    <th>Team involved</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Saved</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <strong>{report.reportNumber}</strong>
                      </td>

                      <td>
                        <strong>{report.clientName}</strong>

                        <div className="text-muted small">
                          {report.jobAddress}
                        </div>
                      </td>

                      <td>{formatDate(report.jobDate)}</td>

                      <td>{report.serviceType}</td>

                      <td>{report.creatorName}</td>

                      <td>
                        <span className="reports-team-pill">
                          {report.teamSummary}
                        </span>
                      </td>

                      <td>{report.totalHours}</td>

                      <td>{renderStatusControl(report)}</td>

                      <td>{formatCreatedAt(report.createdAt)}</td>

                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link
                            to={`/reports/${report.id}`}
                            className="btn btn-outline-primary"
                          >
                            View
                          </Link>

                          {canEditReport(report) && (
                            <Link
                              to={`/edit-report/${report.id}`}
                              className="btn btn-outline-secondary"
                            >
                              Edit
                            </Link>
                          )}

                          {!isWorker && (
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default Reports;
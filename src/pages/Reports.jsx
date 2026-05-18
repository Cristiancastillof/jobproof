import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { recordReportActivity } from "../utils/reportActivity";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "checked", label: "Checked" },
  { value: "completed", label: "Completed" },
];

const formatStatusLabel = (status) => {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Not provided";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatValue = (value, fallback = "Not provided") => {
  if (!value || String(value).trim() === "") return fallback;
  return value;
};

const getClientName = (report) => {
  return (
    report.client_display_name ||
    report.client_name ||
    report.client_contact_person ||
    "Client not provided"
  );
};

const getClientAddress = (report) => {
  return (
    report.client_address_snapshot ||
    report.job_address ||
    "Address not provided"
  );
};

const getPublicReportUrl = (token) => {
  if (!token) return "";
  return `${window.location.origin}/reports/client/${token}`;
};

const canEditReport = ({ report, profile, user }) => {
  if (!report || !profile || !user) return false;

  return (
    profile.role === "admin" ||
    profile.role === "supervisor" ||
    report.created_by === user.id
  );
};

const canManageStatus = (profile) => {
  return profile?.role === "admin" || profile?.role === "supervisor";
};

const canSendReport = (report) => {
  return (
    report?.status === "completed" &&
    Boolean(report?.client_email) &&
    Boolean(report?.public_share_enabled) &&
    Boolean(report?.public_share_token)
  );
};

const buildMailtoLink = (report) => {
  const email = report.client_email || "";

  const clientName =
    report.client_contact_person ||
    report.client_display_name ||
    report.client_name ||
    "there";

  const publicUrl = getPublicReportUrl(report.public_share_token);
  const subject = `Job report ${report.report_number || ""}`.trim();

  const body = [
    `Hi ${clientName},`,
    "",
    "Your job report has been completed.",
    "",
    `Report number: ${report.report_number || "Not provided"}`,
    `Job address: ${getClientAddress(report)}`,
    `Service: ${report.service_type || "Not provided"}`,
    "",
    `You can view the report here: ${publicUrl}`,
    "",
    "Regards,",
    "JobProof",
  ].join("\n");

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

const Reports = () => {
  const { user, profile, profileLoading } = useAuth();

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [updatingShareId, setUpdatingShareId] = useState(null);
  const [copiedReportId, setCopiedReportId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState(null);

  const canUpdateStatus = canManageStatus(profile);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      const searchableText = [
        report.report_number,
        report.client_name,
        report.client_display_name,
        report.client_company_name,
        report.client_contact_person,
        report.client_email,
        report.client_phone,
        report.client_address_snapshot,
        report.job_address,
        report.service_type,
        report.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [reports, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    return reports.reduce(
      (counts, report) => {
        const status = report.status || "pending";

        return {
          ...counts,
          [status]: (counts[status] || 0) + 1,
          total: counts.total + 1,
        };
      },
      {
        total: 0,
        pending: 0,
        checked: 0,
        completed: 0,
      }
    );
  }, [reports]);

  const loadReports = async () => {
    if (!user?.id || !profile?.company_id) {
      setLoadingReports(false);
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
          client_id,
          client_name,
          client_display_name,
          client_company_name,
          client_contact_person,
          client_email,
          client_phone,
          client_address_snapshot,
          client_access_notes,
          job_address,
          job_date,
          starting_hour,
          finish_hour,
          total_hours,
          service_type,
          status,
          public_share_token,
          public_share_enabled,
          public_shared_at,
          created_at,
          updated_at
        `
        )
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

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

  useEffect(() => {
    if (profileLoading) return;

    loadReports();
  }, [user, profile, profileLoading]);

  const handleStatusChange = async (report, nextStatus) => {
    if (!canUpdateStatus) {
      setMessage({
        type: "warning",
        text: "Only admins and supervisors can update report status.",
      });
      return;
    }

    const shouldDisableSharing =
      nextStatus !== "completed" && report.public_share_enabled;

    setUpdatingStatusId(report.id);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("reports")
        .update({
          status: nextStatus,
          public_share_enabled: shouldDisableSharing
            ? false
            : report.public_share_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id)
        .eq("company_id", profile.company_id)
        .select(
          `
          id,
          company_id,
          created_by,
          report_number,
          client_id,
          client_name,
          client_display_name,
          client_company_name,
          client_contact_person,
          client_email,
          client_phone,
          client_address_snapshot,
          client_access_notes,
          job_address,
          job_date,
          starting_hour,
          finish_hour,
          total_hours,
          service_type,
          status,
          public_share_token,
          public_share_enabled,
          public_shared_at,
          created_at,
          updated_at
        `
        )
        .single();

      if (error) {
        throw error;
      }

      await recordReportActivity({
        reportId: report.id,
        companyId: profile.company_id,
        actorId: user.id,
        activityType: "status_changed",
        previousValue: report.status || "pending",
        newValue: nextStatus,
        activityNote: `Status changed from ${formatStatusLabel(
          report.status || "pending"
        )} to ${formatStatusLabel(nextStatus)}.`,
      });

      if (shouldDisableSharing) {
        await recordReportActivity({
          reportId: report.id,
          companyId: profile.company_id,
          actorId: user.id,
          activityType: "sharing_disabled",
          previousValue: "enabled",
          newValue: "disabled",
          activityNote: "Client sharing disabled because report is no longer completed.",
        });
      }

      setReports((currentReports) =>
        currentReports.map((currentReport) =>
          currentReport.id === report.id ? data : currentReport
        )
      );

      setMessage({
        type: "success",
        text: shouldDisableSharing
          ? `Report marked as ${formatStatusLabel(
              nextStatus
            )}. Client sharing was disabled.`
          : `Report marked as ${formatStatusLabel(nextStatus)}.`,
      });
    } catch (error) {
      console.error("Error updating report status:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error updating this report status. Please try again.",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleEnableSharing = async (report) => {
    if (!canUpdateStatus) {
      setMessage({
        type: "warning",
        text: "Only admins and supervisors can enable client sharing.",
      });
      return;
    }

    if (report.status !== "completed") {
      setMessage({
        type: "warning",
        text: "Only completed reports can be shared with clients.",
      });
      return;
    }

    setUpdatingShareId(report.id);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("reports")
        .update({
          public_share_enabled: true,
          public_shared_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id)
        .eq("company_id", profile.company_id)
        .select(
          "id, public_share_token, public_share_enabled, public_shared_at, updated_at"
        )
        .single();

      if (error) {
        throw error;
      }

      await recordReportActivity({
        reportId: report.id,
        companyId: profile.company_id,
        actorId: user.id,
        activityType: "sharing_enabled",
        newValue: "enabled",
        activityNote: "Client sharing enabled.",
      });

      setReports((currentReports) =>
        currentReports.map((currentReport) =>
          currentReport.id === report.id
            ? {
                ...currentReport,
                public_share_token: data.public_share_token,
                public_share_enabled: data.public_share_enabled,
                public_shared_at: data.public_shared_at,
                updated_at: data.updated_at,
              }
            : currentReport
        )
      );

      setMessage({
        type: "success",
        text: "Client sharing enabled for this report.",
      });
    } catch (error) {
      console.error("Error enabling sharing:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error enabling client sharing for this report.",
      });
    } finally {
      setUpdatingShareId(null);
    }
  };

  const handleCopyClientLink = async (report) => {
    const publicUrl = getPublicReportUrl(report.public_share_token);

    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);

      await recordReportActivity({
        reportId: report.id,
        companyId: profile.company_id,
        actorId: user.id,
        activityType: "client_link_copied",
        newValue: "copied",
        activityNote: "Client report link copied.",
      });

      setCopiedReportId(report.id);

      setTimeout(() => {
        setCopiedReportId(null);
      }, 1800);
    } catch (error) {
      console.error("Error copying client link:", error);
      window.prompt("Copy this client report link:", publicUrl);
    }
  };

  const renderStatusControl = (report) => {
    const status = report.status || "pending";

    if (!canUpdateStatus) {
      return (
        <span className={`report-status-badge ${status}`}>
          {formatStatusLabel(status)}
        </span>
      );
    }

    return (
      <div className="reports-status-control">
        <select
          className={`form-select reports-status-select reports-status-${status}`}
          value={status}
          onChange={(event) => handleStatusChange(report, event.target.value)}
          disabled={updatingStatusId === report.id}
        >
          {STATUS_OPTIONS.map((option) => (
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

  const renderShareActions = (report, size = "") => {
    const buttonSizeClass = size ? `btn-${size}` : "";

    if (report.status !== "completed") {
      return null;
    }

    if (!report.public_share_enabled) {
      if (!canUpdateStatus) return null;

      return (
        <button
          type="button"
          className={`btn ${buttonSizeClass} btn-outline-primary`}
          onClick={() => handleEnableSharing(report)}
          disabled={updatingShareId === report.id}
        >
          {updatingShareId === report.id ? "Enabling..." : "Enable share"}
        </button>
      );
    }

    return (
      <>
        <button
          type="button"
          className={`btn ${buttonSizeClass} btn-outline-primary`}
          onClick={() => handleCopyClientLink(report)}
        >
          {copiedReportId === report.id ? "Copied!" : "Copy link"}
        </button>

        {canSendReport(report) && (
          <a
            className={`btn ${buttonSizeClass} btn-primary`}
            href={buildMailtoLink(report)}
            target="_blank"
            rel="noreferrer"
          >
            Send
          </a>
        )}
      </>
    );
  };

  if (profileLoading || loadingReports) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading reports</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof loads your reports.
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
              Complete your Business Profile before managing reports.
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
          <p className="eyebrow mb-2">Reports</p>

          <h1 className="section-title mb-2">Job reports</h1>

          <p className="section-subtitle mb-0">
            Track job reports, client details, workflow status and client-ready
            actions.
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

      <div className="reports-summary-grid mb-4">
        <button
          type="button"
          className={
            statusFilter === "all"
              ? "reports-summary-card active"
              : "reports-summary-card"
          }
          onClick={() => setStatusFilter("all")}
        >
          <span>Total</span>
          <strong>{statusCounts.total}</strong>
        </button>

        <button
          type="button"
          className={
            statusFilter === "pending"
              ? "reports-summary-card active pending"
              : "reports-summary-card pending"
          }
          onClick={() => setStatusFilter("pending")}
        >
          <span>Pending</span>
          <strong>{statusCounts.pending}</strong>
        </button>

        <button
          type="button"
          className={
            statusFilter === "checked"
              ? "reports-summary-card active checked"
              : "reports-summary-card checked"
          }
          onClick={() => setStatusFilter("checked")}
        >
          <span>Checked</span>
          <strong>{statusCounts.checked}</strong>
        </button>

        <button
          type="button"
          className={
            statusFilter === "completed"
              ? "reports-summary-card active completed"
              : "reports-summary-card completed"
          }
          onClick={() => setStatusFilter("completed")}
        >
          <span>Completed</span>
          <strong>{statusCounts.completed}</strong>
        </button>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-lg-8">
              <label htmlFor="reportSearch" className="form-label">
                Search reports
              </label>

              <input
                id="reportSearch"
                type="search"
                className="form-control"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by report number, client, email, phone, address, service or status..."
              />
            </div>

            <div className="col-lg-4">
              <label htmlFor="statusFilter" className="form-label">
                Status
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
          </div>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">No reports found</p>

            <h2 className="h4 mb-3">Create your first job report</h2>

            <p className="text-muted mb-4">
              Once your team creates reports, they will appear here with client
              details and workflow status.
            </p>

            <Link to="/create-report" className="btn btn-primary">
              Create Report
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="card shadow-sm border-0 reports-table-card">
            <div className="table-responsive">
              <table className="table align-middle mb-0 reports-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Client / Job site</th>
                    <th>Contact</th>
                    <th>Job</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.map((report) => {
                    const editable = canEditReport({ report, profile, user });

                    return (
                      <tr key={report.id}>
                        <td>
                          <strong>{report.report_number}</strong>
                          <small className="d-block text-muted">
                            Created {formatDate(report.created_at)}
                          </small>
                        </td>

                        <td>
                          <strong>{getClientName(report)}</strong>
                          <small className="d-block text-muted">
                            {getClientAddress(report)}
                          </small>
                        </td>

                        <td>
                          <span>{formatValue(report.client_email)}</span>
                          <small className="d-block text-muted">
                            {formatValue(report.client_phone)}
                          </small>
                        </td>

                        <td>
                          <span>{formatValue(report.service_type)}</span>
                          <small className="d-block text-muted">
                            {formatDate(report.job_date)}
                          </small>
                        </td>

                        <td>{renderStatusControl(report)}</td>

                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-2 flex-wrap">
                            {renderShareActions(report, "sm")}

                            <Link
                              to={`/reports/${report.id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              View
                            </Link>

                            {editable && (
                              <Link
                                to={`/edit-report/${report.id}`}
                                className="btn btn-sm btn-outline-secondary"
                              >
                                Edit
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="reports-mobile-list">
            {filteredReports.map((report) => {
              const editable = canEditReport({ report, profile, user });
              const status = report.status || "pending";

              return (
                <article className="reports-mobile-card" key={report.id}>
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <p className="eyebrow mb-1">{report.report_number}</p>

                      <h2 className="h5 mb-1">{getClientName(report)}</h2>

                      <p className="text-muted mb-0">
                        {getClientAddress(report)}
                      </p>
                    </div>

                    <span className={`report-status-badge ${status}`}>
                      {formatStatusLabel(status)}
                    </span>
                  </div>

                  <div className="reports-mobile-details">
                    <div>
                      <span>Service</span>
                      <strong>{formatValue(report.service_type)}</strong>
                    </div>

                    <div>
                      <span>Job date</span>
                      <strong>{formatDate(report.job_date)}</strong>
                    </div>

                    <div>
                      <span>Email</span>
                      <strong>{formatValue(report.client_email)}</strong>
                    </div>

                    <div>
                      <span>Phone</span>
                      <strong>{formatValue(report.client_phone)}</strong>
                    </div>
                  </div>

                  {canUpdateStatus && (
                    <div className="mt-3">{renderStatusControl(report)}</div>
                  )}

                  <div className="d-flex gap-2 flex-wrap mt-3">
                    {renderShareActions(report, "sm")}

                    <Link
                      to={`/reports/${report.id}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      View
                    </Link>

                    {editable && (
                      <Link
                        to={`/edit-report/${report.id}`}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        Edit
                      </Link>
                    )}
                  </div>

                  {report.status === "completed" && !report.client_email && (
                    <p className="text-warning small mt-3 mb-0">
                      Completed report without client email.
                    </p>
                  )}

                  {report.status === "completed" &&
                    report.client_email &&
                    !report.public_share_enabled && (
                      <p className="text-muted small mt-3 mb-0">
                        Enable sharing before sending the client link.
                      </p>
                    )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

export default Reports;
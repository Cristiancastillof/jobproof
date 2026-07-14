import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabaseClient";
import { recordReportActivity } from "../utils/reportActivity";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "checked", label: "Checked" },
  { value: "completed", label: "Completed" },
];

const getStatusLabel = (status) => {
  if (status === "completed") return "Completed";
  if (status === "checked") return "Checked";
  return "Pending";
};

const getStatusClass = (status) => {
  if (status === "completed") return "completed";
  if (status === "checked") return "checked";
  return "pending";
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Not provided";

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const createStats = (reports = []) => ({
  total: reports.length,
  pending: reports.filter((report) => (report.status || "pending") === "pending")
    .length,
  checked: reports.filter((report) => (report.status || "pending") === "checked")
    .length,
  completed: reports.filter(
    (report) => (report.status || "pending") === "completed"
  ).length,
});

const StatCard = ({ label, value, helper, tone = "default", onClick }) => {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      className={`jp-reports-stat ${tone}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </Component>
  );
};

const Reports = () => {
  const { user, profile, displayRole, profileLoading } = useAuth();

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [updatingReportId, setUpdatingReportId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState(null);

  const role = profile?.role || "worker";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const isWorker = role === "worker";
  const canManageReports = isAdmin || isSupervisor;

  const stats = useMemo(() => createStats(reports), [reports]);

  const completionRate = useMemo(() => {
    if (!stats.total) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  }, [stats.total, stats.completed]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      const reportStatus = report.status || "pending";

      const matchesStatus =
        statusFilter === "all" || reportStatus === statusFilter;

      const searchText = [
        report.report_number,
        report.client_display_name,
        report.client_name,
        report.client_company_name,
        report.client_contact_person,
        report.client_email,
        report.client_phone,
        report.job_address,
        report.client_address_snapshot,
        report.service_type,
        report.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [reports, searchTerm, statusFilter]);

  const canEditReport = (report) => {
    if (!report) return false;
    if (isAdmin || isSupervisor) return true;

    return (
      isWorker &&
      report.created_by === user?.id &&
      (report.status || "pending") !== "completed"
    );
  };

  const loadReports = useCallback(async () => {
    if (profileLoading) return;

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
          client_display_name,
          client_company_name,
          client_contact_person,
          client_email,
          client_phone,
          client_name,
          job_address,
          client_address_snapshot,
          job_date,
          starting_hour,
          finish_hour,
          total_hours,
          service_type,
          status,
          created_at,
          updated_at
        `
        )
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

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
  }, [profile, profileLoading, user]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleUpdateStatus = async (report, nextStatus) => {
    if (!canManageReports) {
      setMessage({
        type: "warning",
        text: "Only admins and supervisors can update report status.",
      });
      return;
    }

    if (!report?.id || report.status === nextStatus) return;

    const previousStatus = report.status || "pending";

    setUpdatingReportId(report.id);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("reports")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id)
        .eq("company_id", profile.company_id)
        .select("*")
        .single();

      if (error) throw error;

      await recordReportActivity({
        reportId: report.id,
        companyId: profile.company_id,
        actorId: user.id,
        activityType: "status_changed",
        previousValue: previousStatus,
        newValue: nextStatus,
        activityNote: `Status changed from ${getStatusLabel(
          previousStatus
        )} to ${getStatusLabel(nextStatus)}.`,
      });

      setReports((currentReports) =>
        currentReports.map((currentReport) =>
          currentReport.id === report.id ? { ...currentReport, ...data } : currentReport
        )
      );

      setMessage({
        type: "success",
        text: `Report ${report.report_number || ""} moved to ${getStatusLabel(
          nextStatus
        )}.`,
      });
    } catch (error) {
      console.error("Error updating report status:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error updating this report. Please try again.",
      });
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleCopyReportSummary = async (report) => {
    const reportUrl = `${window.location.origin}/reports/${report.id}`;

    const text = [
      `JobProof Report: ${report.report_number || "No number"}`,
      `Client: ${
        report.client_display_name || report.client_name || "Not provided"
      }`,
      `Service: ${report.service_type || "Not provided"}`,
      `Date: ${formatDate(report.job_date)}`,
      `Status: ${getStatusLabel(report.status)}`,
      `Link: ${reportUrl}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);

      setMessage({
        type: "success",
        text: "Report summary copied to clipboard.",
      });
    } catch (error) {
      console.error("Copy error:", error);

      setMessage({
        type: "warning",
        text: "Could not copy automatically. Please copy the report details manually.",
      });
    }
  };

  if (profileLoading || loadingReports) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading reports</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof loads your report archive.
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
    <>
      <style>
        {`
          .jp-reports-page {
            display: grid;
            gap: 22px;
          }

          .jp-reports-hero {
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: 1.35fr 0.65fr;
            gap: 22px;
            padding: 28px;
            border-radius: 34px;
            color: #ffffff;
            background:
              radial-gradient(circle at top right, rgba(245, 158, 11, 0.36), transparent 30%),
              radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.35), transparent 30%),
              linear-gradient(135deg, #020617, #1e40af);
            box-shadow: 0 26px 74px rgba(15, 23, 42, 0.24);
          }

          .jp-reports-eyebrow {
            display: inline-flex;
            margin-bottom: 14px;
            color: #bfdbfe;
            font-size: 0.76rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.13em;
          }

          .jp-reports-hero h1 {
            max-width: 780px;
            margin: 0;
            font-size: clamp(2.1rem, 5vw, 3.7rem);
            line-height: 0.94;
            font-weight: 950;
            letter-spacing: -0.07em;
          }

          .jp-reports-hero p {
            max-width: 680px;
            margin: 16px 0 0;
            color: #dbeafe;
            font-size: 1rem;
            line-height: 1.65;
            font-weight: 650;
          }

          .jp-reports-hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 22px;
          }

          .jp-reports-hero-actions .btn {
            min-height: 44px;
            border-radius: 999px;
            font-weight: 900;
          }

          .jp-reports-hero-panel {
            align-self: stretch;
            display: grid;
            align-content: space-between;
            gap: 18px;
            padding: 20px;
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(18px);
          }

          .jp-reports-hero-panel span {
            display: block;
            color: #bfdbfe;
            font-size: 0.76rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .jp-reports-hero-panel strong {
            display: block;
            margin-top: 8px;
            color: #ffffff;
            font-size: 2.4rem;
            line-height: 1;
            font-weight: 950;
            letter-spacing: -0.06em;
          }

          .jp-reports-progress-track {
            overflow: hidden;
            height: 10px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.18);
          }

          .jp-reports-progress-fill {
            height: 100%;
            border-radius: inherit;
            background: #f59e0b;
          }

          .jp-reports-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .jp-reports-stat {
            appearance: none;
            width: 100%;
            text-align: left;
            min-height: 126px;
            padding: 20px;
            border-radius: 24px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 16px 42px rgba(15, 23, 42, 0.07);
          }

          .jp-reports-stat span {
            display: block;
            color: #64748b;
            font-size: 0.76rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jp-reports-stat strong {
            display: block;
            margin-top: 10px;
            color: #0f172a;
            font-size: 2.15rem;
            line-height: 1;
            font-weight: 950;
            letter-spacing: -0.06em;
          }

          .jp-reports-stat small {
            display: block;
            margin-top: 12px;
            color: #64748b;
            font-size: 0.82rem;
            font-weight: 650;
            line-height: 1.35;
          }

          .jp-reports-stat.pending {
            background: linear-gradient(180deg, #ffffff, #fffbeb);
            border-color: rgba(245, 158, 11, 0.22);
          }

          .jp-reports-stat.checked {
            background: linear-gradient(180deg, #ffffff, #eff6ff);
            border-color: rgba(30, 64, 175, 0.18);
          }

          .jp-reports-stat.completed {
            background: linear-gradient(180deg, #ffffff, #f0fdf4);
            border-color: rgba(22, 101, 52, 0.18);
          }

          .jp-reports-panel {
            padding: 22px;
            border-radius: 28px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
          }

          .jp-reports-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 14px;
            margin-bottom: 16px;
          }

          .jp-reports-panel-header h2 {
            margin: 0;
            color: #0f172a;
            font-size: 1.3rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jp-reports-panel-header p {
            margin: 6px 0 0;
            color: #64748b;
            font-weight: 650;
          }

          .jp-reports-search-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 12px;
            align-items: end;
            margin-bottom: 16px;
          }

          .jp-reports-page .form-control {
            min-height: 46px;
            border-radius: 16px;
            border-color: rgba(15, 23, 42, 0.14);
            font-weight: 650;
          }

          .jp-reports-page .form-label {
            color: #334155;
            font-size: 0.82rem;
            font-weight: 900;
          }

          .jp-reports-filters {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .jp-reports-filter {
            border: 1px solid rgba(15, 23, 42, 0.1);
            border-radius: 999px;
            padding: 8px 12px;
            color: #475569;
            background: #ffffff;
            font-size: 0.84rem;
            font-weight: 900;
          }

          .jp-reports-filter.active {
            color: #1e40af;
            background: #eff6ff;
            border-color: rgba(30, 64, 175, 0.22);
          }

          .jp-reports-list {
            display: grid;
            gap: 14px;
          }

          .jp-report-card {
            overflow: hidden;
            border-radius: 24px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 14px 38px rgba(15, 23, 42, 0.06);
          }

          .jp-report-card-main {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 14px;
            padding: 18px;
            background: linear-gradient(180deg, #ffffff, #f8fafc);
          }

          .jp-report-card h3 {
            margin: 0;
            color: #0f172a;
            font-size: 1.05rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jp-report-client {
            display: block;
            margin-top: 5px;
            color: #64748b;
            font-size: 0.9rem;
            font-weight: 800;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp-report-details-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            padding: 0 18px 18px;
          }

          .jp-report-detail {
            padding: 12px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .jp-report-detail span {
            display: block;
            color: #64748b;
            font-size: 0.7rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.07em;
          }

          .jp-report-detail strong {
            display: block;
            margin-top: 4px;
            color: #0f172a;
            font-size: 0.86rem;
            font-weight: 850;
            word-break: break-word;
          }

          .jp-report-status {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 96px;
            padding: 7px 10px;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .jp-report-status.pending {
            color: #92400e;
            background: #fffbeb;
            border: 1px solid rgba(245, 158, 11, 0.22);
          }

          .jp-report-status.checked {
            color: #1e40af;
            background: #eff6ff;
            border: 1px solid rgba(30, 64, 175, 0.18);
          }

          .jp-report-status.completed {
            color: #166534;
            background: #f0fdf4;
            border: 1px solid rgba(22, 101, 52, 0.18);
          }

          .jp-report-card-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 18px;
            border-top: 1px solid rgba(15, 23, 42, 0.07);
            background: #ffffff;
          }

          .jp-report-card-actions-left,
          .jp-report-card-actions-right {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .jp-report-card-actions .btn,
          .jp-report-status-select {
            border-radius: 999px;
            font-weight: 850;
          }

          .jp-report-status-select {
            min-height: 34px;
            padding: 4px 12px;
            border: 1px solid rgba(15, 23, 42, 0.14);
            background: #ffffff;
            color: #334155;
            font-size: 0.82rem;
          }

          .jp-reports-empty {
            display: grid;
            place-items: center;
            min-height: 260px;
            padding: 28px;
            border-radius: 24px;
            text-align: center;
            background: #f8fafc;
            border: 1px dashed rgba(15, 23, 42, 0.16);
          }

          .jp-reports-empty h3 {
            color: #0f172a;
            font-weight: 950;
          }

          .jp-reports-empty p {
            color: #64748b;
            font-weight: 650;
          }

          @media (max-width: 991px) {
            .jp-reports-hero {
              grid-template-columns: 1fr;
            }

            .jp-reports-stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .jp-report-details-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .jp-reports-search-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 576px) {
            .jp-reports-page {
              gap: 18px;
            }

            .jp-reports-hero {
              padding: 22px;
              border-radius: 26px;
            }

            .jp-reports-hero h1 {
              font-size: 2.2rem;
            }

            .jp-reports-hero-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .jp-reports-hero-actions .btn {
              width: 100%;
            }

            .jp-reports-stats-grid,
            .jp-report-details-grid {
              grid-template-columns: 1fr;
            }

            .jp-reports-panel {
              padding: 18px;
              border-radius: 24px;
            }

            .jp-reports-panel-header,
            .jp-report-card-main,
            .jp-report-card-actions {
              grid-template-columns: 1fr;
              flex-direction: column;
            }

            .jp-report-card-actions-left,
            .jp-report-card-actions-right,
            .jp-report-card-actions .btn,
            .jp-report-status-select {
              width: 100%;
            }

            .jp-report-card-actions-left,
            .jp-report-card-actions-right {
              display: grid;
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <section className="jp-reports-page">
        <div className="jp-reports-hero">
          <div>
            <span className="jp-reports-eyebrow">Report archive</span>

            <h1>Reports Management</h1>

            <p>
              Search, filter, review and manage every job report from one
              operational workspace.
            </p>

            <div className="jp-reports-hero-actions">
              <Link to="/create-report" className="btn btn-light">
                Create Report
              </Link>

              <button
                type="button"
                className="btn btn-outline-light"
                onClick={loadReports}
              >
                Refresh Reports
              </button>
            </div>
          </div>

          <aside className="jp-reports-hero-panel">
            <div>
              <span>Completion rate</span>
              <strong>{completionRate}%</strong>
            </div>

            <div className="jp-reports-progress-track">
              <div
                className="jp-reports-progress-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <small>
              {stats.completed} of {stats.total} visible reports completed
            </small>
          </aside>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        <div className="jp-reports-stats-grid">
          <StatCard
            label="Total reports"
            value={stats.total}
            helper="All visible reports"
            onClick={() => setStatusFilter("all")}
          />

          <StatCard
            label="Pending"
            value={stats.pending}
            helper="Waiting for review"
            tone="pending"
            onClick={() => setStatusFilter("pending")}
          />

          <StatCard
            label="Checked"
            value={stats.checked}
            helper="Reviewed and ready"
            tone="checked"
            onClick={() => setStatusFilter("checked")}
          />

          <StatCard
            label="Completed"
            value={stats.completed}
            helper="Closed reports"
            tone="completed"
            onClick={() => setStatusFilter("completed")}
          />
        </div>

        <div className="jp-reports-panel">
          <div className="jp-reports-panel-header">
            <div>
              <h2>Report archive</h2>
              <p>
                {filteredReports.length} record
                {filteredReports.length === 1 ? "" : "s"} found · Role:{" "}
                {displayRole || role}
              </p>
            </div>
          </div>

          <div className="jp-reports-search-grid">
            <div>
              <label htmlFor="reportSearch" className="form-label">
                Search reports
              </label>

              <input
                id="reportSearch"
                type="search"
                className="form-control"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by report number, client, address, service or status..."
              />
            </div>

            <div className="jp-reports-filters">
              {["all", "pending", "checked", "completed"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={
                    statusFilter === filter
                      ? "jp-reports-filter active"
                      : "jp-reports-filter"
                  }
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === "all" ? "All" : getStatusLabel(filter)}
                </button>
              ))}
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="jp-reports-empty">
              <div>
                <h3>No reports found</h3>

                <p>
                  Create a new report or adjust your search and filters to see
                  more records.
                </p>

                <Link to="/create-report" className="btn btn-primary">
                  Create Report
                </Link>
              </div>
            </div>
          ) : (
            <div className="jp-reports-list">
              {filteredReports.map((report) => {
                const reportStatus = report.status || "pending";

                return (
                  <article className="jp-report-card" key={report.id}>
                    <div className="jp-report-card-main">
                      <div>
                        <h3>{report.report_number || "No report number"}</h3>

                        <span className="jp-report-client">
                          {report.client_display_name ||
                            report.client_name ||
                            "Client not provided"}
                        </span>
                      </div>

                      <span
                        className={`jp-report-status ${getStatusClass(
                          reportStatus
                        )}`}
                      >
                        {getStatusLabel(reportStatus)}
                      </span>
                    </div>

                    <div className="jp-report-details-grid">
                      <div className="jp-report-detail">
                        <span>Service</span>
                        <strong>{report.service_type || "Not provided"}</strong>
                      </div>

                      <div className="jp-report-detail">
                        <span>Job date</span>
                        <strong>{formatDate(report.job_date)}</strong>
                      </div>

                      <div className="jp-report-detail">
                        <span>Total hours</span>
                        <strong>{report.total_hours || "Not provided"}</strong>
                      </div>

                      <div className="jp-report-detail">
                        <span>Updated</span>
                        <strong>{formatDateTime(report.updated_at)}</strong>
                      </div>

                      <div className="jp-report-detail">
                        <span>Address</span>
                        <strong>
                          {report.job_address ||
                            report.client_address_snapshot ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div className="jp-report-detail">
                        <span>Contact</span>
                        <strong>
                          {report.client_contact_person || "Not provided"}
                        </strong>
                      </div>

                      <div className="jp-report-detail">
                        <span>Email</span>
                        <strong>{report.client_email || "Not provided"}</strong>
                      </div>

                      <div className="jp-report-detail">
                        <span>Phone</span>
                        <strong>{report.client_phone || "Not provided"}</strong>
                      </div>
                    </div>

                    <div className="jp-report-card-actions">
                      <div className="jp-report-card-actions-left">
                        <Link
                          to={`/reports/${report.id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          View
                        </Link>

                        {canEditReport(report) && (
                          <Link
                            to={`/edit-report/${report.id}`}
                            className="btn btn-sm btn-primary"
                          >
                            Edit
                          </Link>
                        )}

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleCopyReportSummary(report)}
                        >
                          Copy Summary
                        </button>
                      </div>

                      <div className="jp-report-card-actions-right">
                        {canManageReports && (
                          <select
                            className="jp-report-status-select"
                            value={reportStatus}
                            onChange={(event) =>
                              handleUpdateStatus(report, event.target.value)
                            }
                            disabled={updatingReportId === report.id}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Reports;

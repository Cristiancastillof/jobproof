import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InstallAppButton from "../components/InstallAppButton";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const getMonthStartIso = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

const createInitialStats = () => ({
  totalReports: 0,
  reportsThisMonth: 0,
  pendingReports: 0,
  checkedReports: 0,
  completedReports: 0,
  activeTeamMembers: 0,
  activeWorkers: 0,
  pendingInvitations: 0,
  createdByMe: 0,
  participatedReports: 0,
});

const getRoleCopy = (role) => {
  if (role === "admin") {
    return {
      label: "Admin dashboard",
      title: "Company command center",
      subtitle:
        "Monitor reports, team activity, workflow status and operational documentation from one professional workspace.",
    };
  }

  if (role === "supervisor") {
    return {
      label: "Supervisor dashboard",
      title: "Operational overview",
      subtitle:
        "Review active jobs, monitor report status and keep field operations moving with clear documentation.",
    };
  }

  return {
    label: "Worker dashboard",
    title: "My field workspace",
    subtitle:
      "Create job reports, capture photos, review your submitted work and access jobs assigned to you.",
  };
};

const getRoleLabel = (role) => {
  if (role === "admin") return "Admin";
  if (role === "supervisor") return "Supervisor";
  if (role === "worker") return "Worker";
  return "User";
};

const getStatusBadgeClass = (status) => {
  if (status === "completed") return "jp-dash-status completed";
  if (status === "checked") return "jp-dash-status checked";
  if (status === "pending") return "jp-dash-status pending";

  return "jp-dash-status pending";
};

const getStatusLabel = (status) => {
  if (status === "completed") return "Completed";
  if (status === "checked") return "Checked";
  if (status === "pending") return "Pending";

  return "Pending";
};

const getInitials = (value) => {
  if (!value) return "JP";

  const parts = String(value).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(value).slice(0, 2).toUpperCase();
};

const StatCard = ({ label, value, helper, variant = "default" }) => {
  return (
    <div className={`jp-dash-stat-card ${variant}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      {helper && <small>{helper}</small>}
    </div>
  );
};

const QuickAction = ({ to, title, description, buttonLabel, tone = "blue" }) => {
  return (
    <Link to={to} className={`jp-dash-action-card ${tone}`}>
      <div>
        <span className="jp-dash-action-icon">
          {title.charAt(0).toUpperCase()}
        </span>

        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <strong>{buttonLabel}</strong>
    </Link>
  );
};

const Dashboard = () => {
  const { user, profile, displayName, displayRole, profileLoading } = useAuth();

  const [stats, setStats] = useState(createInitialStats);
  const [recentReports, setRecentReports] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [message, setMessage] = useState(null);

  const role = profile?.role || "worker";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const isWorker = role === "worker";

  const roleCopy = useMemo(() => getRoleCopy(role), [role]);

  const completionRate = useMemo(() => {
    if (!stats.totalReports) return 0;
    return Math.round((stats.completedReports / stats.totalReports) * 100);
  }, [stats.totalReports, stats.completedReports]);

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

  const mapReportsForStats = (reportsList = []) => {
    return {
      totalReports: reportsList.length,
      pendingReports: reportsList.filter(
        (report) => (report.status || "pending") === "pending"
      ).length,
      checkedReports: reportsList.filter(
        (report) => (report.status || "pending") === "checked"
      ).length,
      completedReports: reportsList.filter(
        (report) => (report.status || "pending") === "completed"
      ).length,
    };
  };

  useEffect(() => {
    const loadDashboard = async () => {
      if (profileLoading) return;

      if (!user?.id || !profile?.company_id) {
        setLoadingDashboard(false);
        return;
      }

      setLoadingDashboard(true);
      setMessage(null);

      try {
        const monthStartIso = getMonthStartIso();

        const { data: visibleReportsData, error: visibleReportsError } =
          await supabase
            .from("reports")
            .select(
              "id, report_number, client_name, client_display_name, service_type, job_date, created_at, status, created_by"
            )
            .eq("company_id", profile.company_id)
            .order("created_at", { ascending: false });

        if (visibleReportsError) {
          throw visibleReportsError;
        }

        const visibleReports = visibleReportsData || [];
        const workflowStats = mapReportsForStats(visibleReports);

        const reportsThisMonth = visibleReports.filter((report) => {
          if (!report.created_at) return false;
          return new Date(report.created_at) >= new Date(monthStartIso);
        }).length;

        let activeTeamMembers = 0;
        let activeWorkers = 0;
        let pendingInvitations = 0;
        let createdByMe = 0;
        let participatedReports = 0;

        if (isAdmin || isSupervisor) {
          const [
            { count: activeTeamCount, error: activeTeamError },
            { count: activeWorkersCount, error: activeWorkersError },
          ] = await Promise.all([
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("company_id", profile.company_id)
              .eq("active", true),

            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("company_id", profile.company_id)
              .eq("active", true)
              .eq("role", "worker"),
          ]);

          if (activeTeamError) throw activeTeamError;
          if (activeWorkersError) throw activeWorkersError;

          activeTeamMembers = activeTeamCount || 0;
          activeWorkers = activeWorkersCount || 0;
        }

        if (isAdmin) {
          const { count, error } = await supabase
            .from("team_invitations")
            .select("id", { count: "exact", head: true })
            .eq("company_id", profile.company_id)
            .eq("status", "pending");

          if (error) throw error;

          pendingInvitations = count || 0;
        }

        if (isWorker) {
          const [
            { count: createdCount, error: createdError },
            { count: participatedCount, error: participatedError },
          ] = await Promise.all([
            supabase
              .from("reports")
              .select("id", { count: "exact", head: true })
              .eq("company_id", profile.company_id)
              .eq("created_by", user.id),

            supabase
              .from("report_workers")
              .select("id", { count: "exact", head: true })
              .eq("company_id", profile.company_id)
              .eq("profile_id", user.id),
          ]);

          if (createdError) throw createdError;
          if (participatedError) throw participatedError;

          createdByMe = createdCount || 0;
          participatedReports = participatedCount || 0;
        }

        setStats({
          totalReports: workflowStats.totalReports,
          reportsThisMonth,
          pendingReports: workflowStats.pendingReports,
          checkedReports: workflowStats.checkedReports,
          completedReports: workflowStats.completedReports,
          activeTeamMembers,
          activeWorkers,
          pendingInvitations,
          createdByMe,
          participatedReports,
        });

        setRecentReports(visibleReports.slice(0, 5));
      } catch (error) {
        console.error("Error loading dashboard:", error);

        setMessage({
          type: "danger",
          text: error.message || "There was an error loading your dashboard.",
        });
      } finally {
        setLoadingDashboard(false);
      }
    };

    loadDashboard();
  }, [user, profile, profileLoading, isAdmin, isSupervisor, isWorker]);

  if (loadingDashboard || profileLoading) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading dashboard</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof prepares your workspace.
        </p>
      </section>
    );
  }

  if (!profile?.company_id) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Welcome to JobProof</p>

            <h1 className="h3 mb-3">Complete your Business Profile</h1>

            <p className="text-muted mb-4">
              Before creating reports, set up your company details. JobProof
              will use this information automatically in every report and PDF.
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
          .jp-dash-page {
            display: grid;
            gap: 24px;
          }

          .jp-dash-hero {
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: 1.5fr 0.8fr;
            gap: 22px;
            padding: 28px;
            border-radius: 32px;
            color: #ffffff;
            background:
              radial-gradient(circle at top right, rgba(245, 158, 11, 0.35), transparent 32%),
              linear-gradient(135deg, #0f172a, #1e40af);
            box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
          }

          .jp-dash-hero::after {
            content: "";
            position: absolute;
            right: -90px;
            bottom: -120px;
            width: 280px;
            height: 280px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.08);
          }

          .jp-dash-hero-content {
            position: relative;
            z-index: 1;
          }

          .jp-dash-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            color: #bfdbfe;
            font-size: 0.78rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }

          .jp-dash-hero h1 {
            margin: 0;
            max-width: 720px;
            font-size: clamp(2rem, 5vw, 3.4rem);
            line-height: 0.95;
            font-weight: 950;
            letter-spacing: -0.06em;
          }

          .jp-dash-hero p {
            max-width: 660px;
            margin: 16px 0 0;
            color: #dbeafe;
            font-size: 1rem;
            line-height: 1.65;
            font-weight: 650;
          }

          .jp-dash-hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 22px;
          }

          .jp-dash-hero-actions .btn {
            min-height: 44px;
            border-radius: 999px;
            font-weight: 900;
          }

          .jp-dash-profile-card {
            position: relative;
            z-index: 1;
            align-self: stretch;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 22px;
            padding: 20px;
            border-radius: 26px;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(18px);
          }

          .jp-dash-profile-top {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .jp-dash-avatar {
            width: 52px;
            height: 52px;
            flex: 0 0 52px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 18px;
            color: #0f172a;
            background: #ffffff;
            font-size: 1rem;
            font-weight: 950;
          }

          .jp-dash-profile-meta {
            min-width: 0;
          }

          .jp-dash-profile-meta span {
            display: block;
            color: #bfdbfe;
            font-size: 0.74rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jp-dash-profile-meta strong {
            display: block;
            margin-top: 3px;
            color: #ffffff;
            font-size: 1rem;
            font-weight: 950;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp-dash-profile-meta small {
            display: inline-flex;
            margin-top: 8px;
            padding: 5px 9px;
            border-radius: 999px;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.14);
            font-size: 0.72rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jp-dash-progress {
            display: grid;
            gap: 8px;
          }

          .jp-dash-progress-label {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            color: #dbeafe;
            font-size: 0.8rem;
            font-weight: 850;
          }

          .jp-dash-progress-track {
            overflow: hidden;
            height: 10px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.18);
          }

          .jp-dash-progress-fill {
            height: 100%;
            border-radius: inherit;
            background: #f59e0b;
          }

          .jp-dash-stat-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
          }

          .jp-dash-stat-card {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 132px;
            padding: 20px;
            border-radius: 24px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.07);
          }

          .jp-dash-stat-card span {
            color: #64748b;
            font-size: 0.78rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jp-dash-stat-card strong {
            display: block;
            margin-top: 10px;
            color: #0f172a;
            font-size: 2.25rem;
            line-height: 1;
            font-weight: 950;
            letter-spacing: -0.06em;
          }

          .jp-dash-stat-card small {
            margin-top: 14px;
            color: #64748b;
            font-size: 0.84rem;
            font-weight: 650;
            line-height: 1.4;
          }

          .jp-dash-stat-card.pending {
            border-color: rgba(245, 158, 11, 0.25);
            background: linear-gradient(180deg, #ffffff, #fffbeb);
          }

          .jp-dash-stat-card.checked {
            border-color: rgba(30, 64, 175, 0.18);
            background: linear-gradient(180deg, #ffffff, #eff6ff);
          }

          .jp-dash-stat-card.completed {
            border-color: rgba(22, 101, 52, 0.18);
            background: linear-gradient(180deg, #ffffff, #f0fdf4);
          }

          .jp-dash-main-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
            gap: 20px;
            align-items: start;
          }

          .jp-dash-panel {
            padding: 22px;
            border-radius: 28px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
          }

          .jp-dash-panel-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 18px;
          }

          .jp-dash-panel-header h2 {
            margin: 0;
            color: #0f172a;
            font-size: 1.3rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jp-dash-panel-header p {
            margin: 5px 0 0;
            color: #64748b;
            font-weight: 650;
          }

          .jp-dash-recent-list {
            display: grid;
            gap: 10px;
          }

          .jp-dash-recent-item {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 14px;
            align-items: center;
            padding: 14px;
            border-radius: 18px;
            color: #0f172a;
            text-decoration: none;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.07);
            transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
          }

          .jp-dash-recent-item:hover {
            color: #0f172a;
            background: #eff6ff;
            border-color: rgba(30, 64, 175, 0.18);
            transform: translateY(-1px);
          }

          .jp-dash-recent-main {
            min-width: 0;
          }

          .jp-dash-recent-main strong {
            display: block;
            font-size: 0.95rem;
            font-weight: 950;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp-dash-recent-main span {
            display: block;
            margin-top: 4px;
            color: #64748b;
            font-size: 0.84rem;
            font-weight: 750;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp-dash-recent-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 7px;
          }

          .jp-dash-recent-meta small {
            color: #64748b;
            font-size: 0.78rem;
            font-weight: 750;
          }

          .jp-dash-status {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 82px;
            padding: 6px 9px;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .jp-dash-status.pending {
            color: #92400e;
            background: #fffbeb;
            border: 1px solid rgba(245, 158, 11, 0.22);
          }

          .jp-dash-status.checked {
            color: #1e40af;
            background: #eff6ff;
            border: 1px solid rgba(30, 64, 175, 0.18);
          }

          .jp-dash-status.completed {
            color: #166534;
            background: #f0fdf4;
            border: 1px solid rgba(22, 101, 52, 0.18);
          }

          .jp-dash-actions {
            display: grid;
            gap: 12px;
          }

          .jp-dash-action-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 14px;
            padding: 16px;
            border-radius: 22px;
            color: #0f172a;
            text-decoration: none;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
            transition: transform 0.18s ease, border-color 0.18s ease;
          }

          .jp-dash-action-card:hover {
            color: #0f172a;
            transform: translateY(-1px);
            border-color: rgba(30, 64, 175, 0.22);
          }

          .jp-dash-action-card > div {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-width: 0;
          }

          .jp-dash-action-icon {
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            color: #ffffff;
            background: #1e40af;
            font-size: 0.9rem;
            font-weight: 950;
          }

          .jp-dash-action-card.amber .jp-dash-action-icon {
            background: #f59e0b;
          }

          .jp-dash-action-card.green .jp-dash-action-icon {
            background: #166534;
          }

          .jp-dash-action-card.dark .jp-dash-action-icon {
            background: #0f172a;
          }

          .jp-dash-action-card h3 {
            margin: 0;
            font-size: 0.98rem;
            font-weight: 950;
            letter-spacing: -0.03em;
          }

          .jp-dash-action-card p {
            margin: 4px 0 0;
            color: #64748b;
            font-size: 0.82rem;
            font-weight: 650;
            line-height: 1.4;
          }

          .jp-dash-action-card > strong {
            flex: 0 0 auto;
            color: #1e40af;
            font-size: 0.82rem;
            font-weight: 950;
          }

          .jp-dash-empty {
            display: grid;
            place-items: center;
            min-height: 220px;
            padding: 28px;
            border-radius: 22px;
            background: #f8fafc;
            border: 1px dashed rgba(15, 23, 42, 0.16);
            text-align: center;
          }

          .jp-dash-empty h3 {
            color: #0f172a;
            font-weight: 950;
          }

          .jp-dash-empty p {
            color: #64748b;
            font-weight: 650;
          }

          @media (max-width: 991px) {
            .jp-dash-hero {
              grid-template-columns: 1fr;
              padding: 24px;
              border-radius: 28px;
            }

            .jp-dash-profile-card {
              gap: 16px;
            }

            .jp-dash-stat-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .jp-dash-main-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 576px) {
            .jp-dash-page {
              gap: 18px;
            }

            .jp-dash-hero {
              padding: 22px;
              border-radius: 24px;
            }

            .jp-dash-hero h1 {
              font-size: 2.15rem;
            }

            .jp-dash-hero p {
              font-size: 0.94rem;
            }

            .jp-dash-hero-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .jp-dash-hero-actions .btn {
              width: 100%;
            }

            .jp-dash-stat-grid {
              grid-template-columns: 1fr;
              gap: 12px;
            }

            .jp-dash-stat-card {
              min-height: 118px;
              padding: 18px;
            }

            .jp-dash-stat-card strong {
              font-size: 2rem;
            }

            .jp-dash-panel {
              padding: 18px;
              border-radius: 24px;
            }

            .jp-dash-panel-header {
              flex-direction: column;
            }

            .jp-dash-panel-header .btn {
              width: 100%;
            }

            .jp-dash-recent-item {
              grid-template-columns: 1fr;
            }

            .jp-dash-recent-meta {
              align-items: flex-start;
              flex-direction: row;
              justify-content: space-between;
            }

            .jp-dash-action-card {
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}
      </style>

      <section className="jp-dash-page">
        <InstallAppButton />

        <div className="jp-dash-hero">
          <div className="jp-dash-hero-content">
            <span className="jp-dash-eyebrow">{roleCopy.label}</span>

            <h1>{roleCopy.title}</h1>

            <p>{roleCopy.subtitle}</p>

            <div className="jp-dash-hero-actions">
              <Link to="/create-report" className="btn btn-light">
                Create Report
              </Link>

              <Link to="/reports" className="btn btn-outline-light">
                View Reports
              </Link>
            </div>
          </div>

          <aside className="jp-dash-profile-card">
            <div className="jp-dash-profile-top">
              <div className="jp-dash-avatar">{getInitials(displayName)}</div>

              <div className="jp-dash-profile-meta">
                <span>Signed in as</span>
                <strong>{displayName || "JobProof user"}</strong>
                <small>{displayRole || getRoleLabel(role)}</small>
              </div>
            </div>

            <div className="jp-dash-progress">
              <div className="jp-dash-progress-label">
                <span>Completion rate</span>
                <strong>{completionRate}%</strong>
              </div>

              <div className="jp-dash-progress-track">
                <div
                  className="jp-dash-progress-fill"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </aside>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        <div className="jp-dash-stat-grid">
          <StatCard
            label={isWorker ? "Visible reports" : "Total reports"}
            value={stats.totalReports}
            helper={
              isWorker
                ? "Reports created by you or assigned to you"
                : "All visible company reports"
            }
          />

          <StatCard
            label="Pending"
            value={stats.pendingReports}
            helper="Waiting for review or completion"
            variant="pending"
          />

          <StatCard
            label="Checked"
            value={stats.checkedReports}
            helper="Reviewed and ready to close"
            variant="checked"
          />

          <StatCard
            label="Completed"
            value={stats.completedReports}
            helper="Finished and closed"
            variant="completed"
          />
        </div>

        {(isAdmin || isSupervisor) && (
          <div className="jp-dash-stat-grid">
            <StatCard
              label="Reports this month"
              value={stats.reportsThisMonth}
              helper="Current month activity"
            />

            <StatCard
              label="Active team"
              value={stats.activeTeamMembers}
              helper="Active users in workspace"
            />

            <StatCard
              label="Active workers"
              value={stats.activeWorkers}
              helper="Current field users"
            />

            {isAdmin ? (
              <StatCard
                label="Pending invites"
                value={stats.pendingInvitations}
                helper="Invitations waiting to be accepted"
              />
            ) : (
              <StatCard
                label="Completion rate"
                value={`${completionRate}%`}
                helper="Completed versus total reports"
              />
            )}
          </div>
        )}

        {isWorker && (
          <div className="jp-dash-stat-grid">
            <StatCard
              label="Created by me"
              value={stats.createdByMe}
              helper="Reports you created"
            />

            <StatCard
              label="Participated jobs"
              value={stats.participatedReports}
              helper="Jobs where you were included"
            />
          </div>
        )}

        <div className="jp-dash-main-grid">
          <div className="jp-dash-panel">
            <div className="jp-dash-panel-header">
              <div>
                <h2>Recent reports</h2>
                <p>Latest report activity in your workspace.</p>
              </div>

              <Link to="/reports" className="btn btn-outline-primary btn-sm">
                View all
              </Link>
            </div>

            {recentReports.length === 0 ? (
              <div className="jp-dash-empty">
                <div>
                  <h3>No reports yet</h3>
                  <p>Create your first report and it will appear here.</p>

                  <Link to="/create-report" className="btn btn-primary">
                    Create first report
                  </Link>
                </div>
              </div>
            ) : (
              <div className="jp-dash-recent-list">
                {recentReports.map((report) => (
                  <Link
                    to={`/reports/${report.id}`}
                    className="jp-dash-recent-item"
                    key={report.id}
                  >
                    <div className="jp-dash-recent-main">
                      <strong>{report.report_number || "No number"}</strong>

                      <span>
                        {report.client_display_name ||
                          report.client_name ||
                          "Client not provided"}
                      </span>
                    </div>

                    <div className="jp-dash-recent-meta">
                      <small>{formatDate(report.job_date)}</small>

                      <span className={getStatusBadgeClass(report.status)}>
                        {getStatusLabel(report.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="jp-dash-actions">
            <QuickAction
              to="/create-report"
              title="Create Report"
              description="Start a new job report with notes, photos, team and workflow status."
              buttonLabel="Create"
              tone="blue"
            />

            <QuickAction
              to="/reports"
              title="Reports"
              description="Open reports, review status, download PDFs and manage job records."
              buttonLabel="Open"
              tone="dark"
            />

            {(isAdmin || isSupervisor) && (
              <QuickAction
                to="/clients"
                title="Clients"
                description="Manage saved clients and autofill job report details faster."
                buttonLabel="Manage"
                tone="green"
              />
            )}

            {isAdmin && (
              <>
                <QuickAction
                  to="/team"
                  title="Team"
                  description="Invite workers and supervisors to your company workspace."
                  buttonLabel="Invite"
                  tone="amber"
                />

                <QuickAction
                  to="/business-profile"
                  title="Business Profile"
                  description="Update company details, logo and contact information used in reports."
                  buttonLabel="Update"
                  tone="blue"
                />
              </>
            )}

            {isSupervisor && (
              <QuickAction
                to="/team"
                title="Team"
                description="Review active members in your company workspace."
                buttonLabel="Open"
                tone="amber"
              />
            )}
          </aside>
        </div>
      </section>
    </>
  );
};

export default Dashboard;
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InstallAppButton from "../components/InstallAppButton";
import { useAuth } from "../context/useAuth";
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
      label: "Admin command center",
      title: "Operations Command Center",
      subtitle:
        "Control reports, team activity, client work and job documentation from one central workspace.",
    };
  }

  if (role === "supervisor") {
    return {
      label: "Supervisor command center",
      title: "Field Operations Overview",
      subtitle:
        "Review active jobs, monitor report status and keep operational workflow moving.",
    };
  }

  return {
    label: "Worker workspace",
    title: "My Field Workspace",
    subtitle:
      "Create job reports, capture proof, review your work and access assigned jobs.",
  };
};

const getRoleLabel = (role) => {
  if (role === "admin") return "Admin";
  if (role === "supervisor") return "Supervisor";
  if (role === "worker") return "Worker";
  return "User";
};

const getStatusLabel = (status) => {
  if (status === "completed") return "Completed";
  if (status === "checked") return "Checked";
  if (status === "pending") return "Pending";
  return "Pending";
};

const getStatusClass = (status) => {
  if (status === "completed") return "completed";
  if (status === "checked") return "checked";
  return "pending";
};

const getInitials = (value) => {
  if (!value) return "JP";

  const parts = String(value).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(value).slice(0, 2).toUpperCase();
};

const StatCard = ({ label, value, helper, variant = "default", onClick }) => {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      className={`jp-command-stat ${variant}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </Component>
  );
};

const QuickAction = ({ to, title, description, label, tone = "blue" }) => {
  return (
    <Link to={to} className={`jp-command-action ${tone}`}>
      <span>{title.charAt(0).toUpperCase()}</span>

      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>

      <em>{label}</em>
    </Link>
  );
};

const Dashboard = () => {
  const { user, profile, displayName, displayRole, profileLoading } = useAuth();

  const [stats, setStats] = useState(createInitialStats);
  const [reports, setReports] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [message, setMessage] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const role = profile?.role || "worker";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const isWorker = role === "worker";
  const canManageWorkspace = isAdmin || isSupervisor;

  const roleCopy = useMemo(() => getRoleCopy(role), [role]);

  const completionRate = useMemo(() => {
    if (!stats.totalReports) return 0;
    return Math.round((stats.completedReports / stats.totalReports) * 100);
  }, [stats.totalReports, stats.completedReports]);

  const filteredReports = useMemo(() => {
    if (activeFilter === "all") return reports.slice(0, 8);

    return reports
      .filter((report) => (report.status || "pending") === activeFilter)
      .slice(0, 8);
  }, [reports, activeFilter]);

  const needsAttention = useMemo(() => {
    const items = [];

    if (stats.pendingReports > 0) {
      items.push({
        title: `${stats.pendingReports} pending report${
          stats.pendingReports === 1 ? "" : "s"
        }`,
        description: "Waiting for review or further action.",
        tone: "amber",
        filter: "pending",
      });
    }

    if (stats.checkedReports > 0 && canManageWorkspace) {
      items.push({
        title: `${stats.checkedReports} checked report${
          stats.checkedReports === 1 ? "" : "s"
        }`,
        description: "Reviewed and ready to be completed.",
        tone: "blue",
        filter: "checked",
      });
    }

    if (stats.pendingInvitations > 0 && isAdmin) {
      items.push({
        title: `${stats.pendingInvitations} pending invitation${
          stats.pendingInvitations === 1 ? "" : "s"
        }`,
        description: "Team invites waiting for acceptance.",
        tone: "slate",
        to: "/team",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "No urgent actions",
        description: "Your workspace is currently under control.",
        tone: "green",
        filter: "all",
      });
    }

    return items;
  }, [
    stats.pendingReports,
    stats.checkedReports,
    stats.pendingInvitations,
    canManageWorkspace,
    isAdmin,
  ]);

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

  const canEditReport = (report) => {
    if (!report) return false;
    if (isAdmin || isSupervisor) return true;

    return (
      isWorker &&
      report.created_by === user?.id &&
      (report.status || "pending") !== "completed"
    );
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

        setReports(visibleReports);
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

        <h1 className="h5">Loading command center</h1>

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
          .jp-command-page {
            display: grid;
            gap: 22px;
          }

          .jp-command-hero {
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

          .jp-command-hero-main {
            position: relative;
            z-index: 1;
          }

          .jp-command-eyebrow {
            display: inline-flex;
            margin-bottom: 14px;
            color: #bfdbfe;
            font-size: 0.76rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.13em;
          }

          .jp-command-hero h1 {
            max-width: 760px;
            margin: 0;
            font-size: clamp(2.1rem, 5vw, 3.8rem);
            line-height: 0.93;
            font-weight: 950;
            letter-spacing: -0.07em;
          }

          .jp-command-hero p {
            max-width: 670px;
            margin: 16px 0 0;
            color: #dbeafe;
            font-size: 1rem;
            line-height: 1.65;
            font-weight: 650;
          }

          .jp-command-hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 22px;
          }

          .jp-command-hero-actions .btn {
            min-height: 44px;
            border-radius: 999px;
            font-weight: 900;
          }

          .jp-command-profile {
            position: relative;
            z-index: 1;
            align-self: stretch;
            display: grid;
            gap: 18px;
            padding: 20px;
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(18px);
          }

          .jp-command-profile-top {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .jp-command-avatar {
            width: 54px;
            height: 54px;
            flex: 0 0 54px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 20px;
            color: #0f172a;
            background: #ffffff;
            font-weight: 950;
          }

          .jp-command-profile strong {
            display: block;
            color: #ffffff;
            font-size: 1rem;
            font-weight: 950;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp-command-profile span {
            display: inline-flex;
            width: fit-content;
            margin-top: 7px;
            padding: 5px 9px;
            border-radius: 999px;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.14);
            font-size: 0.72rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jp-command-progress {
            display: grid;
            gap: 8px;
          }

          .jp-command-progress-label {
            display: flex;
            justify-content: space-between;
            color: #dbeafe;
            font-size: 0.82rem;
            font-weight: 850;
          }

          .jp-command-progress-track {
            overflow: hidden;
            height: 10px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.18);
          }

          .jp-command-progress-fill {
            height: 100%;
            border-radius: inherit;
            background: #f59e0b;
          }

          .jp-command-board {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }

          .jp-command-card {
            padding: 22px;
            border-radius: 28px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
          }

          .jp-command-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 14px;
            margin-bottom: 16px;
          }

          .jp-command-card-header h2 {
            margin: 0;
            color: #0f172a;
            font-size: 1.25rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jp-command-card-header p {
            margin: 5px 0 0;
            color: #64748b;
            font-size: 0.9rem;
            font-weight: 650;
          }

          .jp-command-attention-list {
            display: grid;
            gap: 10px;
          }

          .jp-command-attention {
            width: 100%;
            text-align: left;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 14px;
            border-radius: 18px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            background: #f8fafc;
            color: #0f172a;
            text-decoration: none;
            cursor: pointer;
          }

          .jp-command-attention strong {
            display: block;
            font-weight: 950;
          }

          .jp-command-attention small {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-weight: 650;
          }

          .jp-command-attention::after {
            content: "Open";
            flex: 0 0 auto;
            color: #1e40af;
            font-size: 0.78rem;
            font-weight: 950;
          }

          .jp-command-attention.amber {
            background: #fffbeb;
            border-color: rgba(245, 158, 11, 0.22);
          }

          .jp-command-attention.blue {
            background: #eff6ff;
            border-color: rgba(30, 64, 175, 0.18);
          }

          .jp-command-attention.green {
            background: #f0fdf4;
            border-color: rgba(22, 101, 52, 0.18);
          }

          .jp-command-pipeline {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .jp-command-stat {
            appearance: none;
            width: 100%;
            text-align: left;
            min-height: 132px;
            padding: 18px;
            border-radius: 22px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 14px 38px rgba(15, 23, 42, 0.06);
          }

          .jp-command-stat span {
            color: #64748b;
            font-size: 0.76rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jp-command-stat strong {
            display: block;
            margin-top: 10px;
            color: #0f172a;
            font-size: 2.15rem;
            line-height: 1;
            font-weight: 950;
            letter-spacing: -0.06em;
          }

          .jp-command-stat small {
            display: block;
            margin-top: 12px;
            color: #64748b;
            font-size: 0.82rem;
            font-weight: 650;
            line-height: 1.35;
          }

          .jp-command-stat.pending {
            background: linear-gradient(180deg, #ffffff, #fffbeb);
            border-color: rgba(245, 158, 11, 0.25);
          }

          .jp-command-stat.checked {
            background: linear-gradient(180deg, #ffffff, #eff6ff);
            border-color: rgba(30, 64, 175, 0.18);
          }

          .jp-command-stat.completed {
            background: linear-gradient(180deg, #ffffff, #f0fdf4);
            border-color: rgba(22, 101, 52, 0.18);
          }

          .jp-command-layout {
            display: grid;
            grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
            gap: 20px;
            align-items: start;
          }

          .jp-command-filters {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 16px;
          }

          .jp-command-filter {
            border: 1px solid rgba(15, 23, 42, 0.1);
            border-radius: 999px;
            padding: 8px 12px;
            color: #475569;
            background: #ffffff;
            font-size: 0.84rem;
            font-weight: 900;
          }

          .jp-command-filter.active {
            color: #1e40af;
            background: #eff6ff;
            border-color: rgba(30, 64, 175, 0.22);
          }

          .jp-command-report-list {
            display: grid;
            gap: 12px;
          }

          .jp-command-report {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 14px;
            padding: 16px;
            border-radius: 20px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.07);
          }

          .jp-command-report-main {
            min-width: 0;
          }

          .jp-command-report-main strong {
            display: block;
            color: #0f172a;
            font-size: 0.98rem;
            font-weight: 950;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp-command-report-main span {
            display: block;
            margin-top: 4px;
            color: #64748b;
            font-size: 0.86rem;
            font-weight: 750;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp-command-report-main small {
            display: block;
            margin-top: 7px;
            color: #64748b;
            font-size: 0.78rem;
            font-weight: 650;
          }

          .jp-command-report-actions {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
          }

          .jp-command-status {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 88px;
            padding: 6px 9px;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .jp-command-status.pending {
            color: #92400e;
            background: #fffbeb;
            border: 1px solid rgba(245, 158, 11, 0.22);
          }

          .jp-command-status.checked {
            color: #1e40af;
            background: #eff6ff;
            border: 1px solid rgba(30, 64, 175, 0.18);
          }

          .jp-command-status.completed {
            color: #166534;
            background: #f0fdf4;
            border: 1px solid rgba(22, 101, 52, 0.18);
          }

          .jp-command-report-buttons {
            display: flex;
            gap: 8px;
          }

          .jp-command-report-buttons .btn {
            border-radius: 999px;
            font-weight: 850;
          }

          .jp-command-actions {
            display: grid;
            gap: 12px;
          }

          .jp-command-action {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border-radius: 22px;
            color: #0f172a;
            text-decoration: none;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
          }

          .jp-command-action:hover {
            color: #0f172a;
            border-color: rgba(30, 64, 175, 0.22);
          }

          .jp-command-action > span {
            width: 40px;
            height: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 15px;
            color: #ffffff;
            background: #1e40af;
            font-weight: 950;
          }

          .jp-command-action.green > span {
            background: #166534;
          }

          .jp-command-action.amber > span {
            background: #f59e0b;
          }

          .jp-command-action.dark > span {
            background: #0f172a;
          }

          .jp-command-action strong {
            display: block;
            font-size: 0.95rem;
            font-weight: 950;
          }

          .jp-command-action small {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: 0.8rem;
            font-weight: 650;
            line-height: 1.35;
          }

          .jp-command-action em {
            color: #1e40af;
            font-style: normal;
            font-size: 0.8rem;
            font-weight: 950;
          }

          .jp-command-empty {
            padding: 28px;
            border-radius: 22px;
            text-align: center;
            background: #f8fafc;
            border: 1px dashed rgba(15, 23, 42, 0.16);
          }

          .jp-command-empty h3 {
            color: #0f172a;
            font-weight: 950;
          }

          .jp-command-empty p {
            color: #64748b;
            font-weight: 650;
          }

          @media (max-width: 991px) {
            .jp-command-hero,
            .jp-command-board,
            .jp-command-layout {
              grid-template-columns: 1fr;
            }

            .jp-command-pipeline {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 576px) {
            .jp-command-page {
              gap: 18px;
            }

            .jp-command-hero {
              padding: 22px;
              border-radius: 26px;
            }

            .jp-command-hero h1 {
              font-size: 2.2rem;
            }

            .jp-command-hero-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .jp-command-hero-actions .btn {
              width: 100%;
            }

            .jp-command-card {
              padding: 18px;
              border-radius: 24px;
            }

            .jp-command-card-header {
              flex-direction: column;
            }

            .jp-command-report {
              grid-template-columns: 1fr;
            }

            .jp-command-report-actions {
              align-items: flex-start;
            }

            .jp-command-report-buttons {
              width: 100%;
            }

            .jp-command-report-buttons .btn {
              flex: 1;
            }

            .jp-command-action {
              grid-template-columns: auto 1fr;
            }

            .jp-command-action em {
              grid-column: 1 / -1;
            }
          }
        `}
      </style>

      <section className="jp-command-page">
        <InstallAppButton />

        <div className="jp-command-hero">
          <div className="jp-command-hero-main">
            <span className="jp-command-eyebrow">{roleCopy.label}</span>

            <h1>{roleCopy.title}</h1>

            <p>{roleCopy.subtitle}</p>

            <div className="jp-command-hero-actions">
              <Link to="/create-report" className="btn btn-light">
                Create Report
              </Link>

              <Link to="/reports" className="btn btn-outline-light">
                View Reports
              </Link>

              {canManageWorkspace && (
                <Link to="/clients" className="btn btn-outline-light">
                  Manage Clients
                </Link>
              )}
            </div>
          </div>

          <aside className="jp-command-profile">
            <div className="jp-command-profile-top">
              <div className="jp-command-avatar">{getInitials(displayName)}</div>

              <div>
                <strong>{displayName || "JobProof user"}</strong>
                <span>{displayRole || getRoleLabel(role)}</span>
              </div>
            </div>

            <div className="jp-command-progress">
              <div className="jp-command-progress-label">
                <span>Completion rate</span>
                <strong>{completionRate}%</strong>
              </div>

              <div className="jp-command-progress-track">
                <div
                  className="jp-command-progress-fill"
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

        <div className="jp-command-board">
          <div className="jp-command-card">
            <div className="jp-command-card-header">
              <div>
                <h2>Needs attention</h2>
                <p>Priority items that may need action today.</p>
              </div>
            </div>

            <div className="jp-command-attention-list">
              {needsAttention.map((item) =>
                item.to ? (
                  <Link
                    to={item.to}
                    className={`jp-command-attention ${item.tone}`}
                    key={item.title}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`jp-command-attention ${item.tone}`}
                    key={item.title}
                    onClick={() => setActiveFilter(item.filter || "all")}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>

          <div className="jp-command-card">
            <div className="jp-command-card-header">
              <div>
                <h2>Workflow pipeline</h2>
                <p>Click a stage to filter the operations board.</p>
              </div>
            </div>

            <div className="jp-command-pipeline">
              <StatCard
                label="Pending"
                value={stats.pendingReports}
                helper="Waiting for review"
                variant="pending"
                onClick={() => setActiveFilter("pending")}
              />

              <StatCard
                label="Checked"
                value={stats.checkedReports}
                helper="Ready to close"
                variant="checked"
                onClick={() => setActiveFilter("checked")}
              />

              <StatCard
                label="Completed"
                value={stats.completedReports}
                helper="Closed jobs"
                variant="completed"
                onClick={() => setActiveFilter("completed")}
              />
            </div>
          </div>
        </div>

        <div className="jp-command-board">
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
            label="Reports this month"
            value={stats.reportsThisMonth}
            helper="Current month activity"
          />

          {canManageWorkspace ? (
            <>
              <StatCard
                label="Active team"
                value={stats.activeTeamMembers}
                helper="Active workspace users"
              />

              <StatCard
                label="Active workers"
                value={stats.activeWorkers}
                helper="Current field users"
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="jp-command-layout">
          <div className="jp-command-card">
            <div className="jp-command-card-header">
              <div>
                <h2>Operations board</h2>
                <p>Filter, review and open reports directly from here.</p>
              </div>

              <Link to="/reports" className="btn btn-outline-primary btn-sm">
                Full reports page
              </Link>
            </div>

            <div className="jp-command-filters">
              {["all", "pending", "checked", "completed"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={
                    activeFilter === filter
                      ? "jp-command-filter active"
                      : "jp-command-filter"
                  }
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter === "all" ? "All" : getStatusLabel(filter)}
                </button>
              ))}
            </div>

            {filteredReports.length === 0 ? (
              <div className="jp-command-empty">
                <h3>No reports found</h3>
                <p>No reports match the selected filter.</p>

                <Link to="/create-report" className="btn btn-primary">
                  Create Report
                </Link>
              </div>
            ) : (
              <div className="jp-command-report-list">
                {filteredReports.map((report) => (
                  <article className="jp-command-report" key={report.id}>
                    <div className="jp-command-report-main">
                      <strong>{report.report_number || "No number"}</strong>

                      <span>
                        {report.client_display_name ||
                          report.client_name ||
                          "Client not provided"}
                      </span>

                      <small>
                        {report.service_type || "No service"} ·{" "}
                        {formatDate(report.job_date)}
                      </small>
                    </div>

                    <div className="jp-command-report-actions">
                      <span
                        className={`jp-command-status ${getStatusClass(
                          report.status
                        )}`}
                      >
                        {getStatusLabel(report.status)}
                      </span>

                      <div className="jp-command-report-buttons">
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
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="jp-command-actions">
            <QuickAction
              to="/create-report"
              title="Create Report"
              description="Capture notes, photos, team members and job status."
              label="Create"
              tone="blue"
            />

            <QuickAction
              to="/reports"
              title="Reports"
              description="Open, review and export professional reports."
              label="Open"
              tone="dark"
            />

            {canManageWorkspace && (
              <QuickAction
                to="/clients"
                title="Clients"
                description="Manage saved clients for faster autofill."
                label="Manage"
                tone="green"
              />
            )}

            {isAdmin && (
              <>
                <QuickAction
                  to="/team"
                  title="Team"
                  description="Invite workers and supervisors to the workspace."
                  label="Invite"
                  tone="amber"
                />

                <QuickAction
                  to="/business-profile"
                  title="Business Profile"
                  description="Control company branding used in reports and PDFs."
                  label="Update"
                  tone="blue"
                />
              </>
            )}

            {isSupervisor && (
              <QuickAction
                to="/team"
                title="Team"
                description="Review active users in your workspace."
                label="Open"
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

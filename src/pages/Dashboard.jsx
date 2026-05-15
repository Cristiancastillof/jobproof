import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
        "Manage reports, monitor workflow status and keep your team ready for professional job documentation.",
    };
  }

  if (role === "supervisor") {
    return {
      label: "Supervisor dashboard",
      title: "Operational overview",
      subtitle:
        "Review company reports, track job status and keep field activity moving.",
    };
  }

  return {
    label: "Worker dashboard",
    title: "My job workspace",
    subtitle:
      "Create reports, review your own work and access jobs where you were included as part of the team.",
  };
};

const getStatusBadgeClass = (status) => {
  if (status === "completed") return "dashboard-status-pill completed";
  if (status === "checked") return "dashboard-status-pill checked";
  if (status === "pending") return "dashboard-status-pill pending";

  return "dashboard-status-pill";
};

const getStatusLabel = (status) => {
  if (status === "completed") return "Completed";
  if (status === "checked") return "Checked";
  if (status === "pending") return "Pending";

  return "Pending";
};

const StatCard = ({ label, value, helper, variant = "default" }) => {
  return (
    <div className={`dashboard-stat-card dashboard-stat-${variant}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
};

const QuickAction = ({ to, title, description, buttonLabel }) => {
  return (
    <div className="dashboard-action-card">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <Link to={to} className="btn btn-primary">
        {buttonLabel}
      </Link>
    </div>
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
            .select("id, report_number, client_name, service_type, job_date, created_at, status, created_by")
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
    <section>
      <div className="dashboard-hero mb-4">
        <div>
          <p className="eyebrow mb-2">{roleCopy.label}</p>

          <h1 className="section-title mb-2">{roleCopy.title}</h1>

          <p className="section-subtitle mb-0">{roleCopy.subtitle}</p>
        </div>

        <div className="dashboard-user-card">
          <span>Signed in as</span>
          <strong>{displayName}</strong>
          <small>{displayRole}</small>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="dashboard-stats-grid mb-4">
        <StatCard
          label={isWorker ? "Visible reports" : "Total reports"}
          value={stats.totalReports}
          helper={
            isWorker
              ? "Created by you or jobs where you participated"
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

      {isAdmin && (
        <div className="dashboard-stats-grid dashboard-stats-secondary mb-4">
          <StatCard
            label="Reports this month"
            value={stats.reportsThisMonth}
            helper="Current month activity"
          />

          <StatCard
            label="Active team members"
            value={stats.activeTeamMembers}
            helper="Admins, supervisors and workers"
          />

          <StatCard
            label="Pending invitations"
            value={stats.pendingInvitations}
            helper="Invite links waiting"
          />

          <StatCard
            label="Active workers"
            value={stats.activeWorkers}
            helper="Current field users"
          />
        </div>
      )}

      {isSupervisor && (
        <div className="dashboard-stats-grid dashboard-stats-secondary mb-4">
          <StatCard
            label="Reports this month"
            value={stats.reportsThisMonth}
            helper="Current month activity"
          />

          <StatCard
            label="Active workers"
            value={stats.activeWorkers}
            helper="Workers in your company"
          />
        </div>
      )}

      {isWorker && (
        <div className="dashboard-stats-grid dashboard-stats-secondary mb-4">
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

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 dashboard-panel h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h2 className="h4 mb-1">Recent reports</h2>
                  <p className="text-muted mb-0">
                    Latest reports available in your workspace.
                  </p>
                </div>

                <Link to="/reports" className="btn btn-outline-primary btn-sm">
                  View all
                </Link>
              </div>

              {recentReports.length === 0 ? (
                <div className="dashboard-empty-state">
                  <p className="text-muted mb-3">No reports yet.</p>

                  <Link to="/create-report" className="btn btn-primary">
                    Create first report
                  </Link>
                </div>
              ) : (
                <div className="dashboard-recent-list">
                  {recentReports.map((report) => (
                    <Link
                      to={`/reports/${report.id}`}
                      className="dashboard-recent-item"
                      key={report.id}
                    >
                      <div>
                        <strong>{report.report_number || "No number"}</strong>
                        <span>{report.client_name || "Not provided"}</span>
                      </div>

                      <div>
                        <small>{report.service_type || "No service"}</small>
                        <small>{formatDate(report.job_date)}</small>
                      </div>

                      <span className={getStatusBadgeClass(report.status)}>
                        {getStatusLabel(report.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="dashboard-actions-grid">
            <QuickAction
              to="/create-report"
              title="Create Report"
              description="Start a new professional job report with photos, notes, workflow status and team involved."
              buttonLabel="Create"
            />

            <QuickAction
              to="/reports"
              title="Reports"
              description="Review reports, update workflow status, open details and download PDFs."
              buttonLabel="Open"
            />

            {isAdmin && (
              <>
                <QuickAction
                  to="/team"
                  title="Team"
                  description="Invite workers and supervisors, manage active members and pending links."
                  buttonLabel="Manage"
                />

                <QuickAction
                  to="/business-profile"
                  title="Business Profile"
                  description="Update your company details, logo, email and phone used in reports."
                  buttonLabel="Update"
                />
              </>
            )}

            {isSupervisor && (
              <QuickAction
                to="/reports"
                title="Company workflow"
                description="Review pending, checked and completed jobs across your company workspace."
                buttonLabel="Review"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
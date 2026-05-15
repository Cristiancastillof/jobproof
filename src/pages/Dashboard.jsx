import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const formatDate = (dateValue) => {
  if (!dateValue) return "Not specified";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStartOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);

  date.setDate(diff);
  date.setHours(0, 0, 0, 0);

  return date;
};

const isAfterDate = (dateValue, compareDate) => {
  if (!dateValue) return false;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date >= compareDate;
};

const getWelcomeCopy = (role) => {
  if (role === "admin") {
    return {
      eyebrow: "Admin dashboard",
      title: "Company command centre",
      subtitle:
        "Track reports, team activity and company setup from one professional workspace.",
    };
  }

  if (role === "supervisor") {
    return {
      eyebrow: "Supervisor dashboard",
      title: "Operational overview",
      subtitle:
        "Monitor field reports, review recent activity and keep daily work moving.",
    };
  }

  return {
    eyebrow: "Worker dashboard",
    title: "My work hub",
    subtitle:
      "Create reports quickly, review your recent work and keep your job records organised.",
  };
};

const getStatusBadgeClass = (status) => {
  if (status === "approved") return "bg-success";
  if (status === "submitted") return "bg-primary";
  if (status === "draft") return "bg-secondary";
  if (status === "archived") return "bg-dark";

  return "bg-info text-dark";
};

const StatCard = ({ label, value, helper }) => {
  return (
    <div className="dashboard-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
};

const QuickAction = ({ to, title, description, variant = "primary" }) => {
  return (
    <Link
      to={to}
      className={`dashboard-action-card dashboard-action-card-${variant}`}
    >
      <strong>{title}</strong>
      <span>{description}</span>
    </Link>
  );
};

const Dashboard = () => {
  const { user, profile, displayName, displayRole, profileLoading } = useAuth();

  const [company, setCompany] = useState(null);
  const [reports, setReports] = useState([]);
  const [teamCount, setTeamCount] = useState(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(null);
  const [photoCount, setPhotoCount] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [message, setMessage] = useState(null);

  const role = profile?.role || "worker";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const isWorker = role === "worker";

  const welcomeCopy = getWelcomeCopy(role);

  useEffect(() => {
    const loadDashboard = async () => {
      if (profileLoading) return;

      if (!user?.id) {
        setLoadingDashboard(false);
        return;
      }

      if (!profile?.company_id) {
        setLoadingDashboard(false);
        setMessage({
          type: "warning",
          text:
            role === "admin"
              ? "Complete your Business Profile to activate your company dashboard."
              : "Your account is not connected to a company yet. Please contact your admin.",
        });
        return;
      }

      setLoadingDashboard(true);
      setMessage(null);

      try {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select(
            "id, business_name, business_email, business_phone, business_logo_url"
          )
          .eq("id", profile.company_id)
          .single();

        if (companyError) {
          throw companyError;
        }

        setCompany(companyData);

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

        if (role === "worker") {
          reportsQuery = reportsQuery.eq("created_by", user.id);
        }

        const { data: reportsData, error: reportsError } = await reportsQuery;

        if (reportsError) {
          throw reportsError;
        }

        setReports(reportsData || []);

        if (isAdmin || isSupervisor) {
          const { count, error: teamError } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("company_id", profile.company_id)
            .eq("active", true);

          if (teamError) {
            console.error("Error loading team count:", teamError);
            setTeamCount(null);
          } else {
            setTeamCount(count || 0);
          }
        }

        if (isAdmin) {
          const { count, error: invitesError } = await supabase
            .from("team_invitations")
            .select("id", { count: "exact", head: true })
            .eq("company_id", profile.company_id)
            .eq("status", "pending");

          if (invitesError) {
            console.error("Error loading pending invitations:", invitesError);
            setPendingInvitesCount(null);
          } else {
            setPendingInvitesCount(count || 0);
          }
        }

        const { count: photosTotal, error: photosError } = await supabase
          .from("report_photos")
          .select("id", { count: "exact", head: true })
          .eq("company_id", profile.company_id);

        if (photosError) {
          console.error("Error loading photo count:", photosError);
          setPhotoCount(null);
        } else {
          setPhotoCount(photosTotal || 0);
        }
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
  }, [user, profile, profileLoading, role, isAdmin, isSupervisor]);

  const dashboardStats = useMemo(() => {
    const startOfMonth = getStartOfMonth();
    const startOfWeek = getStartOfWeek();

    const reportsThisMonth = reports.filter((report) =>
      isAfterDate(report.created_at, startOfMonth)
    ).length;

    const reportsThisWeek = reports.filter((report) =>
      isAfterDate(report.created_at, startOfWeek)
    ).length;

    const myReports = reports.filter(
      (report) => report.created_by === user?.id
    ).length;

    if (isAdmin) {
      return [
        {
          label: "Total reports",
          value: reports.length,
          helper: "All company reports",
        },
        {
          label: "This month",
          value: reportsThisMonth,
          helper: "Reports created this month",
        },
        {
          label: "Team members",
          value: teamCount ?? "—",
          helper: "Active company users",
        },
        {
          label: "Pending invites",
          value: pendingInvitesCount ?? "—",
          helper: "Team links waiting to be accepted",
        },
      ];
    }

    if (isSupervisor) {
      return [
        {
          label: "Company reports",
          value: reports.length,
          helper: "Reports you can review",
        },
        {
          label: "This week",
          value: reportsThisWeek,
          helper: "Recent field activity",
        },
        {
          label: "Team members",
          value: teamCount ?? "—",
          helper: "Active company users",
        },
        {
          label: "Photos uploaded",
          value: photoCount ?? "—",
          helper: "Evidence attached to reports",
        },
      ];
    }

    return [
      {
        label: "My reports",
        value: myReports,
        helper: "Reports created by you",
      },
      {
        label: "This week",
        value: reportsThisWeek,
        helper: "Your recent activity",
      },
      {
        label: "Photos uploaded",
        value: photoCount ?? "—",
        helper: "Evidence in your accessible reports",
      },
      {
        label: "Last report",
        value: reports[0]?.report_number || "—",
        helper: "Most recent saved report",
      },
    ];
  }, [
    reports,
    user,
    teamCount,
    pendingInvitesCount,
    photoCount,
    isAdmin,
    isSupervisor,
  ]);

  const recentReports = reports.slice(0, 5);

  if (profileLoading || loadingDashboard) {
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
      <section className="dashboard-page">
        <div className="dashboard-hero-card">
          <div>
            <p className="eyebrow mb-2">Workspace setup</p>

            <h1 className="dashboard-title mb-3">
              {isAdmin ? "Complete your company setup" : "Company access needed"}
            </h1>

            <p className="dashboard-subtitle mb-4">
              {message?.text ||
                "Your account needs to be connected to a company before using the dashboard."}
            </p>

            {isAdmin ? (
              <Link to="/business-profile" className="btn btn-primary">
                Complete Business Profile
              </Link>
            ) : (
              <Link to="/reports" className="btn btn-outline-primary">
                Back to Reports
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="dashboard-hero-card mb-4">
        <div className="dashboard-hero-content">
          <p className="eyebrow mb-2">{welcomeCopy.eyebrow}</p>

          <h1 className="dashboard-title mb-2">
            Welcome back, {displayName}
          </h1>

          <p className="dashboard-subtitle mb-0">{welcomeCopy.subtitle}</p>
        </div>

        <div className="dashboard-profile-card">
          <div className="dashboard-avatar">
            {company?.business_logo_url ? (
              <img src={company.business_logo_url} alt="Company logo" />
            ) : (
              <span>{displayName?.charAt(0)?.toUpperCase() || "J"}</span>
            )}
          </div>

          <div>
            <strong>{displayName}</strong>
            <span>{displayRole}</span>
            <small>{company?.business_name || "JobProof company"}</small>
          </div>
        </div>
      </div>

      <div className="dashboard-stat-grid mb-4">
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            helper={stat.helper}
          />
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 dashboard-card">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h2 className="h4 mb-1">
                    {isWorker ? "My recent reports" : "Recent reports"}
                  </h2>

                  <p className="text-muted mb-0">
                    {isWorker
                      ? "Your latest reports saved in JobProof."
                      : "Latest job reports across your workspace."}
                  </p>
                </div>

                <Link to="/reports" className="btn btn-outline-primary btn-sm">
                  View all
                </Link>
              </div>

              {recentReports.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="h5 mb-2">No reports yet</h3>
                  <p className="text-muted mb-3">
                    Start by creating your first job report.
                  </p>
                  <Link to="/create-report" className="btn btn-primary">
                    Create Report
                  </Link>
                </div>
              ) : (
                <div className="dashboard-report-list">
                  {recentReports.map((report) => (
                    <Link
                      to={`/reports/${report.id}`}
                      className="dashboard-report-item"
                      key={report.id}
                    >
                      <div>
                        <strong>
                          {report.report_number || "No report number"}
                        </strong>

                        <span>
                          {report.client_name || "No client"} ·{" "}
                          {report.service_type || "No service"}
                        </span>

                        <small>
                          {report.profiles?.full_name || "Unknown worker"} ·{" "}
                          {formatDate(report.created_at)}
                        </small>
                      </div>

                      <span
                        className={`badge ${getStatusBadgeClass(
                          report.status
                        )}`}
                      >
                        {report.status || "completed"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm border-0 dashboard-card mb-4">
            <div className="card-body p-4">
              <h2 className="h4 mb-3">Quick actions</h2>

              <div className="dashboard-action-grid">
                <QuickAction
                  to="/create-report"
                  title="Create Report"
                  description="Start a new job report"
                  variant="primary"
                />

                <QuickAction
                  to="/reports"
                  title={isWorker ? "My Reports" : "View Reports"}
                  description={
                    isWorker
                      ? "Review your saved work"
                      : "Search company reports"
                  }
                  variant="light"
                />

                {isAdmin && (
                  <>
                    <QuickAction
                      to="/team"
                      title="Manage Team"
                      description="Invite supervisors and workers"
                      variant="light"
                    />

                    <QuickAction
                      to="/business-profile"
                      title="Business Profile"
                      description="Update company details"
                      variant="light"
                    />
                  </>
                )}

                {isSupervisor && (
                  <QuickAction
                    to="/reports"
                    title="Review Work"
                    description="Check recent activity"
                    variant="light"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 dashboard-card">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">
                {isAdmin
                  ? "Admin workspace"
                  : isSupervisor
                  ? "Supervisor workspace"
                  : "Worker workspace"}
              </h2>

              <ul className="dashboard-role-list">
                {isAdmin && (
                  <>
                    <li>Manage company profile and branding.</li>
                    <li>Invite supervisors and workers.</li>
                    <li>View all company reports.</li>
                    <li>Track team and evidence activity.</li>
                  </>
                )}

                {isSupervisor && (
                  <>
                    <li>View company reports.</li>
                    <li>Review recent field activity.</li>
                    <li>Create and update operational reports.</li>
                  </>
                )}

                {isWorker && (
                  <>
                    <li>Create reports quickly from the field.</li>
                    <li>Access your own report history.</li>
                    <li>Attach before and after evidence.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
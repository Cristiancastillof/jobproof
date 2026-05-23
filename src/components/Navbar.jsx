import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const formatRoleLabel = (role) => {
  if (!role) return "User";

  const roleMap = {
    admin: "Admin",
    supervisor: "Supervisor",
    worker: "Worker",
  };

  return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
};

const getInitials = (nameOrEmail) => {
  if (!nameOrEmail) return "JP";

  const cleanValue = String(nameOrEmail).trim();

  const parts = cleanValue
    .replace(/@.*/, "")
    .split(" ")
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return cleanValue.slice(0, 2).toUpperCase();
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, displayName } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAuthenticated = Boolean(user);
  const role = profile?.role || "";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const canManageWorkspace = isAdmin || isSupervisor;

  const userName =
    displayName ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "JobProof user";

  const userEmail = user?.email || "";
  const roleLabel = formatRoleLabel(role);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  const getNavLinkClass = ({ isActive }) =>
    isActive ? "jp2-nav-link active" : "jp2-nav-link";

  return (
    <>
      <style>
        {`
          .jp2-navbar-shell {
            position: sticky;
            top: 0;
            z-index: 1040;
            background: rgba(248, 250, 252, 0.96);
            border-bottom: 1px solid rgba(15, 23, 42, 0.08);
            backdrop-filter: blur(18px);
          }

          .jp2-navbar {
            max-width: 1180px;
            margin: 0 auto;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
          }

          .jp2-brand {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            color: #0f172a;
            text-decoration: none;
            min-width: 0;
          }

          .jp2-brand:hover {
            color: #0f172a;
          }

          .jp2-brand-mark {
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: linear-gradient(135deg, #1e40af, #0f172a);
            box-shadow: 0 12px 24px rgba(30, 64, 175, 0.28);
            font-size: 0.9rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jp2-brand-text {
            display: flex;
            flex-direction: column;
            line-height: 1.05;
          }

          .jp2-brand-text strong {
            font-size: 1rem;
            font-weight: 950;
            letter-spacing: -0.03em;
          }

          .jp2-brand-text small {
            margin-top: 3px;
            color: #64748b;
            font-size: 0.72rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jp2-menu-toggle {
            display: none;
            width: 44px;
            height: 44px;
            border: 1px solid rgba(15, 23, 42, 0.12);
            border-radius: 14px;
            background: #ffffff;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
            padding: 0;
          }

          .jp2-menu-toggle span {
            display: block;
            width: 18px;
            height: 2px;
            margin: 4px auto;
            border-radius: 999px;
            background: #0f172a;
            transition: transform 0.2s ease, opacity 0.2s ease;
          }

          .jp2-menu-toggle.open span:nth-child(1) {
            transform: translateY(6px) rotate(45deg);
          }

          .jp2-menu-toggle.open span:nth-child(2) {
            opacity: 0;
          }

          .jp2-menu-toggle.open span:nth-child(3) {
            transform: translateY(-6px) rotate(-45deg);
          }

          .jp2-nav-panel {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 22px;
          }

          .jp2-nav-links {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-left: auto;
          }

          .jp2-nav-link {
            display: inline-flex;
            align-items: center;
            min-height: 38px;
            padding: 8px 12px;
            border-radius: 999px;
            color: #475569;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 850;
            white-space: nowrap;
          }

          .jp2-nav-link:hover {
            color: #1e40af;
            background: rgba(30, 64, 175, 0.08);
          }

          .jp2-nav-link.active {
            color: #1e40af;
            background: #eff6ff;
          }

          .jp2-user-area {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .jp2-user-card {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            padding: 7px 8px;
            border-radius: 18px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
          }

          .jp2-user-avatar {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            color: #ffffff;
            background: #0f172a;
            font-size: 0.78rem;
            font-weight: 950;
            letter-spacing: -0.03em;
          }

          .jp2-user-meta {
            min-width: 0;
            display: flex;
            flex-direction: column;
            line-height: 1.1;
          }

          .jp2-user-meta strong {
            max-width: 150px;
            color: #0f172a;
            font-size: 0.84rem;
            font-weight: 900;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp2-user-meta small {
            max-width: 150px;
            margin-top: 3px;
            color: #64748b;
            font-size: 0.7rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp2-role-badge {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            padding: 5px 8px;
            border-radius: 999px;
            color: #334155;
            background: #f1f5f9;
            border: 1px solid rgba(15, 23, 42, 0.08);
            font-size: 0.68rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .jp2-role-badge.admin {
            color: #1e40af;
            background: #eff6ff;
            border-color: rgba(30, 64, 175, 0.18);
          }

          .jp2-role-badge.supervisor {
            color: #92400e;
            background: #fffbeb;
            border-color: rgba(245, 158, 11, 0.22);
          }

          .jp2-role-badge.worker {
            color: #166534;
            background: #f0fdf4;
            border-color: rgba(22, 101, 52, 0.18);
          }

          .jp2-logout-btn {
            min-height: 38px;
            border-radius: 999px;
            font-size: 0.86rem;
            font-weight: 850;
          }

          .jp2-auth-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .jp2-auth-actions .btn {
            border-radius: 999px;
            font-weight: 850;
          }

          @media (max-width: 991px) {
            .jp2-navbar {
              padding: 12px 14px;
            }

            .jp2-menu-toggle {
              display: inline-block;
            }

            .jp2-nav-panel {
              position: absolute;
              left: 12px;
              right: 12px;
              top: 72px;
              display: none;
              flex-direction: column;
              align-items: stretch;
              gap: 16px;
              padding: 16px;
              border-radius: 24px;
              background: rgba(255, 255, 255, 0.98);
              border: 1px solid rgba(15, 23, 42, 0.1);
              box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
              backdrop-filter: blur(18px);
            }

            .jp2-nav-panel.open {
              display: flex;
            }

            .jp2-nav-links {
              width: 100%;
              margin-left: 0;
              display: grid;
              grid-template-columns: 1fr;
              gap: 8px;
            }

            .jp2-nav-link {
              width: 100%;
              min-height: 46px;
              justify-content: flex-start;
              padding: 10px 14px;
              border-radius: 16px;
              color: #334155;
              background: #f8fafc;
              border: 1px solid rgba(15, 23, 42, 0.06);
            }

            .jp2-nav-link.active {
              color: #1e40af;
              background: #eff6ff;
              border-color: rgba(30, 64, 175, 0.18);
            }

            .jp2-user-area {
              width: 100%;
              flex-direction: column;
              align-items: stretch;
              padding-top: 14px;
              border-top: 1px solid rgba(15, 23, 42, 0.08);
            }

            .jp2-user-card {
              width: 100%;
              align-items: center;
              padding: 12px;
              border-radius: 18px;
            }

            .jp2-user-meta {
              flex: 1;
            }

            .jp2-user-meta strong,
            .jp2-user-meta small {
              max-width: 100%;
            }

            .jp2-role-badge {
              margin-left: auto;
            }

            .jp2-logout-btn {
              width: 100%;
              min-height: 44px;
            }

            .jp2-auth-actions {
              width: 100%;
              flex-direction: column;
              align-items: stretch;
              padding-top: 14px;
              border-top: 1px solid rgba(15, 23, 42, 0.08);
            }

            .jp2-auth-actions .btn {
              width: 100%;
              min-height: 44px;
            }
          }

          @media (max-width: 380px) {
            .jp2-brand-text small {
              display: none;
            }

            .jp2-brand-mark {
              width: 38px;
              height: 38px;
              border-radius: 13px;
            }
          }
        `}
      </style>

      <header className="jp2-navbar-shell">
        <nav className="jp2-navbar">
          <Link
            to="/"
            className="jp2-brand"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="jp2-brand-mark">JP</span>

            <span className="jp2-brand-text">
              <strong>JobProof</strong>
              <small>Field reports</small>
            </span>
          </Link>

          <button
            type="button"
            className={isMenuOpen ? "jp2-menu-toggle open" : "jp2-menu-toggle"}
            onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <div className={isMenuOpen ? "jp2-nav-panel open" : "jp2-nav-panel"}>
            <div className="jp2-nav-links">
              {isAuthenticated ? (
                <>
                  <NavLink to="/" className={getNavLinkClass} end>
                    Dashboard
                  </NavLink>

                  <NavLink to="/reports" className={getNavLinkClass}>
                    Reports
                  </NavLink>

                  <NavLink to="/create-report" className={getNavLinkClass}>
                    Create Report
                  </NavLink>

                  {canManageWorkspace && (
                    <>
                      <NavLink to="/clients" className={getNavLinkClass}>
                        Clients
                      </NavLink>

                      <NavLink to="/team" className={getNavLinkClass}>
                        Team
                      </NavLink>

                      <NavLink
                        to="/business-profile"
                        className={getNavLinkClass}
                      >
                        Business Profile
                      </NavLink>
                    </>
                  )}
                </>
              ) : (
                <>
                  <NavLink to="/" className={getNavLinkClass} end>
                    Home
                  </NavLink>

                  <NavLink to="/login" className={getNavLinkClass}>
                    Log in
                  </NavLink>

                  <NavLink to="/register" className={getNavLinkClass}>
                    Register
                  </NavLink>
                </>
              )}
            </div>

            {isAuthenticated ? (
              <div className="jp2-user-area">
                <div className="jp2-user-card">
                  <div className="jp2-user-avatar">{getInitials(userName)}</div>

                  <div className="jp2-user-meta">
                    <strong>{userName}</strong>
                    {userEmail && <small>{userEmail}</small>}
                  </div>

                  <span className={`jp2-role-badge ${role || "user"}`}>
                    {roleLabel}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-danger jp2-logout-btn"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            ) : (
              <div className="jp2-auth-actions">
                <Link to="/login" className="btn btn-outline-primary">
                  Log in
                </Link>

                <Link to="/register" className="btn btn-primary">
                  Get started
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;
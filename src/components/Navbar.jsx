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
    isActive ? "jp-nav-link active" : "jp-nav-link";

  return (
    <header className="jp-navbar-shell">
      <nav className="jp-navbar">
        <Link to="/" className="jp-brand" onClick={() => setIsMenuOpen(false)}>
          <span className="jp-brand-mark">JP</span>

          <span className="jp-brand-text">
            <strong>JobProof</strong>
            <small>Field reports</small>
          </span>
        </Link>

        <button
          type="button"
          className={isMenuOpen ? "jp-menu-toggle open" : "jp-menu-toggle"}
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={isMenuOpen ? "jp-nav-panel open" : "jp-nav-panel"}>
          <div className="jp-nav-links">
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

                    <NavLink to="/business-profile" className={getNavLinkClass}>
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
            <div className="jp-user-area">
              <div className="jp-user-card">
                <div className="jp-user-avatar">{getInitials(userName)}</div>

                <div className="jp-user-meta">
                  <strong>{userName}</strong>
                  {userEmail && <small>{userEmail}</small>}
                </div>

                <span className={`jp-role-badge ${role || "user"}`}>
                  {roleLabel}
                </span>
              </div>

              <button
                type="button"
                className="btn btn-outline-danger jp-logout-btn"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          ) : (
            <div className="jp-auth-actions">
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
  );
};

export default Navbar;
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, displayName, displayRole, signOut } = useAuth();

  const isAdmin = displayRole === "Admin";
  const isSupervisor = displayRole === "Supervisor";
  const canManageClients = isAdmin || isSupervisor;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error(error);
      alert("There was an error signing out.");
    }
  };

  const getNavLinkClass = ({ isActive }) =>
    isActive ? "nav-link jp-nav-link active" : "nav-link jp-nav-link";

  return (
    <nav className="navbar navbar-expand-lg jobproof-navbar">
      <div className="container">
        <Link className="navbar-brand jobproof-brand" to="/">
          <span className="jobproof-logo-mark">
            <span className="jobproof-logo-lines">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="jobproof-logo-check">✓</span>
          </span>

          <span className="jobproof-brand-text">
            <span>Job</span>
            <span>Proof</span>
          </span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#jobproofNavbar"
          aria-controls="jobproofNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="jobproofNavbar">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <NavLink to="/" className={getNavLinkClass}>
                    Dashboard
                  </NavLink>
                </li>

                {isAdmin && (
                  <li className="nav-item">
                    <NavLink to="/team" className={getNavLinkClass}>
                      Team
                    </NavLink>
                  </li>
                )}

                {canManageClients && (
                  <li className="nav-item">
                    <NavLink to="/clients" className={getNavLinkClass}>
                      Clients
                    </NavLink>
                  </li>
                )}

                <li className="nav-item">
                  <NavLink to="/reports" className={getNavLinkClass}>
                    Reports
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/create-report" className={getNavLinkClass}>
                    Create Report
                  </NavLink>
                </li>

                {isAdmin && (
                  <li className="nav-item">
                    <NavLink
                      to="/business-profile"
                      className={getNavLinkClass}
                    >
                      Business Profile
                    </NavLink>
                  </li>
                )}

                <li className="nav-item">
                  <span className="jp-user-chip">
                    <span className="jp-user-dot"></span>
                    {displayName} · {displayRole}
                  </span>
                </li>

                <li className="nav-item">
                  <button
                    type="button"
                    className="btn jp-signout-button"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <NavLink to="/" className={getNavLinkClass}>
                    Home
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/login" className={getNavLinkClass}>
                    Log in
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    to="/register"
                    className={({ isActive }) =>
                      isActive
                        ? "btn jp-navbar-cta active"
                        : "btn jp-navbar-cta"
                    }
                  >
                    Get started
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
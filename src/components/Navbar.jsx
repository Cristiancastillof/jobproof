import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, profile, displayName, signOut } = useAuth();

  const isAdmin = profile?.role === "admin";
  const isSupervisor = profile?.role === "supervisor";
  const isWorker = profile?.role === "worker";
  const canManageTeam = isAdmin || isSupervisor;
  const canManageClients = isAdmin || isSupervisor;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const closeMobileMenu = () => {
    const navbarCollapse = document.getElementById("jobproofNavbar");

    if (navbarCollapse?.classList.contains("show")) {
      navbarCollapse.classList.remove("show");
    }
  };

  const getNavLinkClass = ({ isActive }) => {
    return isActive ? "nav-link active" : "nav-link";
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top jobproof-navbar">
      <div className="container">
        <NavLink className="navbar-brand fw-bold" to="/" onClick={closeMobileMenu}>
          JobProof
        </NavLink>

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
          {user ? (
            <>
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                <li className="nav-item">
                  <NavLink
                    to="/"
                    className={getNavLinkClass}
                    onClick={closeMobileMenu}
                  >
                    Dashboard
                  </NavLink>
                </li>

                {canManageTeam && (
                  <li className="nav-item">
                    <NavLink
                      to="/team"
                      className={getNavLinkClass}
                      onClick={closeMobileMenu}
                    >
                      Team
                    </NavLink>
                  </li>
                )}

                {canManageClients && (
                  <li className="nav-item">
                    <NavLink
                      to="/clients"
                      className={getNavLinkClass}
                      onClick={closeMobileMenu}
                    >
                      Clients
                    </NavLink>
                  </li>
                )}

                <li className="nav-item">
                  <NavLink
                    to="/reports"
                    className={getNavLinkClass}
                    onClick={closeMobileMenu}
                  >
                    Reports
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    to="/create-report"
                    className={getNavLinkClass}
                    onClick={closeMobileMenu}
                  >
                    Create Report
                  </NavLink>
                </li>

                {(isAdmin || isSupervisor || isWorker) && (
                  <li className="nav-item d-lg-none">
                    <NavLink
                      to="/business-profile"
                      className={getNavLinkClass}
                      onClick={closeMobileMenu}
                    >
                      Business Profile
                    </NavLink>
                  </li>
                )}
              </ul>

              <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
                <div className="navbar-user-summary text-lg-end">
                  <span className="navbar-user-name">
                    {displayName || user.email}
                  </span>

                  <small className="navbar-user-role">
                    {profile?.role || "user"}
                  </small>
                </div>

                <NavLink
                  to="/business-profile"
                  className="btn btn-sm btn-outline-primary d-none d-lg-inline-flex"
                  onClick={closeMobileMenu}
                >
                  Business Profile
                </NavLink>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                <li className="nav-item">
                  <NavLink
                    to="/"
                    className={getNavLinkClass}
                    onClick={closeMobileMenu}
                  >
                    Home
                  </NavLink>
                </li>
              </ul>

              <div className="d-flex gap-2">
                <NavLink
                  to="/login"
                  className="btn btn-sm btn-outline-primary"
                  onClick={closeMobileMenu}
                >
                  Login
                </NavLink>

                <NavLink
                  to="/register"
                  className="btn btn-sm btn-primary"
                  onClick={closeMobileMenu}
                >
                  Create Account
                </NavLink>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
import { Link, NavLink } from "react-router-dom";

const Navbar = () => {
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
            <li className="nav-item">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? "nav-link active fw-semibold" : "nav-link"
                }
              >
                Home
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/business-profile"
                className={({ isActive }) =>
                  isActive ? "nav-link active fw-semibold" : "nav-link"
                }
              >
                Business Profile
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  isActive ? "nav-link active fw-semibold" : "nav-link"
                }
              >
                Reports
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/create-report"
                className={({ isActive }) =>
                  isActive
                    ? "btn btn-primary fw-semibold"
                    : "btn btn-outline-primary"
                }
              >
                Create Report
              </NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
import { Link, NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold text-primary" to="/">
          JobProof
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
          <div className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
            <NavLink
              className={({ isActive }) =>
                isActive ? "nav-link active fw-semibold" : "nav-link"
              }
              to="/"
            >
              Home
            </NavLink>

            <NavLink
              className={({ isActive }) =>
                isActive ? "nav-link active fw-semibold" : "nav-link"
              }
              to="/reports"
            >
              Reports
            </NavLink>

            <Link
              to="/create-report"
              className="btn btn-primary ms-lg-2 mt-2 mt-lg-0"
            >
              Create Report
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
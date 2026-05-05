import { Link, NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
      <Link className="navbar-brand fw-bold" to="/">
        JobProof
      </Link>

      <div className="navbar-nav ms-auto">
        <NavLink className="nav-link" to="/">
          Home
        </NavLink>

        <NavLink className="nav-link" to="/create-report">
          Create Report
        </NavLink>

        <NavLink className="nav-link" to="/reports">
          Reports
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
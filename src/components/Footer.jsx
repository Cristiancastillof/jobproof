import { Link } from "react-router-dom";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../config/app";

const Footer = () => {
  return (
    <footer className="jp-footer mt-auto">
      <div className="container">
        <small>
          JobProof © 2026 - Professional job reports for cleaners and tradies
        </small>

        <nav aria-label="Legal links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;

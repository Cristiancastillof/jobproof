import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PublicRoute = ({ children }) => {
  const { isAuthenticated, authLoading, profileLoading } = useAuth();

  if (authLoading || profileLoading) {
    return (
      <section className="auth-loading-page">
        <div className="card shadow-sm auth-loading-card">
          <div className="card-body text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>

            <h1 className="h5 mb-1">Loading JobProof</h1>
            <p className="text-muted mb-0">
              Please wait while we check your session.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/reports" replace />;
  }

  return children;
};

export default PublicRoute;
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading, profileLoading } = useAuth();
  const location = useLocation();

  if (authLoading || profileLoading) {
    return (
      <section className="auth-loading-page">
        <div className="card shadow-sm auth-loading-card">
          <div className="card-body text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>

            <h1 className="h5 mb-1">Loading your workspace</h1>
            <p className="text-muted mb-0">
              Please wait while JobProof checks your session.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
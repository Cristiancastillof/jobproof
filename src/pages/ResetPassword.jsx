import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const prepareRecoverySession = async () => {
      setCheckingSession(true);

      try {
        let { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!data.session) {
          const code = new URLSearchParams(window.location.search).get("code");

          if (code) {
            const result = await supabase.auth.exchangeCodeForSession(code);

            if (result.error) {
              throw result.error;
            }

            data = result.data;

            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          }
        }

        if (!isMounted) return;

        setHasRecoverySession(Boolean(data.session?.user));
      } catch (error) {
        console.error("Error preparing password reset session:", error);

        if (isMounted) {
          setMessage({
            type: "danger",
            text:
              "This reset link is invalid or expired. Please request a new password reset email.",
          });
          setHasRecoverySession(false);
        }
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const validatePassword = () => {
    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validatePassword();

    if (validationError) {
      setMessage({
        type: "warning",
        text: validationError,
      });
      return;
    }

    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setMessage({
        type: "success",
        text: "Your password has been updated. Taking you back to JobProof...",
      });

      setTimeout(() => {
        navigate("/reports", { replace: true });
      }, 900);
    } catch (error) {
      console.error("Error updating password:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "We could not update your password. Please request a new reset link.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card card shadow-sm">
        <div className="card-body">
          <span className="jp-eyebrow">
            <span className="jp-eyebrow-dot"></span>
            Secure reset
          </span>

          <h1 className="mb-2">Create a new password</h1>

          <p className="text-muted mb-4">
            Choose a new password for your JobProof account.
          </p>

          {message && (
            <div className={`alert alert-${message.type}`} role="alert">
              {message.text}
            </div>
          )}

          {checkingSession ? (
            <div className="text-center py-3">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Checking reset link...</span>
              </div>

              <p className="text-muted mb-0">Checking your reset link...</p>
            </div>
          ) : hasRecoverySession ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="resetPassword" className="form-label">
                  New password
                </label>

                <input
                  id="resetPassword"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="resetConfirmPassword" className="form-label">
                  Confirm new password
                </label>

                <input
                  id="resetConfirmPassword"
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <button className="btn btn-primary w-100" disabled={loading}>
                {loading ? "Updating password..." : "Update password"}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-muted">
                Request a new reset email and open the latest link from your
                inbox.
              </p>

              <Link to="/forgot-password" className="btn btn-primary">
                Request new link
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResetPassword;

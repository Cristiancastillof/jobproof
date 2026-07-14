import { useState } from "react";
import { Link } from "react-router-dom";
import { getPasswordResetRedirectUrl } from "../config/app";
import { supabase } from "../lib/supabaseClient";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: getPasswordResetRedirectUrl(),
        }
      );

      if (error) {
        throw error;
      }

      setMessage({
        type: "success",
        text:
          "If this email belongs to a JobProof account, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("Error sending password reset email:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "We could not send the reset link. Please check the email and try again.",
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
            Account recovery
          </span>

          <h1 className="mb-2">Reset your password</h1>

          <p className="text-muted mb-4">
            Enter your account email and JobProof will send you a secure reset
            link.
          </p>

          {message && (
            <div className={`alert alert-${message.type}`} role="alert">
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="forgotPasswordEmail" className="form-label">
                Email
              </label>

              <input
                id="forgotPasswordEmail"
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <button className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Sending link..." : "Send reset link"}
            </button>
          </form>

          <p className="text-muted text-center mt-4 mb-0">
            Remembered your password?{" "}
            <Link to="/login" className="fw-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ForgotPassword;

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setMessage({ type: "", text: "" });
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    setLoading(false);

    if (error) {
      setMessage({
        type: "danger",
        text: error.message,
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Login successful.",
    });

    setTimeout(() => {
      navigate("/reports");
    }, 500);
  };

  return (
    <section className="auth-page">
      <div className="auth-card card shadow-sm">
        <div className="card-body">
          <span className="jp-eyebrow">
            <span className="jp-eyebrow-dot"></span>
            Welcome back
          </span>

          <h1 className="mb-2">Log in to JobProof</h1>

          <p className="text-muted mb-4">
            Access your company workspace and manage job reports.
          </p>

          {message.text && (
            <div className={`alert alert-${message.type}`} role="alert">
              {message.text}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label htmlFor="loginEmail" className="form-label">
                Email
              </label>
              <input
                id="loginEmail"
                type="email"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                required
              />
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center gap-2">
                <label htmlFor="loginPassword" className="form-label">
                  Password
                </label>

                <Link to="/forgot-password" className="small fw-semibold">
                  Forgot password?
                </Link>
              </div>

              <input
                id="loginPassword"
                type="password"
                className="form-control"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Your password"
                required
              />
            </div>

            <button className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="text-muted text-center mt-4 mb-0">
            New to JobProof?{" "}
            <Link to="/register" className="fw-semibold">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Login;

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
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

  const handleRegister = async (event) => {
    event.preventDefault();

    setMessage({ type: "", text: "" });

    if (formData.password !== formData.confirmPassword) {
      setMessage({
        type: "warning",
        text: "Passwords do not match.",
      });
      return;
    }

    if (formData.password.length < 6) {
      setMessage({
        type: "warning",
        text: "Password must be at least 6 characters.",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
        },
      },
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
      text: "Account created. Please check your email if confirmation is required.",
    });

    setTimeout(() => {
      navigate("/login");
    }, 1200);
  };

  return (
    <section className="auth-page">
      <div className="auth-card card shadow-sm">
        <div className="card-body">
          <span className="jp-eyebrow">
            <span className="jp-eyebrow-dot"></span>
            Get started
          </span>

          <h1 className="mb-2">Create your JobProof account</h1>

          <p className="text-muted mb-4">
            Start your company workspace and prepare your reporting system.
          </p>

          {message.text && (
            <div className={`alert alert-${message.type}`} role="alert">
              {message.text}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="mb-3">
              <label htmlFor="registerFullName" className="form-label">
                Full name
              </label>
              <input
                id="registerFullName"
                type="text"
                className="form-control"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Example: Cris Castillo"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="registerEmail" className="form-label">
                Email
              </label>
              <input
                id="registerEmail"
                type="email"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="registerPassword" className="form-label">
                Password
              </label>
              <input
                id="registerPassword"
                type="password"
                className="form-control"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="registerConfirmPassword" className="form-label">
                Confirm password
              </label>
              <input
                id="registerConfirmPassword"
                type="password"
                className="form-control"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your password"
                required
              />
            </div>

            <button className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-muted text-center mt-4 mb-0">
            Already have an account?{" "}
            <Link to="/login" className="fw-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Register;
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const createEmptyForm = () => ({
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteToken = searchParams.get("invite");

  const [formData, setFormData] = useState(createEmptyForm);
  const [inviteData, setInviteData] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(Boolean(inviteToken));
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [message, setMessage] = useState(null);

  const isInviteRegistration = Boolean(inviteToken && inviteData);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!inviteToken) {
        setLoadingInvite(false);
        return;
      }

      setLoadingInvite(true);
      setMessage(null);

      try {
        const { data, error } = await supabase.rpc("get_team_invitation", {
          invite_token_input: inviteToken,
        });

        if (error) {
          throw error;
        }

        const invitation = data?.[0];

        if (!invitation) {
          setInviteData(null);
          setMessage({
            type: "danger",
            text: "This invitation is invalid, expired or has already been used.",
          });
          return;
        }

        setInviteData(invitation);

        setFormData((currentForm) => ({
          ...currentForm,
          fullName: invitation.full_name || "",
          email: invitation.email || "",
        }));
      } catch (error) {
        console.error("Error loading invitation:", error);

        setMessage({
          type: "danger",
          text:
            error.message ||
            "There was an error loading this invitation. Please ask your admin for a new link.",
        });
      } finally {
        setLoadingInvite(false);
      }
    };

    loadInvitation();
  }, [inviteToken]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!formData.email.trim()) {
      return "Please enter your email.";
    }

    if (formData.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match.";
    }

    if (inviteData) {
      const typedEmail = formData.email.trim().toLowerCase();
      const invitedEmail = inviteData.email.trim().toLowerCase();

      if (typedEmail !== invitedEmail) {
        return "This invitation can only be used with the invited email address.";
      }
    }

    return null;
  };

  const createStandardAdminProfile = async (userId, email) => {
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      company_id: null,
      full_name: formData.fullName.trim(),
      email,
      role: "admin",
      active: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
  };

  const acceptInvitation = async () => {
    const { error } = await supabase.rpc("accept_team_invitation", {
      invite_token_input: inviteToken,
    });

    if (error) {
      throw error;
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setMessage({
        type: "warning",
        text: validationError,
      });
      return;
    }

    setCreatingAccount(true);
    setMessage(null);

    try {
      const email = formData.email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("The account could not be created. Please try again.");
      }

      if (!data.session) {
        setMessage({
          type: "warning",
          text:
            "Account created, but email confirmation is enabled. Please confirm your email, then log in to continue.",
        });
        return;
      }

      if (isInviteRegistration) {
        await acceptInvitation();

        setMessage({
          type: "success",
          text: `Account created. You have joined ${inviteData.company_name} as ${inviteData.role}.`,
        });

        setTimeout(() => {
          navigate("/", { replace: true });
        }, 800);

        return;
      }

      await createStandardAdminProfile(data.user.id, email);

      setMessage({
        type: "success",
        text: "Admin account created. Complete your Business Profile to start using JobProof.",
      });

      setTimeout(() => {
        navigate("/business-profile", { replace: true });
      }, 800);
    } catch (error) {
      console.error("Error creating account:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error creating your account. Please try again.",
      });
    } finally {
      setCreatingAccount(false);
    }
  };

  if (loadingInvite) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>

            <h1 className="h5 mb-2">Loading invitation</h1>

            <p className="text-muted mb-0">
              Please wait while JobProof checks your invite link.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-4">
          <p className="eyebrow mb-2">
            {isInviteRegistration ? "Team invitation" : "Create admin account"}
          </p>

          <h1 className="h3 mb-2">
            {isInviteRegistration
              ? `Join ${inviteData.company_name}`
              : "Create your company admin account"}
          </h1>

          <p className="text-muted mb-0">
            {isInviteRegistration
              ? `You have been invited as ${inviteData.role}.`
              : "Start by creating the admin account for your company workspace."}
          </p>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        {inviteToken && !inviteData && (
          <div className="text-center">
            <p className="text-muted">
              This invite link cannot be used. Please ask your admin to send a
              new invitation.
            </p>

            <Link to="/login" className="btn btn-primary">
              Back to Login
            </Link>
          </div>
        )}

        {(!inviteToken || inviteData) && (
          <form onSubmit={handleRegister}>
            {isInviteRegistration && (
              <div className="invite-summary-box mb-4">
                <span>Company</span>
                <strong>{inviteData.company_name}</strong>

                <span>Assigned role</span>
                <strong className="text-capitalize">{inviteData.role}</strong>
              </div>
            )}

            {!isInviteRegistration && (
              <div className="alert alert-info mb-4">
                <strong>Admin account</strong>
                <br />
                This account will manage the company profile, team invitations
                and report workflow.
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="registerFullName" className="form-label">
                Full name
              </label>

              <input
                id="registerFullName"
                type="text"
                name="fullName"
                className="form-control"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Example: Alex Morgan"
                autoComplete="name"
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
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                autoComplete="email"
                required
                readOnly={isInviteRegistration}
              />

              {isInviteRegistration && (
                <small className="text-muted">
                  This invite is linked to this email address.
                </small>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="registerPassword" className="form-label">
                Password
              </label>

              <input
                id="registerPassword"
                type="password"
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
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
                name="confirmPassword"
                className="form-control"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={creatingAccount}
            >
              {creatingAccount
                ? "Creating account..."
                : isInviteRegistration
                ? "Create Account & Join Team"
                : "Create Admin Account"}
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <p className="text-muted mb-0">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Register;
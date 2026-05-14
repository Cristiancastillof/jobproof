import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const initialBusinessProfile = {
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  defaultWorkerName: "",
  businessLogo: "",
};

const BusinessProfile = () => {
  const { user, profile, authLoading, profileLoading, isAuthenticated, fetchProfile } =
    useAuth();

  const [businessProfile, setBusinessProfile] = useState(initialBusinessProfile);
  const [businessLogoFile, setBusinessLogoFile] = useState(null);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadBusinessProfile = async () => {
      if (!isAuthenticated || authLoading || profileLoading) return;

      const savedProfile =
        JSON.parse(localStorage.getItem("jobproofBusinessProfile")) || null;

      if (savedProfile) {
        setBusinessProfile({
          ...initialBusinessProfile,
          ...savedProfile,
        });
      }

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from("companies")
        .select(
          "id, business_name, business_email, business_phone, business_logo_url"
        )
        .eq("id", profile.company_id)
        .single();

      if (error) {
        console.error("Error loading company:", error);
        return;
      }

      if (data) {
        const loadedProfile = {
          businessName: data.business_name || "",
          businessEmail: data.business_email || "",
          businessPhone: data.business_phone || "",
          businessLogo: data.business_logo_url || "",
          defaultWorkerName: profile.full_name || "",
        };

        setBusinessProfile(loadedProfile);

        localStorage.setItem(
          "jobproofBusinessProfile",
          JSON.stringify(loadedProfile)
        );
      }
    };

    loadBusinessProfile();
  }, [authLoading, profileLoading, isAuthenticated, profile]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 4000);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setBusinessProfile({
      ...businessProfile,
      [name]: value,
    });
  };

  const handleLogoChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setBusinessLogoFile(file);

    const previewUrl = URL.createObjectURL(file);

    setBusinessProfile({
      ...businessProfile,
      businessLogo: previewUrl,
    });
  };

  const handleRemoveLogo = () => {
    setBusinessLogoFile(null);

    setBusinessProfile({
      ...businessProfile,
      businessLogo: "",
    });
  };

  const uploadBusinessLogo = async () => {
    if (!businessLogoFile || !user?.id) {
      return businessProfile.businessLogo || "";
    }

    const fileExtension = businessLogoFile.name.split(".").pop();
    const cleanFileName = businessLogoFile.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

    const filePath = `${user.id}/${Date.now()}-${cleanFileName}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(filePath, businessLogoFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("business-logos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!isAuthenticated || !user) {
      showMessage("warning", "Please log in before saving a business profile.");
      return;
    }

    if (!businessProfile.businessName.trim()) {
      showMessage("warning", "Business name is required.");
      return;
    }

    setLoading(true);

    try {
      const logoUrl = await uploadBusinessLogo();

      let companyId = profile?.company_id || null;

      if (!companyId) {
        const { data: newCompany, error: companyError } = await supabase
          .from("companies")
          .insert({
  owner_id: user.id,
  business_name: businessProfile.businessName,
  business_email: businessProfile.businessEmail,
  business_phone: businessProfile.businessPhone,
  business_logo_url: logoUrl,
})
          .select("id")
          .single();

        if (companyError) {
          throw companyError;
        }

        companyId = newCompany.id;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            company_id: companyId,
            full_name: businessProfile.defaultWorkerName || profile?.full_name,
          })
          .eq("id", user.id);

        if (profileError) {
          throw profileError;
        }
      } else {
        const { error: companyUpdateError } = await supabase
          .from("companies")
          .update({
            business_name: businessProfile.businessName,
            business_email: businessProfile.businessEmail,
            business_phone: businessProfile.businessPhone,
            business_logo_url: logoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);

        if (companyUpdateError) {
          throw companyUpdateError;
        }

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            full_name: businessProfile.defaultWorkerName || profile?.full_name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (profileUpdateError) {
          throw profileUpdateError;
        }
      }

      const savedBusinessProfile = {
        ...businessProfile,
        businessLogo: logoUrl,
      };

      setBusinessProfile(savedBusinessProfile);
      setBusinessLogoFile(null);

      localStorage.setItem(
        "jobproofBusinessProfile",
        JSON.stringify(savedBusinessProfile)
      );

      await fetchProfile(user);

      showMessage("success", "Business profile saved successfully.");
    } catch (error) {
      console.error(error);
      showMessage(
        "danger",
        "There was an error saving the business profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearProfile = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear the local business profile form?"
    );

    if (!confirmClear) return;

    localStorage.removeItem("jobproofBusinessProfile");
    setBusinessLogoFile(null);
    setBusinessProfile(initialBusinessProfile);

    showMessage(
      "info",
      "Local form cleared. Your saved company in Supabase was not deleted."
    );
  };

  if (authLoading || profileLoading) {
    return (
      <section className="business-profile-page">
        <div className="alert alert-info">Loading business profile...</div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="business-profile-page">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="mb-2">Business Profile</h1>
            <p className="text-muted">
              Please log in to set up your company profile.
            </p>

            <div className="d-flex gap-2 flex-wrap">
              <Link to="/login" className="btn btn-primary">
                Log in
              </Link>

              <Link to="/register" className="btn btn-outline-primary">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="business-profile-page">
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h1 className="mb-1">Business Profile</h1>
          <p className="text-muted mb-0">
            Save your company details and use them automatically in job reports.
          </p>

          {profile?.company_id ? (
            <p className="small text-success fw-semibold mt-2 mb-0">
              Company connected to your admin profile.
            </p>
          ) : (
            <p className="small text-warning fw-semibold mt-2 mb-0">
              No company connected yet. Saving this form will create one.
            </p>
          )}
        </div>

        <div className="business-profile-actions d-flex gap-2 flex-wrap">
          <button
            className="btn btn-outline-danger"
            onClick={handleClearProfile}
            disabled={loading}
          >
            Clear Form
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSaveProfile}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card shadow-sm business-profile-card">
            <div className="card-body">
              <h2 className="h4 mb-4">Company details</h2>

              <div className="mb-3">
                <label htmlFor="businessName" className="form-label">
                  Business name
                </label>
                <input
                  id="businessName"
                  type="text"
                  className="form-control"
                  name="businessName"
                  value={businessProfile.businessName}
                  onChange={handleChange}
                  placeholder="Example: CleanPro Melbourne"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="businessEmail" className="form-label">
                  Business email
                </label>
                <input
                  id="businessEmail"
                  type="email"
                  className="form-control"
                  name="businessEmail"
                  value={businessProfile.businessEmail}
                  onChange={handleChange}
                  placeholder="Example: hello@cleanpro.com.au"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="businessPhone" className="form-label">
                  Business phone
                </label>
                <input
                  id="businessPhone"
                  type="text"
                  className="form-control"
                  name="businessPhone"
                  value={businessProfile.businessPhone}
                  onChange={handleChange}
                  placeholder="Example: 0400 000 000"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="defaultWorkerName" className="form-label">
                  Your display name
                </label>
                <input
                  id="defaultWorkerName"
                  type="text"
                  className="form-control"
                  name="defaultWorkerName"
                  value={businessProfile.defaultWorkerName}
                  onChange={handleChange}
                  placeholder="Example: Cristian Castillo"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="businessLogo" className="form-label">
                  Business logo
                </label>
                <input
                  id="businessLogo"
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <small className="text-muted d-block mt-2">
                  Recommended: square PNG or JPG logo.
                </small>
              </div>

              {businessProfile.businessLogo && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={handleRemoveLogo}
                  disabled={loading}
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm business-profile-card">
            <div className="card-body">
              <h2 className="h4 mb-4">Profile preview</h2>

              <div className="business-profile-preview">
                <div className="business-profile-logo-wrapper mb-3">
                  {businessProfile.businessLogo ? (
                    <img
                      src={businessProfile.businessLogo}
                      alt="Business logo"
                      className="business-logo-preview"
                    />
                  ) : (
                    <div className="business-logo-placeholder">
                      No logo uploaded
                    </div>
                  )}
                </div>

                <h3 className="h5 fw-bold mb-2">
                  {businessProfile.businessName || "Your Business Name"}
                </h3>

                <div className="business-profile-preview-details">
                  <p className="text-muted mb-1">
                    {businessProfile.businessEmail || "business@email.com"}
                  </p>

                  <p className="text-muted mb-1">
                    {businessProfile.businessPhone || "Business phone"}
                  </p>

                  <p className="text-muted mb-0">
                    Display name:{" "}
                    <strong>
                      {businessProfile.defaultWorkerName || "Your name"}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-info mt-4">
            These details will be saved to your Supabase company profile and
            used to pre-fill new reports.
          </div>
        </div>
      </div>

      <div className="mobile-business-profile-actions">
        <button
          className="btn btn-primary mobile-action-button"
          onClick={handleSaveProfile}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </section>
  );
};

export default BusinessProfile;
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const BUSINESS_PROFILE_KEY = "jobproofBusinessProfile";
const BUSINESS_LOGOS_BUCKET = "business-logos";

const emptyBusinessProfile = {
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessLogo: "",
  workerName: "",
};

const getLocalBusinessProfile = () => {
  try {
    return (
      JSON.parse(localStorage.getItem(BUSINESS_PROFILE_KEY)) ||
      emptyBusinessProfile
    );
  } catch (error) {
    console.error("Error reading business profile from localStorage:", error);
    return emptyBusinessProfile;
  }
};

const BusinessProfile = () => {
  const { user, profile, profileLoading, fetchProfile } = useAuth();

  const [businessProfile, setBusinessProfile] = useState(emptyBusinessProfile);
  const [companyId, setCompanyId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    const loadBusinessProfile = async () => {
      if (profileLoading) return;

      setLoadingProfile(true);
      setMessage(null);

      try {
        const localProfile = getLocalBusinessProfile();

        setBusinessProfile({
          ...emptyBusinessProfile,
          ...localProfile,
          workerName: profile?.full_name || localProfile.workerName || "",
        });

        setLogoPreview(localProfile.businessLogo || "");

        if (!user?.id || !profile?.company_id) {
          setCompanyId(null);
          setLoadingProfile(false);
          return;
        }

        const { data, error } = await supabase
          .from("companies")
          .select(
            "id, business_name, business_email, business_phone, business_logo_url"
          )
          .eq("id", profile.company_id)
          .single();

        if (error) {
          throw error;
        }

        const loadedProfile = {
          businessName: data.business_name || "",
          businessEmail: data.business_email || "",
          businessPhone: data.business_phone || "",
          businessLogo: data.business_logo_url || "",
          workerName: profile?.full_name || "",
        };

        setCompanyId(data.id);
        setBusinessProfile(loadedProfile);
        setLogoPreview(data.business_logo_url || "");

        localStorage.setItem(
          BUSINESS_PROFILE_KEY,
          JSON.stringify(loadedProfile)
        );
      } catch (error) {
        console.error("Error loading business profile:", error);

        setMessage({
          type: "danger",
          text: error.message || "There was an error loading your business profile.",
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    loadBusinessProfile();
  }, [user, profile, profileLoading]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setBusinessProfile((currentProfile) => ({
      ...currentProfile,
      [name]: value,
    }));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadBusinessLogo = async (currentCompanyId) => {
    if (!logoFile) {
      return businessProfile.businessLogo || "";
    }

    const fileExtension =
      logoFile.name?.split(".").pop()?.toLowerCase() || "jpg";

    const filePath = `${currentCompanyId}/business-logo-${Date.now()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUSINESS_LOGOS_BUCKET)
      .upload(filePath, logoFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: logoFile.type || "image/jpeg",
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(BUSINESS_LOGOS_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const saveLocalProfile = (profileToSave) => {
    localStorage.setItem(BUSINESS_PROFILE_KEY, JSON.stringify(profileToSave));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      showMessage(
        "warning",
        "Only company admins can update the Business Profile."
      );
      return;
    }

    if (!user?.id) {
      showMessage("warning", "Please log in before saving your profile.");
      return;
    }

    if (!businessProfile.businessName.trim()) {
      showMessage("warning", "Please enter your business name.");
      return;
    }

    setSavingProfile(true);
    setMessage(null);

    try {
      let currentCompanyId = companyId || profile?.company_id || null;
      let logoUrl = businessProfile.businessLogo || "";

      if (!currentCompanyId) {
        const { data: newCompany, error: companyInsertError } = await supabase
          .from("companies")
          .insert({
            owner_id: user.id,
            business_name: businessProfile.businessName,
            business_email: businessProfile.businessEmail,
            business_phone: businessProfile.businessPhone,
            business_logo_url: "",
          })
          .select("id")
          .single();

        if (companyInsertError) {
          throw companyInsertError;
        }

        currentCompanyId = newCompany.id;
      }

      logoUrl = await uploadBusinessLogo(currentCompanyId);

      const { error: companyUpdateError } = await supabase
        .from("companies")
        .update({
          business_name: businessProfile.businessName,
          business_email: businessProfile.businessEmail,
          business_phone: businessProfile.businessPhone,
          business_logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentCompanyId);

      if (companyUpdateError) {
        throw companyUpdateError;
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          company_id: currentCompanyId,
          full_name:
            businessProfile.workerName.trim() ||
            profile?.full_name ||
            user.email?.split("@")[0] ||
            "User",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      const savedProfile = {
        ...businessProfile,
        businessLogo: logoUrl,
        workerName:
          businessProfile.workerName.trim() ||
          profile?.full_name ||
          user.email?.split("@")[0] ||
          "User",
      };

      setCompanyId(currentCompanyId);
      setBusinessProfile(savedProfile);
      setLogoPreview(logoUrl);
      setLogoFile(null);
      saveLocalProfile(savedProfile);

      await fetchProfile(user);

      showMessage(
        "success",
        "Business Profile saved successfully. Your reports will now use this company information automatically."
      );
    } catch (error) {
      console.error("Error saving business profile:", error);

      showMessage(
        "danger",
        error.message ||
          "There was an error saving the business profile. Please try again."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleClearProfile = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear this form? This will only clear the current form and local copy, not the company saved in Supabase."
    );

    if (!confirmClear) return;

    setBusinessProfile(emptyBusinessProfile);
    setLogoFile(null);
    setLogoPreview("");
    localStorage.removeItem(BUSINESS_PROFILE_KEY);
    setMessage(null);
  };

  if (profileLoading || loadingProfile) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading business profile</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof loads your company information.
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Business Profile</p>

            <h1 className="h3 mb-3">Log in required</h1>

            <p className="text-muted mb-4">
              Please log in before setting up your company profile.
            </p>

            <div className="d-flex justify-content-center gap-2 flex-wrap">
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

  if (profile && !isAdmin) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Restricted area</p>

            <h1 className="h3 mb-3">Admin access required</h1>

            <p className="text-muted mb-4">
              Only company admins can update the Business Profile. Your account
              can still create and manage job reports based on your role.
            </p>

            <Link to="/reports" className="btn btn-primary">
              Back to Reports
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">Company setup</p>

          <h1 className="section-title mb-2">Business Profile</h1>

          <p className="section-subtitle mb-0">
            Save your company details once. JobProof will add them automatically
            to every report.
          </p>
        </div>

        <div className="desktop-report-actions d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>

          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={handleClearProfile}
            disabled={savingProfile}
          >
            Clear Form
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      {!companyId && (
        <div className="alert alert-warning" role="alert">
          <strong>No company connected yet.</strong> Saving this form will create
          one and connect it to your admin profile.
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <form className="card shadow-sm border-0" onSubmit={handleSaveProfile}>
            <div className="card-body p-4">
              <h2 className="h4 mb-4">Company information</h2>

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
                  placeholder="Example: CleanPro Services"
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
                  placeholder="Example: admin@cleanpro.com.au"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="businessPhone" className="form-label">
                  Business phone
                </label>

                <input
                  id="businessPhone"
                  type="tel"
                  className="form-control"
                  name="businessPhone"
                  value={businessProfile.businessPhone}
                  onChange={handleChange}
                  placeholder="Example: 0400 000 000"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="workerName" className="form-label">
                  Your display name
                </label>

                <input
                  id="workerName"
                  type="text"
                  className="form-control"
                  name="workerName"
                  value={businessProfile.workerName}
                  onChange={handleChange}
                  placeholder="Example: Cristian Castillo"
                />

                <small className="text-muted">
                  This name will appear as the person completing reports.
                </small>
              </div>

              <div className="mb-4">
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

                <small className="text-muted">
                  Upload a clean PNG or JPG logo for better PDF branding.
                </small>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={handleClearProfile}
                  disabled={savingProfile}
                >
                  Clear Form
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h4 mb-4">Profile preview</h2>

              <div className="business-profile-preview">
                <div className="business-logo-preview mb-3">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Business logo preview"
                      className="img-fluid rounded"
                    />
                  ) : (
                    <div className="business-logo-placeholder">
                      <span>No logo</span>
                    </div>
                  )}
                </div>

                <h3 className="h5 mb-2">
                  {businessProfile.businessName || "Your business name"}
                </h3>

                <p className="text-muted mb-2">
                  {businessProfile.businessEmail || "business@email.com"}
                </p>

                <p className="text-muted mb-2">
                  {businessProfile.businessPhone || "Business phone"}
                </p>

                <hr />

                <p className="mb-1">
                  <strong>Reports completed by:</strong>
                </p>

                <p className="text-muted mb-0">
                  {businessProfile.workerName || "Your display name"}
                </p>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 mt-4">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">How this works</h2>

              <p className="text-muted mb-3">
                This profile is used as your company source of truth. New reports
                automatically include your business name, contact details and
                logo.
              </p>

              <ul className="text-muted mb-0">
                <li>Admins can update this profile.</li>
                <li>Workers use these details automatically.</li>
                <li>PDF reports stay consistent across the company.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mobile-report-action-bar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSaveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={handleClearProfile}
          disabled={savingProfile}
        >
          Clear
        </button>
      </div>
    </section>
  );
};

export default BusinessProfile;
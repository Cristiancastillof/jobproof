import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabaseClient";

const BUSINESS_LOGOS_BUCKET = "business-logos";

const createEmptyForm = () => ({
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessLogoUrl: "",
  displayName: "",
});

const BusinessProfile = () => {
  const { user, profile, displayName, displayRole, profileLoading, fetchProfile } =
    useAuth();

  const [formData, setFormData] = useState(createEmptyForm);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState(null);

  const isAdmin = profile?.role === "admin";
  const hasCompany = Boolean(profile?.company_id);

  useEffect(() => {
    const loadBusinessProfile = async () => {
      if (profileLoading) return;

      if (!user?.id) {
        setLoadingProfile(false);
        return;
      }

      if (!isAdmin) {
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      setMessage(null);
      setLogoFile(null);
      setLogoPreview("");

      try {
        if (!profile?.company_id) {
          const cleanForm = {
            ...createEmptyForm(),
            displayName: profile?.full_name || displayName || "",
          };

          setFormData(cleanForm);
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

        setFormData({
          businessName: data?.business_name || "",
          businessEmail: data?.business_email || "",
          businessPhone: data?.business_phone || "",
          businessLogoUrl: data?.business_logo_url || "",
          displayName: profile?.full_name || displayName || "",
        });

        setLogoPreview(data?.business_logo_url || "");
      } catch (error) {
        console.error("Error loading business profile:", error);

        setMessage({
          type: "danger",
          text:
            error.message ||
            "There was an error loading your Business Profile.",
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    loadBusinessProfile();
  }, [user, profile, profileLoading, displayName, isAdmin]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const getFileExtension = (file) => {
    const extension = file.name?.split(".").pop();

    if (extension && extension.length <= 5) {
      return extension.toLowerCase();
    }

    if (file.type === "image/png") return "png";
    if (file.type === "image/webp") return "webp";

    return "jpg";
  };

  const uploadLogo = async (companyId) => {
    if (!logoFile) {
      return formData.businessLogoUrl || "";
    }

    const extension = getFileExtension(logoFile);
    const filePath = `${companyId}/business-logo-${Date.now()}.${extension}`;

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

  const validateForm = () => {
    if (!formData.businessName.trim()) {
      return "Please enter your business name.";
    }

    if (!formData.displayName.trim()) {
      return "Please enter your display name.";
    }

    return null;
  };

  const handleSaveProfile = async () => {
    const validationError = validateForm();

    if (validationError) {
      setMessage({
        type: "warning",
        text: validationError,
      });
      return;
    }

    if (!user?.id || !profile?.id) {
      setMessage({
        type: "danger",
        text: "Your user profile is not ready yet. Please log in again.",
      });
      return;
    }

    setSavingProfile(true);
    setMessage(null);

    try {
      let companyId = profile.company_id;

      if (!companyId) {
        const { data: createdCompany, error: createError } = await supabase
          .from("companies")
          .insert({
            business_name: formData.businessName.trim(),
            business_email: formData.businessEmail.trim(),
            business_phone: formData.businessPhone.trim(),
            business_logo_url: "",
            owner_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createError) {
          throw createError;
        }

        companyId = createdCompany.id;
      }

      const logoUrl = await uploadLogo(companyId);

      const { error: companyError } = await supabase
        .from("companies")
        .update({
          business_name: formData.businessName.trim(),
          business_email: formData.businessEmail.trim(),
          business_phone: formData.businessPhone.trim(),
          business_logo_url: logoUrl,
          owner_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", companyId);

      if (companyError) {
        throw companyError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          company_id: companyId,
          full_name: formData.displayName.trim(),
          email: profile.email || user.email,
          role: "admin",
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      setFormData((currentForm) => ({
        ...currentForm,
        businessLogoUrl: logoUrl,
      }));

      setLogoPreview(logoUrl);
      setLogoFile(null);

      if (fetchProfile) {
        await fetchProfile(user);
      }

      setMessage({
        type: "success",
        text: "Business Profile saved successfully.",
      });
    } catch (error) {
      console.error("Error saving business profile:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error saving your Business Profile. Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleClearForm = () => {
    const confirmClear = window.confirm(
      "Clear the current form? This will not delete a saved company from Supabase."
    );

    if (!confirmClear) return;

    setFormData({
      ...createEmptyForm(),
      displayName: profile?.full_name || displayName || "",
    });

    setLogoFile(null);
    setLogoPreview("");
    setMessage(null);
  };

  if (profileLoading || loadingProfile) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading Business Profile</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof prepares your company setup.
        </p>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Restricted area</p>

            <h1 className="h3 mb-3">Admin access required</h1>

            <p className="text-muted mb-4">
              Only company admins can manage the Business Profile. Your current
              role is {displayRole}.
            </p>

            <Link to="/" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">Company setup</p>

          <h1 className="section-title mb-2">Business Profile</h1>

          <p className="section-subtitle mb-0">
            Save your company details once. JobProof will add them automatically
            to every report.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
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
            onClick={handleClearForm}
            disabled={savingProfile}
          >
            Clear Form
          </button>
        </div>
      </div>

      {!hasCompany && (
        <div className="alert alert-warning" role="alert">
          <strong>No company connected yet.</strong> Saving this form will
          create one and connect it to your admin profile.
        </div>
      )}

      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h4 mb-4">Company information</h2>

              <div className="mb-3">
                <label htmlFor="businessName" className="form-label">
                  Business name
                </label>

                <input
                  id="businessName"
                  type="text"
                  name="businessName"
                  className="form-control"
                  value={formData.businessName}
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
                  name="businessEmail"
                  className="form-control"
                  value={formData.businessEmail}
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
                  type="text"
                  name="businessPhone"
                  className="form-control"
                  value={formData.businessPhone}
                  onChange={handleChange}
                  placeholder="Example: 0400 000 000"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="displayName" className="form-label">
                  Your display name
                </label>

                <input
                  id="displayName"
                  type="text"
                  name="displayName"
                  className="form-control"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Example: Alex Morgan"
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
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleLogoChange}
                />

                <small className="text-muted">
                  Upload a clean PNG or JPG logo for better PDF branding.
                </small>
              </div>

              <div className="d-flex gap-2 flex-wrap">
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
                  onClick={handleClearForm}
                  disabled={savingProfile}
                >
                  Clear Form
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-4">
              <h2 className="h4 mb-4">Profile preview</h2>

              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Business logo preview"
                  className="business-profile-logo-preview mb-3"
                />
              ) : (
                <div className="business-profile-logo-placeholder mb-3">
                  No logo
                </div>
              )}

              <h3 className="h5 mb-2">
                {formData.businessName || "Your business name"}
              </h3>

              <p className="text-muted mb-2">
                {formData.businessEmail || "business@email.com"}
              </p>

              <p className="text-muted mb-4">
                {formData.businessPhone || "Business phone"}
              </p>

              <hr />

              <p className="fw-bold mb-2">Reports completed by:</p>

              <p className="text-muted mb-0">
                {formData.displayName || "Your display name"}
              </p>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">How this works</h2>

              <p className="text-muted">
                This profile is used as your company source of truth. New
                reports automatically include your business name, contact details
                and logo.
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
    </section>
  );
};

export default BusinessProfile; 

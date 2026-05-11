import { useEffect, useState } from "react";

const initialBusinessProfile = {
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  defaultWorkerName: "",
  businessLogo: "",
};

const BusinessProfile = () => {
  const [businessProfile, setBusinessProfile] = useState(initialBusinessProfile);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedProfile =
      JSON.parse(localStorage.getItem("jobproofBusinessProfile")) || null;

    if (savedProfile) {
      setBusinessProfile({
        ...initialBusinessProfile,
        ...savedProfile,
      });
    }
  }, []);

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

    const reader = new FileReader();

    reader.onload = () => {
      setBusinessProfile({
        ...businessProfile,
        businessLogo: reader.result,
      });
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setBusinessProfile({
      ...businessProfile,
      businessLogo: "",
    });
  };

  const handleSaveProfile = () => {
    localStorage.setItem(
      "jobproofBusinessProfile",
      JSON.stringify(businessProfile)
    );

    setMessage("Business profile saved successfully.");

    setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  const handleClearProfile = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear this business profile?"
    );

    if (!confirmClear) return;

    localStorage.removeItem("jobproofBusinessProfile");
    setBusinessProfile(initialBusinessProfile);
    setMessage("Business profile cleared.");

    setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  return (
    <section className="business-profile-page">
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h1 className="mb-1">Business Profile</h1>
          <p className="text-muted mb-0">
            Save your business details and use them automatically in reports.
          </p>
        </div>

        <div className="business-profile-actions d-flex gap-2 flex-wrap">
          <button
            className="btn btn-outline-danger"
            onClick={handleClearProfile}
          >
            Clear Profile
          </button>

          <button className="btn btn-primary" onClick={handleSaveProfile}>
            Save Profile
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card shadow-sm business-profile-card">
            <div className="card-body">
              <h2 className="h4 mb-4">Business details</h2>

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
                  Default worker name
                </label>
                <input
                  id="defaultWorkerName"
                  type="text"
                  className="form-control"
                  name="defaultWorkerName"
                  value={businessProfile.defaultWorkerName}
                  onChange={handleChange}
                  placeholder="Example: Cris Castillo"
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
                    Default worker:{" "}
                    <strong>
                      {businessProfile.defaultWorkerName || "Worker name"}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-info mt-4">
            These details will be used to pre-fill new reports and improve the
            PDF header.
          </div>
        </div>
      </div>

      <div className="mobile-business-profile-actions">
        <button className="btn btn-primary mobile-action-button" onClick={handleSaveProfile}>
          Save Profile
        </button>
      </div>
    </section>
  );
};

export default BusinessProfile;
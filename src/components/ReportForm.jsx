import { calculateTotalHours } from "../utils/calculateTotalHours";

const ReportForm = ({ reportData, setReportData }) => {
  const totalHours =
    reportData.totalHours ||
    calculateTotalHours(reportData.startingHour, reportData.finishHour);

  const handleChange = (event) => {
    const { name, value } = event.target;

    const updatedReportData = {
      ...reportData,
      [name]: value,
    };

    if (name === "startingHour" || name === "finishHour") {
      updatedReportData.totalHours = calculateTotalHours(
        name === "startingHour" ? value : reportData.startingHour,
        name === "finishHour" ? value : reportData.finishHour
      );
    }

    setReportData(updatedReportData);
  };

  const handleBusinessLogoChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setReportData({
        ...reportData,
        businessLogo: reader.result,
      });
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveBusinessLogo = () => {
    setReportData({
      ...reportData,
      businessLogo: "",
    });
  };

  const handlePhotoUpload = (event, photoType) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    const readers = files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();

          reader.onload = () => {
            resolve(reader.result);
          };

          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((uploadedPhotos) => {
      setReportData({
        ...reportData,
        [photoType]: [...(reportData[photoType] || []), ...uploadedPhotos],
      });
    });

    event.target.value = "";
  };

  const handleRemovePhoto = (photoType, photoIndex) => {
    const updatedPhotos = reportData[photoType].filter(
      (_, index) => index !== photoIndex
    );

    setReportData({
      ...reportData,
      [photoType]: updatedPhotos,
    });
  };

  const renderPhotoUploader = (title, photoType, inputId) => {
    const photos = reportData[photoType] || [];

    return (
      <div className="mb-4">
        <label className="form-label">{title}</label>

        <div className="photo-action-grid">
          <div>
            <label
              htmlFor={`${inputId}Camera`}
              className="btn btn-primary w-100"
            >
              Take photo
            </label>

            <input
              id={`${inputId}Camera`}
              type="file"
              className="visually-hidden"
              accept="image/*"
              capture="environment"
              onChange={(event) => handlePhotoUpload(event, photoType)}
            />
          </div>

          <div>
            <label
              htmlFor={`${inputId}Gallery`}
              className="btn btn-outline-primary w-100"
            >
              Upload from gallery
            </label>

            <input
              id={`${inputId}Gallery`}
              type="file"
              className="visually-hidden"
              accept="image/*"
              multiple
              onChange={(event) => handlePhotoUpload(event, photoType)}
            />
          </div>
        </div>

        <small className="text-muted d-block mt-2">
          On mobile, Take photo opens the camera. You can add more photos one by
          one.
        </small>

        {photos.length === 0 ? (
          <p className="text-muted small mt-2 mb-0">No photos uploaded yet.</p>
        ) : (
          <div className="row g-2 mt-2">
            {photos.map((photo, index) => (
              <div className="col-6" key={`${photoType}-${index}`}>
                <div className="border rounded p-2 bg-light">
                  <img
                    src={photo}
                    alt={`${title} ${index + 1}`}
                    className="img-fluid rounded mb-2 report-photo"
                  />

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger w-100"
                    onClick={() => handleRemovePhoto(photoType, index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h2 className="h4 mb-4">Report information</h2>

        <div className="mb-4">
          <h3 className="h5 mb-3">Business details</h3>

          <div className="mb-3">
            <label htmlFor="businessName" className="form-label">
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              className="form-control"
              name="businessName"
              value={reportData.businessName}
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
              value={reportData.businessEmail}
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
              value={reportData.businessPhone}
              onChange={handleChange}
              placeholder="Example: 0400 000 000"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="workerName" className="form-label">
              Worker name
            </label>
            <input
              id="workerName"
              type="text"
              className="form-control"
              name="workerName"
              value={reportData.workerName}
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
              onChange={handleBusinessLogoChange}
            />
          </div>

          {reportData.businessLogo && (
            <div className="border rounded p-3 bg-light mb-3">
              <p className="small text-muted mb-2">Current logo</p>

              <img
                src={reportData.businessLogo}
                alt="Business logo"
                className="business-logo-preview mb-3"
              />

              <button
                type="button"
                className="btn btn-sm btn-outline-danger d-block"
                onClick={handleRemoveBusinessLogo}
              >
                Remove logo
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <h3 className="h5 mb-3">Client and job details</h3>

          <div className="mb-3">
            <label htmlFor="clientName" className="form-label">
              Client name
            </label>
            <input
              id="clientName"
              type="text"
              className="form-control"
              name="clientName"
              value={reportData.clientName}
              onChange={handleChange}
              placeholder="Example: John Smith"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="jobAddress" className="form-label">
              Job address
            </label>
            <input
              id="jobAddress"
              type="text"
              className="form-control"
              name="jobAddress"
              value={reportData.jobAddress}
              onChange={handleChange}
              placeholder="Example: 123 Collins Street, Melbourne"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="jobDate" className="form-label">
              Job date
            </label>
            <input
              id="jobDate"
              type="date"
              className="form-control"
              name="jobDate"
              value={reportData.jobDate}
              onChange={handleChange}
            />
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="startingHour" className="form-label">
                Starting hour
              </label>
              <input
                id="startingHour"
                type="time"
                className="form-control"
                name="startingHour"
                value={reportData.startingHour}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="finishHour" className="form-label">
                Finish hour
              </label>
              <input
                id="finishHour"
                type="time"
                className="form-control"
                name="finishHour"
                value={reportData.finishHour}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="totalHours" className="form-label">
              Total hours
            </label>
            <input
              id="totalHours"
              type="text"
              className="form-control"
              name="totalHours"
              value={totalHours}
              readOnly
              placeholder="Calculated automatically"
            />
          </div>

          <div className="mt-3">
            <label htmlFor="serviceType" className="form-label">
              Service type
            </label>
            <input
              id="serviceType"
              type="text"
              className="form-control"
              name="serviceType"
              value={reportData.serviceType}
              onChange={handleChange}
              placeholder="Example: End of lease cleaning"
            />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="h5 mb-3">Work notes</h3>

          <div className="mb-3">
            <label htmlFor="workCompleted" className="form-label">
              Work completed
            </label>
            <textarea
              id="workCompleted"
              className="form-control"
              rows="4"
              name="workCompleted"
              value={reportData.workCompleted}
              onChange={handleChange}
              placeholder="Describe the work completed..."
            />
          </div>

          <div className="mb-3">
            <label htmlFor="issuesFound" className="form-label">
              Issues found
            </label>
            <textarea
              id="issuesFound"
              className="form-control"
              rows="3"
              name="issuesFound"
              value={reportData.issuesFound}
              onChange={handleChange}
              placeholder="Describe any issues found..."
            />
          </div>

          <div className="mb-3">
            <label htmlFor="recommendations" className="form-label">
              Recommendations
            </label>
            <textarea
              id="recommendations"
              className="form-control"
              rows="3"
              name="recommendations"
              value={reportData.recommendations}
              onChange={handleChange}
              placeholder="Add recommendations for the client..."
            />
          </div>
        </div>

        <div>
          <h3 className="h5 mb-3">Photos</h3>

          {renderPhotoUploader("Before photos", "beforePhotos", "beforePhotos")}
          {renderPhotoUploader("After photos", "afterPhotos", "afterPhotos")}
        </div>
      </div>
    </div>
  );
};

export default ReportForm;
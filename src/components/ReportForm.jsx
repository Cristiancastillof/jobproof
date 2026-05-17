import { calculateTotalHours } from "../utils/calculateTotalHours";

const ReportForm = ({
  reportData,
  setReportData,
  photoFiles,
  setPhotoFiles,
  teamMembers = [],
  selectedWorkerIds = [],
  setSelectedWorkerIds,
  statusOptions = [],
  clients = [],
  onSelectClient,
}) => {
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

    if (name === "clientName") {
      updatedReportData.clientDisplayName = value;
    }

    if (name === "jobAddress") {
      updatedReportData.clientAddressSnapshot = value;
    }

    setReportData(updatedReportData);
  };

  const handleClientSelectChange = (event) => {
    if (onSelectClient) {
      onSelectClient(event.target.value);
    }
  };

  const handleWorkerToggle = (workerId) => {
    if (!setSelectedWorkerIds) return;

    setSelectedWorkerIds((currentWorkerIds) => {
      if (currentWorkerIds.includes(workerId)) {
        return currentWorkerIds.filter((id) => id !== workerId);
      }

      return [...currentWorkerIds, workerId];
    });
  };

  const readFileAsDataUrl = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve({
          file,
          previewUrl: reader.result,
        });
      };

      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (event, photoType) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    const uploadedPhotos = await Promise.all(files.map(readFileAsDataUrl));
    const previewUrls = uploadedPhotos.map((photo) => photo.previewUrl);

    setReportData({
      ...reportData,
      [photoType]: [...(reportData[photoType] || []), ...previewUrls],
    });

    if (setPhotoFiles) {
      setPhotoFiles((currentPhotoFiles) => ({
        ...currentPhotoFiles,
        [photoType]: [
          ...(currentPhotoFiles[photoType] || []),
          ...uploadedPhotos,
        ],
      }));
    }

    event.target.value = "";
  };

  const handleRemovePhoto = (photoType, photoIndex) => {
    const photoToRemove = reportData[photoType][photoIndex];

    const updatedPhotos = reportData[photoType].filter(
      (_, index) => index !== photoIndex
    );

    setReportData({
      ...reportData,
      [photoType]: updatedPhotos,
    });

    if (setPhotoFiles) {
      setPhotoFiles((currentPhotoFiles) => ({
        ...currentPhotoFiles,
        [photoType]: (currentPhotoFiles[photoType] || []).filter(
          (photo) => photo.previewUrl !== photoToRemove
        ),
      }));
    }
  };

  const selectedStatusHelper =
    statusOptions.find((option) => option.value === reportData.status)?.helper ||
    "Select the current workflow status for this job.";

  const selectedClient = clients.find(
    (client) => client.id === reportData.clientId
  );

  const renderClientSelector = () => {
    return (
      <div className="mb-4">
        <h3 className="h5 mb-3">Client / Job site</h3>

        <div className="client-autofill-box">
          <label htmlFor="clientId" className="form-label">
            Search or select saved client
          </label>

          <select
            id="clientId"
            name="clientId"
            className="form-select"
            value={reportData.clientId || ""}
            onChange={handleClientSelectChange}
          >
            <option value="">Manual entry / no saved client</option>

            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.client_display_name}
                {client.job_address ? ` — ${client.job_address}` : ""}
              </option>
            ))}
          </select>

          <small className="text-muted d-block mt-2">
            Selecting a saved client will autofill the client name, address,
            contact details and default service type.
          </small>

          {selectedClient && (
            <div className="client-autofill-summary mt-3">
              <div>
                <span>Selected client</span>
                <strong>{selectedClient.client_display_name}</strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{selectedClient.email || "Not provided"}</strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>{selectedClient.phone || "Not provided"}</strong>
              </div>

              <div>
                <span>Access notes</span>
                <strong>{selectedClient.access_notes || "Not provided"}</strong>
              </div>
            </div>
          )}

          {clients.length === 0 && (
            <div className="alert alert-light border mt-3 mb-0">
              No saved clients yet. Admins and supervisors can create clients
              from the Clients page.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTeamSelector = () => {
    if (!teamMembers || teamMembers.length === 0) {
      return (
        <div className="mb-4">
          <h3 className="h5 mb-3">Team involved</h3>

          <div className="team-involved-empty">
            <p className="text-muted mb-0">
              No active team members were found. The report creator will still
              be recorded automatically.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h3 className="h5 mb-1">Team involved</h3>

            <p className="text-muted small mb-0">
              Select every person who participated in this job. The report
              creator is selected automatically.
            </p>
          </div>

          <span className="team-involved-count">
            {selectedWorkerIds.length} selected
          </span>
        </div>

        <div className="team-involved-grid">
          {teamMembers.map((member) => {
            const isSelected = selectedWorkerIds.includes(member.id);
            const isLead = reportData.createdBy === member.id;

            return (
              <button
                key={member.id}
                type="button"
                className={
                  isSelected
                    ? "team-involved-option selected"
                    : "team-involved-option"
                }
                onClick={() => handleWorkerToggle(member.id)}
              >
                <span className="team-involved-avatar">
                  {member.full_name?.charAt(0)?.toUpperCase() || "U"}
                </span>

                <span className="team-involved-text">
                  <strong>{member.full_name || "Unnamed user"}</strong>
                  <small>
                    {isLead ? "Lead / Report creator" : member.role || "worker"}
                  </small>
                </span>

                <span className="team-involved-check">
                  {isSelected ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
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
              <div className="col-6" key={`${photoType}-${index}-${photo}`}>
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
        <h2 className="h4 mb-4">Job report information</h2>

        <div className="alert alert-info">
          <strong>Company profile loaded automatically.</strong>
          <br />
          Reports will use{" "}
          <strong>{reportData.businessName || "your saved company"}</strong>
          {reportData.workerName ? (
            <>
              {" "}
              and will be marked as created by{" "}
              <strong>{reportData.workerName}</strong>.
            </>
          ) : (
            "."
          )}
        </div>

        {renderClientSelector()}

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
              placeholder="Example: Michael Turner"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="clientCompanyName" className="form-label">
              Client company
            </label>
            <input
              id="clientCompanyName"
              type="text"
              className="form-control"
              name="clientCompanyName"
              value={reportData.clientCompanyName}
              onChange={handleChange}
              placeholder="Example: Turner Property Group"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="clientContactPerson" className="form-label">
              Contact person
            </label>
            <input
              id="clientContactPerson"
              type="text"
              className="form-control"
              name="clientContactPerson"
              value={reportData.clientContactPerson}
              onChange={handleChange}
              placeholder="Example: Michael Turner"
            />
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="clientEmail" className="form-label">
                Client email
              </label>
              <input
                id="clientEmail"
                type="email"
                className="form-control"
                name="clientEmail"
                value={reportData.clientEmail}
                onChange={handleChange}
                placeholder="client@example.com"
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="clientPhone" className="form-label">
                Client phone
              </label>
              <input
                id="clientPhone"
                type="text"
                className="form-control"
                name="clientPhone"
                value={reportData.clientPhone}
                onChange={handleChange}
                placeholder="0400 000 000"
              />
            </div>
          </div>

          <div className="mt-3">
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
              placeholder="Example: 25 Collins Street, Melbourne VIC 3000"
            />
          </div>

          <div className="mt-3">
            <label htmlFor="clientAccessNotes" className="form-label">
              Access notes
            </label>
            <textarea
              id="clientAccessNotes"
              className="form-control"
              rows="3"
              name="clientAccessNotes"
              value={reportData.clientAccessNotes}
              onChange={handleChange}
              placeholder="Example: Key in lockbox. Parking available behind the building."
            />
          </div>

          <div className="mt-3">
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

          <div className="row g-3 mt-1">
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

          <div className="mt-3">
            <label htmlFor="status" className="form-label">
              Job status
            </label>

            <select
              id="status"
              name="status"
              className="form-select"
              value={reportData.status || "pending"}
              onChange={handleChange}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <small className="text-muted d-block mt-2">
              {selectedStatusHelper}
            </small>
          </div>
        </div>

        {renderTeamSelector()}

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
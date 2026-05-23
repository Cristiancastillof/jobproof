import { useEffect, useRef, useState } from "react";
import { calculateTotalHours } from "../utils/calculateTotalHours";

const MAX_PHOTOS_PER_GROUP = 6;
const MAX_ORIGINAL_FILE_SIZE_MB = 25;
const MAX_ORIGINAL_FILE_SIZE_BYTES = MAX_ORIGINAL_FILE_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_WIDTH_OR_HEIGHT = 1400;
const JPEG_QUALITY = 0.72;

const PhotoInputButton = ({
  inputId,
  label,
  disabled = false,
  multiple = true,
  onChange,
}) => {
  return (
    <div className="w-100">
      <label
        htmlFor={inputId}
        className={
          disabled
            ? "btn btn-outline-primary w-100 disabled"
            : "btn btn-outline-primary w-100"
        }
        style={{
          minHeight: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {label}
      </label>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        style={{ display: "none" }}
      />
    </div>
  );
};

const isProbablyImageFile = (file) => {
  if (!file) return false;

  if (file.type && file.type.startsWith("image/")) {
    return true;
  }

  const fileName = file.name || "";
  return /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(fileName);
};

const resizeImageFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!isProbablyImageFile(file)) {
      reject(new Error("Only image files are allowed."));
      return;
    }

    if (file.size > MAX_ORIGINAL_FILE_SIZE_BYTES) {
      reject(
        new Error(
          `${
            file.name || "This photo"
          } is too large. Maximum original size is ${MAX_ORIGINAL_FILE_SIZE_MB} MB.`
        )
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");

        let { width, height } = image;

        if (width > height && width > MAX_IMAGE_WIDTH_OR_HEIGHT) {
          height = Math.round((height * MAX_IMAGE_WIDTH_OR_HEIGHT) / width);
          width = MAX_IMAGE_WIDTH_OR_HEIGHT;
        } else if (height > MAX_IMAGE_WIDTH_OR_HEIGHT) {
          width = Math.round((width * MAX_IMAGE_WIDTH_OR_HEIGHT) / height);
          height = MAX_IMAGE_WIDTH_OR_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("There was an error preparing this image."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("There was an error compressing this image."));
              return;
            }

            const baseName =
              file.name && file.name.trim() !== ""
                ? file.name.replace(/\.[^/.]+$/, "")
                : `jobproof-photo-${Date.now()}`;

            const compressedFile = new File([blob], `${baseName}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            const previewUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

            resolve({
              file: compressedFile,
              previewUrl,
            });
          },
          "image/jpeg",
          JPEG_QUALITY
        );
      };

      image.onerror = () => {
        reject(
          new Error(
            "This image format could not be processed. Please try another photo or upload it from the gallery."
          )
        );
      };

      image.src = reader.result;
    };

    reader.onerror = () => {
      reject(new Error("There was an error reading this image."));
    };

    reader.readAsDataURL(file);
  });
};

const createFileFromCameraBlob = (blob) => {
  return new File([blob], `jobproof-camera-photo-${Date.now()}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};

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
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [activeCameraPhotoType, setActiveCameraPhotoType] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const totalHours =
    reportData.totalHours ||
    calculateTotalHours(reportData.startingHour, reportData.finishHour);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setActiveCameraPhotoType(null);
    setIsCameraLoading(false);
  };

  const addProcessedPhotosToState = ({ processedPhotos, photoType }) => {
    const previewUrls = processedPhotos.map((photo) => photo.previewUrl);

    setReportData((currentReportData) => ({
      ...currentReportData,
      [photoType]: [...(currentReportData[photoType] || []), ...previewUrls],
    }));

    if (setPhotoFiles) {
      setPhotoFiles((currentPhotoFiles) => ({
        ...currentPhotoFiles,
        [photoType]: [
          ...(currentPhotoFiles[photoType] || []),
          ...processedPhotos,
        ],
      }));
    }
  };

  const startCamera = async (photoType) => {
    const currentPhotos = reportData[photoType] || [];

    if (currentPhotos.length >= MAX_PHOTOS_PER_GROUP) {
      alert(`You can upload a maximum of ${MAX_PHOTOS_PER_GROUP} photos.`);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera is not available in this browser. Please use Add photo instead."
      );
      return;
    }

    setCameraError("");
    setIsCameraLoading(true);
    setActiveCameraPhotoType(photoType);

    try {
      stopCamera();

      setActiveCameraPhotoType(photoType);
      setIsCameraLoading(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      cameraStreamRef.current = stream;

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .catch(() => {
              setCameraError("Could not start camera preview.");
            });
        }

        setIsCameraLoading(false);
      }, 100);
    } catch (error) {
      console.error("Camera error:", error);

      setCameraError(
        "Camera permission was denied or the camera could not be opened. Please use Add photo instead."
      );

      stopCamera();
    }
  };

  const captureQuickPhoto = async () => {
    if (!videoRef.current || !activeCameraPhotoType) {
      setCameraError("Camera is not ready yet.");
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");

      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        setCameraError("Could not capture the photo.");
        return;
      }

      context.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setCameraError("Could not create the photo file.");
            return;
          }

          const file = createFileFromCameraBlob(blob);
          const processedPhoto = await resizeImageFile(file);

          addProcessedPhotosToState({
            processedPhotos: [processedPhoto],
            photoType: activeCameraPhotoType,
          });

          stopCamera();
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    } catch (error) {
      console.error("Capture photo error:", error);
      setCameraError(
        error.message || "There was an error capturing this photo."
      );
    }
  };

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

  const handlePhotoUpload = async (event, photoType) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const currentPhotos = reportData[photoType] || [];
    const availableSlots = MAX_PHOTOS_PER_GROUP - currentPhotos.length;

    if (availableSlots <= 0) {
      alert(`You can upload a maximum of ${MAX_PHOTOS_PER_GROUP} photos.`);
      event.target.value = "";
      return;
    }

    const filesToProcess = selectedFiles.slice(0, availableSlots);

    if (selectedFiles.length > availableSlots) {
      alert(
        `Only ${availableSlots} more photo${
          availableSlots === 1 ? "" : "s"
        } can be added. Maximum ${MAX_PHOTOS_PER_GROUP} photos allowed.`
      );
    }

    try {
      const processedPhotos = await Promise.all(
        filesToProcess.map((file) => resizeImageFile(file))
      );

      addProcessedPhotosToState({
        processedPhotos,
        photoType,
      });
    } catch (error) {
      console.error("Photo upload error:", error);
      alert(error.message || "There was an error uploading this photo.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemovePhoto = (photoType, photoIndex) => {
    const photoToRemove = reportData[photoType]?.[photoIndex];

    const updatedPhotos = (reportData[photoType] || []).filter(
      (_, index) => index !== photoIndex
    );

    setReportData((currentReportData) => ({
      ...currentReportData,
      [photoType]: updatedPhotos,
    }));

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

  const renderCameraPanel = (photoType) => {
    if (activeCameraPhotoType !== photoType) return null;

    return (
      <div
        className="mt-3"
        style={{
          borderRadius: "20px",
          overflow: "hidden",
          background: "#020617",
          border: "1px solid rgba(15, 23, 42, 0.12)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: "260px",
            background: "#020617",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "320px",
              objectFit: "cover",
              display: "block",
              background: "#020617",
            }}
          />

          {isCameraLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                background: "rgba(2, 6, 23, 0.65)",
                fontWeight: 800,
              }}
            >
              Opening camera...
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            padding: "12px",
            background: "#ffffff",
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={captureQuickPhoto}
            disabled={isCameraLoading}
          >
            Capture photo
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={stopCamera}
          >
            Close camera
          </button>
        </div>

        {cameraError && (
          <div className="alert alert-warning m-3" role="alert">
            {cameraError}
          </div>
        )}
      </div>
    );
  };

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
    const hasReachedLimit = photos.length >= MAX_PHOTOS_PER_GROUP;

    return (
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <label className="form-label mb-0">{title}</label>

          <small className="text-muted">
            {photos.length}/{MAX_PHOTOS_PER_GROUP} photos
          </small>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "10px",
            width: "100%",
          }}
        >
          <button
            type="button"
            className="btn btn-primary w-100"
            disabled={hasReachedLimit}
            onClick={() => startCamera(photoType)}
            style={{
              minHeight: "48px",
              fontWeight: 800,
            }}
          >
            Take quick photo
          </button>

          <PhotoInputButton
            inputId={`${inputId}AddPhoto`}
            label="Add from device"
            disabled={hasReachedLimit}
            multiple
            onChange={(event) => handlePhotoUpload(event, photoType)}
          />
        </div>

        {renderCameraPanel(photoType)}

        <small className="text-muted d-block mt-2">
          Use Take quick photo for camera capture, or Add from device for
          gallery/files. Max {MAX_ORIGINAL_FILE_SIZE_MB} MB per original photo.
        </small>

        {photos.length === 0 ? (
          <p className="text-muted small mt-2 mb-0">No photos uploaded yet.</p>
        ) : (
          <div
            className="mt-3"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "14px",
              width: "100%",
            }}
          >
            {photos.map((photo, index) => (
              <div
                key={`${photoType}-${index}`}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  overflow: "hidden",
                  borderRadius: "18px",
                  background: "#020617",
                  border: "1px solid rgba(15, 23, 42, 0.1)",
                }}
              >
                <img
                  src={photo}
                  alt={`${title} ${index + 1}`}
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: "100%",
                    height: "260px",
                    objectFit: "contain",
                    objectPosition: "center",
                    background: "#020617",
                  }}
                />

                <button
                  type="button"
                  className="btn btn-sm btn-danger w-100"
                  style={{
                    borderRadius: 0,
                  }}
                  onClick={() => handleRemovePhoto(photoType, index)}
                >
                  Remove
                </button>
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

        <div className="mb-4 internal-notes-box">
          <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h3 className="h5 mb-1">Internal team notes</h3>

              <p className="text-muted small mb-0">
                These notes are for your internal team. They are not shown in the
                public client view.
              </p>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="internalNotes" className="form-label">
              Internal notes
            </label>

            <textarea
              id="internalNotes"
              className="form-control"
              rows="3"
              name="internalNotes"
              value={reportData.internalNotes || ""}
              onChange={handleChange}
              placeholder="Internal notes for the team. Example: client requested extra service, access issue, invoice reminder..."
            />
          </div>

          <div className="mb-3">
            <label htmlFor="supervisorNotes" className="form-label">
              Supervisor notes
            </label>

            <textarea
              id="supervisorNotes"
              className="form-control"
              rows="3"
              name="supervisorNotes"
              value={reportData.supervisorNotes || ""}
              onChange={handleChange}
              placeholder="Supervisor review notes. Example: photos checked, quality approved, follow-up required..."
            />
          </div>

          <div>
            <label htmlFor="completionNotes" className="form-label">
              Completion notes
            </label>

            <textarea
              id="completionNotes"
              className="form-control"
              rows="3"
              name="completionNotes"
              value={reportData.completionNotes || ""}
              onChange={handleChange}
              placeholder="Completion notes. Example: completed with extra time, client notified, ready to invoice..."
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
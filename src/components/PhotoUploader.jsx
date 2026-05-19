const MAX_PHOTOS = 6;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_WIDTH_OR_HEIGHT = 1600;
const JPEG_QUALITY = 0.75;

const PhotoUploader = ({ label, name, photos = [], setReportData }) => {
  const resizeImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Only image files are allowed."));
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        reject(
          new Error(
            `${file.name} is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`
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

          context.drawImage(image, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL(
            "image/jpeg",
            JPEG_QUALITY
          );

          resolve(compressedBase64);
        };

        image.onerror = () => {
          reject(new Error("There was an error processing this image."));
        };

        image.src = reader.result;
      };

      reader.onerror = () => {
        reject(new Error("There was an error reading this image."));
      };

      reader.readAsDataURL(file);
    });
  };

  const handlePhotosChange = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) return;

    const availableSlots = MAX_PHOTOS - photos.length;

    if (availableSlots <= 0) {
      alert(`You can upload a maximum of ${MAX_PHOTOS} photos for ${label}.`);
      event.target.value = "";
      return;
    }

    const filesToProcess = selectedFiles.slice(0, availableSlots);

    if (selectedFiles.length > availableSlots) {
      alert(
        `Only ${availableSlots} more photo${
          availableSlots === 1 ? "" : "s"
        } can be added. Maximum ${MAX_PHOTOS} photos allowed.`
      );
    }

    try {
      const compressedPhotos = await Promise.all(
        filesToProcess.map((file) => resizeImageToBase64(file))
      );

      setReportData((prevData) => ({
        ...prevData,
        [name]: [...(prevData[name] || []), ...compressedPhotos],
      }));
    } catch (error) {
      alert(error.message || "There was an error uploading the photos.");
      console.error(error);
    } finally {
      event.target.value = "";
    }
  };

  const handleRemovePhoto = (photoToRemove) => {
    setReportData((prevData) => ({
      ...prevData,
      [name]: (prevData[name] || []).filter((photo) => photo !== photoToRemove),
    }));
  };

  return (
    <div className="mb-4 photo-uploader">
      <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
        <label className="form-label fw-semibold mb-0">{label}</label>

        <small className="text-muted">
          {photos.length}/{MAX_PHOTOS} photos
        </small>
      </div>

      <input
        type="file"
        className="form-control"
        accept="image/*"
        multiple
        onChange={handlePhotosChange}
        disabled={photos.length >= MAX_PHOTOS}
      />

      <small className="text-muted d-block mt-2">
        Max {MAX_FILE_SIZE_MB} MB per photo. Images are automatically resized
        for faster upload and cleaner reports.
      </small>

      {photos.length > 0 && (
        <div className="photo-preview-grid mt-3">
          {photos.map((photo, index) => (
            <div className="photo-preview-card" key={`${name}-${index}`}>
              <img
                src={photo}
                alt={`${label} ${index + 1}`}
                className="photo-preview-img"
              />

              <button
                type="button"
                className="btn btn-sm btn-danger photo-remove-btn"
                onClick={() => handleRemovePhoto(photo)}
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

export default PhotoUploader;
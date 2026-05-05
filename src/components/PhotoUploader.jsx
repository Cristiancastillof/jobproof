const PhotoUploader = ({ label, name, photos, setReportData }) => {
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };

      reader.readAsDataURL(file);
    });
  };

  const handlePhotosChange = async (event) => {
    const files = Array.from(event.target.files);

    try {
      const photoBase64List = await Promise.all(
        files.map((file) => convertFileToBase64(file))
      );

      setReportData((prevData) => ({
        ...prevData,
        [name]: [...prevData[name], ...photoBase64List],
      }));
    } catch (error) {
      alert("There was an error uploading the photos.");
      console.error(error);
    }
  };

  const handleRemovePhoto = (photoToRemove) => {
    setReportData((prevData) => ({
      ...prevData,
      [name]: prevData[name].filter((photo) => photo !== photoToRemove),
    }));
  };

  return (
    <div className="mb-4">
      <label className="form-label fw-semibold">{label}</label>

      <input
        type="file"
        className="form-control"
        accept="image/*"
        multiple
        onChange={handlePhotosChange}
      />

      {photos.length > 0 && (
        <div className="row g-2 mt-2">
          {photos.map((photo, index) => (
            <div className="col-6" key={`${photo.slice(0, 30)}-${index}`}>
              <div className="photo-thumb-wrapper">
                <img
                  src={photo}
                  alt={`${label} ${index + 1}`}
                  className="img-fluid rounded photo-thumb"
                />

                <button
                  type="button"
                  className="btn btn-sm btn-danger mt-1 w-100"
                  onClick={() => handleRemovePhoto(photo)}
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

export default PhotoUploader;
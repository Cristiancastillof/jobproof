import PhotoUploader from "./PhotoUploader";
import { calculateTotalHours } from "../utils/calculateTotalHours";

const ReportForm = ({ reportData, setReportData }) => {
  const handleChange = (event) => {
    const { name, value } = event.target;

    const updatedData = {
      ...reportData,
      [name]: value,
    };

    if (name === "startingHour" || name === "finishHour") {
      updatedData.totalHours = calculateTotalHours(
        updatedData.startingHour,
        updatedData.finishHour
      );
    }

    setReportData(updatedData);
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h2 className="h4 mb-4">Report details</h2>

        <div className="mb-3">
          <label className="form-label">Business name</label>
          <input
            type="text"
            className="form-control"
            name="businessName"
            value={reportData.businessName}
            onChange={handleChange}
            placeholder="Example: CleanPro Melbourne"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Client name</label>
          <input
            type="text"
            className="form-control"
            name="clientName"
            value={reportData.clientName}
            onChange={handleChange}
            placeholder="Example: John Smith"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Job address</label>
          <input
            type="text"
            className="form-control"
            name="jobAddress"
            value={reportData.jobAddress}
            onChange={handleChange}
            placeholder="Example: 25 Collins St, Melbourne"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Job date</label>
          <input
            type="date"
            className="form-control"
            name="jobDate"
            value={reportData.jobDate}
            onChange={handleChange}
          />
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Starting hour</label>
            <input
              type="time"
              className="form-control"
              name="startingHour"
              value={reportData.startingHour}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Finish hour</label>
            <input
              type="time"
              className="form-control"
              name="finishHour"
              value={reportData.finishHour}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="alert alert-light border mt-3">
          <strong>Total hours:</strong>{" "}
          {reportData.totalHours || "Add starting and finish hour"}
        </div>

        <div className="mb-3">
          <label className="form-label">Service type</label>
          <input
            type="text"
            className="form-control"
            name="serviceType"
            value={reportData.serviceType}
            onChange={handleChange}
            placeholder="Example: Airbnb cleaning"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Work completed</label>
          <textarea
            className="form-control"
            rows="4"
            name="workCompleted"
            value={reportData.workCompleted}
            onChange={handleChange}
            placeholder="Describe the work completed..."
          ></textarea>
        </div>

        <div className="mb-3">
          <label className="form-label">Issues found</label>
          <textarea
            className="form-control"
            rows="3"
            name="issuesFound"
            value={reportData.issuesFound}
            onChange={handleChange}
            placeholder="Example: Broken chair, missing supplies, damaged wall..."
          ></textarea>
        </div>

        <div className="mb-3">
          <label className="form-label">Recommendations</label>
          <textarea
            className="form-control"
            rows="3"
            name="recommendations"
            value={reportData.recommendations}
            onChange={handleChange}
            placeholder="Example: Replace broken chair, restock toilet paper..."
          ></textarea>
        </div>

        <PhotoUploader
          label="Before photos"
          name="beforePhotos"
          photos={reportData.beforePhotos}
          setReportData={setReportData}
        />

        <PhotoUploader
          label="After photos"
          name="afterPhotos"
          photos={reportData.afterPhotos}
          setReportData={setReportData}
        />
      </div>
    </div>
  );
};

export default ReportForm;
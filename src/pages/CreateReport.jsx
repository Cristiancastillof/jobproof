import { useState } from "react";
import ReportForm from "../components/ReportForm";
import ReportPreview from "../components/ReportPreview";
import { generatePDF } from "../utils/generatePDF";

const initialReportData = {
  businessName: "",
  clientName: "",
  jobAddress: "",
  jobDate: "",
  serviceType: "",
  workCompleted: "",
  issuesFound: "",
  recommendations: "",
  beforePhotos: [],
  afterPhotos: [],
};

const CreateReport = () => {
  const [reportData, setReportData] = useState(initialReportData);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });

    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const isReportValid = () => {
    return (
      reportData.businessName.trim() ||
      reportData.clientName.trim() ||
      reportData.jobAddress.trim() ||
      reportData.jobDate.trim() ||
      reportData.serviceType.trim() ||
      reportData.workCompleted.trim() ||
      reportData.issuesFound.trim() ||
      reportData.recommendations.trim() ||
      reportData.beforePhotos.length > 0 ||
      reportData.afterPhotos.length > 0
    );
  };

  const handleDownloadPDF = () => {
    if (!isReportValid()) {
      showMessage(
        "warning",
        "Please add at least one detail before downloading the PDF."
      );
      return;
    }

    const clientName = reportData.clientName || "client";
    const fileName = `${clientName}-job-report.pdf`;

    generatePDF("report-preview", fileName);
    showMessage("success", "PDF generated successfully.");
  };

  const handleClearForm = () => {
    setReportData(initialReportData);
    showMessage("info", "The form has been cleared.");
  };

  const handleSaveReport = () => {
    if (!isReportValid()) {
      showMessage(
        "warning",
        "Please add at least one detail before saving the report."
      );
      return;
    }

    const savedReports =
      JSON.parse(localStorage.getItem("jobproofReports")) || [];

    const newReport = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...reportData,
    };

    const updatedReports = [newReport, ...savedReports];

    localStorage.setItem("jobproofReports", JSON.stringify(updatedReports));

    showMessage("success", "Report saved successfully.");
  };

  const getAlertClass = () => {
    if (message.type === "success") return "alert alert-success";
    if (message.type === "warning") return "alert alert-warning";
    if (message.type === "info") return "alert alert-info";

    return "alert alert-secondary";
  };

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Create Job Report</h1>

        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-danger" onClick={handleClearForm}>
            Clear Form
          </button>

          <button className="btn btn-primary" onClick={handleSaveReport}>
            Save Report
          </button>

          <button className="btn btn-success" onClick={handleDownloadPDF}>
            Download PDF
          </button>
        </div>
      </div>

      {message.text && (
        <div className={getAlertClass()} role="alert">
          {message.text}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-5">
          <ReportForm reportData={reportData} setReportData={setReportData} />
        </div>

        <div className="col-lg-7">
          <ReportPreview reportData={reportData} />
        </div>
      </div>
    </section>
  );
};

export default CreateReport;
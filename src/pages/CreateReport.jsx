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

  const handleDownloadPDF = () => {
    const clientName = reportData.clientName || "client";
    const fileName = `${clientName}-job-report.pdf`;

    generatePDF("report-preview", fileName);
  };

  const handleClearForm = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear the current report?"
    );

    if (!confirmClear) return;

    setReportData(initialReportData);
  };

  const handleSaveReport = () => {
    const savedReports = JSON.parse(localStorage.getItem("jobproofReports")) || [];

    const newReport = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...reportData,
    };

    const updatedReports = [newReport, ...savedReports];

    localStorage.setItem("jobproofReports", JSON.stringify(updatedReports));

    alert("Report saved successfully.");
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
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReportForm from "../components/ReportForm";
import ReportPreview from "../components/ReportPreview";
import { generatePDF } from "../utils/generatePDF";
import { calculateTotalHours } from "../utils/calculateTotalHours";

const initialReportData = {
  businessName: "",
  clientName: "",
  jobAddress: "",
  jobDate: "",
  startingHour: "",
  finishHour: "",
  totalHours: "",
  serviceType: "",
  workCompleted: "",
  issuesFound: "",
  recommendations: "",
  beforePhotos: [],
  afterPhotos: [],
};

const CreateReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditMode = Boolean(id);

  const [reportData, setReportData] = useState(initialReportData);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  useEffect(() => {
    if (!isEditMode) return;

    const savedReports =
      JSON.parse(localStorage.getItem("jobproofReports")) || [];

    const reportToEdit = savedReports.find((report) => report.id === id);

    if (!reportToEdit) {
      setMessage({
        type: "warning",
        text: "Report not found. It may have been deleted.",
      });
      return;
    }

    setReportData({
      ...initialReportData,
      ...reportToEdit,
      totalHours:
        reportToEdit.totalHours ||
        calculateTotalHours(reportToEdit.startingHour, reportToEdit.finishHour),
      beforePhotos: reportToEdit.beforePhotos || [],
      afterPhotos: reportToEdit.afterPhotos || [],
    });
  }, [id, isEditMode]);

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
      reportData.startingHour.trim() ||
      reportData.finishHour.trim() ||
      reportData.serviceType.trim() ||
      reportData.workCompleted.trim() ||
      reportData.issuesFound.trim() ||
      reportData.recommendations.trim() ||
      reportData.beforePhotos.length > 0 ||
      reportData.afterPhotos.length > 0
    );
  };

  const prepareReportForSave = () => {
    return {
      ...reportData,
      totalHours: calculateTotalHours(
        reportData.startingHour,
        reportData.finishHour
      ),
      beforePhotos: reportData.beforePhotos || [],
      afterPhotos: reportData.afterPhotos || [],
    };
  };

  const handleDownloadPDF = async () => {
    if (!isReportValid()) {
      showMessage(
        "warning",
        "Please add at least one detail before downloading the PDF."
      );
      return;
    }

    const currentReport = prepareReportForSave();

    try {
      await generatePDF(currentReport);
      showMessage("success", "PDF generated successfully.");
    } catch (error) {
      console.error(error);
      showMessage("warning", "There was an error generating the PDF.");
    }
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

    const preparedReport = prepareReportForSave();

    if (isEditMode) {
      const updatedReports = savedReports.map((report) =>
        report.id === id
          ? {
              ...preparedReport,
              id,
              createdAt: reportData.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : report
      );

      localStorage.setItem("jobproofReports", JSON.stringify(updatedReports));

      showMessage("success", "Report updated successfully.");

      setTimeout(() => {
        navigate(`/reports/${id}`);
      }, 800);

      return;
    }

    const newReport = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...preparedReport,
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
        <div>
          <h1 className="mb-1">
            {isEditMode ? "Edit Job Report" : "Create Job Report"}
          </h1>

          {isEditMode && (
            <p className="text-muted mb-0">
              Update this saved report and keep the same record.
            </p>
          )}
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-danger" onClick={handleClearForm}>
            Clear Form
          </button>

          <button className="btn btn-primary" onClick={handleSaveReport}>
            {isEditMode ? "Update Report" : "Save Report"}
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
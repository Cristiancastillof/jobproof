import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReportForm from "../components/ReportForm";
import ReportPreview from "../components/ReportPreview";
import { generatePDF } from "../utils/generatePDF";
import { calculateTotalHours } from "../utils/calculateTotalHours";
import { generateReportNumber } from "../utils/generateReportNumber";

const initialReportData = {
  reportNumber: "",
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessLogo: "",
  workerName: "",
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

const getSavedBusinessProfile = () => {
  const savedBusinessProfile = localStorage.getItem("jobproofBusinessProfile");

  if (!savedBusinessProfile) return null;

  try {
    return JSON.parse(savedBusinessProfile);
  } catch (error) {
    console.error("Invalid business profile data:", error);
    return null;
  }
};

const getReportDataWithBusinessProfile = () => {
  const savedBusinessProfile = getSavedBusinessProfile();

  if (!savedBusinessProfile) return initialReportData;

  return {
    ...initialReportData,
    businessName: savedBusinessProfile.businessName || "",
    businessEmail: savedBusinessProfile.businessEmail || "",
    businessPhone: savedBusinessProfile.businessPhone || "",
    businessLogo: savedBusinessProfile.businessLogo || "",
    workerName: savedBusinessProfile.defaultWorkerName || "",
  };
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
    if (isEditMode) return;

    const dataWithBusinessProfile = getReportDataWithBusinessProfile();

    setReportData(dataWithBusinessProfile);
  }, [isEditMode]);

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
      reportData.businessEmail.trim() ||
      reportData.businessPhone.trim() ||
      reportData.workerName.trim() ||
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
    if (isEditMode) {
      setReportData(initialReportData);
      showMessage("info", "The form has been cleared.");
      return;
    }

    const dataWithBusinessProfile = getReportDataWithBusinessProfile();

    setReportData(dataWithBusinessProfile);

    if (dataWithBusinessProfile.businessName) {
      showMessage(
        "info",
        "The form has been cleared. Business profile was kept."
      );
      return;
    }

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
              reportNumber:
                reportData.reportNumber ||
                report.reportNumber ||
                generateReportNumber(),
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
      ...preparedReport,
      id: crypto.randomUUID(),
      reportNumber: generateReportNumber(),
      createdAt: new Date().toISOString(),
    };

    const updatedReports = [newReport, ...savedReports];

    localStorage.setItem("jobproofReports", JSON.stringify(updatedReports));

    setReportData(newReport);

    showMessage(
      "success",
      `Report saved successfully: ${newReport.reportNumber}`
    );
  };

  const getAlertClass = () => {
    if (message.type === "success") return "alert alert-success";
    if (message.type === "warning") return "alert alert-warning";
    if (message.type === "info") return "alert alert-info";

    return "alert alert-secondary";
  };

  return (
    <section className="create-report-page">
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h1 className="mb-1">
            {isEditMode ? "Edit Job Report" : "Create Job Report"}
          </h1>

          {isEditMode && (
            <p className="text-muted mb-0">
              Update this saved report and keep the same record.
            </p>
          )}

          {!isEditMode && reportData.businessName && (
            <p className="text-muted mb-0">
              Business profile loaded:{" "}
              <strong>{reportData.businessName}</strong>
            </p>
          )}

          {!isEditMode && reportData.workerName && (
            <p className="text-muted mb-0">
              Default worker: <strong>{reportData.workerName}</strong>
            </p>
          )}

          {!isEditMode && reportData.reportNumber && (
            <p className="text-muted mb-0">
              Report number: <strong>{reportData.reportNumber}</strong>
            </p>
          )}
        </div>

 <div className="desktop-report-actions d-flex gap-2 flex-wrap">
  <button className="btn btn-primary" onClick={handleSaveReport}>
    {isEditMode ? "Update Report" : "Save Report"}
  </button>

  <button className="btn btn-success" onClick={handleDownloadPDF}>
    Download PDF
  </button>

  <button className="btn btn-outline-danger" onClick={handleClearForm}>
    Clear Form
  </button>
</div>

        <div className="mobile-clear-action">
          <button className="btn btn-outline-danger" onClick={handleClearForm}>
            Clear Form
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

      <div className="mobile-report-actions">
        <button className="btn btn-primary mobile-action-button" onClick={handleSaveReport}>
          {isEditMode ? "Update" : "Save"}
        </button>

        <button className="btn btn-success mobile-action-button" onClick={handleDownloadPDF}>
          PDF
        </button>
      </div>
    </section>
  );
};

export default CreateReport;
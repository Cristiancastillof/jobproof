import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReportForm from "../components/ReportForm";
import ReportPreview from "../components/ReportPreview";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { calculateTotalHours } from "../utils/calculateTotalHours";
import { generatePDF } from "../utils/generatePDF";

const LOCAL_REPORTS_KEY = "jobproofReports";

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const getYear = () => {
  return new Date().getFullYear();
};

const createEmptyReport = () => ({
  id: "",
  reportNumber: "",
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessLogo: "",
  workerName: "",
  clientName: "",
  jobAddress: "",
  jobDate: getTodayDate(),
  startingHour: "",
  finishHour: "",
  totalHours: "",
  serviceType: "",
  workCompleted: "",
  issuesFound: "",
  recommendations: "",
  beforePhotos: [],
  afterPhotos: [],
  createdAt: "",
  updatedAt: "",
});

const mapSupabaseReportToForm = (report, company, workerName) => ({
  id: report.id || "",
  reportNumber: report.report_number || "",
  businessName: company?.business_name || "",
  businessEmail: company?.business_email || "",
  businessPhone: company?.business_phone || "",
  businessLogo: company?.business_logo_url || "",
  workerName: workerName || "",
  clientName: report.client_name || "",
  jobAddress: report.job_address || "",
  jobDate: report.job_date || getTodayDate(),
  startingHour: report.starting_hour ? report.starting_hour.slice(0, 5) : "",
  finishHour: report.finish_hour ? report.finish_hour.slice(0, 5) : "",
  totalHours: report.total_hours || "",
  serviceType: report.service_type || "",
  workCompleted: report.work_completed || "",
  issuesFound: report.issues_found || "",
  recommendations: report.recommendations || "",
  beforePhotos: [],
  afterPhotos: [],
  createdAt: report.created_at || "",
  updatedAt: report.updated_at || "",
});

const buildSupabasePayload = ({ reportData, profile, user }) => ({
  company_id: profile.company_id,
  created_by: user.id,
  report_number: reportData.reportNumber,
  client_name: reportData.clientName,
  job_address: reportData.jobAddress,
  job_date: reportData.jobDate || null,
  starting_hour: reportData.startingHour || null,
  finish_hour: reportData.finishHour || null,
  total_hours:
    reportData.totalHours ||
    calculateTotalHours(reportData.startingHour, reportData.finishHour),
  service_type: reportData.serviceType,
  work_completed: reportData.workCompleted,
  issues_found: reportData.issuesFound,
  recommendations: reportData.recommendations,
  status: "completed",
  updated_at: new Date().toISOString(),
});

const getLocalReports = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY)) || [];
  } catch (error) {
    console.error("Error reading local reports:", error);
    return [];
  }
};

const saveLocalReportCopy = (reportToSave) => {
  const currentReports = getLocalReports();
  const existingIndex = currentReports.findIndex(
    (report) => report.id === reportToSave.id
  );

  let updatedReports;

  if (existingIndex >= 0) {
    updatedReports = currentReports.map((report) =>
      report.id === reportToSave.id ? reportToSave : report
    );
  } else {
    updatedReports = [reportToSave, ...currentReports];
  }

  localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updatedReports));
};

const generateReportNumber = async (companyId) => {
  const year = getYear();
  const prefix = `JP-${year}`;

  const { count, error } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .ilike("report_number", `${prefix}-%`);

  if (error) {
    console.error("Error generating report number:", error);
    return `${prefix}-${String(Date.now()).slice(-4)}`;
  }

  return `${prefix}-${String((count || 0) + 1).padStart(4, "0")}`;
};

const CreateReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, displayName, profileLoading } = useAuth();

  const isEditMode = Boolean(id);

  const [reportData, setReportData] = useState(createEmptyReport);
  const [company, setCompany] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [savingReport, setSavingReport] = useState(false);
  const [message, setMessage] = useState(null);

  const canCreateReport = useMemo(() => {
    return Boolean(user?.id && profile?.company_id);
  }, [user, profile]);

  useEffect(() => {
    const loadCompanyAndReport = async () => {
      if (profileLoading) return;

      if (!user?.id) {
        setLoadingReport(false);
        return;
      }

      if (!profile?.company_id) {
        setLoadingReport(false);
        setMessage({
          type: "warning",
          text: "Please complete your Business Profile before creating reports.",
        });
        return;
      }

      setLoadingReport(true);
      setMessage(null);

      try {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select(
            "id, business_name, business_email, business_phone, business_logo_url"
          )
          .eq("id", profile.company_id)
          .single();

        if (companyError) {
          throw companyError;
        }

        setCompany(companyData);

        if (isEditMode) {
          const { data: existingReport, error: reportError } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();

          if (reportError) {
            throw reportError;
          }

          const localReport = getLocalReports().find(
            (report) => report.id === id
          );

          setReportData({
            ...mapSupabaseReportToForm(existingReport, companyData, displayName),
            beforePhotos: localReport?.beforePhotos || [],
            afterPhotos: localReport?.afterPhotos || [],
          });
        } else {
          const reportNumber = await generateReportNumber(profile.company_id);

          setReportData({
            ...createEmptyReport(),
            reportNumber,
            businessName: companyData.business_name || "",
            businessEmail: companyData.business_email || "",
            businessPhone: companyData.business_phone || "",
            businessLogo: companyData.business_logo_url || "",
            workerName: displayName || "",
            jobDate: getTodayDate(),
          });
        }
      } catch (error) {
        console.error("Error loading report data:", error);
        setMessage({
          type: "danger",
          text: error.message || "There was an error loading this report.",
        });
      } finally {
        setLoadingReport(false);
      }
    };

    loadCompanyAndReport();
  }, [id, isEditMode, user, profile, profileLoading, displayName]);

  const handleSaveReport = async () => {
    if (!canCreateReport) {
      setMessage({
        type: "warning",
        text: "Please complete your Business Profile before saving reports.",
      });
      return;
    }

    if (!reportData.clientName.trim()) {
      setMessage({
        type: "warning",
        text: "Please enter the client name before saving.",
      });
      return;
    }

    setSavingReport(true);
    setMessage(null);

    try {
      const finalTotalHours =
        reportData.totalHours ||
        calculateTotalHours(reportData.startingHour, reportData.finishHour);

      const payload = buildSupabasePayload({
        reportData: {
          ...reportData,
          totalHours: finalTotalHours,
        },
        profile,
        user,
      });

      let savedReport;

      if (isEditMode) {
        const { data, error } = await supabase
          .from("reports")
          .update(payload)
          .eq("id", id)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        savedReport = data;
      } else {
        const { data, error } = await supabase
          .from("reports")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        savedReport = data;
      }

      const finalReportData = {
        ...reportData,
        id: savedReport.id,
        reportNumber: savedReport.report_number,
        businessName: company?.business_name || reportData.businessName,
        businessEmail: company?.business_email || reportData.businessEmail,
        businessPhone: company?.business_phone || reportData.businessPhone,
        businessLogo: company?.business_logo_url || reportData.businessLogo,
        workerName: displayName || reportData.workerName,
        totalHours: savedReport.total_hours || finalTotalHours,
        createdAt: savedReport.created_at,
        updatedAt: savedReport.updated_at,
      };

      setReportData(finalReportData);
      saveLocalReportCopy(finalReportData);

      setMessage({
        type: "success",
        text: isEditMode
          ? "Report updated successfully."
          : "Report saved successfully.",
      });

      if (!isEditMode) {
        navigate(`/edit-report/${savedReport.id}`, { replace: true });
      }
    } catch (error) {
      console.error("Error saving report:", error);
      setMessage({
        type: "danger",
        text: error.message || "There was an error saving the report.",
      });
    } finally {
      setSavingReport(false);
    }
  };

  const handleDownloadPDF = () => {
    generatePDF(reportData);
  };

  const handleClearForm = async () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear this form?"
    );

    if (!confirmClear) return;

    const reportNumber = canCreateReport
      ? await generateReportNumber(profile.company_id)
      : "";

    setReportData({
      ...createEmptyReport(),
      reportNumber,
      businessName: company?.business_name || "",
      businessEmail: company?.business_email || "",
      businessPhone: company?.business_phone || "",
      businessLogo: company?.business_logo_url || "",
      workerName: displayName || "",
      jobDate: getTodayDate(),
    });

    setMessage(null);
  };

  if (loadingReport || profileLoading) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h1 className="h5">Loading report workspace</h1>
        <p className="text-muted mb-0">
          Please wait while JobProof prepares your report.
        </p>
      </section>
    );
  }

  if (!profile?.company_id) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <h1 className="h3 mb-3">Business Profile required</h1>
            <p className="text-muted mb-4">
              Before creating reports, you need to complete your company profile.
              This information will be added automatically to every report.
            </p>

            <Link to="/business-profile" className="btn btn-primary">
              Complete Business Profile
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">
            {isEditMode ? "Edit report" : "Create report"}
          </p>

          <h1 className="section-title mb-2">
            {isEditMode ? "Update job report" : "Create a new job report"}
          </h1>

          <p className="section-subtitle mb-0">
            Company details are loaded automatically from your Business Profile.
          </p>
        </div>

        <div className="desktop-report-actions d-flex gap-2 flex-wrap">
          <button
            className="btn btn-primary"
            onClick={handleSaveReport}
            disabled={savingReport}
          >
            {savingReport
              ? "Saving..."
              : isEditMode
              ? "Update Report"
              : "Save Report"}
          </button>

          <button
            className="btn btn-success"
            onClick={handleDownloadPDF}
            disabled={savingReport}
          >
            Download PDF
          </button>

          <button
            className="btn btn-outline-danger"
            onClick={handleClearForm}
            disabled={savingReport}
          >
            Clear Form
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <ReportForm reportData={reportData} setReportData={setReportData} />
        </div>

        <div className="col-lg-5">
          <ReportPreview reportData={reportData} />
        </div>
      </div>

      <div className="mobile-report-action-bar">
        <button
          className="btn btn-primary"
          onClick={handleSaveReport}
          disabled={savingReport}
        >
          {savingReport ? "Saving..." : isEditMode ? "Update" : "Save"}
        </button>

        <button
          className="btn btn-success"
          onClick={handleDownloadPDF}
          disabled={savingReport}
        >
          PDF
        </button>
      </div>
    </section>
  );
};

export default CreateReport;
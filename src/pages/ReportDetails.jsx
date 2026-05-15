import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReportPreview from "../components/ReportPreview";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { generatePDF } from "../utils/generatePDF";

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const mapSupabaseReportToPreview = ({
  report,
  company,
  photos = [],
  workerName,
}) => {
  const beforePhotos = photos
    .filter((photo) => photo.photo_type === "before")
    .sort((a, b) => a.photo_order - b.photo_order)
    .map((photo) => photo.photo_url);

  const afterPhotos = photos
    .filter((photo) => photo.photo_type === "after")
    .sort((a, b) => a.photo_order - b.photo_order)
    .map((photo) => photo.photo_url);

  return {
    id: report.id || "",
    reportNumber: report.report_number || "",
    businessName: company?.business_name || "",
    businessEmail: company?.business_email || "",
    businessPhone: company?.business_phone || "",
    businessLogo: company?.business_logo_url || "",
    workerName: workerName || "Unknown user",
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
    beforePhotos,
    afterPhotos,
    createdAt: report.created_at || "",
    updatedAt: report.updated_at || "",
  };
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, profileLoading } = useAuth();

  const [reportData, setReportData] = useState(null);
  const [rawReport, setRawReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadReportDetails = async () => {
      if (profileLoading) return;

      if (!user?.id) {
        setLoadingReport(false);
        return;
      }

      if (!profile?.company_id) {
        setLoadingReport(false);
        setMessage({
          type: "warning",
          text: "Please complete your Business Profile before viewing reports.",
        });
        return;
      }

      setLoadingReport(true);
      setMessage(null);

      try {
        const { data: report, error: reportError } = await supabase
          .from("reports")
          .select(
            `
            *,
            profiles:created_by (
              full_name,
              email,
              role
            )
          `
          )
          .eq("id", id)
          .eq("company_id", profile.company_id)
          .single();

        if (reportError) {
          throw reportError;
        }

        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select(
            "id, business_name, business_email, business_phone, business_logo_url"
          )
          .eq("id", profile.company_id)
          .single();

        if (companyError) {
          throw companyError;
        }

        const { data: photos, error: photosError } = await supabase
          .from("report_photos")
          .select("id, photo_type, photo_url, photo_order")
          .eq("report_id", id)
          .eq("company_id", profile.company_id)
          .order("photo_order", { ascending: true });

        if (photosError) {
          throw photosError;
        }

        const mappedReport = mapSupabaseReportToPreview({
          report,
          company,
          photos: photos || [],
          workerName: report.profiles?.full_name,
        });

        setRawReport(report);
        setReportData(mappedReport);
      } catch (error) {
        console.error("Error loading report details:", error);
        setMessage({
          type: "danger",
          text: error.message || "There was an error loading this report.",
        });
      } finally {
        setLoadingReport(false);
      }
    };

    loadReportDetails();
  }, [id, user, profile, profileLoading]);

  const handleDownloadPDF = () => {
    if (!reportData) return;
    generatePDF(reportData);
  };

  const handleBack = () => {
    navigate("/reports");
  };

  if (loadingReport || profileLoading) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading report details</h1>
        <p className="text-muted mb-0">
          Please wait while JobProof loads this report.
        </p>
      </section>
    );
  }

  if (message?.type === "danger" || !reportData) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <h1 className="h3 mb-3">Report not found</h1>

            <p className="text-muted mb-4">
              {message?.text ||
                "This report could not be found or you do not have access to it."}
            </p>

            <Link to="/reports" className="btn btn-primary">
              Back to Reports
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
          <p className="eyebrow mb-2">Report details</p>

          <h1 className="section-title mb-2">
            {reportData.reportNumber || "Job report"}
          </h1>

          <p className="section-subtitle mb-0">
            {reportData.clientName || "No client added"} ·{" "}
            {reportData.serviceType || "No service added"}
          </p>
        </div>

        <div className="desktop-report-actions d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-secondary" onClick={handleBack}>
            Back
          </button>

          <Link to={`/edit-report/${reportData.id}`} className="btn btn-primary">
            Edit Report
          </Link>

          <button className="btn btn-success" onClick={handleDownloadPDF}>
            Download PDF
          </button>
        </div>
      </div>

      {message && message.type !== "danger" && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">Report summary</h2>

              <div className="report-meta-list">
                <div>
                  <span>Report number</span>
                  <strong>{reportData.reportNumber || "Not available"}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong className="text-capitalize">
                    {rawReport?.status || "completed"}
                  </strong>
                </div>

                <div>
                  <span>Client</span>
                  <strong>{reportData.clientName || "Not specified"}</strong>
                </div>

                <div>
                  <span>Address</span>
                  <strong>{reportData.jobAddress || "Not specified"}</strong>
                </div>

                <div>
                  <span>Service</span>
                  <strong>{reportData.serviceType || "Not specified"}</strong>
                </div>

                <div>
                  <span>Completed by</span>
                  <strong>{reportData.workerName || "Unknown user"}</strong>
                </div>

                <div>
                  <span>Total hours</span>
                  <strong>{reportData.totalHours || "Not recorded"}</strong>
                </div>

                <div>
                  <span>Created</span>
                  <strong>{formatDateTime(reportData.createdAt)}</strong>
                </div>

                <div>
                  <span>Last updated</span>
                  <strong>{formatDateTime(reportData.updatedAt)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">Photos</h2>

              <div className="report-meta-list">
                <div>
                  <span>Before photos</span>
                  <strong>{reportData.beforePhotos.length}</strong>
                </div>

                <div>
                  <span>After photos</span>
                  <strong>{reportData.afterPhotos.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <ReportPreview reportData={reportData} />
        </div>
      </div>

      <div className="mobile-report-action-bar">
        <Link to={`/edit-report/${reportData.id}`} className="btn btn-primary">
          Edit
        </Link>

        <button className="btn btn-success" onClick={handleDownloadPDF}>
          PDF
        </button>
      </div>
    </section>
  );
};

export default ReportDetails;
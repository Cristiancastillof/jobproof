import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReportPreview from "../components/ReportPreview";
import { supabase } from "../lib/supabaseClient";
import { generatePDF } from "../utils/generatePDF";

const formatValue = (value, fallback = "Not provided") => {
  if (!value || String(value).trim() === "") return fallback;
  return value;
};

const formatStatusLabel = (status) => {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Not provided";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const mapPublicReportToPreviewData = ({ report, photos, team }) => {
  const beforePhotos = photos
    .filter((photo) => photo.photo_type === "before")
    .sort((a, b) => a.photo_order - b.photo_order)
    .map((photo) => photo.photo_url);

  const afterPhotos = photos
    .filter((photo) => photo.photo_type === "after")
    .sort((a, b) => a.photo_order - b.photo_order)
    .map((photo) => photo.photo_url);

  const teamInvolved = team.map((member) => ({
    id: member.profile_id,
    fullName: member.full_name || "Team member",
    role: member.role || "worker",
    roleOnJob: member.role_on_job || "worker",
  }));

  return {
    id: report.id,
    reportNumber: report.report_number || "",
    businessName: report.business_name || "",
    businessEmail: report.business_email || "",
    businessPhone: report.business_phone || "",
    businessLogo: report.business_logo_url || "",
    workerName: "",

    clientName: report.client_name || report.client_display_name || "",
    clientDisplayName: report.client_display_name || report.client_name || "",
    clientCompanyName: report.client_company_name || "",
    clientContactPerson: report.client_contact_person || "",
    clientEmail: report.client_email || "",
    clientPhone: report.client_phone || "",
    clientAddressSnapshot:
      report.client_address_snapshot || report.job_address || "",
    clientAccessNotes: report.client_access_notes || "",

    jobAddress: report.job_address || report.client_address_snapshot || "",
    jobDate: report.job_date || "",
    startingHour: report.starting_hour
      ? String(report.starting_hour).slice(0, 5)
      : "",
    finishHour: report.finish_hour
      ? String(report.finish_hour).slice(0, 5)
      : "",
    totalHours: report.total_hours || "",
    serviceType: report.service_type || "",
    workCompleted: report.work_completed || "",
    issuesFound: report.issues_found || "",
    recommendations: report.recommendations || "",
    status: report.status || "completed",
    teamInvolved,
    beforePhotos,
    afterPhotos,
    createdAt: report.created_at || "",
    updatedAt: report.updated_at || "",
  };
};

const PublicReport = () => {
  const { token } = useParams();

  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [message, setMessage] = useState(null);

  const pageTitle = useMemo(() => {
    if (!reportData) return "Client report";
    return `${reportData.reportNumber || "Job report"} · ${
      reportData.businessName || "JobProof"
    }`;
  }, [reportData]);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  useEffect(() => {
    const loadPublicReport = async () => {
      if (!token) {
        setLoadingReport(false);
        setMessage({
          type: "danger",
          text: "This report link is invalid.",
        });
        return;
      }

      setLoadingReport(true);
      setMessage(null);

      try {
        const { data: reportRows, error: reportError } = await supabase.rpc(
          "get_public_report_by_token",
          {
            token_input: token,
          }
        );

        if (reportError) {
          throw reportError;
        }

        const report = reportRows?.[0];

        if (!report) {
          setMessage({
            type: "danger",
            text: "This report is not available. The link may be disabled, expired, or the report is not completed yet.",
          });
          setReportData(null);
          return;
        }

        const { data: photosRows, error: photosError } = await supabase.rpc(
          "get_public_report_photos_by_token",
          {
            token_input: token,
          }
        );

        if (photosError) {
          throw photosError;
        }

        const { data: teamRows, error: teamError } = await supabase.rpc(
          "get_public_report_team_by_token",
          {
            token_input: token,
          }
        );

        if (teamError) {
          throw teamError;
        }

        setReportData(
          mapPublicReportToPreviewData({
            report,
            photos: photosRows || [],
            team: teamRows || [],
          })
        );
      } catch (error) {
        console.error("Error loading public report:", error);

        setMessage({
          type: "danger",
          text:
            error.message ||
            "There was an error loading this public report.",
        });
      } finally {
        setLoadingReport(false);
      }
    };

    loadPublicReport();
  }, [token]);

  if (loadingReport) {
    return (
      <section className="public-report-page public-report-loading text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading client report</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof loads this shared report.
        </p>
      </section>
    );
  }

  if (message?.type === "danger" || !reportData) {
    return (
      <section className="public-report-page py-5">
        <div className="public-report-shell">
          <div className="card shadow-sm border-0 public-report-error-card">
            <div className="card-body p-4 p-md-5 text-center">
              <p className="eyebrow mb-2">Shared report</p>

              <h1 className="h3 mb-3">Report not available</h1>

              <p className="text-muted mb-4">
                {message?.text ||
                  "This report link is not available right now."}
              </p>

              <Link to="/" className="btn btn-primary">
                Go to JobProof
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const clientName =
    reportData.clientDisplayName ||
    reportData.clientName ||
    "Client not provided";

  const jobAddress =
    reportData.clientAddressSnapshot ||
    reportData.jobAddress ||
    "Address not provided";

  return (
    <section className="public-report-page">
      <div className="public-report-shell">
        <div className="public-report-client-hero">
          <div className="public-report-brand-row">
            <div className="public-report-brand">
              {reportData.businessLogo ? (
                <img
                  src={reportData.businessLogo}
                  alt={`${reportData.businessName || "Business"} logo`}
                  className="public-report-logo"
                />
              ) : (
                <div className="public-report-logo-fallback">
                  {(reportData.businessName || "J").charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <p className="eyebrow mb-1">Completed job report</p>
                <h1>{formatValue(reportData.businessName, "JobProof")}</h1>
              </div>
            </div>

            <span className={`report-status-badge ${reportData.status}`}>
              {formatStatusLabel(reportData.status)}
            </span>
          </div>

          <div className="public-report-hero-body">
            <div>
              <p className="public-report-report-number mb-2">
                {formatValue(reportData.reportNumber, "Job report")}
              </p>

              <h2>{clientName}</h2>

              <p className="mb-0">{jobAddress}</p>
            </div>

            <button
              type="button"
              className="btn btn-success public-report-download-btn"
              onClick={() => generatePDF(reportData)}
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="public-report-summary-grid">
          <div className="public-report-summary-card">
            <span>Service</span>
            <strong>{formatValue(reportData.serviceType)}</strong>
          </div>

          <div className="public-report-summary-card">
            <span>Job date</span>
            <strong>{formatDate(reportData.jobDate)}</strong>
          </div>

          <div className="public-report-summary-card">
            <span>Total hours</span>
            <strong>{formatValue(reportData.totalHours, "0")}</strong>
          </div>

          <div className="public-report-summary-card">
            <span>Contact</span>
            <strong>
              {formatValue(
                reportData.clientContactPerson ||
                  reportData.clientEmail ||
                  reportData.clientPhone
              )}
            </strong>
          </div>
        </div>

        <div className="alert alert-light border public-report-note">
          This report has been marked as completed and shared by{" "}
          <strong>
            {formatValue(reportData.businessName, "the service provider")}
          </strong>.
        </div>

        <ReportPreview reportData={reportData} />
      </div>
    </section>
  );
};

export default PublicReport;
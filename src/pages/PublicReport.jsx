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
      <section className="public-report-page py-5 text-center">
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
          <div className="card shadow-sm border-0">
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

  return (
    <section className="public-report-page">
      <div className="public-report-shell">
        <div className="public-report-hero">
          <div>
            <p className="eyebrow mb-2">Client report</p>

            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <h1 className="mb-0">
                {formatValue(reportData.reportNumber, "Job report")}
              </h1>

              <span className={`report-status-badge ${reportData.status}`}>
                {formatStatusLabel(reportData.status)}
              </span>
            </div>

            <p className="mb-0">
              Shared by{" "}
              <strong>{formatValue(reportData.businessName, "JobProof")}</strong>
            </p>
          </div>

          <button
            type="button"
            className="btn btn-success"
            onClick={() => generatePDF(reportData)}
          >
            Download PDF
          </button>
        </div>

        <div className="alert alert-light border public-report-note">
          This is a client-ready shared report. It is available only when the
          report has been completed and sharing has been enabled by the service
          provider.
        </div>

        <ReportPreview reportData={reportData} />
      </div>
    </section>
  );
};

export default PublicReport;
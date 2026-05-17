import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReportPreview from "../components/ReportPreview";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { generatePDF } from "../utils/generatePDF";

const formatStatusLabel = (status) => {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const buildMailtoLink = (reportData) => {
  const email = reportData.clientEmail || "";
  const clientName =
    reportData.clientContactPerson ||
    reportData.clientDisplayName ||
    reportData.clientName ||
    "there";

  const subject = `Job report ${reportData.reportNumber || ""}`.trim();

  const body = [
    `Hi ${clientName},`,
    "",
    `Your job report has been completed.`,
    "",
    `Report number: ${reportData.reportNumber || "Not provided"}`,
    `Job address: ${
      reportData.clientAddressSnapshot || reportData.jobAddress || "Not provided"
    }`,
    `Service: ${reportData.serviceType || "Not provided"}`,
    "",
    "Please find the report details attached or shared by our team.",
    "",
    `Regards,`,
    `${reportData.businessName || "JobProof"}`,
  ].join("\n");

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

const mapReportToPreviewData = ({
  report,
  company,
  photos,
  teamInvolved,
  displayName,
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
    id: report.id,
    reportNumber: report.report_number || "",
    businessName: company?.business_name || "",
    businessEmail: company?.business_email || "",
    businessPhone: company?.business_phone || "",
    businessLogo: company?.business_logo_url || "",
    workerName: displayName || "",
    createdBy: report.created_by || "",

    clientId: report.client_id || "",
    clientDisplayName: report.client_display_name || report.client_name || "",
    clientCompanyName: report.client_company_name || "",
    clientContactPerson: report.client_contact_person || "",
    clientEmail: report.client_email || "",
    clientPhone: report.client_phone || "",
    clientAddressSnapshot:
      report.client_address_snapshot || report.job_address || "",
    clientAccessNotes: report.client_access_notes || "",

    clientName: report.client_name || report.client_display_name || "",
    jobAddress: report.job_address || report.client_address_snapshot || "",
    jobDate: report.job_date || "",
    startingHour: report.starting_hour
      ? String(report.starting_hour).slice(0, 5)
      : "",
    finishHour: report.finish_hour ? String(report.finish_hour).slice(0, 5) : "",
    totalHours: report.total_hours || "",
    serviceType: report.service_type || "",
    workCompleted: report.work_completed || "",
    issuesFound: report.issues_found || "",
    recommendations: report.recommendations || "",
    status: report.status || "pending",
    teamInvolved,
    beforePhotos,
    afterPhotos,
    createdAt: report.created_at || "",
    updatedAt: report.updated_at || "",
  };
};

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, displayName, profileLoading } = useAuth();

  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [message, setMessage] = useState(null);

  const canEditReport = useMemo(() => {
    if (!reportData || !profile || !user) return false;

    return (
      profile.role === "admin" ||
      profile.role === "supervisor" ||
      reportData.createdBy === user.id
    );
  }, [reportData, profile, user]);

  const canSendToClient = useMemo(() => {
    return reportData?.status === "completed" && reportData?.clientEmail;
  }, [reportData]);

  useEffect(() => {
    const loadReportDetails = async () => {
      if (profileLoading) return;

      if (!user?.id || !profile?.company_id) {
        setLoadingReport(false);
        return;
      }

      setLoadingReport(true);
      setMessage(null);

      try {
        const { data: report, error: reportError } = await supabase
          .from("reports")
          .select("*")
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

        const { data: reportWorkers, error: workersError } = await supabase
          .from("report_workers")
          .select(
            `
            id,
            profile_id,
            role_on_job,
            profiles:profile_id (
              id,
              full_name,
              email,
              role
            )
          `
          )
          .eq("report_id", id)
          .eq("company_id", profile.company_id);

        if (workersError) {
          throw workersError;
        }

        const teamInvolved = (reportWorkers || [])
          .map((worker) => ({
            id: worker.profiles?.id || worker.profile_id,
            fullName: worker.profiles?.full_name || "Unknown user",
            email: worker.profiles?.email || "",
            role: worker.profiles?.role || "worker",
            roleOnJob: worker.role_on_job || "worker",
          }))
          .sort((a, b) => {
            if (a.roleOnJob === "lead") return -1;
            if (b.roleOnJob === "lead") return 1;
            return a.fullName.localeCompare(b.fullName);
          });

        setReportData(
          mapReportToPreviewData({
            report,
            company,
            photos: photos || [],
            teamInvolved,
            displayName,
          })
        );
      } catch (error) {
        console.error("Error loading report details:", error);

        setMessage({
          type: "danger",
          text:
            error.message ||
            "This report could not be found or you do not have access to it.",
        });
      } finally {
        setLoadingReport(false);
      }
    };

    loadReportDetails();
  }, [id, user, profile, profileLoading, displayName]);

  if (profileLoading || loadingReport) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading report</h1>

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
            <p className="eyebrow mb-2">Report details</p>

            <h1 className="h3 mb-3">Report not available</h1>

            <p className="text-muted mb-4">
              {message?.text ||
                "This report could not be found or you do not have permission to view it."}
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

          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <h1 className="section-title mb-0">
              {reportData.reportNumber || "Job report"}
            </h1>

            <span className={`report-status-badge ${reportData.status}`}>
              {formatStatusLabel(reportData.status)}
            </span>
          </div>

          <p className="section-subtitle mb-0">
            Full client, job, team, status and photo details.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {canEditReport && (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => navigate(`/edit-report/${reportData.id}`)}
            >
              Edit Report
            </button>
          )}

          <button
            type="button"
            className="btn btn-success"
            onClick={() => generatePDF(reportData)}
          >
            Download PDF
          </button>

          {canSendToClient && (
            <a
              className="btn btn-primary"
              href={buildMailtoLink(reportData)}
              target="_blank"
              rel="noreferrer"
            >
              Send Report to Client
            </a>
          )}
        </div>
      </div>

      {reportData.status === "completed" && !reportData.clientEmail && (
        <div className="alert alert-warning">
          This report is completed, but no client email is saved. Add a client
          email before sending the report.
        </div>
      )}

      {reportData.status !== "completed" && (
        <div className="alert alert-light border">
          The send option will appear when the report status is{" "}
          <strong>Completed</strong>.
        </div>
      )}

      <ReportPreview reportData={reportData} />
    </section>
  );
};

export default ReportDetails;
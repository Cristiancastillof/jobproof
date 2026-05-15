import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReportPreview from "../components/ReportPreview";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { generatePDF } from "../utils/generatePDF";

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const getStatusLabel = (status) => {
  if (status === "pending") return "Pending";
  if (status === "checked") return "Checked";
  if (status === "completed") return "Completed";

  return "Pending";
};

const getStatusBadgeClass = (status) => {
  if (status === "completed") return "bg-success";
  if (status === "checked") return "bg-primary";
  if (status === "pending") return "bg-warning text-dark";

  return "bg-secondary";
};

const mapSupabaseReportToPreview = ({
  report,
  company,
  creator,
  photos = [],
  teamInvolved = [],
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
    workerName: creator?.full_name || "Unknown user",
    createdBy: report.created_by || "",
    teamInvolved,
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
    status: report.status || "pending",
    beforePhotos,
    afterPhotos,
    createdAt: report.created_at || "",
    updatedAt: report.updated_at || "",
  };
};

const ReportDetails = () => {
  const { id } = useParams();
  const { user, profile, profileLoading } = useAuth();

  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [message, setMessage] = useState(null);

  const canEditReport =
    profile?.role === "admin" ||
    profile?.role === "supervisor" ||
    reportData?.createdBy === user?.id;

  useEffect(() => {
    const loadReport = async () => {
      if (profileLoading) return;

      if (!user?.id || !profile?.company_id) {
        setLoadingReport(false);
        setMessage({
          type: "warning",
          text: "You need a company profile to view reports.",
        });
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

        const [
          { data: company, error: companyError },
          { data: creator, error: creatorError },
          { data: photos, error: photosError },
          { data: reportWorkers, error: workersError },
        ] = await Promise.all([
          supabase
            .from("companies")
            .select(
              "id, business_name, business_email, business_phone, business_logo_url"
            )
            .eq("id", report.company_id)
            .single(),

          supabase
            .from("profiles")
            .select("id, full_name, email, role")
            .eq("id", report.created_by)
            .single(),

          supabase
            .from("report_photos")
            .select("id, photo_type, photo_url, photo_order")
            .eq("report_id", report.id)
            .eq("company_id", profile.company_id)
            .order("photo_order", { ascending: true }),

          supabase
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
            .eq("report_id", report.id)
            .eq("company_id", profile.company_id),
        ]);

        if (companyError) throw companyError;
        if (creatorError) throw creatorError;
        if (photosError) throw photosError;
        if (workersError) throw workersError;

        const mappedTeamInvolved = (reportWorkers || [])
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

        const finalTeamInvolved =
          mappedTeamInvolved.length > 0
            ? mappedTeamInvolved
            : [
                {
                  id: creator.id,
                  fullName: creator.full_name || "Unknown user",
                  email: creator.email || "",
                  role: creator.role || "worker",
                  roleOnJob: "lead",
                },
              ];

        setReportData(
          mapSupabaseReportToPreview({
            report,
            company,
            creator,
            photos: photos || [],
            teamInvolved: finalTeamInvolved,
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

    loadReport();
  }, [id, user, profile, profileLoading]);

  const handleDownloadPDF = () => {
    if (!reportData) return;
    generatePDF(reportData);
  };

  if (loadingReport || profileLoading) {
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

          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <h1 className="section-title mb-0">
              {reportData.reportNumber || "Job report"}
            </h1>

            <span
              className={`badge ${getStatusBadgeClass(reportData.status)} text-capitalize`}
            >
              {getStatusLabel(reportData.status)}
            </span>
          </div>

          <p className="section-subtitle mb-0">
            View, download or edit this saved JobProof report.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Link to="/reports" className="btn btn-outline-secondary">
            Back to Reports
          </Link>

          {canEditReport && (
            <Link
              to={`/edit-report/${reportData.id}`}
              className="btn btn-primary"
            >
              Edit Report
            </Link>
          )}

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

      <div className="row justify-content-center">
        <div className="col-lg-9 col-xl-8">
          <ReportPreview reportData={reportData} />
        </div>
      </div>
    </section>
  );
};

export default ReportDetails;
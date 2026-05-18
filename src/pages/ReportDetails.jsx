import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReportPreview from "../components/ReportPreview";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  buildClientReportMailtoLink,
  copyClientReportMessage,
} from "../utils/clientMessage";
import { generatePDF } from "../utils/generatePDF";
import { getPublicReportUrl } from "../utils/publicLinks";
import {
  loadReportActivity,
  recordReportActivity,
} from "../utils/reportActivity";

const formatStatusLabel = (status) => {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatActivityLabel = (activityType) => {
  const labels = {
    report_created: "Report created",
    report_updated: "Report updated",
    status_changed: "Status changed",
    sharing_enabled: "Client sharing enabled",
    sharing_disabled: "Client sharing disabled",
    client_link_copied: "Client link copied",
    client_email_opened: "Client email opened",
  };

  return labels[activityType] || "Activity";
};

const formatActivityDate = (dateValue) => {
  if (!dateValue) return "Date not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ActivityTimeline = ({ activityItems = [] }) => {
  if (!activityItems.length) {
    return (
      <div className="card shadow-sm border-0 report-activity-card mb-4">
        <div className="card-body p-4">
          <p className="eyebrow mb-2">Activity timeline</p>

          <h2 className="h5 mb-2">No activity recorded yet</h2>

          <p className="text-muted mb-0">
            Report activity will appear here when the report is created,
            updated, shared or sent to a client.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-0 report-activity-card mb-4">
      <div className="card-body p-4">
        <p className="eyebrow mb-2">Activity timeline</p>

        <h2 className="h5 mb-4">Report history</h2>

        <div className="report-activity-list">
          {activityItems.map((item) => {
            const actorName =
              item.profiles?.full_name ||
              item.profiles?.email ||
              "Unknown user";

            return (
              <div className="report-activity-item" key={item.id}>
                <div className="report-activity-dot"></div>

                <div>
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <strong>{formatActivityLabel(item.activity_type)}</strong>

                    <span>{formatActivityDate(item.created_at)}</span>
                  </div>

                  <p className="mb-1">
                    {item.activity_note || "No activity note provided."}
                  </p>

                  <small>
                    By {actorName}
                    {item.previous_value || item.new_value
                      ? ` · ${item.previous_value || "—"} → ${
                          item.new_value || "—"
                        }`
                      : ""}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
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

    publicShareToken: report.public_share_token || "",
    publicShareEnabled: Boolean(report.public_share_enabled),
    publicSharedAt: report.public_shared_at || "",

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
  const [activityItems, setActivityItems] = useState([]);
  const [loadingReport, setLoadingReport] = useState(true);
  const [updatingShare, setUpdatingShare] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [message, setMessage] = useState(null);

  const canEditReport = useMemo(() => {
    if (!reportData || !profile || !user) return false;

    return (
      profile.role === "admin" ||
      profile.role === "supervisor" ||
      reportData.createdBy === user.id
    );
  }, [reportData, profile, user]);

  const canManageShare = useMemo(() => {
    return profile?.role === "admin" || profile?.role === "supervisor";
  }, [profile]);

  const publicReportUrl = useMemo(() => {
    if (!reportData?.publicShareToken) return "";
    return getPublicReportUrl(reportData.publicShareToken);
  }, [reportData]);

  const canSendToClient = useMemo(() => {
    return (
      reportData?.status === "completed" &&
      reportData?.clientEmail &&
      reportData?.publicShareEnabled &&
      reportData?.publicShareToken
    );
  }, [reportData]);

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

      const loadedActivity = await loadReportActivity({
        reportId: id,
        companyId: profile.company_id,
      });

      setActivityItems(loadedActivity);

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

  useEffect(() => {
    loadReportDetails();
  }, [id, user, profile, profileLoading, displayName]);

  const refreshActivity = async () => {
    if (!reportData?.id || !profile?.company_id) return;

    const loadedActivity = await loadReportActivity({
      reportId: reportData.id,
      companyId: profile.company_id,
    });

    setActivityItems(loadedActivity);
  };

  const handleEnableSharing = async () => {
    if (!canManageShare) {
      setMessage({
        type: "warning",
        text: "Only admins and supervisors can manage client sharing.",
      });
      return;
    }

    if (reportData.status !== "completed") {
      setMessage({
        type: "warning",
        text: "Only completed reports can be shared with clients.",
      });
      return;
    }

    setUpdatingShare(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("reports")
        .update({
          public_share_enabled: true,
          public_shared_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportData.id)
        .eq("company_id", profile.company_id)
        .select("public_share_token, public_share_enabled, public_shared_at")
        .single();

      if (error) {
        throw error;
      }

      await recordReportActivity({
        reportId: reportData.id,
        companyId: profile.company_id,
        actorId: user.id,
        activityType: "sharing_enabled",
        newValue: "enabled",
        activityNote: "Client sharing enabled.",
      });

      setReportData((currentReportData) => ({
        ...currentReportData,
        publicShareToken: data.public_share_token,
        publicShareEnabled: Boolean(data.public_share_enabled),
        publicSharedAt: data.public_shared_at,
      }));

      await refreshActivity();

      setMessage({
        type: "success",
        text: "Client sharing enabled. You can now copy or send the client link.",
      });
    } catch (error) {
      console.error("Error enabling public sharing:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error enabling client sharing for this report.",
      });
    } finally {
      setUpdatingShare(false);
    }
  };

  const handleDisableSharing = async () => {
    if (!canManageShare) return;

    const confirmDisable = window.confirm(
      "Disable this client share link? The client will no longer be able to open it."
    );

    if (!confirmDisable) return;

    setUpdatingShare(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("reports")
        .update({
          public_share_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportData.id)
        .eq("company_id", profile.company_id);

      if (error) {
        throw error;
      }

      await recordReportActivity({
        reportId: reportData.id,
        companyId: profile.company_id,
        actorId: user.id,
        activityType: "sharing_disabled",
        previousValue: "enabled",
        newValue: "disabled",
        activityNote: "Client sharing disabled.",
      });

      setReportData((currentReportData) => ({
        ...currentReportData,
        publicShareEnabled: false,
      }));

      await refreshActivity();

      setMessage({
        type: "success",
        text: "Client sharing disabled.",
      });
    } catch (error) {
      console.error("Error disabling public sharing:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error disabling client sharing for this report.",
      });
    } finally {
      setUpdatingShare(false);
    }
  };

  const handleCopyClientLink = async () => {
    if (!publicReportUrl) return;

    try {
      await navigator.clipboard.writeText(publicReportUrl);

      await recordReportActivity({
        reportId: reportData.id,
        companyId: profile.company_id,
        actorId: user.id,
        activityType: "client_link_copied",
        newValue: "copied",
        activityNote: "Client report link copied.",
      });

      await refreshActivity();

      setCopiedLink(true);

      setTimeout(() => {
        setCopiedLink(false);
      }, 1800);
    } catch (error) {
      console.error("Error copying link:", error);
      window.prompt("Copy this client report link:", publicReportUrl);
    }
  };

  const handleCopyClientMessage = async () => {
    try {
      await copyClientReportMessage(reportData);

      setCopiedMessage(true);

      setTimeout(() => {
        setCopiedMessage(false);
      }, 1800);
    } catch (error) {
      console.error("Error copying client message:", error);

      setMessage({
        type: "danger",
        text: "There was an error copying the client message.",
      });
    }
  };

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

          {reportData.publicShareEnabled && (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleCopyClientMessage}
            >
              {copiedMessage ? "Copied!" : "Copy client message"}
            </button>
          )}

          {canSendToClient && (
            <a
              className="btn btn-primary"
              href={buildClientReportMailtoLink(reportData)}
              target="_blank"
              rel="noreferrer"
            >
              Send Report to Client
            </a>
          )}
        </div>
      </div>

      {message && message.type !== "danger" && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="card shadow-sm border-0 mb-4 client-share-card">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
            <div>
              <p className="eyebrow mb-2">Client sharing</p>

              <h2 className="h5 mb-2">Client-ready report link</h2>

              {reportData.status !== "completed" ? (
                <p className="text-muted mb-0">
                  The client link becomes available when this report is marked as{" "}
                  <strong>Completed</strong>.
                </p>
              ) : reportData.publicShareEnabled ? (
                <p className="text-muted mb-0">
                  Sharing is enabled. Anyone with this link can view the
                  completed client report.
                </p>
              ) : (
                <p className="text-muted mb-0">
                  Enable sharing to generate a client-ready link for this
                  completed report.
                </p>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-start">
              {reportData.status === "completed" &&
                !reportData.publicShareEnabled &&
                canManageShare && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleEnableSharing}
                    disabled={updatingShare}
                  >
                    {updatingShare ? "Enabling..." : "Enable client sharing"}
                  </button>
                )}

              {reportData.publicShareEnabled && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={handleCopyClientLink}
                  >
                    {copiedLink ? "Copied!" : "Copy client link"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleCopyClientMessage}
                  >
                    {copiedMessage ? "Copied!" : "Copy client message"}
                  </button>

                  <a
                    className="btn btn-outline-secondary"
                    href={publicReportUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open client view
                  </a>

                  {canManageShare && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={handleDisableSharing}
                      disabled={updatingShare}
                    >
                      Disable sharing
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {reportData.publicShareEnabled && publicReportUrl && (
            <div className="client-share-url mt-3">
              <span>{publicReportUrl}</span>
            </div>
          )}

          {reportData.status === "completed" && !reportData.clientEmail && (
            <div className="alert alert-warning mt-3 mb-0">
              This report is completed, but no client email is saved. Add a
              client email before sending the report.
            </div>
          )}

          {reportData.status === "completed" &&
            reportData.clientEmail &&
            !reportData.publicShareEnabled && (
              <div className="alert alert-light border mt-3 mb-0">
                Enable client sharing first, then the email button will include
                the client report link.
              </div>
            )}
        </div>
      </div>

      <ActivityTimeline activityItems={activityItems} />

      <ReportPreview reportData={reportData} />
    </section>
  );
};

export default ReportDetails;
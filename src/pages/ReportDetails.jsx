import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReportPreview from "../components/ReportPreview";
import { useAuth } from "../context/useAuth";
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

const getStatusClass = (status) => {
  if (status === "completed") return "completed";
  if (status === "checked") return "checked";
  return "pending";
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

const formatReportDate = (dateValue) => {
  if (!dateValue) return "Not provided";

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (timeValue) => {
  if (!timeValue) return "Not provided";
  return String(timeValue).slice(0, 5);
};

const hasInternalNotes = (reportData) => {
  return Boolean(
    reportData?.internalNotes ||
      reportData?.supervisorNotes ||
      reportData?.completionNotes
  );
};

const DetailTile = ({ label, value, wide = false }) => (
  <div className={wide ? "rd-detail-tile wide" : "rd-detail-tile"}>
    <span>{label}</span>
    <strong>{value || "Not provided"}</strong>
  </div>
);

const WorkBlock = ({ title, value }) => (
  <div className="rd-work-block">
    <span>{title}</span>
    <p>{value || "Not provided"}</p>
  </div>
);

const PhotoGrid = ({ title, photos = [], emptyText }) => (
  <div className="rd-photo-section">
    <div className="rd-section-heading compact">
      <div>
        <span>{title}</span>
        <h3>
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </h3>
      </div>
    </div>

    {photos.length === 0 ? (
      <div className="rd-empty-photo">{emptyText}</div>
    ) : (
      <div className="rd-photo-grid">
        {photos.map((photoUrl, index) => (
          <a
            href={photoUrl}
            target="_blank"
            rel="noreferrer"
            className="rd-photo-card"
            key={`${photoUrl}-${index}`}
          >
            <img src={photoUrl} alt={`${title} ${index + 1}`} />
            <span>{index + 1}</span>
          </a>
        ))}
      </div>
    )}
  </div>
);

const TeamPanel = ({ teamInvolved = [] }) => (
  <div className="rd-panel">
    <div className="rd-section-heading">
      <div>
        <span>Team involved</span>
        <h2>Field team</h2>
      </div>
    </div>

    {teamInvolved.length === 0 ? (
      <div className="rd-empty-state small">
        No team members were attached to this report.
      </div>
    ) : (
      <div className="rd-team-list">
        {teamInvolved.map((member) => (
          <div className="rd-team-member" key={member.id}>
            <div className="rd-team-avatar">
              {(member.fullName || member.email || "U").slice(0, 2).toUpperCase()}
            </div>

            <div>
              <strong>{member.fullName || "Unknown user"}</strong>
              <span>{member.email || "No email"}</span>
            </div>

            <small>{member.roleOnJob || member.role || "worker"}</small>
          </div>
        ))}
      </div>
    )}
  </div>
);

const ActivityTimeline = ({ activityItems = [] }) => {
  return (
    <div className="rd-panel">
      <div className="rd-section-heading">
        <div>
          <span>Activity timeline</span>
          <h2>Report history</h2>
        </div>
      </div>

      {!activityItems.length ? (
        <div className="rd-empty-state small">
          Report activity will appear here when the report is created, updated,
          shared or sent to a client.
        </div>
      ) : (
        <div className="rd-activity-list">
          {activityItems.map((item) => {
            const actorName =
              item.profiles?.full_name ||
              item.profiles?.email ||
              "Unknown user";

            return (
              <div className="rd-activity-item" key={item.id}>
                <div className="rd-activity-dot" />

                <div>
                  <div className="rd-activity-top">
                    <strong>{formatActivityLabel(item.activity_type)}</strong>
                    <span>{formatActivityDate(item.created_at)}</span>
                  </div>

                  <p>{item.activity_note || "No activity note provided."}</p>

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
      )}
    </div>
  );
};

const InternalNotesPanel = ({ reportData }) => {
  return (
    <div className="rd-panel rd-internal-panel">
      <div className="rd-section-heading">
        <div>
          <span>Internal team notes</span>
          <h2>Private report notes</h2>
        </div>

        <em>Internal only</em>
      </div>

      {!hasInternalNotes(reportData) ? (
        <div className="rd-empty-state small">
          Internal, supervisor and completion notes will appear here. These notes
          are not shown in the public client view.
        </div>
      ) : (
        <div className="rd-notes-grid">
          <WorkBlock
            title="Internal notes"
            value={reportData.internalNotes || "No internal notes added."}
          />

          <WorkBlock
            title="Supervisor notes"
            value={reportData.supervisorNotes || "No supervisor notes added."}
          />

          <WorkBlock
            title="Completion notes"
            value={reportData.completionNotes || "No completion notes added."}
          />
        </div>
      )}
    </div>
  );
};

const PreviewModal = ({ reportData, onClose, onDownloadPDF }) => {
  if (!reportData) return null;

  return (
    <div className="rd-modal-backdrop" role="dialog" aria-modal="true">
      <div className="rd-modal">
        <div className="rd-modal-header">
          <div>
            <span>Report preview</span>
            <h2>{reportData.reportNumber || "Job report"}</h2>
          </div>

          <button type="button" className="rd-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="rd-modal-body">
          <ReportPreview reportData={reportData} showInternalNotes={false} />
        </div>

        <div className="rd-modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            Close
          </button>

          <button type="button" className="btn btn-success" onClick={onDownloadPDF}>
            Download PDF
          </button>
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

    internalNotes: report.internal_notes || "",
    supervisorNotes: report.supervisor_notes || "",
    completionNotes: report.completion_notes || "",

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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
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

  const loadReportDetails = useCallback(async () => {
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
  }, [displayName, id, profile, profileLoading, user]);

  useEffect(() => {
    loadReportDetails();
  }, [loadReportDetails]);

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

  const handleDownloadPDF = () => {
    generatePDF(reportData);
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
    <>
      <style>
        {`
          .rd-page {
            display: grid;
            gap: 22px;
          }

          .rd-hero {
            overflow: hidden;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 24px;
            padding: 28px;
            border-radius: 34px;
            color: #ffffff;
            background:
              radial-gradient(circle at top right, rgba(245, 158, 11, 0.34), transparent 32%),
              radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.3), transparent 32%),
              linear-gradient(135deg, #020617, #1e40af);
            box-shadow: 0 26px 74px rgba(15, 23, 42, 0.24);
          }

          .rd-eyebrow {
            display: inline-flex;
            margin-bottom: 12px;
            color: #bfdbfe;
            font-size: 0.76rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.13em;
          }

          .rd-hero h1 {
            margin: 0;
            font-size: clamp(2.1rem, 5vw, 3.5rem);
            line-height: 0.95;
            font-weight: 950;
            letter-spacing: -0.07em;
          }

          .rd-hero p {
            max-width: 740px;
            margin: 14px 0 0;
            color: #dbeafe;
            font-size: 1rem;
            line-height: 1.6;
            font-weight: 650;
          }

          .rd-status-pill {
            display: inline-flex;
            align-items: center;
            width: max-content;
            margin-top: 18px;
            padding: 8px 12px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.07em;
          }

          .rd-status-pill.pending {
            color: #92400e;
            background: #fffbeb;
          }

          .rd-status-pill.checked {
            color: #1e40af;
            background: #eff6ff;
          }

          .rd-status-pill.completed {
            color: #166534;
            background: #f0fdf4;
          }

          .rd-hero-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            align-content: flex-start;
            gap: 10px;
            min-width: 310px;
          }

          .rd-hero-actions .btn {
            min-height: 42px;
            border-radius: 999px;
            font-weight: 900;
          }

          .rd-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .rd-detail-tile {
            padding: 18px;
            border-radius: 22px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 14px 38px rgba(15, 23, 42, 0.06);
          }

          .rd-detail-tile.wide {
            grid-column: span 2;
          }

          .rd-detail-tile span,
          .rd-work-block span,
          .rd-section-heading span,
          .rd-modal-header span {
            display: block;
            color: #64748b;
            font-size: 0.72rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .rd-detail-tile strong {
            display: block;
            margin-top: 8px;
            color: #0f172a;
            font-size: 0.95rem;
            font-weight: 850;
            line-height: 1.35;
            word-break: break-word;
          }

          .rd-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 360px;
            gap: 18px;
            align-items: start;
          }

          .rd-main-column,
          .rd-side-column {
            display: grid;
            gap: 18px;
          }

          .rd-panel {
            padding: 22px;
            border-radius: 28px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
          }

          .rd-section-heading {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 18px;
          }

          .rd-section-heading.compact {
            margin-bottom: 12px;
          }

          .rd-section-heading h2,
          .rd-section-heading h3 {
            margin: 5px 0 0;
            color: #0f172a;
            font-size: 1.2rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .rd-section-heading h3 {
            font-size: 1rem;
          }

          .rd-section-heading em {
            display: inline-flex;
            padding: 6px 10px;
            border-radius: 999px;
            color: #92400e;
            background: #fffbeb;
            border: 1px solid rgba(245, 158, 11, 0.22);
            font-size: 0.68rem;
            font-style: normal;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .rd-info-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .rd-work-grid,
          .rd-notes-grid {
            display: grid;
            gap: 12px;
          }

          .rd-work-block {
            padding: 16px;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .rd-work-block p {
            margin: 8px 0 0;
            color: #0f172a;
            font-size: 0.94rem;
            line-height: 1.55;
            font-weight: 650;
            white-space: pre-wrap;
          }

          .rd-photo-wrapper {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .rd-photo-section {
            display: grid;
            gap: 12px;
          }

          .rd-photo-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .rd-photo-card {
            position: relative;
            overflow: hidden;
            display: block;
            aspect-ratio: 4 / 3;
            border-radius: 18px;
            background: #e2e8f0;
            border: 1px solid rgba(15, 23, 42, 0.08);
          }

          .rd-photo-card img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .rd-photo-card span {
            position: absolute;
            top: 8px;
            left: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            border-radius: 999px;
            color: #ffffff;
            background: rgba(15, 23, 42, 0.84);
            font-size: 0.74rem;
            font-weight: 950;
          }

          .rd-empty-photo,
          .rd-empty-state {
            padding: 18px;
            border-radius: 18px;
            color: #64748b;
            background: #f8fafc;
            border: 1px dashed rgba(15, 23, 42, 0.16);
            font-weight: 700;
            line-height: 1.45;
          }

          .rd-empty-state.small {
            font-size: 0.9rem;
          }

          .rd-team-list {
            display: grid;
            gap: 10px;
          }

          .rd-team-member {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: center;
            gap: 10px;
            padding: 12px;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .rd-team-avatar {
            width: 38px;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            color: #ffffff;
            background: #0f172a;
            font-size: 0.78rem;
            font-weight: 950;
          }

          .rd-team-member strong,
          .rd-team-member span {
            display: block;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .rd-team-member strong {
            color: #0f172a;
            font-size: 0.9rem;
            font-weight: 900;
          }

          .rd-team-member span {
            color: #64748b;
            font-size: 0.78rem;
            font-weight: 650;
          }

          .rd-team-member small {
            padding: 5px 8px;
            border-radius: 999px;
            color: #334155;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            font-size: 0.68rem;
            font-weight: 950;
            text-transform: uppercase;
          }

          .rd-share-url {
            margin-top: 14px;
            padding: 12px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.08);
            color: #334155;
            font-size: 0.82rem;
            font-weight: 700;
            word-break: break-all;
          }

          .rd-share-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .rd-share-actions .btn {
            border-radius: 999px;
            font-weight: 850;
          }

          .rd-activity-list {
            display: grid;
            gap: 14px;
          }

          .rd-activity-item {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 12px;
          }

          .rd-activity-dot {
            width: 12px;
            height: 12px;
            margin-top: 6px;
            border-radius: 999px;
            background: #1e40af;
            box-shadow: 0 0 0 5px #eff6ff;
          }

          .rd-activity-top {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }

          .rd-activity-top strong {
            color: #0f172a;
            font-size: 0.9rem;
            font-weight: 950;
          }

          .rd-activity-top span,
          .rd-activity-item small {
            color: #64748b;
            font-size: 0.76rem;
            font-weight: 700;
          }

          .rd-activity-item p {
            margin: 4px 0;
            color: #334155;
            font-size: 0.88rem;
            font-weight: 650;
            line-height: 1.45;
          }

          .rd-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 3000;
            display: grid;
            place-items: center;
            padding: 18px;
            background: rgba(15, 23, 42, 0.72);
            backdrop-filter: blur(10px);
          }

          .rd-modal {
            width: min(1120px, 100%);
            max-height: 92vh;
            display: grid;
            grid-template-rows: auto minmax(0, 1fr) auto;
            overflow: hidden;
            border-radius: 28px;
            background: #f8fafc;
            box-shadow: 0 28px 80px rgba(0, 0, 0, 0.34);
          }

          .rd-modal-header,
          .rd-modal-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 18px 22px;
            background: #ffffff;
            border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          }

          .rd-modal-footer {
            border-top: 1px solid rgba(15, 23, 42, 0.08);
            border-bottom: 0;
          }

          .rd-modal-header h2 {
            margin: 4px 0 0;
            color: #0f172a;
            font-size: 1.15rem;
            font-weight: 950;
          }

          .rd-modal-close {
            width: 42px;
            height: 42px;
            border: 0;
            border-radius: 14px;
            background: #f1f5f9;
            color: #0f172a;
            font-size: 1.8rem;
            line-height: 1;
            font-weight: 700;
          }

          .rd-modal-body {
            overflow: auto;
            padding: 18px;
          }

          .rd-modal-body .report-preview {
            margin: 0 auto;
          }

          @media (max-width: 991px) {
            .rd-hero,
            .rd-layout {
              grid-template-columns: 1fr;
            }

            .rd-hero-actions {
              justify-content: flex-start;
              min-width: 0;
            }

            .rd-summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .rd-photo-wrapper {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 576px) {
            .rd-page {
              gap: 18px;
            }

            .rd-hero {
              padding: 22px;
              border-radius: 26px;
            }

            .rd-hero h1 {
              font-size: 2.2rem;
            }

            .rd-hero-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .rd-hero-actions .btn,
            .rd-share-actions .btn,
            .rd-share-actions a {
              width: 100%;
            }

            .rd-summary-grid,
            .rd-info-grid,
            .rd-photo-grid {
              grid-template-columns: 1fr;
            }

            .rd-detail-tile.wide {
              grid-column: auto;
            }

            .rd-panel {
              padding: 18px;
              border-radius: 24px;
            }

            .rd-section-heading,
            .rd-activity-top,
            .rd-modal-header,
            .rd-modal-footer {
              flex-direction: column;
              align-items: flex-start;
            }

            .rd-modal {
              max-height: 94vh;
              border-radius: 22px;
            }

            .rd-modal-footer .btn {
              width: 100%;
            }
          }
        `}
      </style>

      <section className="rd-page">
        <div className="rd-hero">
          <div>
            <span className="rd-eyebrow">Report details</span>

            <h1>{reportData.reportNumber || "Job report"}</h1>

            <p>
              {reportData.clientDisplayName ||
                reportData.clientName ||
                "Client not provided"}{" "}
              · {reportData.serviceType || "Service not provided"}
            </p>

            <span className={`rd-status-pill ${getStatusClass(reportData.status)}`}>
              {formatStatusLabel(reportData.status)}
            </span>
          </div>

          <div className="rd-hero-actions">
            <Link to="/reports" className="btn btn-outline-light">
              Back to Reports
            </Link>

            {canEditReport && (
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={() => navigate(`/edit-report/${reportData.id}`)}
              >
                Edit Report
              </button>
            )}

            <button
              type="button"
              className="btn btn-light"
              onClick={() => setShowPreviewModal(true)}
            >
              Preview Report
            </button>

            <button type="button" className="btn btn-success" onClick={handleDownloadPDF}>
              Download PDF
            </button>

            {canSendToClient && (
              <a
                className="btn btn-primary"
                href={buildClientReportMailtoLink(reportData)}
                target="_blank"
                rel="noreferrer"
              >
                Send to Client
              </a>
            )}
          </div>
        </div>

        {message && message.type !== "danger" && (
          <div className={`alert alert-${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        <div className="rd-summary-grid">
          <DetailTile
            label="Client"
            value={reportData.clientDisplayName || reportData.clientName}
          />

          <DetailTile label="Service" value={reportData.serviceType} />

          <DetailTile label="Job date" value={formatReportDate(reportData.jobDate)} />

          <DetailTile label="Total hours" value={reportData.totalHours} />

          <DetailTile
            label="Job address"
            value={reportData.jobAddress || reportData.clientAddressSnapshot}
            wide
          />

          <DetailTile label="Start time" value={formatTime(reportData.startingHour)} />

          <DetailTile label="Finish time" value={formatTime(reportData.finishHour)} />
        </div>

        <div className="rd-layout">
          <div className="rd-main-column">
            <div className="rd-panel">
              <div className="rd-section-heading">
                <div>
                  <span>Client and job details</span>
                  <h2>Job information</h2>
                </div>
              </div>

              <div className="rd-info-grid">
                <DetailTile label="Company" value={reportData.clientCompanyName} />
                <DetailTile label="Contact person" value={reportData.clientContactPerson} />
                <DetailTile label="Client email" value={reportData.clientEmail} />
                <DetailTile label="Client phone" value={reportData.clientPhone} />
                <DetailTile
                  label="Access notes"
                  value={reportData.clientAccessNotes}
                  wide
                />
              </div>
            </div>

            <div className="rd-panel">
              <div className="rd-section-heading">
                <div>
                  <span>Work summary</span>
                  <h2>Completed work and notes</h2>
                </div>
              </div>

              <div className="rd-work-grid">
                <WorkBlock title="Work completed" value={reportData.workCompleted} />
                <WorkBlock title="Issues found" value={reportData.issuesFound} />
                <WorkBlock title="Recommendations" value={reportData.recommendations} />
              </div>
            </div>

            <div className="rd-panel">
              <div className="rd-section-heading">
                <div>
                  <span>Photo evidence</span>
                  <h2>Before and after photos</h2>
                </div>
              </div>

              <div className="rd-photo-wrapper">
                <PhotoGrid
                  title="Before photos"
                  photos={reportData.beforePhotos}
                  emptyText="No before photos were attached to this report."
                />

                <PhotoGrid
                  title="After photos"
                  photos={reportData.afterPhotos}
                  emptyText="No after photos were attached to this report."
                />
              </div>
            </div>

            <InternalNotesPanel reportData={reportData} />
          </div>

          <aside className="rd-side-column">
            <div className="rd-panel">
              <div className="rd-section-heading">
                <div>
                  <span>Client sharing</span>
                  <h2>Public client link</h2>
                </div>
              </div>

              {reportData.status !== "completed" ? (
                <div className="rd-empty-state small">
                  The client link becomes available when this report is marked as{" "}
                  <strong>Completed</strong>.
                </div>
              ) : reportData.publicShareEnabled ? (
                <div className="rd-empty-state small">
                  Sharing is enabled. Anyone with this link can view the completed
                  client report.
                </div>
              ) : (
                <div className="rd-empty-state small">
                  Enable sharing to generate a client-ready link for this completed
                  report.
                </div>
              )}

              <div className="rd-share-actions mt-3">
                {reportData.status === "completed" &&
                  !reportData.publicShareEnabled &&
                  canManageShare && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleEnableSharing}
                      disabled={updatingShare}
                    >
                      {updatingShare ? "Enabling..." : "Enable sharing"}
                    </button>
                  )}

                {reportData.publicShareEnabled && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleCopyClientLink}
                    >
                      {copiedLink ? "Copied!" : "Copy link"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCopyClientMessage}
                    >
                      {copiedMessage ? "Copied!" : "Copy message"}
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

              {reportData.publicShareEnabled && publicReportUrl && (
                <div className="rd-share-url">{publicReportUrl}</div>
              )}

              {reportData.status === "completed" && !reportData.clientEmail && (
                <div className="alert alert-warning mt-3 mb-0">
                  This report is completed, but no client email is saved.
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

            <TeamPanel teamInvolved={reportData.teamInvolved} />

            <ActivityTimeline activityItems={activityItems} />
          </aside>
        </div>
      </section>

      {showPreviewModal && (
        <PreviewModal
          reportData={reportData}
          onClose={() => setShowPreviewModal(false)}
          onDownloadPDF={handleDownloadPDF}
        />
      )}
    </>
  );
};

export default ReportDetails;

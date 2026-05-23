const formatValue = (value, fallback = "Not provided") => {
  if (!value || String(value).trim() === "") return fallback;
  return value;
};

const formatStatusLabel = (status) => {
  if (!status) return "Pending";

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatRoleLabel = (role) => {
  if (!role) return "Worker";

  const normalizedRole = String(role).trim().toLowerCase();

  const roleMap = {
    lead: "Lead",
    worker: "Worker",
    supervisor: "Supervisor",
    admin: "Admin",
    helper: "Helper",
  };

  if (roleMap[normalizedRole]) {
    return roleMap[normalizedRole];
  }

  return normalizedRole
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const hasInternalNotes = (reportData) => {
  return Boolean(
    reportData?.internalNotes ||
      reportData?.supervisorNotes ||
      reportData?.completionNotes
  );
};

const ReportPreview = ({ reportData, showInternalNotes = false }) => {
  const status = reportData.status || "pending";

  const hasClientContact =
    reportData.clientCompanyName ||
    reportData.clientContactPerson ||
    reportData.clientEmail ||
    reportData.clientPhone ||
    reportData.clientAccessNotes;

  const renderPhotos = (title, photos = []) => {
    if (!photos.length) return null;

    return (
      <div className="report-preview-section">
        <h4>{title}</h4>

        <div className="report-preview-photos">
          {photos.map((photo, index) => (
            <div className="report-preview-photo-card" key={`${title}-${index}`}>
              <span>{index + 1}</span>
              <img src={photo} alt={`${title} ${index + 1}`} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTeamInvolved = () => {
    if (!reportData.teamInvolved || reportData.teamInvolved.length === 0) {
      return null;
    }

    return (
      <div className="report-preview-section">
        <h4>Team involved</h4>

        <div className="report-preview-team-list-fixed">
          {reportData.teamInvolved.map((member, index) => {
            const memberName =
              member.fullName ||
              member.full_name ||
              member.name ||
              member.email ||
              `Team member ${index + 1}`;

            const memberRole =
              member.roleOnJob ||
              member.role_on_job ||
              member.role ||
              "worker";

            return (
              <div
                className="report-preview-team-member-fixed"
                key={member.id || `${memberName}-${index}`}
              >
                <div className="report-preview-team-member-name-fixed">
                  {memberName}
                </div>

                <div className="report-preview-team-member-role-fixed">
                  {formatRoleLabel(memberRole)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <article className="report-preview-card">
      <div className="report-preview-header">
        <div>
          <p className="eyebrow mb-2">Report preview</p>

          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <h2 className="mb-0">Job Report</h2>

            <span className={`report-status-badge ${status}`}>
              {formatStatusLabel(status)}
            </span>
          </div>

          <p className="text-muted mb-0">
            {formatValue(reportData.reportNumber, "Report number pending")}
          </p>
        </div>

        {reportData.businessLogo ? (
          <img
            src={reportData.businessLogo}
            alt="Business logo"
            className="report-preview-logo"
          />
        ) : (
          <div className="report-preview-logo-placeholder">Logo</div>
        )}
      </div>

      <div className="report-preview-business">
        <h3>{formatValue(reportData.businessName, "Business name not set")}</h3>

        <p>{formatValue(reportData.businessEmail, "Business email not set")}</p>

        <p>{formatValue(reportData.businessPhone, "Business phone not set")}</p>
      </div>

      <div className="report-preview-section">
        <h4>Client and job details</h4>

        <div className="report-preview-grid">
          <div>
            <span>Status</span>
            <strong>{formatStatusLabel(status)}</strong>
          </div>

          <div>
            <span>Client</span>
            <strong>
              {formatValue(
                reportData.clientDisplayName || reportData.clientName,
                "Client not set"
              )}
            </strong>
          </div>

          <div>
            <span>Job address</span>
            <strong>
              {formatValue(
                reportData.clientAddressSnapshot || reportData.jobAddress,
                "Address not set"
              )}
            </strong>
          </div>

          <div>
            <span>Job date</span>
            <strong>{formatValue(reportData.jobDate, "Date not set")}</strong>
          </div>

          <div>
            <span>Start</span>
            <strong>{formatValue(reportData.startingHour, "Not set")}</strong>
          </div>

          <div>
            <span>Finish</span>
            <strong>{formatValue(reportData.finishHour, "Not set")}</strong>
          </div>

          <div>
            <span>Total hours</span>
            <strong>{formatValue(reportData.totalHours, "0")}</strong>
          </div>

          <div>
            <span>Service</span>
            <strong>
              {formatValue(reportData.serviceType, "Service type not set")}
            </strong>
          </div>
        </div>
      </div>

      {hasClientContact && (
        <div className="report-preview-section">
          <h4>Client profile</h4>

          <div className="report-preview-grid">
            <div>
              <span>Company</span>
              <strong>{formatValue(reportData.clientCompanyName)}</strong>
            </div>

            <div>
              <span>Contact</span>
              <strong>{formatValue(reportData.clientContactPerson)}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{formatValue(reportData.clientEmail)}</strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>{formatValue(reportData.clientPhone)}</strong>
            </div>
          </div>

          {reportData.clientAccessNotes && (
            <div className="report-preview-note mt-3">
              <span>Access notes</span>
              <p>{reportData.clientAccessNotes}</p>
            </div>
          )}
        </div>
      )}

      {renderTeamInvolved()}

      <div className="report-preview-section">
        <h4>Work notes</h4>

        <div className="report-preview-note">
          <span>Work completed</span>
          <p>{formatValue(reportData.workCompleted, "No work notes yet.")}</p>
        </div>

        <div className="report-preview-note">
          <span>Issues found</span>
          <p>{formatValue(reportData.issuesFound, "No issues listed.")}</p>
        </div>

        <div className="report-preview-note">
          <span>Recommendations</span>
          <p>
            {formatValue(reportData.recommendations, "No recommendations yet.")}
          </p>
        </div>
      </div>

      {showInternalNotes && hasInternalNotes(reportData) && (
        <div className="report-preview-section report-preview-internal-section">
          <h4>Internal team notes</h4>

          <div className="report-preview-note">
            <span>Internal notes</span>
            <p>{formatValue(reportData.internalNotes, "No internal notes.")}</p>
          </div>

          <div className="report-preview-note">
            <span>Supervisor notes</span>
            <p>
              {formatValue(reportData.supervisorNotes, "No supervisor notes.")}
            </p>
          </div>

          <div className="report-preview-note">
            <span>Completion notes</span>
            <p>
              {formatValue(reportData.completionNotes, "No completion notes.")}
            </p>
          </div>
        </div>
      )}

      {renderPhotos("Before photos", reportData.beforePhotos)}
      {renderPhotos("After photos", reportData.afterPhotos)}
    </article>
  );
};

export default ReportPreview;
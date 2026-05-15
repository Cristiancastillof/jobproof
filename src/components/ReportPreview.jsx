const formatDate = (dateValue) => {
  if (!dateValue) return "Not provided";

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (timeValue) => {
  if (!timeValue) return "Not provided";

  return timeValue;
};

const getInitials = (name) => {
  if (!name) return "U";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getRoleLabel = (roleOnJob, role) => {
  if (roleOnJob === "lead") return "Lead";
  if (roleOnJob === "supervisor") return "Supervisor";
  if (roleOnJob === "helper") return "Helper";

  if (role === "admin") return "Admin";
  if (role === "supervisor") return "Supervisor";

  return "Worker";
};

const ReportPreview = ({ reportData }) => {
  const beforePhotos = reportData.beforePhotos || [];
  const afterPhotos = reportData.afterPhotos || [];
  const teamInvolved = reportData.teamInvolved || [];

  const hasTeamInvolved = teamInvolved.length > 0;

  return (
    <div className="report-preview-wrapper">
      <div className="report-preview-card">
        <div className="report-preview-header">
          <div>
            <p className="report-preview-eyebrow">Job Report</p>

            <h2>{reportData.reportNumber || "Draft report"}</h2>

            <p className="mb-0">
              {reportData.businessName || "Business name not set"}
            </p>
          </div>

          {reportData.businessLogo && (
            <img
              src={reportData.businessLogo}
              alt={`${reportData.businessName || "Business"} logo`}
              className="report-preview-logo"
            />
          )}
        </div>

        <div className="report-preview-section">
          <h3>Business details</h3>

          <div className="report-preview-grid">
            <div>
              <span>Business</span>
              <strong>{reportData.businessName || "Not provided"}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{reportData.businessEmail || "Not provided"}</strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>{reportData.businessPhone || "Not provided"}</strong>
            </div>

            <div>
              <span>Created by</span>
              <strong>{reportData.workerName || "Not provided"}</strong>
            </div>
          </div>
        </div>

        <div className="report-preview-section">
          <h3>Client and job details</h3>

          <div className="report-preview-grid">
            <div>
              <span>Client</span>
              <strong>{reportData.clientName || "Not provided"}</strong>
            </div>

            <div>
              <span>Job date</span>
              <strong>{formatDate(reportData.jobDate)}</strong>
            </div>

            <div className="report-preview-grid-wide">
              <span>Address</span>
              <strong>{reportData.jobAddress || "Not provided"}</strong>
            </div>

            <div>
              <span>Starting hour</span>
              <strong>{formatTime(reportData.startingHour)}</strong>
            </div>

            <div>
              <span>Finish hour</span>
              <strong>{formatTime(reportData.finishHour)}</strong>
            </div>

            <div>
              <span>Total hours</span>
              <strong>{reportData.totalHours || "Not calculated"}</strong>
            </div>

            <div>
              <span>Service type</span>
              <strong>{reportData.serviceType || "Not provided"}</strong>
            </div>
          </div>
        </div>

        <div className="report-preview-section">
          <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h3 className="mb-1">Team involved</h3>
              <p className="text-muted small mb-0">
                People recorded as part of this job.
              </p>
            </div>

            <span className="report-team-count">
              {teamInvolved.length} people
            </span>
          </div>

          {!hasTeamInvolved ? (
            <div className="report-preview-empty">
              No team members selected yet.
            </div>
          ) : (
            <div className="report-team-list">
              {teamInvolved.map((member) => (
                <div className="report-team-member" key={member.id}>
                  <span className="report-team-avatar">
                    {getInitials(member.fullName)}
                  </span>

                  <span className="report-team-copy">
                    <strong>{member.fullName || "Unnamed user"}</strong>
                    <small>
                      {getRoleLabel(member.roleOnJob, member.role)}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="report-preview-section">
          <h3>Work notes</h3>

          <div className="report-preview-note">
            <span>Work completed</span>
            <p>{reportData.workCompleted || "Not provided"}</p>
          </div>

          <div className="report-preview-note">
            <span>Issues found</span>
            <p>{reportData.issuesFound || "Not provided"}</p>
          </div>

          <div className="report-preview-note">
            <span>Recommendations</span>
            <p>{reportData.recommendations || "Not provided"}</p>
          </div>
        </div>

        <div className="report-preview-section">
          <h3>Photos</h3>

          <div className="report-photo-preview-block">
            <h4>Before photos</h4>

            {beforePhotos.length === 0 ? (
              <p className="text-muted small mb-0">No before photos.</p>
            ) : (
              <div className="report-photo-preview-grid">
                {beforePhotos.map((photo, index) => (
                  <img
                    key={`before-${index}-${photo}`}
                    src={photo}
                    alt={`Before ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="report-photo-preview-block">
            <h4>After photos</h4>

            {afterPhotos.length === 0 ? (
              <p className="text-muted small mb-0">No after photos.</p>
            ) : (
              <div className="report-photo-preview-grid">
                {afterPhotos.map((photo, index) => (
                  <img
                    key={`after-${index}-${photo}`}
                    src={photo}
                    alt={`After ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="report-preview-footer">
          Generated with JobProof
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;
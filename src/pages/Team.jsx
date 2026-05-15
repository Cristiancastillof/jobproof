import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const createEmptyInviteForm = () => ({
  fullName: "",
  email: "",
  role: "worker",
});

const formatDate = (dateValue) => {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusBadgeClass = (status) => {
  if (status === "accepted") return "bg-success";
  if (status === "revoked") return "bg-danger";
  if (status === "expired") return "bg-secondary";

  return "bg-warning text-dark";
};

const getRoleBadgeClass = (role) => {
  if (role === "admin") return "bg-primary";
  if (role === "supervisor") return "bg-info text-dark";

  return "bg-secondary";
};

const getInviteLink = (inviteToken) => {
  return `${window.location.origin}/register?invite=${inviteToken}`;
};

const Team = () => {
  const { user, profile, displayRole, profileLoading } = useAuth();

  const [inviteForm, setInviteForm] = useState(createEmptyInviteForm);
  const [invitations, setInvitations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState(null);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [message, setMessage] = useState(null);

  const isAdmin = profile?.role === "admin";

  const pendingInvitations = useMemo(() => {
    return invitations.filter((invite) => invite.status === "pending");
  }, [invitations]);

  const acceptedInvitations = useMemo(() => {
    return invitations.filter((invite) => invite.status === "accepted");
  }, [invitations]);

  const inactiveInvitations = useMemo(() => {
    return invitations.filter(
      (invite) => invite.status === "revoked" || invite.status === "expired"
    );
  }, [invitations]);

  const activeMembers = useMemo(() => {
    return teamMembers.filter((member) => member.active);
  }, [teamMembers]);

  const inactiveMembers = useMemo(() => {
    return teamMembers.filter((member) => !member.active);
  }, [teamMembers]);

  const loadTeamMembers = async () => {
    if (!profile?.company_id || !isAdmin) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, company_id, full_name, email, role, active, created_at")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    setTeamMembers(data || []);
  };

  const loadInvitations = async () => {
    if (!profile?.company_id || !isAdmin) return;

    const { data, error } = await supabase
      .from("team_invitations")
      .select(
        `
        id,
        company_id,
        email,
        full_name,
        role,
        invite_token,
        status,
        created_at,
        expires_at,
        accepted_at
      `
      )
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setInvitations(data || []);
  };

  const loadTeam = async () => {
    if (!profile?.company_id || !isAdmin) {
      setLoadingTeam(false);
      return;
    }

    setLoadingTeam(true);
    setMessage(null);

    try {
      await Promise.all([loadTeamMembers(), loadInvitations()]);
    } catch (error) {
      console.error("Error loading team:", error);

      setMessage({
        type: "danger",
        text: error.message || "There was an error loading your team.",
      });
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;

    if (!user?.id) {
      setLoadingTeam(false);
      return;
    }

    loadTeam();
  }, [user, profile, profileLoading]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setInviteForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleCreateInvite = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      setMessage({
        type: "warning",
        text: "Only admins can invite team members.",
      });
      return;
    }

    if (!profile?.company_id) {
      setMessage({
        type: "warning",
        text: "Complete your Business Profile before inviting team members.",
      });
      return;
    }

    if (!inviteForm.fullName.trim()) {
      setMessage({
        type: "warning",
        text: "Please enter the team member's full name.",
      });
      return;
    }

    if (!inviteForm.email.trim()) {
      setMessage({
        type: "warning",
        text: "Please enter the team member's email.",
      });
      return;
    }

    setCreatingInvite(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .insert({
          company_id: profile.company_id,
          full_name: inviteForm.fullName.trim(),
          email: inviteForm.email.trim().toLowerCase(),
          role: inviteForm.role,
          created_by: user.id,
        })
        .select(
          `
          id,
          company_id,
          email,
          full_name,
          role,
          invite_token,
          status,
          created_at,
          expires_at,
          accepted_at
        `
        )
        .single();

      if (error) {
        throw error;
      }

      setInvitations((currentInvitations) => [data, ...currentInvitations]);
      setInviteForm(createEmptyInviteForm());

      setMessage({
        type: "success",
        text: "Invitation created. Copy the invite link and send it to your team member.",
      });
    } catch (error) {
      console.error("Error creating invitation:", error);

      setMessage({
        type: "danger",
        text: error.message || "There was an error creating the invitation.",
      });
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyInvite = async (invite) => {
    const inviteLink = getInviteLink(invite.invite_token);

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInviteId(invite.id);

      setMessage({
        type: "success",
        text: "Invite link copied to clipboard.",
      });

      setTimeout(() => {
        setCopiedInviteId(null);
      }, 1800);
    } catch (error) {
      console.error("Error copying invitation link:", error);

      setMessage({
        type: "warning",
        text: inviteLink,
      });
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    const confirmRevoke = window.confirm(
      "Are you sure you want to revoke this invitation?"
    );

    if (!confirmRevoke) return;

    try {
      const { error } = await supabase
        .from("team_invitations")
        .update({
          status: "revoked",
          updated_at: new Date().toISOString(),
        })
        .eq("id", inviteId)
        .eq("company_id", profile.company_id);

      if (error) {
        throw error;
      }

      setInvitations((currentInvitations) =>
        currentInvitations.map((invite) =>
          invite.id === inviteId ? { ...invite, status: "revoked" } : invite
        )
      );

      setMessage({
        type: "success",
        text: "Invitation revoked.",
      });
    } catch (error) {
      console.error("Error revoking invitation:", error);

      setMessage({
        type: "danger",
        text: error.message || "There was an error revoking this invitation.",
      });
    }
  };

  const handleToggleMemberStatus = async (member) => {
    if (member.id === user.id) {
      setMessage({
        type: "warning",
        text: "You cannot deactivate your own admin account.",
      });
      return;
    }

    const nextStatus = !member.active;

    const confirmUpdate = window.confirm(
      nextStatus
        ? `Reactivate ${member.full_name}?`
        : `Deactivate ${member.full_name}?`
    );

    if (!confirmUpdate) return;

    setUpdatingMemberId(member.id);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          active: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id)
        .eq("company_id", profile.company_id);

      if (error) {
        throw error;
      }

      setTeamMembers((currentMembers) =>
        currentMembers.map((currentMember) =>
          currentMember.id === member.id
            ? { ...currentMember, active: nextStatus }
            : currentMember
        )
      );

      setMessage({
        type: "success",
        text: nextStatus
          ? "Team member reactivated."
          : "Team member deactivated.",
      });
    } catch (error) {
      console.error("Error updating team member:", error);

      setMessage({
        type: "danger",
        text:
          error.message || "There was an error updating this team member.",
      });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const renderMembersTable = (title, membersList, emptyText) => {
    return (
      <div className="card shadow-sm border-0 team-card mb-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
            <div>
              <h2 className="h5 mb-1">{title}</h2>
              <p className="text-muted mb-0">{membersList.length} members</p>
            </div>
          </div>

          {membersList.length === 0 ? (
            <div className="team-empty-state">
              <p className="text-muted mb-0">{emptyText}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 team-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {membersList.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.full_name}</strong>
                        {member.id === user.id && (
                          <div className="text-muted small">Current user</div>
                        )}
                      </td>

                      <td>{member.email}</td>

                      <td>
                        <span
                          className={`badge ${getRoleBadgeClass(member.role)}`}
                        >
                          {member.role}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            member.active ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {member.active ? "active" : "inactive"}
                        </span>
                      </td>

                      <td>{formatDate(member.created_at)}</td>

                      <td className="text-end">
                        {member.id === user.id ? (
                          <span className="text-muted small">No actions</span>
                        ) : (
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              member.active
                                ? "btn-outline-danger"
                                : "btn-outline-success"
                            }`}
                            onClick={() => handleToggleMemberStatus(member)}
                            disabled={updatingMemberId === member.id}
                          >
                            {updatingMemberId === member.id
                              ? "Updating..."
                              : member.active
                              ? "Deactivate"
                              : "Reactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInvitationTable = (title, inviteList, emptyText) => {
    return (
      <div className="card shadow-sm border-0 team-card mb-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
            <div>
              <h2 className="h5 mb-1">{title}</h2>
              <p className="text-muted mb-0">{inviteList.length} records</p>
            </div>
          </div>

          {inviteList.length === 0 ? (
            <div className="team-empty-state">
              <p className="text-muted mb-0">{emptyText}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 team-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Expires</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {inviteList.map((invite) => (
                    <tr key={invite.id}>
                      <td>
                        <strong>{invite.full_name}</strong>
                      </td>

                      <td>{invite.email}</td>

                      <td className="text-capitalize">{invite.role}</td>

                      <td>
                        <span
                          className={`badge ${getStatusBadgeClass(
                            invite.status
                          )}`}
                        >
                          {invite.status}
                        </span>
                      </td>

                      <td>{formatDate(invite.expires_at)}</td>

                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {invite.status === "pending" && (
                            <>
                              <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => handleCopyInvite(invite)}
                              >
                                {copiedInviteId === invite.id
                                  ? "Copied"
                                  : "Copy Link"}
                              </button>

                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => handleRevokeInvite(invite.id)}
                              >
                                Revoke
                              </button>
                            </>
                          )}

                          {invite.status !== "pending" && (
                            <span className="text-muted small px-2">
                              No actions
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (profileLoading || loadingTeam) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading team</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof loads your team workspace.
        </p>
      </section>
    );
  }

  if (!profile?.company_id) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Team</p>

            <h1 className="h3 mb-3">Business Profile required</h1>

            <p className="text-muted mb-4">
              Complete your Business Profile before inviting team members.
            </p>

            <Link to="/business-profile" className="btn btn-primary">
              Complete Business Profile
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Restricted area</p>

            <h1 className="h3 mb-3">Admin access required</h1>

            <p className="text-muted mb-4">
              Only company admins can invite and manage team members. Your
              current role is {displayRole}.
            </p>

            <Link to="/" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">Team management</p>

          <h1 className="section-title mb-2">Manage your team</h1>

          <p className="section-subtitle mb-0">
            Invite supervisors and workers, review active members and control
            who can access your JobProof workspace.
          </p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="team-overview-grid mb-4">
        <div className="team-overview-card">
          <span>Active members</span>
          <strong>{activeMembers.length}</strong>
        </div>

        <div className="team-overview-card">
          <span>Pending invites</span>
          <strong>{pendingInvitations.length}</strong>
        </div>

        <div className="team-overview-card">
          <span>Accepted invites</span>
          <strong>{acceptedInvitations.length}</strong>
        </div>
      </div>

      {renderMembersTable(
        "Active team members",
        activeMembers,
        "No active team members found."
      )}

      {inactiveMembers.length > 0 &&
        renderMembersTable(
          "Inactive team members",
          inactiveMembers,
          "No inactive members."
        )}

      <div className="row g-4">
        <div className="col-lg-5">
          <form
            className="card shadow-sm border-0 team-card"
            onSubmit={handleCreateInvite}
          >
            <div className="card-body p-4">
              <h2 className="h4 mb-3">Create invitation</h2>

              <p className="text-muted mb-4">
                The invited person will use this link to create an account and
                join your company with the selected role.
              </p>

              <div className="mb-3">
                <label htmlFor="fullName" className="form-label">
                  Full name
                </label>

                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  className="form-control"
                  value={inviteForm.fullName}
                  onChange={handleChange}
                  placeholder="Example: Sarah Wilson"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="email" className="form-label">
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-control"
                  value={inviteForm.email}
                  onChange={handleChange}
                  placeholder="worker@example.com"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="role" className="form-label">
                  Role
                </label>

                <select
                  id="role"
                  name="role"
                  className="form-select"
                  value={inviteForm.role}
                  onChange={handleChange}
                >
                  <option value="worker">Worker</option>
                  <option value="supervisor">Supervisor</option>
                </select>

                <small className="text-muted">
                  Admins can invite supervisors and workers. Owner/admin
                  management can be added later.
                </small>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={creatingInvite}
              >
                {creatingInvite ? "Creating..." : "Generate Invite Link"}
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-7">
          <div className="team-info-panel mb-4">
            <h2 className="h5 mb-2">How invite links work</h2>

            <ul className="mb-0">
              <li>Create an invitation with email and role.</li>
              <li>Copy the invite link and send it manually.</li>
              <li>The user registers with that link and joins your company.</li>
            </ul>
          </div>

          {renderInvitationTable(
            "Pending invitations",
            pendingInvitations,
            "No pending invitations yet."
          )}
        </div>
      </div>

      {renderInvitationTable(
        "Accepted invitations",
        acceptedInvitations,
        "No accepted invitations yet."
      )}

      {inactiveInvitations.length > 0 &&
        renderInvitationTable(
          "Inactive invitations",
          inactiveInvitations,
          "No inactive invitations."
        )}
    </section>
  );
};

export default Team;
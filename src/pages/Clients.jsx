import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const createEmptyClientForm = () => ({
  clientDisplayName: "",
  clientType: "individual",
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  jobAddress: "",
  suburb: "",
  state: "",
  postcode: "",
  country: "Australia",
  defaultServiceType: "",
  accessNotes: "",
  internalNotes: "",
  active: true,
});

const CLIENT_TYPE_OPTIONS = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "property_manager", label: "Property manager" },
  { value: "agency", label: "Agency" },
  { value: "site", label: "Job site" },
];

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

const mapClientToForm = (client) => ({
  clientDisplayName: client.client_display_name || "",
  clientType: client.client_type || "individual",
  companyName: client.company_name || "",
  contactPerson: client.contact_person || "",
  email: client.email || "",
  phone: client.phone || "",
  jobAddress: client.job_address || "",
  suburb: client.suburb || "",
  state: client.state || "",
  postcode: client.postcode || "",
  country: client.country || "Australia",
  defaultServiceType: client.default_service_type || "",
  accessNotes: client.access_notes || "",
  internalNotes: client.internal_notes || "",
  active: Boolean(client.active),
});

const buildClientPayload = ({ formData, profile, user }) => ({
  company_id: profile.company_id,
  created_by: user.id,
  client_display_name: formData.clientDisplayName.trim(),
  client_type: formData.clientType,
  company_name: formData.companyName.trim(),
  contact_person: formData.contactPerson.trim(),
  email: formData.email.trim(),
  phone: formData.phone.trim(),
  job_address: formData.jobAddress.trim(),
  suburb: formData.suburb.trim(),
  state: formData.state.trim(),
  postcode: formData.postcode.trim(),
  country: formData.country.trim() || "Australia",
  default_service_type: formData.defaultServiceType.trim(),
  access_notes: formData.accessNotes.trim(),
  internal_notes: formData.internalNotes.trim(),
  active: formData.active,
  updated_at: new Date().toISOString(),
});

const Clients = () => {
  const { user, profile, displayRole, profileLoading } = useAuth();

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState(createEmptyClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loadingClients, setLoadingClients] = useState(true);
  const [savingClient, setSavingClient] = useState(false);
  const [updatingClientId, setUpdatingClientId] = useState(null);
  const [message, setMessage] = useState(null);

  const canManageClients =
    profile?.role === "admin" || profile?.role === "supervisor";

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && client.active) ||
        (statusFilter === "inactive" && !client.active);

      const searchText = [
        client.client_display_name,
        client.client_type,
        client.company_name,
        client.contact_person,
        client.email,
        client.phone,
        client.job_address,
        client.suburb,
        client.state,
        client.postcode,
        client.default_service_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [clients, searchTerm, statusFilter]);

  const activeClientsCount = useMemo(() => {
    return clients.filter((client) => client.active).length;
  }, [clients]);

  const inactiveClientsCount = useMemo(() => {
    return clients.filter((client) => !client.active).length;
  }, [clients]);

  const loadClients = async () => {
    if (!profile?.company_id || !canManageClients) {
      setLoadingClients(false);
      return;
    }

    setLoadingClients(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          id,
          company_id,
          created_by,
          client_display_name,
          client_type,
          company_name,
          contact_person,
          email,
          phone,
          job_address,
          suburb,
          state,
          postcode,
          country,
          default_service_type,
          access_notes,
          internal_notes,
          active,
          created_at,
          updated_at
        `
        )
        .eq("company_id", profile.company_id)
        .order("client_display_name", { ascending: true });

      if (error) {
        throw error;
      }

      setClients(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);

      setMessage({
        type: "danger",
        text: error.message || "There was an error loading clients.",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;

    if (!user?.id) {
      setLoadingClients(false);
      return;
    }

    loadClients();
  }, [user, profile, profileLoading]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!formData.clientDisplayName.trim()) {
      return "Please enter a client display name.";
    }

    if (!profile?.company_id) {
      return "Please complete your Business Profile before creating clients.";
    }

    return null;
  };

  const handleSaveClient = async (event) => {
    event.preventDefault();

    if (!canManageClients) {
      setMessage({
        type: "warning",
        text: "Only admins and supervisors can manage clients.",
      });
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setMessage({
        type: "warning",
        text: validationError,
      });
      return;
    }

    setSavingClient(true);
    setMessage(null);

    try {
      const payload = buildClientPayload({ formData, profile, user });

      if (editingClientId) {
        const { data, error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", editingClientId)
          .eq("company_id", profile.company_id)
          .select(
            `
            id,
            company_id,
            created_by,
            client_display_name,
            client_type,
            company_name,
            contact_person,
            email,
            phone,
            job_address,
            suburb,
            state,
            postcode,
            country,
            default_service_type,
            access_notes,
            internal_notes,
            active,
            created_at,
            updated_at
          `
          )
          .single();

        if (error) {
          throw error;
        }

        setClients((currentClients) =>
          currentClients.map((client) =>
            client.id === editingClientId ? data : client
          )
        );

        setMessage({
          type: "success",
          text: "Client updated successfully.",
        });
      } else {
        const { data, error } = await supabase
          .from("clients")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select(
            `
            id,
            company_id,
            created_by,
            client_display_name,
            client_type,
            company_name,
            contact_person,
            email,
            phone,
            job_address,
            suburb,
            state,
            postcode,
            country,
            default_service_type,
            access_notes,
            internal_notes,
            active,
            created_at,
            updated_at
          `
          )
          .single();

        if (error) {
          throw error;
        }

        setClients((currentClients) =>
          [data, ...currentClients].sort((a, b) =>
            a.client_display_name.localeCompare(b.client_display_name)
          )
        );

        setMessage({
          type: "success",
          text: "Client created successfully.",
        });
      }

      setFormData(createEmptyClientForm());
      setEditingClientId(null);
    } catch (error) {
      console.error("Error saving client:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error saving this client. Please try again.",
      });
    } finally {
      setSavingClient(false);
    }
  };

  const handleEditClient = (client) => {
    setEditingClientId(client.id);
    setFormData(mapClientToForm(client));
    setMessage(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    setEditingClientId(null);
    setFormData(createEmptyClientForm());
    setMessage(null);
  };

  const handleToggleClientStatus = async (client) => {
    if (!canManageClients) {
      setMessage({
        type: "warning",
        text: "Only admins and supervisors can update clients.",
      });
      return;
    }

    const nextStatus = !client.active;

    const confirmUpdate = window.confirm(
      nextStatus
        ? `Reactivate ${client.client_display_name}?`
        : `Deactivate ${client.client_display_name}?`
    );

    if (!confirmUpdate) return;

    setUpdatingClientId(client.id);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          active: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", client.id)
        .eq("company_id", profile.company_id);

      if (error) {
        throw error;
      }

      setClients((currentClients) =>
        currentClients.map((currentClient) =>
          currentClient.id === client.id
            ? { ...currentClient, active: nextStatus }
            : currentClient
        )
      );

      setMessage({
        type: "success",
        text: nextStatus ? "Client reactivated." : "Client deactivated.",
      });
    } catch (error) {
      console.error("Error updating client status:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error updating this client. Please try again.",
      });
    } finally {
      setUpdatingClientId(null);
    }
  };

  if (profileLoading || loadingClients) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading clients</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof loads your client database.
        </p>
      </section>
    );
  }

  if (!profile?.company_id) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Clients</p>

            <h1 className="h3 mb-3">Business Profile required</h1>

            <p className="text-muted mb-4">
              Complete your Business Profile before creating your client
              database.
            </p>

            <Link to="/business-profile" className="btn btn-primary">
              Complete Business Profile
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!canManageClients) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Restricted area</p>

            <h1 className="h3 mb-3">Admin or supervisor access required</h1>

            <p className="text-muted mb-4">
              Only admins and supervisors can create or edit client records.
              Your current role is {displayRole}.
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
          <p className="eyebrow mb-2">Client database</p>

          <h1 className="section-title mb-2">Clients</h1>

          <p className="section-subtitle mb-0">
            Save client and job site details once, then use them to autofill
            future reports.
          </p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="clients-overview-grid mb-4">
        <div className="clients-overview-card">
          <span>Total clients</span>
          <strong>{clients.length}</strong>
        </div>

        <div className="clients-overview-card">
          <span>Active</span>
          <strong>{activeClientsCount}</strong>
        </div>

        <div className="clients-overview-card">
          <span>Inactive</span>
          <strong>{inactiveClientsCount}</strong>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <form
            className="card shadow-sm border-0 clients-card"
            onSubmit={handleSaveClient}
          >
            <div className="card-body p-4">
              <h2 className="h4 mb-3">
                {editingClientId ? "Edit client" : "Create client"}
              </h2>

              <p className="text-muted mb-4">
                Add the client, company or job site details that your team will
                use when creating reports.
              </p>

              <div className="mb-3">
                <label htmlFor="clientDisplayName" className="form-label">
                  Client display name
                </label>

                <input
                  id="clientDisplayName"
                  type="text"
                  name="clientDisplayName"
                  className="form-control"
                  value={formData.clientDisplayName}
                  onChange={handleChange}
                  placeholder="Example: Turner Property Group - Collins St"
                />

                <small className="text-muted">
                  This is the name your team will search for in reports.
                </small>
              </div>

              <div className="mb-3">
                <label htmlFor="clientType" className="form-label">
                  Client type
                </label>

                <select
                  id="clientType"
                  name="clientType"
                  className="form-select"
                  value={formData.clientType}
                  onChange={handleChange}
                >
                  {CLIENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="companyName" className="form-label">
                  Company name
                </label>

                <input
                  id="companyName"
                  type="text"
                  name="companyName"
                  className="form-control"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Example: Turner Property Group"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="contactPerson" className="form-label">
                  Contact person
                </label>

                <input
                  id="contactPerson"
                  type="text"
                  name="contactPerson"
                  className="form-control"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Example: Michael Turner"
                />
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="client@example.com"
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="phone" className="form-label">
                    Phone
                  </label>

                  <input
                    id="phone"
                    type="text"
                    name="phone"
                    className="form-control"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0400 000 000"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label htmlFor="jobAddress" className="form-label">
                  Job address
                </label>

                <input
                  id="jobAddress"
                  type="text"
                  name="jobAddress"
                  className="form-control"
                  value={formData.jobAddress}
                  onChange={handleChange}
                  placeholder="Example: 25 Collins Street"
                />
              </div>

              <div className="row g-3 mt-1">
                <div className="col-md-5">
                  <label htmlFor="suburb" className="form-label">
                    Suburb
                  </label>

                  <input
                    id="suburb"
                    type="text"
                    name="suburb"
                    className="form-control"
                    value={formData.suburb}
                    onChange={handleChange}
                    placeholder="Melbourne"
                  />
                </div>

                <div className="col-md-3">
                  <label htmlFor="state" className="form-label">
                    State
                  </label>

                  <input
                    id="state"
                    type="text"
                    name="state"
                    className="form-control"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="VIC"
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="postcode" className="form-label">
                    Postcode
                  </label>

                  <input
                    id="postcode"
                    type="text"
                    name="postcode"
                    className="form-control"
                    value={formData.postcode}
                    onChange={handleChange}
                    placeholder="3000"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label htmlFor="country" className="form-label">
                  Country
                </label>

                <input
                  id="country"
                  type="text"
                  name="country"
                  className="form-control"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Australia"
                />
              </div>

              <div className="mt-3">
                <label htmlFor="defaultServiceType" className="form-label">
                  Default service type
                </label>

                <input
                  id="defaultServiceType"
                  type="text"
                  name="defaultServiceType"
                  className="form-control"
                  value={formData.defaultServiceType}
                  onChange={handleChange}
                  placeholder="Example: End of lease cleaning"
                />
              </div>

              <div className="mt-3">
                <label htmlFor="accessNotes" className="form-label">
                  Access notes
                </label>

                <textarea
                  id="accessNotes"
                  name="accessNotes"
                  className="form-control"
                  rows="3"
                  value={formData.accessNotes}
                  onChange={handleChange}
                  placeholder="Example: Key in lockbox. Parking available behind the building."
                />
              </div>

              <div className="mt-3">
                <label htmlFor="internalNotes" className="form-label">
                  Internal notes
                </label>

                <textarea
                  id="internalNotes"
                  name="internalNotes"
                  className="form-control"
                  rows="3"
                  value={formData.internalNotes}
                  onChange={handleChange}
                  placeholder="Internal notes for admins and supervisors."
                />
              </div>

              <div className="form-check form-switch mt-3">
                <input
                  id="active"
                  type="checkbox"
                  name="active"
                  className="form-check-input"
                  checked={formData.active}
                  onChange={handleChange}
                />

                <label htmlFor="active" className="form-check-label">
                  Active client
                </label>
              </div>

              <div className="d-flex gap-2 flex-wrap mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingClient}
                >
                  {savingClient
                    ? "Saving..."
                    : editingClientId
                    ? "Update Client"
                    : "Save Client"}
                </button>

                {editingClientId && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleCancelEdit}
                    disabled={savingClient}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="col-lg-7">
          <div className="card shadow-sm border-0 clients-card mb-4">
            <div className="card-body p-4">
              <div className="row g-3 align-items-end">
                <div className="col-md-8">
                  <label htmlFor="clientSearch" className="form-label">
                    Search clients
                  </label>

                  <input
                    id="clientSearch"
                    type="search"
                    className="form-control"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by name, company, contact, email, phone or address..."
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="statusFilter" className="form-label">
                    Status
                  </label>

                  <select
                    id="statusFilter"
                    className="form-select"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="active">Active only</option>
                    <option value="all">All clients</option>
                    <option value="inactive">Inactive only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 clients-card">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h2 className="h4 mb-1">Saved clients</h2>
                  <p className="text-muted mb-0">
                    {filteredClients.length} records found
                  </p>
                </div>
              </div>

              {filteredClients.length === 0 ? (
                <div className="clients-empty-state">
                  <p className="text-muted mb-0">
                    No clients found. Create your first client to start using
                    autofill in reports.
                  </p>
                </div>
              ) : (
                <div className="clients-list">
                  {filteredClients.map((client) => (
                    <div className="client-list-card" key={client.id}>
                      <div className="client-list-main">
                        <div>
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                            <h3>{client.client_display_name}</h3>

                            <span
                              className={`badge ${
                                client.active ? "bg-success" : "bg-secondary"
                              }`}
                            >
                              {client.active ? "active" : "inactive"}
                            </span>
                          </div>

                          <p className="mb-1">
                            {client.company_name || "No company name"} ·{" "}
                            {client.contact_person || "No contact person"}
                          </p>

                          <p className="text-muted small mb-0">
                            {client.job_address || "No address"}
                            {client.suburb ? `, ${client.suburb}` : ""}
                            {client.state ? ` ${client.state}` : ""}
                            {client.postcode ? ` ${client.postcode}` : ""}
                          </p>
                        </div>

                        <div className="client-list-meta">
                          <span>{client.email || "No email"}</span>
                          <span>{client.phone || "No phone"}</span>
                          <span>
                            {client.default_service_type || "No default service"}
                          </span>
                          <span>Created {formatDate(client.created_at)}</span>
                        </div>
                      </div>

                      {(client.access_notes || client.internal_notes) && (
                        <div className="client-notes-preview">
                          {client.access_notes && (
                            <p>
                              <strong>Access:</strong> {client.access_notes}
                            </p>
                          )}

                          {client.internal_notes && (
                            <p>
                              <strong>Internal:</strong> {client.internal_notes}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="d-flex gap-2 flex-wrap mt-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEditClient(client)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={`btn btn-sm ${
                            client.active
                              ? "btn-outline-danger"
                              : "btn-outline-success"
                          }`}
                          onClick={() => handleToggleClientStatus(client)}
                          disabled={updatingClientId === client.id}
                        >
                          {updatingClientId === client.id
                            ? "Updating..."
                            : client.active
                            ? "Deactivate"
                            : "Reactivate"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Clients;
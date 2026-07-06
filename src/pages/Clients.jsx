import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  getLimitLabel,
  getPrimaryBillingBlockReason,
  loadBillingPermissions,
} from "../utils/billingLimits";

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

const formatClientTypeLabel = (clientType) => {
  const option = CLIENT_TYPE_OPTIONS.find((item) => item.value === clientType);
  return option?.label || "Client";
};

const getClientTypeClass = (clientType) => {
  if (clientType === "company") return "company";
  if (clientType === "property_manager") return "property";
  if (clientType === "agency") return "agency";
  if (clientType === "site") return "site";
  return "individual";
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

const StatCard = ({ label, value, helper, tone = "default" }) => {
  return (
    <div className={`jp-client-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
};

const Clients = () => {
  const { user, profile, displayRole, profileLoading } = useAuth();

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState(createEmptyClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loadingClients, setLoadingClients] = useState(true);
  const [savingClient, setSavingClient] = useState(false);
  const [updatingClientId, setUpdatingClientId] = useState(null);
  const [message, setMessage] = useState(null);
  const [billingPermissions, setBillingPermissions] = useState(null);
  const [loadingBilling, setLoadingBilling] = useState(true);

  const canManageClients =
    profile?.role === "admin" || profile?.role === "supervisor";

  const clientCreationBlocked =
    !editingClientId &&
    Boolean(billingPermissions) &&
    !billingPermissions.canCreateClient;

  const clientLimitLabel = billingPermissions
    ? getLimitLabel(
        billingPermissions.clientsUsed,
        billingPermissions.plan.clientsLimit,
        "clients"
      )
    : "Loading usage";

  const clientBlockReason = billingPermissions
    ? getPrimaryBillingBlockReason(billingPermissions, "clients")
    : "Billing information is still loading.";

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && client.active) ||
        (statusFilter === "inactive" && !client.active);

      const matchesType =
        typeFilter === "all" || client.client_type === typeFilter;

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

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [clients, searchTerm, statusFilter, typeFilter]);

  const activeClientsCount = useMemo(() => {
    return clients.filter((client) => client.active).length;
  }, [clients]);

  const companyClientsCount = useMemo(() => {
    return clients.filter((client) =>
      ["company", "property_manager", "agency"].includes(client.client_type)
    ).length;
  }, [clients]);

  const jobSitesCount = useMemo(() => {
    return clients.filter((client) => client.client_type === "site").length;
  }, [clients]);

  const loadBillingState = async () => {
    if (!profile?.company_id || !canManageClients) {
      setLoadingBilling(false);
      setBillingPermissions(null);
      return;
    }

    setLoadingBilling(true);

    try {
      const { data: company, error } = await supabase
        .from("companies")
        .select(
          `
          id,
          plan_key,
          subscription_status,
          trial_started_at,
          trial_ends_at,
          stripe_customer_id,
          stripe_subscription_id,
          billing_email,
          billing_updated_at
        `
        )
        .eq("id", profile.company_id)
        .single();

      if (error) {
        throw error;
      }

      const permissions = await loadBillingPermissions(company);

      setBillingPermissions(permissions);
    } catch (error) {
      console.error("Error loading billing permissions:", error);

      setBillingPermissions(null);
      setMessage({
        type: "warning",
        text:
          error.message ||
          "Billing limits could not be loaded. Please refresh the page.",
      });
    } finally {
      setLoadingBilling(false);
    }
  };

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
    loadBillingState();
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

    if (!editingClientId && loadingBilling) {
      setMessage({
        type: "warning",
        text: "Billing limits are still loading. Please try again in a moment.",
      });
      return;
    }

    if (!editingClientId && clientCreationBlocked) {
      setMessage({
        type: "warning",
        text: clientBlockReason,
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

      await loadBillingState();

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

  if (profileLoading || loadingClients || loadingBilling) {
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
    <>
      <style>
        {`
          .jp-clients-page {
            display: grid;
            gap: 22px;
          }

          .jp-clients-hero {
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: 1.3fr auto;
            gap: 22px;
            align-items: end;
            padding: 28px;
            border-radius: 34px;
            color: #ffffff;
            background:
              radial-gradient(circle at top right, rgba(245, 158, 11, 0.36), transparent 30%),
              linear-gradient(135deg, #020617, #1e40af);
            box-shadow: 0 26px 74px rgba(15, 23, 42, 0.24);
          }

          .jp-clients-eyebrow {
            display: inline-flex;
            margin-bottom: 12px;
            color: #bfdbfe;
            font-size: 0.76rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.13em;
          }

          .jp-clients-hero h1 {
            margin: 0;
            max-width: 760px;
            font-size: clamp(2.1rem, 5vw, 3.6rem);
            line-height: 0.94;
            font-weight: 950;
            letter-spacing: -0.07em;
          }

          .jp-clients-hero p {
            max-width: 680px;
            margin: 16px 0 0;
            color: #dbeafe;
            font-size: 1rem;
            line-height: 1.65;
            font-weight: 650;
          }

          .jp-clients-hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .jp-clients-hero-actions .btn {
            min-height: 44px;
            border-radius: 999px;
            font-weight: 900;
          }

          .jp-client-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .jp-client-stat {
            min-height: 128px;
            padding: 20px;
            border-radius: 24px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 16px 42px rgba(15, 23, 42, 0.07);
          }

          .jp-client-stat span {
            display: block;
            color: #64748b;
            font-size: 0.76rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jp-client-stat strong {
            display: block;
            margin-top: 10px;
            color: #0f172a;
            font-size: 2.15rem;
            line-height: 1;
            font-weight: 950;
            letter-spacing: -0.06em;
          }

          .jp-client-stat small {
            display: block;
            margin-top: 12px;
            color: #64748b;
            font-size: 0.82rem;
            font-weight: 650;
            line-height: 1.35;
          }

          .jp-client-stat.green {
            background: linear-gradient(180deg, #ffffff, #f0fdf4);
            border-color: rgba(22, 101, 52, 0.18);
          }

          .jp-client-stat.amber {
            background: linear-gradient(180deg, #ffffff, #fffbeb);
            border-color: rgba(245, 158, 11, 0.22);
          }

          .jp-client-stat.blue {
            background: linear-gradient(180deg, #ffffff, #eff6ff);
            border-color: rgba(30, 64, 175, 0.18);
          }

          .jp-clients-layout {
            display: grid;
            grid-template-columns: minmax(330px, 0.78fr) minmax(0, 1.22fr);
            gap: 20px;
            align-items: start;
          }

          .jp-clients-panel {
            padding: 22px;
            border-radius: 28px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
          }

          .jp-clients-panel.sticky {
            position: sticky;
            top: 96px;
          }

          .jp-clients-panel-header {
            margin-bottom: 18px;
          }

          .jp-clients-panel-header h2 {
            margin: 0;
            color: #0f172a;
            font-size: 1.3rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jp-clients-panel-header p {
            margin: 6px 0 0;
            color: #64748b;
            font-weight: 650;
            line-height: 1.45;
          }

          .jp-client-form-grid {
            display: grid;
            gap: 14px;
          }

          .jp-client-form-grid.two {
            grid-template-columns: 1fr 1fr;
          }

          .jp-client-form-grid.three {
            grid-template-columns: 1.2fr 0.8fr 0.8fr;
          }

          .jp-clients-page .form-label {
            color: #334155;
            font-size: 0.82rem;
            font-weight: 900;
          }

          .jp-clients-page .form-control,
          .jp-clients-page .form-select {
            min-height: 44px;
            border-radius: 14px;
            border-color: rgba(15, 23, 42, 0.14);
            font-weight: 650;
          }

          .jp-client-search-panel {
            display: grid;
            gap: 14px;
            margin-bottom: 16px;
          }

          .jp-client-filter-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .jp-client-filter {
            border: 1px solid rgba(15, 23, 42, 0.1);
            border-radius: 999px;
            padding: 8px 12px;
            color: #475569;
            background: #ffffff;
            font-size: 0.82rem;
            font-weight: 900;
          }

          .jp-client-filter.active {
            color: #1e40af;
            background: #eff6ff;
            border-color: rgba(30, 64, 175, 0.22);
          }

          .jp-client-card-grid {
            display: grid;
            gap: 14px;
          }

          .jp-client-card {
            overflow: hidden;
            border-radius: 24px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 14px 38px rgba(15, 23, 42, 0.06);
          }

          .jp-client-card-top {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 14px;
            padding: 18px;
            background: linear-gradient(180deg, #ffffff, #f8fafc);
          }

          .jp-client-card h3 {
            margin: 0;
            color: #0f172a;
            font-size: 1.05rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jp-client-card-subtitle {
            margin: 5px 0 0;
            color: #64748b;
            font-size: 0.88rem;
            font-weight: 750;
          }

          .jp-client-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
            margin-top: 12px;
          }

          .jp-client-badge {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            padding: 5px 8px;
            border-radius: 999px;
            font-size: 0.68rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .jp-client-badge.active {
            color: #166534;
            background: #f0fdf4;
            border: 1px solid rgba(22, 101, 52, 0.18);
          }

          .jp-client-badge.inactive {
            color: #475569;
            background: #f1f5f9;
            border: 1px solid rgba(15, 23, 42, 0.1);
          }

          .jp-client-badge.individual {
            color: #1e40af;
            background: #eff6ff;
            border: 1px solid rgba(30, 64, 175, 0.18);
          }

          .jp-client-badge.company,
          .jp-client-badge.property {
            color: #92400e;
            background: #fffbeb;
            border: 1px solid rgba(245, 158, 11, 0.22);
          }

          .jp-client-badge.agency {
            color: #6d28d9;
            background: #f5f3ff;
            border: 1px solid rgba(109, 40, 217, 0.18);
          }

          .jp-client-badge.site {
            color: #166534;
            background: #f0fdf4;
            border: 1px solid rgba(22, 101, 52, 0.18);
          }

          .jp-client-main-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-end;
          }

          .jp-client-main-actions .btn {
            min-width: 126px;
            border-radius: 999px;
            font-weight: 850;
          }

          .jp-client-details {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            padding: 0 18px 18px;
          }

          .jp-client-detail {
            padding: 12px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .jp-client-detail span {
            display: block;
            color: #64748b;
            font-size: 0.72rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.07em;
          }

          .jp-client-detail strong {
            display: block;
            margin-top: 4px;
            color: #0f172a;
            font-size: 0.88rem;
            font-weight: 850;
            word-break: break-word;
          }

          .jp-client-notes {
            display: grid;
            gap: 10px;
            padding: 0 18px 18px;
          }

          .jp-client-note {
            padding: 12px;
            border-radius: 16px;
            background: #fffbeb;
            border: 1px solid rgba(245, 158, 11, 0.18);
          }

          .jp-client-note.internal {
            background: #eff6ff;
            border-color: rgba(30, 64, 175, 0.16);
          }

          .jp-client-note strong {
            display: block;
            color: #0f172a;
            font-size: 0.78rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.07em;
          }

          .jp-client-note p {
            margin: 5px 0 0;
            color: #475569;
            font-size: 0.86rem;
            font-weight: 650;
            line-height: 1.45;
          }

          .jp-client-card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 14px 18px;
            border-top: 1px solid rgba(15, 23, 42, 0.07);
            background: #ffffff;
          }

          .jp-client-card-footer small {
            color: #64748b;
            font-weight: 650;
          }

          .jp-client-card-footer .btn {
            border-radius: 999px;
            font-weight: 850;
          }

          .jp-client-empty {
            display: grid;
            place-items: center;
            min-height: 240px;
            padding: 28px;
            border-radius: 24px;
            text-align: center;
            background: #f8fafc;
            border: 1px dashed rgba(15, 23, 42, 0.16);
          }

          .jp-client-empty h3 {
            color: #0f172a;
            font-weight: 950;
          }

          .jp-client-empty p {
            color: #64748b;
            font-weight: 650;
          }

          @media (max-width: 991px) {
            .jp-clients-hero,
            .jp-clients-layout {
              grid-template-columns: 1fr;
            }

            .jp-clients-panel.sticky {
              position: static;
            }

            .jp-client-stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 576px) {
            .jp-clients-page {
              gap: 18px;
            }

            .jp-clients-hero {
              padding: 22px;
              border-radius: 26px;
            }

            .jp-clients-hero h1 {
              font-size: 2.2rem;
            }

            .jp-clients-hero-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .jp-clients-hero-actions .btn {
              width: 100%;
            }

            .jp-client-stats-grid,
            .jp-client-form-grid.two,
            .jp-client-form-grid.three,
            .jp-client-details {
              grid-template-columns: 1fr;
            }

            .jp-clients-panel {
              padding: 18px;
              border-radius: 24px;
            }

            .jp-client-card-top {
              grid-template-columns: 1fr;
            }

            .jp-client-main-actions {
              align-items: stretch;
            }

            .jp-client-main-actions .btn {
              width: 100%;
            }

            .jp-client-card-footer {
              flex-direction: column;
              align-items: stretch;
            }

            .jp-client-card-footer .btn {
              width: 100%;
            }
          }
        `}
      </style>

      <section className="jp-clients-page">
        <div className="jp-clients-hero">
          <div>
            <span className="jp-clients-eyebrow">Client database</span>

            <h1>Clients & Job Sites</h1>

            <p>
              Manage saved clients, job locations, contact details, access
              notes and default service information for faster, cleaner reports.
            </p>
          </div>

          <div className="jp-clients-hero-actions">
            {clientCreationBlocked ? (
              <Link to="/billing" className="btn btn-light">
                Upgrade Plan
              </Link>
            ) : (
              <a href="#client-form" className="btn btn-light">
                Add Client
              </a>
            )}

            <Link to="/create-report" className="btn btn-outline-light">
              Create Report
            </Link>
          </div>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        <div className="jp-client-stats-grid">
          <StatCard
            label="Total clients"
            value={clients.length}
            helper="All saved client records"
          />

          <StatCard
            label="Plan usage"
            value={clientLimitLabel}
            helper="Current client allowance"
            tone={clientCreationBlocked ? "amber" : "blue"}
          />

          <StatCard
            label="Active clients"
            value={activeClientsCount}
            helper="Available for report autofill"
            tone="green"
          />

          <StatCard
            label="Companies"
            value={companyClientsCount}
            helper="Companies, agencies and managers"
            tone="amber"
          />

          <StatCard
            label="Job sites"
            value={jobSitesCount}
            helper="Specific saved work locations"
            tone="blue"
          />
        </div>

        <div className="jp-clients-layout">
          <form
            id="client-form"
            className="jp-clients-panel sticky"
            onSubmit={handleSaveClient}
          >
            <div className="jp-clients-panel-header">
              <h2>{editingClientId ? "Edit client" : "Add new client"}</h2>

              <p>
                Store the details your team needs for fast report creation and
                fewer manual entry errors.
              </p>
            </div>

            {clientCreationBlocked && (
              <div className="jp-client-limit-notice">
                <div>
                  <strong>Client limit reached</strong>
                  <p>{clientBlockReason}</p>
                  <p>Current usage: {clientLimitLabel}</p>
                </div>

                <div className="jp-client-limit-actions">
                  <Link to="/billing" className="btn btn-warning btn-sm">
                    Go to Billing
                  </Link>
                </div>
              </div>
            )}

            <div className="jp-client-form-grid">
              <div>
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
                  This is the searchable name used in reports.
                </small>
              </div>

              <div>
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

              <div>
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

              <div>
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

              <div className="jp-client-form-grid two">
                <div>
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

                <div>
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

              <div>
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

              <div className="jp-client-form-grid three">
                <div>
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

                <div>
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

                <div>
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

              <div>
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

              <div>
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

              <div>
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

              <div>
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

              <div className="form-check form-switch">
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

              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingClient || clientCreationBlocked}
                >
                  {savingClient
                    ? "Saving..."
                    : clientCreationBlocked
                    ? "Upgrade Required"
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

          <div>
            <div className="jp-clients-panel jp-client-search-panel">
              <div className="jp-clients-panel-header">
                <h2>Saved records</h2>

                <p>
                  Search, filter, edit and reuse client records when creating
                  reports.
                </p>
              </div>

              <div>
                <label htmlFor="clientSearch" className="form-label">
                  Search clients
                </label>

                <input
                  id="clientSearch"
                  type="search"
                  className="form-control"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, company, contact, email, phone, service or address..."
                />
              </div>

              <div className="jp-client-filter-row">
                {[
                  { value: "active", label: "Active" },
                  { value: "all", label: "All" },
                  { value: "inactive", label: "Inactive" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={
                      statusFilter === filter.value
                        ? "jp-client-filter active"
                        : "jp-client-filter"
                    }
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="jp-client-filter-row">
                <button
                  type="button"
                  className={
                    typeFilter === "all"
                      ? "jp-client-filter active"
                      : "jp-client-filter"
                  }
                  onClick={() => setTypeFilter("all")}
                >
                  All types
                </button>

                {CLIENT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      typeFilter === option.value
                        ? "jp-client-filter active"
                        : "jp-client-filter"
                    }
                    onClick={() => setTypeFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="jp-client-card-grid">
              {filteredClients.length === 0 ? (
                <div className="jp-client-empty">
                  <div>
                    <h3>No clients found</h3>

                    <p>
                      Create your first client or adjust your filters to see
                      more records.
                    </p>

                    <a href="#client-form" className="btn btn-primary">
                      Add Client
                    </a>
                  </div>
                </div>
              ) : (
                filteredClients.map((client) => (
                  <article className="jp-client-card" key={client.id}>
                    <div className="jp-client-card-top">
                      <div>
                        <h3>{client.client_display_name}</h3>

                        <p className="jp-client-card-subtitle">
                          {client.company_name || "No company name"} ·{" "}
                          {client.contact_person || "No contact person"}
                        </p>

                        <div className="jp-client-badges">
                          <span
                            className={`jp-client-badge ${
                              client.active ? "active" : "inactive"
                            }`}
                          >
                            {client.active ? "Active" : "Inactive"}
                          </span>

                          <span
                            className={`jp-client-badge ${getClientTypeClass(
                              client.client_type
                            )}`}
                          >
                            {formatClientTypeLabel(client.client_type)}
                          </span>

                          {client.access_notes && (
                            <span className="jp-client-badge company">
                              Access notes
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="jp-client-main-actions">
                        <Link
                          to={`/create-report?clientId=${client.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          Use in Report
                        </Link>

                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleEditClient(client)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="jp-client-details">
                      <div className="jp-client-detail">
                        <span>Email</span>
                        <strong>{client.email || "No email"}</strong>
                      </div>

                      <div className="jp-client-detail">
                        <span>Phone</span>
                        <strong>{client.phone || "No phone"}</strong>
                      </div>

                      <div className="jp-client-detail">
                        <span>Default service</span>
                        <strong>
                          {client.default_service_type || "No default service"}
                        </strong>
                      </div>

                      <div className="jp-client-detail">
                        <span>Location</span>
                        <strong>
                          {client.job_address || "No address"}
                          {client.suburb ? `, ${client.suburb}` : ""}
                          {client.state ? ` ${client.state}` : ""}
                          {client.postcode ? ` ${client.postcode}` : ""}
                        </strong>
                      </div>
                    </div>

                    {(client.access_notes || client.internal_notes) && (
                      <div className="jp-client-notes">
                        {client.access_notes && (
                          <div className="jp-client-note">
                            <strong>Access notes</strong>
                            <p>{client.access_notes}</p>
                          </div>
                        )}

                        {client.internal_notes && (
                          <div className="jp-client-note internal">
                            <strong>Internal notes</strong>
                            <p>{client.internal_notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="jp-client-card-footer">
                      <small>Created {formatDate(client.created_at)}</small>

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
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Clients;

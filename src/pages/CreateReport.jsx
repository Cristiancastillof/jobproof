import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ReportForm from "../components/ReportForm";
import ReportPreview from "../components/ReportPreview";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { calculateTotalHours } from "../utils/calculateTotalHours";
import { generatePDF } from "../utils/generatePDF";
import { recordReportActivity } from "../utils/reportActivity";

const LOCAL_REPORTS_KEY = "jobproofReports";
const REPORT_PHOTOS_BUCKET = "report-photos";

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const getYear = () => {
  return new Date().getFullYear();
};

const createEmptyReport = () => ({
  id: "",
  reportNumber: "",
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessLogo: "",
  workerName: "",
  createdBy: "",

  clientId: "",
  clientDisplayName: "",
  clientCompanyName: "",
  clientContactPerson: "",
  clientEmail: "",
  clientPhone: "",
  clientAddressSnapshot: "",
  clientAccessNotes: "",

  teamInvolved: [],
  clientName: "",
  jobAddress: "",
  jobDate: getTodayDate(),
  startingHour: "",
  finishHour: "",
  totalHours: "",
  serviceType: "",
  workCompleted: "",
  issuesFound: "",
  recommendations: "",

  internalNotes: "",
  supervisorNotes: "",
  completionNotes: "",

  status: "pending",
  beforePhotos: [],
  afterPhotos: [],
  createdAt: "",
  updatedAt: "",
});

const createEmptyPhotoFiles = () => ({
  beforePhotos: [],
  afterPhotos: [],
});

const getStatusOptionsByRole = (role) => {
  if (role === "admin" || role === "supervisor") {
    return [
      {
        value: "pending",
        label: "Pending",
        helper: "Job created, still waiting for review or completion.",
      },
      {
        value: "checked",
        label: "Checked",
        helper: "Job reviewed and ready to be closed.",
      },
      {
        value: "completed",
        label: "Completed",
        helper: "Job finished and officially closed.",
      },
    ];
  }

  return [
    {
      value: "pending",
      label: "Pending",
      helper: "Job created, still waiting for review.",
    },
    {
      value: "checked",
      label: "Checked",
      helper: "Job reviewed and ready for supervisor/admin completion.",
    },
  ];
};

const buildClientAddress = (client) => {
  if (!client) return "";

  return [
    client.job_address,
    client.suburb,
    client.state,
    client.postcode,
    client.country,
  ]
    .filter(Boolean)
    .join(", ");
};

const applyClientToReportData = (baseReportData, selectedClient) => {
  if (!selectedClient) return baseReportData;

  const addressSnapshot = buildClientAddress(selectedClient);

  const clientName =
    selectedClient.client_display_name ||
    selectedClient.contact_person ||
    selectedClient.company_name ||
    "";

  return {
    ...baseReportData,
    clientId: selectedClient.id,
    clientDisplayName: selectedClient.client_display_name || "",
    clientCompanyName: selectedClient.company_name || "",
    clientContactPerson: selectedClient.contact_person || "",
    clientEmail: selectedClient.email || "",
    clientPhone: selectedClient.phone || "",
    clientAddressSnapshot: addressSnapshot,
    clientAccessNotes: selectedClient.access_notes || "",
    clientName,
    jobAddress: addressSnapshot || baseReportData.jobAddress,
    serviceType:
      selectedClient.default_service_type || baseReportData.serviceType,
  };
};

const mapSupabaseReportToForm = ({
  report,
  company,
  workerName,
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
    workerName: workerName || "",
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

    teamInvolved,
    clientName: report.client_name || report.client_display_name || "",
    jobAddress: report.job_address || report.client_address_snapshot || "",
    jobDate: report.job_date || getTodayDate(),
    startingHour: report.starting_hour ? report.starting_hour.slice(0, 5) : "",
    finishHour: report.finish_hour ? report.finish_hour.slice(0, 5) : "",
    totalHours: report.total_hours || "",
    serviceType: report.service_type || "",
    workCompleted: report.work_completed || "",
    issuesFound: report.issues_found || "",
    recommendations: report.recommendations || "",

    internalNotes: report.internal_notes || "",
    supervisorNotes: report.supervisor_notes || "",
    completionNotes: report.completion_notes || "",

    status: report.status || "pending",
    beforePhotos,
    afterPhotos,
    createdAt: report.created_at || "",
    updatedAt: report.updated_at || "",
  };
};

const buildSupabasePayload = ({ reportData, profile, user }) => ({
  company_id: profile.company_id,
  created_by: user.id,
  report_number: reportData.reportNumber,

  client_id: reportData.clientId || null,
  client_display_name: reportData.clientDisplayName || reportData.clientName,
  client_company_name: reportData.clientCompanyName,
  client_contact_person: reportData.clientContactPerson,
  client_email: reportData.clientEmail,
  client_phone: reportData.clientPhone,
  client_address_snapshot:
    reportData.clientAddressSnapshot || reportData.jobAddress,
  client_access_notes: reportData.clientAccessNotes,

  client_name: reportData.clientName,
  job_address: reportData.jobAddress,
  job_date: reportData.jobDate || null,
  starting_hour: reportData.startingHour || null,
  finish_hour: reportData.finishHour || null,
  total_hours:
    reportData.totalHours ||
    calculateTotalHours(reportData.startingHour, reportData.finishHour),
  service_type: reportData.serviceType,
  work_completed: reportData.workCompleted,
  issues_found: reportData.issuesFound,
  recommendations: reportData.recommendations,

  internal_notes: reportData.internalNotes || "",
  supervisor_notes: reportData.supervisorNotes || "",
  completion_notes: reportData.completionNotes || "",

  status: reportData.status || "pending",
  updated_at: new Date().toISOString(),
});

const getLocalReports = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY)) || [];
  } catch (error) {
    console.error("Error reading local reports:", error);
    return [];
  }
};

const saveLocalReportCopy = (reportToSave) => {
  const currentReports = getLocalReports();

  const existingIndex = currentReports.findIndex(
    (report) => report.id === reportToSave.id
  );

  let updatedReports;

  if (existingIndex >= 0) {
    updatedReports = currentReports.map((report) =>
      report.id === reportToSave.id ? reportToSave : report
    );
  } else {
    updatedReports = [reportToSave, ...currentReports];
  }

  localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updatedReports));
};

const generateReportNumber = async (companyId) => {
  const year = getYear();
  const prefix = `JP-${year}`;

  const { count, error } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .ilike("report_number", `${prefix}-%`);

  if (error) {
    console.error("Error generating report number:", error);
    return `${prefix}-${String(Date.now()).slice(-4)}`;
  }

  return `${prefix}-${String((count || 0) + 1).padStart(4, "0")}`;
};

const getStoragePathFromPublicUrl = (publicUrl) => {
  if (!publicUrl || typeof publicUrl !== "string") return null;

  const marker = `/${REPORT_PHOTOS_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) return null;

  const pathWithPossibleQuery = publicUrl.slice(markerIndex + marker.length);
  const cleanPath = pathWithPossibleQuery.split("?")[0];

  try {
    return decodeURIComponent(cleanPath);
  } catch {
    return cleanPath;
  }
};

const getFileExtension = (file) => {
  const extensionFromName = file.name?.split(".").pop();

  if (extensionFromName && extensionFromName.length <= 5) {
    return extensionFromName.toLowerCase();
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
};

const getRoleOnJob = (member, creatorId) => {
  if (member.id === creatorId) return "lead";
  if (member.role === "supervisor") return "supervisor";
  return "worker";
};

const PreviewModal = ({ reportData, onClose, onDownloadPDF }) => {
  if (!reportData) return null;

  return (
    <div className="cr-preview-backdrop" role="dialog" aria-modal="true">
      <div className="cr-preview-modal">
        <div className="cr-preview-header">
          <div>
            <span>Report preview</span>
            <h2>{reportData.reportNumber || "Job report"}</h2>
          </div>

          <button type="button" className="cr-preview-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="cr-preview-body">
          <ReportPreview reportData={reportData} />
        </div>

        <div className="cr-preview-footer">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="btn btn-success"
            onClick={onDownloadPDF}
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, displayName, profileLoading } = useAuth();

  const clientIdFromUrl = searchParams.get("clientId");

  const isEditMode = Boolean(id);
  const statusOptions = getStatusOptionsByRole(profile?.role);

  const [reportData, setReportData] = useState(createEmptyReport);
  const [photoFiles, setPhotoFiles] = useState(createEmptyPhotoFiles);
  const [company, setCompany] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [loadingReport, setLoadingReport] = useState(true);
  const [savingReport, setSavingReport] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const isWorker = profile?.role === "worker";
  const isCompletedReport = reportData?.status === "completed";
  const workerCannotEditCompletedReport = isWorker && isCompletedReport;

  const canCreateReport = useMemo(() => {
    return Boolean(user?.id && profile?.company_id);
  }, [user, profile]);

  const normalizeSelectedWorkerIds = (workerIds = []) => {
    const uniqueIds = Array.from(new Set(workerIds.filter(Boolean)));

    if (user?.id && !uniqueIds.includes(user.id)) {
      return [user.id, ...uniqueIds];
    }

    return uniqueIds;
  };

  const loadActiveClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select(
        `
        id,
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
        active
      `
      )
      .eq("company_id", profile.company_id)
      .eq("active", true)
      .order("client_display_name", { ascending: true });

    if (error) {
      throw error;
    }

    const loadedClients = data || [];
    setClients(loadedClients);

    return loadedClients;
  };

  useEffect(() => {
    const loadCompanyAndReport = async () => {
      if (profileLoading) return;

      if (!user?.id) {
        setLoadingReport(false);
        return;
      }

      if (!profile?.company_id) {
        setLoadingReport(false);
        setMessage({
          type: "warning",
          text: "Please complete your Business Profile before creating reports.",
        });
        return;
      }

      setLoadingReport(true);
      setMessage(null);
      setPhotoFiles(createEmptyPhotoFiles());

      try {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select(
            "id, business_name, business_email, business_phone, business_logo_url"
          )
          .eq("id", profile.company_id)
          .single();

        if (companyError) {
          throw companyError;
        }

        setCompany(companyData);

        const { data: membersData, error: membersError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, active")
          .eq("company_id", profile.company_id)
          .eq("active", true)
          .order("full_name", { ascending: true });

        if (membersError) {
          throw membersError;
        }

        const loadedMembers = membersData || [];
        setTeamMembers(loadedMembers);

        const loadedClients = await loadActiveClients();

        if (isEditMode) {
          let reportQuery = supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .eq("company_id", profile.company_id);

          if (profile.role === "worker") {
            reportQuery = reportQuery.eq("created_by", user.id);
          }

          const { data: existingReport, error: reportError } =
            await reportQuery.single();

          if (reportError) {
            throw reportError;
          }

          const { data: existingPhotos, error: photosError } = await supabase
            .from("report_photos")
            .select("id, photo_type, photo_url, photo_order")
            .eq("report_id", id)
            .eq("company_id", profile.company_id)
            .order("photo_order", { ascending: true });

          if (photosError) {
            throw photosError;
          }

          const { data: existingReportWorkers, error: workersError } =
            await supabase
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

          const existingWorkerIds = (existingReportWorkers || []).map(
            (worker) => worker.profile_id
          );

          const normalizedWorkerIds = normalizeSelectedWorkerIds(
            existingWorkerIds.length > 0
              ? existingWorkerIds
              : [existingReport.created_by]
          );

          setSelectedWorkerIds(normalizedWorkerIds);

          const mappedTeamInvolved = (existingReportWorkers || [])
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
            mapSupabaseReportToForm({
              report: existingReport,
              company: companyData,
              workerName: displayName,
              photos: existingPhotos || [],
              teamInvolved: mappedTeamInvolved,
            })
          );
        } else {
          const reportNumber = await generateReportNumber(profile.company_id);
          const initialSelectedWorkers = normalizeSelectedWorkerIds([user.id]);

          setSelectedWorkerIds(initialSelectedWorkers);

          const initialTeamInvolved = loadedMembers
            .filter((member) => initialSelectedWorkers.includes(member.id))
            .map((member) => ({
              id: member.id,
              fullName: member.full_name || "Unknown user",
              email: member.email || "",
              role: member.role || "worker",
              roleOnJob: member.id === user.id ? "lead" : "worker",
            }));

          const baseNewReport = {
            ...createEmptyReport(),
            reportNumber,
            businessName: companyData.business_name || "",
            businessEmail: companyData.business_email || "",
            businessPhone: companyData.business_phone || "",
            businessLogo: companyData.business_logo_url || "",
            workerName: displayName || "",
            createdBy: user.id,
            teamInvolved: initialTeamInvolved,
            status: "pending",
            jobDate: getTodayDate(),
          };

          const selectedClientFromUrl = clientIdFromUrl
            ? loadedClients.find((client) => client.id === clientIdFromUrl)
            : null;

          const reportWithClient = selectedClientFromUrl
            ? applyClientToReportData(baseNewReport, selectedClientFromUrl)
            : baseNewReport;

          setReportData(reportWithClient);

          if (clientIdFromUrl && !selectedClientFromUrl) {
            setMessage({
              type: "warning",
              text: "The selected client could not be found or is no longer active.",
            });
          }

          if (selectedClientFromUrl) {
            setMessage({
              type: "success",
              text: `${selectedClientFromUrl.client_display_name} was loaded into this report.`,
            });

            const nextSearchParams = new URLSearchParams(searchParams);
            nextSearchParams.delete("clientId");
            setSearchParams(nextSearchParams, { replace: true });
          }
        }
      } catch (error) {
        console.error("Error loading report data:", error);

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

    loadCompanyAndReport();
  }, [id, isEditMode, user, profile, profileLoading, displayName]);

  useEffect(() => {
    if (!user?.id || teamMembers.length === 0) return;

    const normalizedWorkerIds = normalizeSelectedWorkerIds(selectedWorkerIds);

    if (normalizedWorkerIds.join(",") !== selectedWorkerIds.join(",")) {
      setSelectedWorkerIds(normalizedWorkerIds);
      return;
    }

    const teamInvolved = teamMembers
      .filter((member) => normalizedWorkerIds.includes(member.id))
      .map((member) => ({
        id: member.id,
        fullName: member.full_name || "Unknown user",
        email: member.email || "",
        role: member.role || "worker",
        roleOnJob: getRoleOnJob(member, reportData.createdBy || user.id),
      }))
      .sort((a, b) => {
        if (a.roleOnJob === "lead") return -1;
        if (b.roleOnJob === "lead") return 1;
        return a.fullName.localeCompare(b.fullName);
      });

    setReportData((currentReportData) => ({
      ...currentReportData,
      teamInvolved,
    }));
  }, [selectedWorkerIds, teamMembers, user?.id, reportData.createdBy]);

  const handleSelectClient = (clientId) => {
    if (!clientId) {
      setReportData((currentReportData) => ({
        ...currentReportData,
        clientId: "",
        clientDisplayName: "",
        clientCompanyName: "",
        clientContactPerson: "",
        clientEmail: "",
        clientPhone: "",
        clientAddressSnapshot: "",
        clientAccessNotes: "",
        clientName: "",
        jobAddress: "",
        serviceType: "",
      }));

      return;
    }

    const selectedClient = clients.find((client) => client.id === clientId);

    if (!selectedClient) return;

    setReportData((currentReportData) =>
      applyClientToReportData(currentReportData, selectedClient)
    );
  };

  const deleteRemovedSupabasePhotos = async (reportId, currentReportData) => {
    const { data: savedPhotos, error } = await supabase
      .from("report_photos")
      .select("id, photo_type, photo_url")
      .eq("report_id", reportId)
      .eq("company_id", profile.company_id);

    if (error) {
      throw error;
    }

    const currentPhotoUrls = [
      ...(currentReportData.beforePhotos || []),
      ...(currentReportData.afterPhotos || []),
    ].filter((photo) => typeof photo === "string" && photo.startsWith("http"));

    const photosToDelete = (savedPhotos || []).filter(
      (photo) => !currentPhotoUrls.includes(photo.photo_url)
    );

    if (photosToDelete.length === 0) return;

    const storagePathsToDelete = photosToDelete
      .map((photo) => getStoragePathFromPublicUrl(photo.photo_url))
      .filter(Boolean);

    if (storagePathsToDelete.length > 0) {
      const { error: storageDeleteError } = await supabase.storage
        .from(REPORT_PHOTOS_BUCKET)
        .remove(storagePathsToDelete);

      if (storageDeleteError) {
        throw storageDeleteError;
      }
    }

    const { error: deleteRowsError } = await supabase
      .from("report_photos")
      .delete()
      .in(
        "id",
        photosToDelete.map((photo) => photo.id)
      );

    if (deleteRowsError) {
      throw deleteRowsError;
    }
  };

  const uploadPhotosToSupabase = async (reportId, currentReportData) => {
    const uploadGroup = async (photoType, dbPhotoType) => {
      const newPhotos = photoFiles[photoType] || [];

      if (newPhotos.length === 0) {
        return currentReportData[photoType] || [];
      }

      const uploadedUrls = [];

      for (let index = 0; index < newPhotos.length; index += 1) {
        const photo = newPhotos[index];
        const extension = getFileExtension(photo.file);

        const filePath = `${
          profile.company_id
        }/${reportId}/${dbPhotoType}-${Date.now()}-${index}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(REPORT_PHOTOS_BUCKET)
          .upload(filePath, photo.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: photo.file.type || "image/jpeg",
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from(REPORT_PHOTOS_BUCKET)
          .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        const photoOrder = (currentReportData[photoType] || []).length + index;

        const { error: insertPhotoError } = await supabase
          .from("report_photos")
          .insert({
            report_id: reportId,
            company_id: profile.company_id,
            photo_type: dbPhotoType,
            photo_url: publicUrl,
            photo_order: photoOrder,
          });

        if (insertPhotoError) {
          throw insertPhotoError;
        }

        uploadedUrls.push({
          previewUrl: photo.previewUrl,
          publicUrl,
        });
      }

      return (currentReportData[photoType] || []).map((photoUrl) => {
        const uploadedPhoto = uploadedUrls.find(
          (photo) => photo.previewUrl === photoUrl
        );

        return uploadedPhoto ? uploadedPhoto.publicUrl : photoUrl;
      });
    };

    const beforePhotos = await uploadGroup("beforePhotos", "before");
    const afterPhotos = await uploadGroup("afterPhotos", "after");

    return {
      ...currentReportData,
      beforePhotos,
      afterPhotos,
    };
  };

  const syncReportWorkers = async (reportId, createdBy) => {
    const normalizedWorkerIds = normalizeSelectedWorkerIds(selectedWorkerIds);

    const selectedMembers = teamMembers.filter((member) =>
      normalizedWorkerIds.includes(member.id)
    );

    const { error: deleteError } = await supabase
      .from("report_workers")
      .delete()
      .eq("report_id", reportId)
      .eq("company_id", profile.company_id);

    if (deleteError) {
      throw deleteError;
    }

    if (selectedMembers.length === 0) {
      return [];
    }

    const rowsToInsert = selectedMembers.map((member) => ({
      report_id: reportId,
      company_id: profile.company_id,
      profile_id: member.id,
      role_on_job: getRoleOnJob(member, createdBy),
    }));

    const { error: insertError } = await supabase
      .from("report_workers")
      .insert(rowsToInsert);

    if (insertError) {
      throw insertError;
    }

    return selectedMembers
      .map((member) => ({
        id: member.id,
        fullName: member.full_name || "Unknown user",
        email: member.email || "",
        role: member.role || "worker",
        roleOnJob: getRoleOnJob(member, createdBy),
      }))
      .sort((a, b) => {
        if (a.roleOnJob === "lead") return -1;
        if (b.roleOnJob === "lead") return 1;
        return a.fullName.localeCompare(b.fullName);
      });
  };

  const handleSaveReport = async () => {
    if (workerCannotEditCompletedReport) {
      setMessage({
        type: "warning",
        text: "This report is completed. Workers cannot edit completed reports. Please contact a supervisor or admin.",
      });
      return;
    }

    if (isWorker && reportData.status === "completed") {
      setMessage({
        type: "warning",
        text: "Workers cannot mark reports as Completed. Please set the report to Pending or Checked.",
      });
      return;
    }

    if (!canCreateReport) {
      setMessage({
        type: "warning",
        text: "Please complete your Business Profile before saving reports.",
      });
      return;
    }

    if (!reportData.clientName.trim()) {
      setMessage({
        type: "warning",
        text: "Please enter the client name before saving.",
      });
      return;
    }

    setSavingReport(true);
    setMessage({
      type: "info",
      text: "Saving report...",
    });

    try {
      const finalTotalHours =
        reportData.totalHours ||
        calculateTotalHours(reportData.startingHour, reportData.finishHour);

      const payload = buildSupabasePayload({
        reportData: {
          ...reportData,
          totalHours: finalTotalHours,
          status: reportData.status || "pending",
        },
        profile,
        user,
      });

      let savedReport;

      if (isEditMode) {
        let updateQuery = supabase
          .from("reports")
          .update(payload)
          .eq("id", id)
          .eq("company_id", profile.company_id);

        if (profile.role === "worker") {
          updateQuery = updateQuery.eq("created_by", user.id);
        }

        const { data, error } = await updateQuery.select("*").single();

        if (error) throw error;

        savedReport = data;

        await recordReportActivity({
          reportId: savedReport.id,
          companyId: profile.company_id,
          actorId: user.id,
          activityType: "report_updated",
          newValue: savedReport.status || "pending",
          activityNote: "Report updated.",
        });
      } else {
        const { data, error } = await supabase
          .from("reports")
          .insert({
            ...payload,
            status: reportData.status || "pending",
            created_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (error) throw error;

        savedReport = data;

        await recordReportActivity({
          reportId: savedReport.id,
          companyId: profile.company_id,
          actorId: user.id,
          activityType: "report_created",
          newValue: savedReport.status || "pending",
          activityNote: "Report created.",
        });
      }

      await deleteRemovedSupabasePhotos(savedReport.id, reportData);

      const reportWithUploadedPhotos = await uploadPhotosToSupabase(
        savedReport.id,
        reportData
      );

      const savedTeamInvolved = await syncReportWorkers(
        savedReport.id,
        savedReport.created_by
      );

      const finalReportData = {
        ...reportWithUploadedPhotos,
        id: savedReport.id,
        reportNumber: savedReport.report_number,
        businessName: company?.business_name || reportData.businessName,
        businessEmail: company?.business_email || reportData.businessEmail,
        businessPhone: company?.business_phone || reportData.businessPhone,
        businessLogo: company?.business_logo_url || reportData.businessLogo,
        workerName: displayName || reportData.workerName,
        createdBy: savedReport.created_by,

        clientId: savedReport.client_id || "",
        clientDisplayName:
          savedReport.client_display_name || reportData.clientDisplayName,
        clientCompanyName:
          savedReport.client_company_name || reportData.clientCompanyName,
        clientContactPerson:
          savedReport.client_contact_person || reportData.clientContactPerson,
        clientEmail: savedReport.client_email || reportData.clientEmail,
        clientPhone: savedReport.client_phone || reportData.clientPhone,
        clientAddressSnapshot:
          savedReport.client_address_snapshot ||
          reportData.clientAddressSnapshot,
        clientAccessNotes:
          savedReport.client_access_notes || reportData.clientAccessNotes,

        internalNotes: savedReport.internal_notes || "",
        supervisorNotes: savedReport.supervisor_notes || "",
        completionNotes: savedReport.completion_notes || "",

        teamInvolved: savedTeamInvolved,
        status: savedReport.status || "pending",
        totalHours: savedReport.total_hours || finalTotalHours,
        createdAt: savedReport.created_at,
        updatedAt: savedReport.updated_at,
      };

      setReportData(finalReportData);
      setSelectedWorkerIds(savedTeamInvolved.map((member) => member.id));
      setPhotoFiles(createEmptyPhotoFiles());
      saveLocalReportCopy(finalReportData);

      const hasNewPhotos =
        photoFiles.beforePhotos.length > 0 || photoFiles.afterPhotos.length > 0;

      setMessage({
        type: "success",
        text: hasNewPhotos
          ? "Report saved successfully with photos."
          : isEditMode
          ? "Report updated successfully."
          : "Report saved successfully.",
      });

      if (!isEditMode) {
        navigate(`/edit-report/${savedReport.id}`, { replace: true });
      }
    } catch (error) {
      console.error("Error saving report:", error);

      setMessage({
        type: "danger",
        text:
          error.message ||
          "There was an error saving this report. Please check your permissions and try again.",
      });
    } finally {
      setSavingReport(false);
    }
  };

  const handleDownloadPDF = () => {
    generatePDF(reportData);
  };

  const handleClearForm = async () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear this form?"
    );

    if (!confirmClear) return;

    const reportNumber = canCreateReport
      ? await generateReportNumber(profile.company_id)
      : "";

    const initialSelectedWorkers = normalizeSelectedWorkerIds([user.id]);

    const initialTeamInvolved = teamMembers
      .filter((member) => initialSelectedWorkers.includes(member.id))
      .map((member) => ({
        id: member.id,
        fullName: member.full_name || "Unknown user",
        email: member.email || "",
        role: member.role || "worker",
        roleOnJob: member.id === user.id ? "lead" : "worker",
      }));

    setSelectedWorkerIds(initialSelectedWorkers);

    setReportData({
      ...createEmptyReport(),
      reportNumber,
      businessName: company?.business_name || "",
      businessEmail: company?.business_email || "",
      businessPhone: company?.business_phone || "",
      businessLogo: company?.business_logo_url || "",
      workerName: displayName || "",
      createdBy: user.id,
      teamInvolved: initialTeamInvolved,
      status: "pending",
      jobDate: getTodayDate(),
    });

    setPhotoFiles(createEmptyPhotoFiles());

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("clientId");
    setSearchParams(nextSearchParams, { replace: true });

    setMessage(null);
  };

  if (loadingReport || profileLoading) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading report workspace</h1>

        <p className="text-muted mb-0">
          Please wait while JobProof prepares your report.
        </p>
      </section>
    );
  }

  if (!profile?.company_id) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <h1 className="h3 mb-3">Business Profile required</h1>

            <p className="text-muted mb-4">
              Before creating reports, you need to complete your company profile.
              This information will be added automatically to every report.
            </p>

            <Link to="/business-profile" className="btn btn-primary">
              Complete Business Profile
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (message?.type === "danger" && isEditMode && !reportData?.id) {
    return (
      <section className="py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5 text-center">
            <p className="eyebrow mb-2">Edit report</p>

            <h1 className="h3 mb-3">Report not available</h1>

            <p className="text-muted mb-4">
              {message.text ||
                "This report could not be found or you do not have permission to edit it."}
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
          .cr-preview-backdrop {
            position: fixed;
            inset: 0;
            z-index: 3000;
            display: grid;
            place-items: center;
            padding: 18px;
            background: rgba(15, 23, 42, 0.72);
            backdrop-filter: blur(10px);
          }

          .cr-preview-modal {
            width: min(1120px, 100%);
            max-height: 92vh;
            display: grid;
            grid-template-rows: auto minmax(0, 1fr) auto;
            overflow: hidden;
            border-radius: 28px;
            background: #f8fafc;
            box-shadow: 0 28px 80px rgba(0, 0, 0, 0.34);
          }

          .cr-preview-header,
          .cr-preview-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 18px 22px;
            background: #ffffff;
            border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          }

          .cr-preview-footer {
            border-top: 1px solid rgba(15, 23, 42, 0.08);
            border-bottom: 0;
          }

          .cr-preview-header span {
            display: block;
            color: #64748b;
            font-size: 0.72rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .cr-preview-header h2 {
            margin: 4px 0 0;
            color: #0f172a;
            font-size: 1.15rem;
            font-weight: 950;
          }

          .cr-preview-close {
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

          .cr-preview-body {
            overflow: auto;
            padding: 18px;
          }

          .cr-preview-body .report-preview {
            margin: 0 auto;
          }

          @media (max-width: 576px) {
            .desktop-report-actions {
              display: none !important;
            }

            .cr-preview-modal {
              max-height: 94vh;
              border-radius: 22px;
            }

            .cr-preview-header,
            .cr-preview-footer {
              flex-direction: column;
              align-items: flex-start;
            }

            .cr-preview-footer .btn {
              width: 100%;
            }
          }
        `}
      </style>

      <section>
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
          <div>
            <p className="eyebrow mb-2">
              {isEditMode ? "Edit report" : "Create report"}
            </p>

            <h1 className="section-title mb-2">
              {isEditMode ? "Update job report" : "Create a new job report"}
            </h1>

            <p className="section-subtitle mb-0">
              Company details are loaded automatically from your Business Profile.
            </p>
          </div>

          <div className="desktop-report-actions d-flex gap-2 flex-wrap">
            <button
              className="btn btn-primary"
              onClick={handleSaveReport}
              disabled={savingReport || workerCannotEditCompletedReport}
            >
              {savingReport
                ? "Saving..."
                : isEditMode
                ? "Update Report"
                : "Save Report"}
            </button>

            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => setShowPreviewModal(true)}
              disabled={savingReport}
            >
              Preview Report
            </button>

            <button
              type="button"
              className="btn btn-success"
              onClick={handleDownloadPDF}
              disabled={savingReport}
            >
              Download PDF
            </button>

            <button
              className="btn btn-outline-danger"
              onClick={handleClearForm}
              disabled={savingReport}
            >
              Clear Form
            </button>
          </div>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        {message && (
          <div
            className={`alert alert-${message.type} mobile-save-message d-lg-none`}
            role="alert"
          >
            {message.text}
          </div>
        )}

        {workerCannotEditCompletedReport && (
          <div className="alert alert-warning" role="alert">
            This report is completed. Workers can view it, but only supervisors or
            admins can edit completed reports.
          </div>
        )}

        <div className="row g-4">
          <div className="col-12">
            <ReportForm
              reportData={reportData}
              setReportData={setReportData}
              photoFiles={photoFiles}
              setPhotoFiles={setPhotoFiles}
              teamMembers={teamMembers}
              selectedWorkerIds={selectedWorkerIds}
              setSelectedWorkerIds={setSelectedWorkerIds}
              statusOptions={statusOptions}
              clients={clients}
              onSelectClient={handleSelectClient}
            />
          </div>
        </div>

        <div className="mobile-report-action-bar">
          <button
            className="btn btn-primary"
            onClick={handleSaveReport}
            disabled={savingReport || workerCannotEditCompletedReport}
          >
            {savingReport ? "Saving..." : isEditMode ? "Update" : "Save"}
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => setShowPreviewModal(true)}
            disabled={savingReport}
          >
            Preview
          </button>

          <button
            className="btn btn-success"
            onClick={handleDownloadPDF}
            disabled={savingReport}
          >
            PDF
          </button>
        </div>

        {showPreviewModal && (
          <PreviewModal
            reportData={reportData}
            onClose={() => setShowPreviewModal(false)}
            onDownloadPDF={handleDownloadPDF}
          />
        )}
      </section>
    </>
  );
};

export default CreateReport;
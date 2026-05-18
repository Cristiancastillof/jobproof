import { getPublicReportUrl } from "./publicLinks";

const formatValue = (value, fallback = "Not provided") => {
  if (!value || String(value).trim() === "") return fallback;
  return String(value).trim();
};

const getClientName = (reportData) => {
  return (
    reportData.clientContactPerson ||
    reportData.client_contact_person ||
    reportData.clientDisplayName ||
    reportData.client_display_name ||
    reportData.clientName ||
    reportData.client_name ||
    "there"
  );
};

const getReportNumber = (reportData) => {
  return reportData.reportNumber || reportData.report_number || "Not provided";
};

const getJobAddress = (reportData) => {
  return (
    reportData.clientAddressSnapshot ||
    reportData.client_address_snapshot ||
    reportData.jobAddress ||
    reportData.job_address ||
    "Not provided"
  );
};

const getServiceType = (reportData) => {
  return reportData.serviceType || reportData.service_type || "Not provided";
};

const getBusinessName = (reportData, fallback = "our team") => {
  return reportData.businessName || reportData.business_name || fallback;
};

const getPublicToken = (reportData) => {
  return reportData.publicShareToken || reportData.public_share_token || "";
};

export const buildClientReportMessage = (reportData) => {
  const clientName = getClientName(reportData);
  const businessName = getBusinessName(reportData);
  const publicUrl = getPublicReportUrl(getPublicToken(reportData));

  return [
    `Hi ${clientName},`,
    "",
    `Your job report has been completed by ${businessName}.`,
    "",
    `Report number: ${getReportNumber(reportData)}`,
    `Job address: ${getJobAddress(reportData)}`,
    `Service: ${getServiceType(reportData)}`,
    "",
    publicUrl
      ? `You can view your completed report here: ${publicUrl}`
      : "Your completed report is ready to view.",
    "",
    "Thank you,",
    businessName,
  ].join("\n");
};

export const buildClientReportEmailSubject = (reportData) => {
  const reportNumber = getReportNumber(reportData);
  const businessName = getBusinessName(reportData, "JobProof");

  return `${businessName} - Completed job report ${formatValue(
    reportNumber,
    ""
  )}`.trim();
};

export const buildClientReportMailtoLink = (reportData) => {
  const email = reportData.clientEmail || reportData.client_email || "";
  const subject = buildClientReportEmailSubject(reportData);
  const body = buildClientReportMessage(reportData);

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

export const copyClientReportMessage = async (reportData) => {
  const message = buildClientReportMessage(reportData);

  if (!navigator?.clipboard) {
    window.prompt("Copy this message:", message);
    return;
  }

  await navigator.clipboard.writeText(message);
};


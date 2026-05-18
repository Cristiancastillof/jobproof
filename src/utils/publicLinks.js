const getConfiguredAppUrl = () => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "";
};

export const getPublicReportUrl = (token) => {
  if (!token) return "";

  const appUrl = getConfiguredAppUrl();

  if (!appUrl) return "";

  return `${appUrl}/reports/client/${token}`;
};
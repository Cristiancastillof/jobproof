export const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || "support@jobproof.app";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

export const getPublicAppUrl = () => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL;
  const baseUrl =
    configuredUrl ||
    (typeof window !== "undefined" ? window.location.origin : "");

  return baseUrl.replace(/\/+$/, "");
};

export const getPasswordResetRedirectUrl = () => {
  return `${getPublicAppUrl()}/reset-password`;
};

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || "CRM",
  supportWhatsApp: import.meta.env.VITE_SUPPORT_WHATSAPP || "972553123658",
  supportSiteUrl: import.meta.env.VITE_SUPPORT_SITE_URL || "https://xflow.co.il/",
  quoteBrandName: import.meta.env.VITE_QUOTE_BRAND_NAME || (import.meta.env.VITE_APP_NAME || "CRM"),
};

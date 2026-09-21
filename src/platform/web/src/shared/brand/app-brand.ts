const configuredBrandName = import.meta.env.VITE_APP_BRAND_NAME?.trim();

export const appBrandName = configuredBrandName || "Tech Media";

export const appBrandDescription = `Access ${appBrandName} with your registered credentials.`;

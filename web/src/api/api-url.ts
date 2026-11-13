import "server-only";

export function getApiUrl(path: string): string | null {
  const baseUrl = process.env.PMS_API_BASE_URL;
  if (!baseUrl) return null;

  try {
    const url = new URL(path, baseUrl.replace(/\/?$/, "/"));
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

import "dotenv/config";

export const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean)
  .map((url) => new URL(url).origin);

if (!clientUrls.length) {
  throw new Error("CLIENT_URL must be set in server/.env");
}

export function getClientUrl(req) {
  const origin = req.get("origin");

  if (clientUrls.includes(origin)) {
    return origin;
  }

  return clientUrls.find((url) => new URL(url).hostname === req.hostname)
    || clientUrls[0];
}

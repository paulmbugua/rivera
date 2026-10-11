export const SITE_NAME = "Rivera";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.WEB_ORIGIN ??
  "https://www.riveracreators.com"
).replace(/\/$/, "");

export const SITE_DESCRIPTION =
  "Rivera connects brands with distinctive creators for transparent, meaningful campaigns—from discovery and proposals to delivery and payment.";

export const SOCIAL_IMAGE = "/images/rivera-social-card.png";

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

import "server-only";

// Server-only configuration. Nothing here is ever sent to the browser.
export const env = {
  // Explicit APP_URL wins; on Vercel fall back to the project's own *.vercel.app address.
  appUrl: (
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000"
  ).replace(/\/$/, ""),
  isProd: process.env.NODE_ENV === "production",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  },
  resendKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "SYNAPSE <hello@example.com>",
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    premiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID ?? "",
  },
};

export const features = {
  google: Boolean(env.google.clientId && env.google.clientSecret),
  realEmail: Boolean(env.resendKey),
  stripe: Boolean(env.stripe.secretKey && env.stripe.premiumPriceId),
  // Public demo deployment: one-click demo accounts, and the test checkout stays on.
  demo: process.env.DEMO_MODE === "true",
  // The mock checkout grants Premium for free, so it is only reachable in development or on
  // an explicit demo deployment - never on a real production site.
  mockBilling: !env.stripe.secretKey && (!env.isProd || process.env.DEMO_MODE === "true"),
};

import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Photos are capped at 5 MB in src/lib/uploads.ts; leave room for the other form fields.
    serverActions: {
      bodySizeLimit: "6mb",
      // Behind a hosting proxy the public host must be allowed explicitly (CSRF origin check).
      allowedOrigins: process.env.APP_URL ? [new URL(process.env.APP_URL).host] : [],
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

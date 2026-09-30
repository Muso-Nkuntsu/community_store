import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // bcryptjs and Prisma run only on the server; keep them out of any client bundle.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  images: {
    // Listing images may be external URLs supplied by sellers. The frontend can
    // render them with next/image once the allowed hosts are agreed; until then
    // a plain <img> with the /placeholder-listing.svg fallback is fine.
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;

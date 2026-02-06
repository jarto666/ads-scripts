import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://klippli.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/terms", "/privacy"],
        disallow: [
          "/dashboard/",
          "/projects/",
          "/settings/",
          "/admin/",
          "/auth/",
          "/pricing/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

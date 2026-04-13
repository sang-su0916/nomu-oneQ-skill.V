import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://nomu-oneq.vercel.app";
  const now = new Date();

  const staticPages = [
    { url: baseUrl, changeFrequency: "weekly" as const, priority: 1.0 },
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/membership`,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    },
  ];

  const documentPages = [
    "contract/fulltime",
    "contract/parttime",
    "contract/freelancer",
    "documents/privacy-consent",
    "documents/nda",
    "documents/pledge",
    "documents/attendance",
    "documents/annual-leave",
    "documents/annual-leave-notice",
    "documents/overtime",
    "documents/certificate",
    "documents/career-certificate",
    "documents/resignation",
    "documents/retirement-pay",
    "documents/warning-letter",
    "documents/disciplinary-notice",
    "documents/termination-notice",
    "documents/training-record",
    "documents/probation-eval",
    "documents/personnel-card",
    "documents/leave-application",
    "documents/reinstatement",
    "documents/work-hours-change",
    "documents/remote-work",
    "documents/business-trip",
    "documents/side-job-permit",
    "documents/handover",
    "payslip",
    "wage-ledger",
    "work-rules",
  ].map((path) => ({
    url: `${baseUrl}/${path}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...documentPages].map((page) => ({
    ...page,
    lastModified: now,
  }));
}

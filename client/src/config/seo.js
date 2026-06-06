const SITE_NAME = "Shribi Care";

export const DEFAULT_SEO = {
  title: `${SITE_NAME} | Free Customer Support Chat for Small Businesses`,
  description:
    "Launch live customer support chat in minutes. Multi-tenant workspaces, real-time inbox, voice calls, campaigns, and platform controls for growing businesses.",
  keywords:
    "customer support chat, live chat widget, help desk software, small business chat, multi-tenant support, Shribi Care, eChat",
  robots: "index, follow",
  ogType: "website",
};

const ROUTE_SEO = {
  "/": DEFAULT_SEO,
  "/signup": {
    title: `Sign Up Free | ${SITE_NAME} Customer Support Chat`,
    description:
      "Create your free tenant workspace and embed a live support chat widget on your website. Quick setup, secure access, and a modern admin console.",
    keywords: "sign up, free chat widget, tenant signup, customer support, Shribi Care",
    robots: "index, follow",
    ogType: "website",
  },
  "/admin": {
    title: `Tenant Admin Login | ${SITE_NAME}`,
    description:
      "Sign in to your tenant support console to manage live chats, active users, campaigns, and customer conversations.",
    keywords: "admin login, tenant admin, support console, Shribi Care",
    robots: "noindex, nofollow",
    ogType: "website",
  },
  "/super-admin": {
    title: `Platform Super Admin | ${SITE_NAME}`,
    description: "Secure OTP access for authorized platform operators.",
    keywords: "super admin, platform admin",
    robots: "noindex, nofollow",
    ogType: "website",
  },
  "/widget": {
    title: `Support Chat Widget | ${SITE_NAME}`,
    description: "Embedded customer support chat widget for your website visitors.",
    keywords: "chat widget, embedded support chat",
    robots: "noindex, nofollow",
    ogType: "website",
  },
};

export function getSeoForPath(pathname = "/") {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  if (ROUTE_SEO[path]) return ROUTE_SEO[path];
  if (path.startsWith("/admin")) return ROUTE_SEO["/admin"];
  if (path.startsWith("/super-admin")) return ROUTE_SEO["/super-admin"];
  return DEFAULT_SEO;
}

export { SITE_NAME };

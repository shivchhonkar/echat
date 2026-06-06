export const ADMIN_SECTION_PATHS = {
  "active-users": "/admin",
  "campaign-sms": "/admin/campaign/bulk-sms",
  "campaign-whatsapp": "/admin/campaign/whatsapp",
  "campaign-history": "/admin/campaign/history",
};

const PATH_TO_SECTION = Object.entries(ADMIN_SECTION_PATHS).reduce((acc, [section, path]) => {
  acc[path] = section;
  return acc;
}, {});

export function normalizeAdminPath(pathname) {
  const path = String(pathname || "").replace(/\/$/, "") || "/";
  return path === "/admin/" ? "/admin" : path;
}

export function pathToAdminSection(pathname) {
  const path = normalizeAdminPath(pathname);
  return PATH_TO_SECTION[path] || "active-users";
}

export function adminSectionToPath(section) {
  return ADMIN_SECTION_PATHS[section] || "/admin";
}

export function isKnownAdminPath(pathname) {
  const path = normalizeAdminPath(pathname);
  return path in PATH_TO_SECTION;
}

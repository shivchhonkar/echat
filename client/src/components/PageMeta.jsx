import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getSeoForPath, SITE_NAME } from "../config/seo";

function upsertMeta(attr, key, content) {
  if (content == null || content === "") return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", String(content));
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function getBaseUrl() {
  const configured = String(import.meta.env.VITE_SITE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function PageMeta() {
  const { pathname } = useLocation();
  const seo = useMemo(() => getSeoForPath(pathname), [pathname]);

  useEffect(() => {
    const baseUrl = getBaseUrl();
    const canonicalPath = pathname.split("?")[0] || "/";
    const canonical = baseUrl ? `${baseUrl}${canonicalPath}` : canonicalPath;
    const image = baseUrl ? `${baseUrl}/logo.png` : "/logo.png";

    document.title = seo.title;

    upsertMeta("name", "description", seo.description);
    upsertMeta("name", "keywords", seo.keywords);
    upsertMeta("name", "robots", seo.robots);
    upsertMeta("name", "author", SITE_NAME);
    upsertMeta("name", "application-name", SITE_NAME);
    upsertMeta("name", "theme-color", "#2563eb");

    upsertLink("canonical", canonical);

    upsertMeta("property", "og:type", seo.ogType || "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", seo.title);
    upsertMeta("property", "og:description", seo.description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:alt", `${SITE_NAME} logo`);
    upsertMeta("property", "og:locale", "en_IN");

    upsertMeta("name", "twitter:card", "summary");
    upsertMeta("name", "twitter:title", seo.title);
    upsertMeta("name", "twitter:description", seo.description);
    upsertMeta("name", "twitter:image", image);

    if (canonicalPath === "/" && baseUrl) {
      upsertJsonLd("echat-website-jsonld", {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: baseUrl,
        description: seo.description,
        publisher: {
          "@type": "Organization",
          name: "Shribi",
          url: "https://shribi.com/",
          logo: image,
        },
      });
    } else {
      upsertJsonLd("echat-website-jsonld", null);
    }
  }, [pathname, seo]);

  return null;
}

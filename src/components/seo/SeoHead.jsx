import React, { useEffect } from "react";
import PropTypes from "prop-types";

const ORIGIN = "https://shop.p2pdeal.net";

const buildAbsoluteUrl = (pathOrUrl) => {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalizedPath = pathOrUrl.startsWith("/")
    ? pathOrUrl
    : `/${pathOrUrl}`;
  return `${ORIGIN}${normalizedPath}`;
};

const DEFAULT = Object.freeze({
  title: "Custom Merchandise & Corporate Gifts Online | p2pdeal",
  description:
    "Shop personalized t-shirts, caps, mugs, office essentials, stationery, and corporate gifting merchandise at p2pdeal. Premium quality, fast printing, PAN-India delivery.",
  keywords: [
    "custom merchandise",
    "corporate gifts",
    "custom t-shirts",
    "personalized mugs",
    "custom caps",
    "office essentials",
    "stationery",
    "keychains",
    "branding merchandise",
    "print on demand",
  ],
  image: "/assets/og/p2pdeal-default-og.jpg",
});

const SeoHead = ({
  title = DEFAULT.title,
  description = DEFAULT.description,
  keywords,
  canonicalPath,
  openGraph = {},
  twitter = {},
  schema,
  noindex = false,
}) => {
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const cleanupTasks = [];

    const previousTitle = document.title;
    document.title = title;
    cleanupTasks.push(() => {
      document.title = previousTitle;
    });

    const resolvedKeywords =
      Array.isArray(keywords) && keywords.length > 0
        ? keywords
        : DEFAULT.keywords;

    const updateMeta = ({ name, property, content }) => {
      if (!content) return;
      const selector = name
        ? `meta[name="${name}"]`
        : `meta[property="${property}"]`;
      const existing = document.head.querySelector(selector);
      if (existing) {
        const previousContent = existing.getAttribute("content");
        existing.setAttribute("content", content);
        cleanupTasks.push(() => {
          if (previousContent === null) {
            existing.removeAttribute("content");
          } else {
            existing.setAttribute("content", previousContent);
          }
        });
        return;
      }

      const meta = document.createElement("meta");
      if (name) meta.setAttribute("name", name);
      if (property) meta.setAttribute("property", property);
      meta.setAttribute("content", content);
      document.head.appendChild(meta);
      cleanupTasks.push(() => {
        document.head.removeChild(meta);
      });
    };

    updateMeta({ name: "description", content: description });
    updateMeta({ name: "keywords", content: resolvedKeywords.join(", ") });

    const canonicalUrl = buildAbsoluteUrl(canonicalPath);
    if (canonicalPath) {
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
        cleanupTasks.push(() => {
          document.head.removeChild(link);
        });
      } else {
        const previousHref = link.getAttribute("href");
        cleanupTasks.push(() => {
          if (previousHref === null) {
            link.removeAttribute("href");
          } else {
            link.setAttribute("href", previousHref);
          }
        });
      }
      link.setAttribute("href", canonicalUrl);
    }

    const ogImage = buildAbsoluteUrl(openGraph.image || DEFAULT.image);
    updateMeta({ property: "og:type", content: openGraph.type || "website" });
    updateMeta({ property: "og:title", content: openGraph.title || title });
    updateMeta({
      property: "og:description",
      content: openGraph.description || description,
    });
    updateMeta({ property: "og:image", content: ogImage });
    if (canonicalUrl) {
      updateMeta({ property: "og:url", content: canonicalUrl });
    }
    updateMeta({ property: "og:site_name", content: "p2pdeal" });

    const twitterImage = buildAbsoluteUrl(
      twitter.image || openGraph.image || DEFAULT.image
    );
    updateMeta({
      name: "twitter:card",
      content: twitter.card || "summary_large_image",
    });
    updateMeta({ name: "twitter:title", content: twitter.title || title });
    updateMeta({
      name: "twitter:description",
      content: twitter.description || description,
    });
    updateMeta({ name: "twitter:image", content: twitterImage });

    if (noindex) {
      updateMeta({ name: "robots", content: "noindex,nofollow" });
    }

    const schemaEntries = Array.isArray(schema)
      ? schema
      : schema
      ? [schema]
      : [];
    const scriptNodes = schemaEntries.map((entry) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(entry);
      document.head.appendChild(script);
      cleanupTasks.push(() => {
        document.head.removeChild(script);
      });
      return script;
    });

    return () => {
      while (cleanupTasks.length) {
        const task = cleanupTasks.pop();
        try {
          task();
        } catch (error) {
          console.warn("SeoHead cleanup failed", error);
        }
      }
      // ensure script nodes removed (already handled) but to be safe
      scriptNodes.length = 0;
    };
  }, [
    title,
    description,
    canonicalPath,
    openGraph.type,
    openGraph.title,
    openGraph.description,
    openGraph.image,
    twitter.card,
    twitter.title,
    twitter.description,
    twitter.image,
    JSON.stringify(keywords),
    JSON.stringify(schema),
    noindex,
  ]);

  return null;
};

SeoHead.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  keywords: PropTypes.arrayOf(PropTypes.string),
  canonicalPath: PropTypes.string,
  openGraph: PropTypes.shape({
    type: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    image: PropTypes.string,
  }),
  twitter: PropTypes.shape({
    card: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    image: PropTypes.string,
  }),
  schema: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  noindex: PropTypes.bool,
  children: PropTypes.node,
};

export default SeoHead;

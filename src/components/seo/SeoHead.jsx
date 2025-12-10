import { useEffect } from "react";

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const ensureMeta = (attrName, attrValue, content) => {
  if (!content) {
    return;
  }

  let element = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

const ensureLink = (rel, href) => {
  if (!href) {
    return;
  }

  let element = document.head.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
};

const removeStructuredData = () => {
  document
    .querySelectorAll("script[data-seo-head='true']")
    .forEach((node) => node.parentNode.removeChild(node));
};

const injectStructuredData = (entries = []) => {
  entries.filter(Boolean).forEach((entry) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoHead = "true";
    script.text = JSON.stringify(entry);
    document.head.appendChild(script);
  });
};

const buildCanonicalUrl = (canonicalPath) => {
  if (!canonicalPath) {
    return undefined;
  }

  if (canonicalPath.startsWith("http")) {
    return canonicalPath;
  }

  return `https://shop.p2pdeal.net${canonicalPath}`;
};

const SeoHead = ({
  title,
  description,
  keywords,
  canonicalPath,
  openGraph = {},
  twitter = {},
  schema = [],
  robots,
}) => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    if (description) {
      ensureMeta("name", "description", description);
    }

    const keywordString = toArray(keywords).join(", ");
    if (keywordString) {
      ensureMeta("name", "keywords", keywordString);
    }

    if (robots) {
      ensureMeta("name", "robots", robots);
    }

    const canonicalUrl = buildCanonicalUrl(canonicalPath);
    if (canonicalUrl) {
      ensureLink("canonical", canonicalUrl);
    }

    const ogTitle = openGraph.title || title;
    const ogDescription = openGraph.description || description;
    const ogImage = openGraph.image;
    const ogType = openGraph.type || "website";

    if (ogTitle) {
      ensureMeta("property", "og:title", ogTitle);
    }
    if (ogDescription) {
      ensureMeta("property", "og:description", ogDescription);
    }
    if (canonicalUrl) {
      ensureMeta("property", "og:url", canonicalUrl);
    }
    if (ogImage) {
      ensureMeta("property", "og:image", ogImage);
    }
    if (ogType) {
      ensureMeta("property", "og:type", ogType);
    }

    const twitterTitle = twitter.title || title;
    const twitterDescription = twitter.description || description;
    const twitterImage = twitter.image || ogImage;
    const twitterCard = twitter.card || "summary_large_image";

    ensureMeta("name", "twitter:card", twitterCard);
    if (twitterTitle) {
      ensureMeta("name", "twitter:title", twitterTitle);
    }
    if (twitterDescription) {
      ensureMeta("name", "twitter:description", twitterDescription);
    }
    if (twitterImage) {
      ensureMeta("name", "twitter:image", twitterImage);
    }

    removeStructuredData();
    injectStructuredData(Array.isArray(schema) ? schema : [schema]);

    return () => {
      removeStructuredData();
    };
  }, [
    title,
    description,
    keywords,
    canonicalPath,
    openGraph,
    twitter,
    schema,
    robots,
  ]);

  return null;
};

export default SeoHead;

import React from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";

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
  children,
}) => {
  const resolvedKeywords =
    Array.isArray(keywords) && keywords.length > 0
      ? keywords
      : DEFAULT.keywords;

  const pageUrl = buildAbsoluteUrl(canonicalPath);
  const ogImage = buildAbsoluteUrl(openGraph.image || DEFAULT.image);
  const twitterImage = buildAbsoluteUrl(
    twitter.image || openGraph.image || DEFAULT.image
  );

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={resolvedKeywords.join(", ")} />
      {canonicalPath && <link rel="canonical" href={pageUrl} />}

      <meta property="og:type" content={openGraph.type || "website"} />
      <meta property="og:title" content={openGraph.title || title} />
      <meta
        property="og:description"
        content={openGraph.description || description}
      />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {pageUrl && <meta property="og:url" content={pageUrl} />}
      <meta property="og:site_name" content="p2pdeal" />

      <meta
        name="twitter:card"
        content={twitter.card || "summary_large_image"}
      />
      <meta name="twitter:title" content={twitter.title || title} />
      <meta
        name="twitter:description"
        content={twitter.description || description}
      />
      {twitterImage && <meta name="twitter:image" content={twitterImage} />}

      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {Array.isArray(schema)
        ? schema.map((entry, index) => (
            <script key={index} type="application/ld+json">
              {JSON.stringify(entry)}
            </script>
          ))
        : schema && (
            <script type="application/ld+json">{JSON.stringify(schema)}</script>
          )}

      {children}
    </Helmet>
  );
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

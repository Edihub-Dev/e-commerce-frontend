const safeString = (value) => {
  if (!value) return "";
  return String(value).trim();
};

/**
 * Generates descriptive, keyword-friendly alt text for product imagery.
 * @param {object} product - Raw product object from API/state.
 * @param {object} [options]
 * @param {number} [options.index] - 1-based index used for galleries.
 * @param {string} [options.context] - Extra context (e.g., "product card", "gallery").
 * @returns {string}
 */
export const buildProductImageAlt = (product = {}, options = {}) => {
  const { index, context } = options;
  const name = safeString(product.name);
  const brand = safeString(product.brand);
  const category = safeString(product.category);
  const color = safeString(product.color || product.colour);
  const material = safeString(product.material);

  const tokens = [];

  if (name) {
    tokens.push(name);
  }

  const qualifierTokens = [brand, category, color, material].filter(Boolean);
  if (qualifierTokens.length) {
    tokens.push(qualifierTokens.join(" "));
  }

  tokens.push("custom merchandise by p2pdeal");

  if (typeof index === "number" && Number.isFinite(index)) {
    tokens.push(`image ${index}`);
  }

  if (context) {
    tokens.push(context);
  }

  const altText = tokens
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(" - ");

  return altText || "p2pdeal custom merchandise product image";
};

/* -------------------------------------------------------------
   ECOMMERCE FRONTEND API SERVICE (FULLY FIXED)
   All backend routes now correctly use /api prefix
------------------------------------------------------------- */

import axios from "axios";

/* ---------------------- S3 URL Helpers ---------------------- */

const S3_BUCKET = import.meta.env.VITE_S3_BUCKET || "ecom-mega-mart";
const S3_REGION = import.meta.env.VITE_S3_REGION || "ap-south-1";
const DEFAULT_S3_BASE = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;
const S3_PUBLIC_URL = (
  import.meta.env.VITE_S3_PUBLIC_URL ||
  import.meta.env.VITE_S3_PUBLIC_ENDPOINT ||
  DEFAULT_S3_BASE
).replace(/\/$/, "");

const LEGACY_HOST = `${S3_BUCKET}.s3.amazonaws.com`;
const LEGACY_PATH_HOST = `s3.${S3_REGION}.amazonaws.com`;
const GLOBAL_PATH_HOST = "s3.amazonaws.com";

const ensureS3Url = (value) => {
  if (!value || typeof value !== "string") return value;

  if (value.startsWith("http")) {
    try {
      const url = new URL(value);
      const pathname = url.pathname?.replace(/^\/+/, "");

      if (!pathname) return `${S3_PUBLIC_URL}/`;

      if (url.hostname === LEGACY_HOST)
        return `${S3_PUBLIC_URL}/${pathname}`;

      if (url.hostname === LEGACY_PATH_HOST && pathname.startsWith(`${S3_BUCKET}/`))
        return `${S3_PUBLIC_URL}/${pathname.slice(S3_BUCKET.length + 1)}`;

      if (url.hostname === GLOBAL_PATH_HOST && pathname.startsWith(`${S3_BUCKET}/`))
        return `${S3_PUBLIC_URL}/${pathname.slice(S3_BUCKET.length + 1)}`;

      return value;
    } catch {
      return value;
    }
  }

  if (value.startsWith("data:") || value.startsWith("blob:")) return value;

  return `${S3_PUBLIC_URL}/${value.replace(/^\/+/, "")}`;
};

/* ---------------------- Axios Instance ---------------------- */

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:3001") + "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

/* ---------------------- Helper Functions ---------------------- */

const extractPayload = (res, msg) => {
  if (!res?.data) throw new Error(msg);
  if (res.data.success === false) throw new Error(res.data.message || msg);
  return res.data;
};

const withApi = async (fn, msg) => {
  try {
    return extractPayload(await fn(), msg);
  } catch (error) {
    throw new Error(error?.response?.data?.message || error.message || msg);
  }
};

const normalizeSizes = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => {
          const label = entry?.label?.toString().trim();
          if (!label) return null;
          return {
            label,
            isAvailable: Boolean(entry?.isAvailable ?? true),
            stock: Math.max(Number(entry?.stock ?? 0), 0),
          };
        })
        .filter(Boolean)
    : [];

/* ---------------------- Product Mappers ---------------------- */

const ensurePriceFields = (product = {}) => {
  const price = Number(product.price ?? 0);
  const original = Number(
    product.originalPrice ??
      product.price ??
      product.costPrice ??
      price
  );

  return {
    price: price || original,
    originalPrice: original || price,
    discountPercentage:
      product.discountPercentage ??
      (original > price
        ? Math.round(((original - price) / original) * 100)
        : 0),
    saveAmount:
      product.saveAmount ??
      (original > price ? original - price : 0),
  };
};

const mapProductCard = (product = {}) => {
  const prices = ensurePriceFields(product);

  return {
    id: product.slug || product._id,
    slug: product.slug || "",
    name: product.name || "Untitled Product",
    description: product.shortDescription || "",
    price: prices.price,
    originalPrice: prices.originalPrice,
    discount: prices.discountPercentage,
    saveAmount: prices.saveAmount,
    image: ensureS3Url(product.thumbnail || product.image),
    gallery: (product.gallery || []).map((g) => ensureS3Url(g)),
    rating: Number(product.rating || 0),
    reviews: Number(product.reviews || 0),
    brand: product.brand || "",
    category: product.category || "",
    sizes: normalizeSizes(product.sizes),
    showSizes: Boolean(product.showSizes),
  };
};

const mapProductDetail = (product = {}) => ({
  ...mapProductCard(product),
  description: product.description,
  longDescription: product.description,
  metadata: product.metadata || {},
  images: (product.images || []).map((i) => ensureS3Url(i)),
  variants: (product.variants || []).map((v) => ({
    ...v,
    imageUrl: ensureS3Url(v.imageUrl),
  })),
});

/* ---------------------- Product API ---------------------- */

export const fetchProducts = (params = {}) =>
  withApi(
    () => api.get("/products", { params }),
    "Failed to load products"
  );

export const getProductById = (id) =>
  withApi(
    () => api.get(`/products/${id}`),
    "Failed to load product details"
  );

export const getProductsByCategory = (slug) =>
  fetchProducts({ category: slug });

export const getProductsByBrand = (slug) =>
  fetchProducts({ brand: slug });

export const getSmartphoneDeals = () =>
  fetchProducts({ isFeatured: true });

/* ---------------------- Hero Carousel & Categories ---------------------- */

export const getHeroCarousel = () =>
  withApi(
    () => api.get("/hero-carousel"),
    "Failed to load hero slides"
  );

export const getCategories = () =>
  withApi(
    () => api.get("/categories"),
    "Failed to load categories"
  );

/* ---------------------- Orders ---------------------- */

export const createOrder = (payload) =>
  api.post("/orders/create", payload).then((res) => res.data);

export const fetchMyOrders = () =>
  api.get("/orders/my").then((res) => res.data);

export const fetchOrderById = (id) =>
  api.get(`/orders/${id}`).then((res) => res.data);

/* ---------------------- Payments ---------------------- */

export const createPhonePePayment = (payload) =>
  api.post("/payments/create", payload).then((res) => res.data);

export const fetchPaymentStatus = (id) =>
  api.get(`/payments/status/${id}`).then((res) => res.data);

/* ---------------------- User Address ---------------------- */

export const fetchAddresses = () =>
  api.get("/user/address/get").then((res) => res.data);

export const addAddress = (payload) =>
  api.post("/user/address/add", payload).then((res) => res.data);

export const updateAddress = (id, payload) =>
  api.patch(`/user/address/update/${id}`, payload).then((res) => res.data);

export const deleteAddress = (id) =>
  api.delete(`/user/address/remove/${id}`).then((res) => res.data);

/* ---------------------- Auth ---------------------- */

export const verifyEmailOtp = (data) =>
  api.post("/auth/verify-email", data).then((res) => res.data);

export const resendVerificationOtp = (data) =>
  api.post("/auth/verify-email/resend", data).then((res) => res.data);

export const requestPasswordReset = (data) =>
  api.post("/auth/password-reset/request", data).then((res) => res.data);

export const verifyPasswordResetOtp = (data) =>
  api.post("/auth/password-reset/verify", data).then((res) => res.data);

export default api;

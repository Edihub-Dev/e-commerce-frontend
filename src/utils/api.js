// import axios from 'axios';

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL,
// });

// // On a real app, you would use an interceptor to add the auth token
// /*
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('authToken');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });
// */

// // --- MOCKED API CALLS ---
// // Replace these with actual API calls to your backend

// import { allProducts, smartphoneDeals, topCategories, topBrands, dailyEssentials } from '../data/mock';

// const mockRequest = (data, delay = 500) =>
//   new Promise(resolve => setTimeout(() => resolve({ data }), delay));

// export const getSmartphoneDeals = () => mockRequest(smartphoneDeals);
// export const getTopCategories = () => mockRequest(topCategories);
// export const getTopBrands = ().model-output {
//   padding: 1rem;
//   border-radius: 0.5rem;
//   background-color: #f0f0f0;
// }

import axios from "axios";

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
  if (!value || typeof value !== "string") {
    return value;
  }

  if (value.startsWith("http")) {
    try {
      const url = new URL(value);
      const pathname = url.pathname?.replace(/^\/+/, "");

      if (!pathname) {
        return `${S3_PUBLIC_URL}/`;
      }

      if (url.hostname === LEGACY_HOST) {
        return `${S3_PUBLIC_URL}/${pathname}`;
      }

      if (
        url.hostname === LEGACY_PATH_HOST &&
        pathname.startsWith(`${S3_BUCKET}/`)
      ) {
        return `${S3_PUBLIC_URL}/${pathname.slice(S3_BUCKET.length + 1)}`;
      }

      if (
        url.hostname === GLOBAL_PATH_HOST &&
        pathname.startsWith(`${S3_BUCKET}/`)
      ) {
        return `${S3_PUBLIC_URL}/${pathname.slice(S3_BUCKET.length + 1)}`;
      }

      return value;
    } catch (_error) {
      return value;
    }
  }

  if (value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("blob:")) {
    return value;
  }

  const sanitized = value.replace(/^\/+/, "");
  return `${S3_PUBLIC_URL}/${sanitized}`;
};

const resolveBaseUrl = (value) => {
  if (value && /^https?:\/\//i.test(value)) {
    return value;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (!value || !value.trim()) {
      return `${protocol}//${hostname}:5000/api`;
    }

    const trimmed = value.trim();

    if (trimmed.startsWith("//")) {
      return `${protocol}${trimmed}`;
    }

    if (trimmed.startsWith(":")) {
      return `${protocol}//${hostname}${trimmed}`;
    }

    if (trimmed.startsWith("/")) {
      return `${protocol}//${hostname}${trimmed}`;
    }

    return `${protocol}//${hostname}/${trimmed.replace(/^\/+/, "")}`;
  }

  return value || "http://localhost:5000/api";
};

const api = axios.create({
  baseURL: resolveBaseUrl(import.meta.env.VITE_API_URL),
  withCredentials: true,
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

const extractPayload = (response, fallbackMessage) => {
  const payload = response?.data;
  if (!payload) {
    throw new Error(fallbackMessage);
  }
  if (payload.success === false) {
    throw new Error(payload.message || fallbackMessage);
  }
  return payload;
};

const isRequestCanceled = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED" ||
  error?.message === "canceled";

const withApiHandling = async (requestFn, fallbackMessage) => {
  try {
    const response = await requestFn();
    return extractPayload(response, fallbackMessage);
  } catch (error) {
    if (isRequestCanceled(error)) {
      throw error;
    }
    const message =
      error?.response?.data?.message || error?.message || fallbackMessage;
    throw new Error(message);
  }
};

const ensurePriceFields = (product = {}) => {
  const resolvedPrice = Number(product.price ?? 0);
  const resolvedOriginal = Number(
    product.originalPrice ?? product.price ?? product.costPrice ?? resolvedPrice
  );
  const price = resolvedPrice || resolvedOriginal;
  const originalPrice = resolvedOriginal || price;
  const discountPercentage =
    product.discountPercentage ??
    (originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0);
  const saveAmount =
    product.saveAmount ?? (discountPercentage > 0 ? originalPrice - price : 0);

  return { price, originalPrice, discountPercentage, saveAmount };
};

const normalizeSizes = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => {
          const label = entry?.label?.toString().trim();
          if (!label) {
            return null;
          }
          const stock = Math.max(Number(entry?.stock ?? 0), 0);
          return {
            label,
            isAvailable: Boolean(entry?.isAvailable ?? true),
            stock,
          };
        })
        .filter(Boolean)
    : [];

const normalizeObjectId = (value) => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.length ? value : undefined;
  }

  if (typeof value === "object") {
    if (typeof value.toHexString === "function") {
      return value.toHexString();
    }
    if (typeof value.$oid === "string") {
      return value.$oid;
    }
    if (
      typeof value.toString === "function" &&
      value.toString !== Object.prototype.toString
    ) {
      const asString = value.toString();
      return typeof asString === "string" && asString.length
        ? asString
        : undefined;
    }
  }

  return undefined;
};

const mapProductCard = (product = {}) => {
  const { price, originalPrice, discountPercentage, saveAmount } =
    ensurePriceFields(product);

  const mongoId = normalizeObjectId(product._id);
  const sellerId = normalizeObjectId(product.sellerProductId);
  const normalizedId = product.slug || mongoId || sellerId || product.id;

  const gallery = Array.isArray(product.gallery)
    ? product.gallery.map((entry) => ensureS3Url(entry))
    : [];
  const primaryImage = ensureS3Url(
    product.thumbnail || product.image || gallery[0] || ""
  );

  const keyFeatures = Array.isArray(product.keyFeatures)
    ? product.keyFeatures
        .map((feature) => feature?.toString().trim())
        .filter(Boolean)
    : [];

  const rawReviews = product.reviews ?? product.ratings?.totalReviews ?? 0;
  const rawRating = product.rating ?? product.ratings?.average ?? 0;
  const normalizedReviews = Number.isFinite(Number(rawReviews))
    ? Number(rawReviews)
    : 0;
  const normalizedRating = normalizedReviews > 0 ? Number(rawRating) || 0 : 0;

  return {
    id: normalizedId,
    slug: product.slug || "",
    mongoId,
    productId: mongoId,
    sellerProductId: sellerId,
    name: product.name || "Unnamed Product",
    description: product.shortDescription || "",
    image: primaryImage,
    gallery,
    price,
    originalPrice,
    discount: discountPercentage,
    saveAmount,
    rating: normalizedRating,
    reviews: normalizedReviews,
    availabilityStatus: product.availabilityStatus,
    brand: product.brand || "",
    category: product.category || "",
    categoryPriority: product.categoryPriority || "P5",
    currency: product.currency || "INR",
    keyFeatures,
    sizes: normalizeSizes(product.sizes),
    showSizes: Boolean(product.showSizes),
    hsnCode:
      product.hsnCode !== undefined && product.hsnCode !== null
        ? String(product.hsnCode).trim()
        : undefined,
    gstRate:
      product.gstRate !== undefined && product.gstRate !== null
        ? Number(product.gstRate)
        : undefined,
  };
};

const mapProductDetail = (product = {}) => {
  const card = mapProductCard(product);
  const mongoId = card.mongoId || normalizeObjectId(product._id);

  const keyFeatures = Array.isArray(product.keyFeatures)
    ? product.keyFeatures
        .map((feature) => feature?.toString().trim())
        .filter(Boolean)
    : card.keyFeatures || [];
  const gallery = Array.isArray(product.gallery)
    ? product.gallery.map((entry) => ensureS3Url(entry))
    : card.gallery || [];
  const images = Array.isArray(product.images)
    ? product.images.map((entry) => ensureS3Url(entry))
    : [];
  const variants = Array.isArray(product.variants)
    ? product.variants.map((variant) => ({
        ...variant,
        imageUrl: ensureS3Url(variant?.imageUrl),
      }))
    : [];
  return {
    ...card,
    _id: mongoId,
    mongoId,
    description: product.description || card.description,
    shortDescription: product.shortDescription || card.description,
    gallery,
    images,
    thumbnail: ensureS3Url(product.thumbnail) || card.image,
    metadata: product.metadata || {},
    attributes: product.attributes || {},
    variants,
    stock: product.stock ?? 0,
    keyFeatures,
    features: keyFeatures,
    sizes: card.sizes,
    showSizes: card.showSizes,
    categoryPriority: card.categoryPriority,
    reviewsList: Array.isArray(product.reviewsList) ? product.reviewsList : [],
    reviewsSummary: product.reviewsSummary || {
      totalReviews: card.reviews ?? 0,
      average: card.rating ?? 0,
      totalScore: (card.reviews ?? 0) * ((card.rating ?? 0) || 0),
    },
    hsnCode:
      product.hsnCode !== undefined && product.hsnCode !== null
        ? String(product.hsnCode).trim()
        : card.hsnCode,
    gstRate:
      product.gstRate !== undefined && product.gstRate !== null
        ? Number(product.gstRate)
        : card.gstRate,
  };
};

const decodeSlug = (value = "") =>
  String(value).replace(/-/g, " ").replace(/_/g, " ").trim();

export const fetchProducts = async (params = {}, options = {}) => {
  const requestConfig = {
    params,
  };

  if (options?.signal) {
    requestConfig.signal = options.signal;
  }

  if (typeof options?.timeout === "number") {
    requestConfig.timeout = options.timeout;
  }

  const payload = await withApiHandling(
    () => api.get("/products", requestConfig),
    "Failed to fetch products"
  );

  return {
    data: Array.isArray(payload.data) ? payload.data.map(mapProductCard) : [],
    meta: payload.meta || {},
  };
};

export const getAllProducts = (params = {}) => fetchProducts(params);

export const getSmartphoneDeals = (params = {}) =>
  fetchProducts({ isFeatured: true, ...params });

export const getProductsByBrand = (slug, params = {}) =>
  fetchProducts({ brand: decodeSlug(slug), ...params });

export const getProductsByCategory = (slug, params = {}) =>
  fetchProducts({ category: decodeSlug(slug), ...params });

export const getProductById = async (idOrSlug) => {
  const payload = await withApiHandling(
    () => api.get(`/products/${idOrSlug}`),
    "Failed to fetch product"
  );

  return {
    data: mapProductDetail(payload.data || {}),
  };
};

export const requestPasswordReset = async ({ email, newPassword }) => {
  try {
    const response = await api.post("/auth/password-reset/request", {
      email,
      newPassword,
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to request password reset";
    throw new Error(message);
  }
};

export const verifyPasswordResetOtp = async ({ email, otp }) => {
  try {
    const response = await api.post("/auth/password-reset/verify", {
      email,
      otp,
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to verify reset code";
    throw new Error(message);
  }
};

export const verifyEmailOtp = async ({ email, otp }) => {
  try {
    const response = await api.post("/auth/verify-email", { email, otp });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Failed to verify email";
    throw new Error(message);
  }
};

export const resendVerificationOtp = async ({ email }) => {
  try {
    const response = await api.post("/auth/verify-email/resend", { email });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to resend verification code";
    throw new Error(message);
  }
};

export default api;
export { withApiHandling };

export const applyForSeller = async (payload) => {
  try {
    const response = await api.post("/sellers/apply", payload);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message || "Failed to submit seller application";
    throw new Error(message);
  }
};

export const fetchSellerOverview = () =>
  withApiHandling(
    () => api.get("/sellers/overview"),
    "Failed to load seller dashboard"
  );

export const fetchSellerProducts = (params = {}) =>
  withApiHandling(
    () =>
      api.get("/sellers/products", {
        params,
      }),
    "Failed to load seller products"
  );

export const fetchSellerProductById = (id) =>
  withApiHandling(
    () => api.get(`/sellers/products/${id}`),
    "Failed to load product details"
  );

export const fetchSellerOrders = (params = {}) =>
  withApiHandling(
    () =>
      api.get("/sellers/orders", {
        params,
      }),
    "Failed to load seller orders"
  );

export const fetchSellerCoupons = (params = {}) =>
  withApiHandling(
    () =>
      api.get("/sellers/coupons", {
        params,
      }),
    "Failed to load seller coupons"
  );

export const createSellerProduct = (payload) =>
  withApiHandling(
    () => api.post("/sellers/products", payload),
    "Failed to create seller product"
  );

export const updateSellerProduct = (id, payload) =>
  withApiHandling(
    () => api.put(`/sellers/products/${id}`, payload),
    "Failed to update seller product"
  );

export const deleteSellerProduct = (id) =>
  withApiHandling(
    () => api.delete(`/sellers/products/${id}`),
    "Failed to delete seller product"
  );

export const fetchAddresses = async () => {
  const response = await api.get("/user/address/get");
  return response.data;
};

export const addAddress = async (payload) => {
  const response = await api.post("/user/address/add", payload);
  return response.data;
};

export const updateAddress = async (addressId, payload) => {
  const response = await api.patch(
    `/user/address/update/${addressId}`,
    payload
  );
  return response.data;
};

export const deleteAddress = async (addressId) => {
  const response = await api.delete(`/user/address/remove/${addressId}`);
  return response.data;
};

export const createOrder = async (payload) => {
  const response = await api.post("/orders/create", payload);
  return response.data;
};

export const createPhonePePayment = async (payload) => {
  const response = await api.post("/payments/create", payload);
  return response.data;
};

export const fetchPaymentStatus = async (transactionId) => {
  const response = await api.get(`/payments/status/${transactionId}`);
  return response.data;
};

export const fetchMyOrders = async () => {
  const response = await api.get("/orders/my");
  return response.data;
};

export const fetchOrderById = async (orderId) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};

export const submitReplacementRequest = async (orderId, payload) => {
  const response = await api.post(`/orders/${orderId}/replacement`, payload);
  return response.data;
};

export const adminUpdateReplacementRequest = async (orderId, payload) => {
  const response = await api.patch(`/orders/${orderId}/replacement`, payload);
  return response.data;
};

export const updateOrder = async (orderId, payload) => {
  const response = await api.patch(`/orders/${orderId}`, payload);
  return response.data;
};

export const rateOrderItem = async (orderId, payload) => {
  const response = await api.post(`/orders/${orderId}/rate`, payload);
  return response.data;
};

export const downloadOrderInvoice = async (orderId) => {
  const response = await api.get(`/orders/${orderId}/invoice`, {
    responseType: "blob",
  });
  return response;
};

export const deleteSellerOrder = async (orderId) =>
  withApiHandling(
    () => api.delete(`/orders/${orderId}`),
    "Failed to delete order"
  );

export const deleteSellerOrdersBulk = async (orderIds = []) =>
  withApiHandling(
    () => api.post("/orders/bulk-delete", { ids: orderIds }),
    "Failed to delete selected orders"
  );

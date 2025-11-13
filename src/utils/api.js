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

// Create Axios instance with base URL from environment
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
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

const withApiHandling = async (requestFn, fallbackMessage) => {
  try {
    const response = await requestFn();
    return extractPayload(response, fallbackMessage);
  } catch (error) {
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

const mapProductCard = (product = {}) => {
  const { price, originalPrice, discountPercentage, saveAmount } =
    ensurePriceFields(product);

  const gallery = Array.isArray(product.gallery) ? product.gallery : [];
  const primaryImage = product.thumbnail || product.image || gallery[0] || "";

  const keyFeatures = Array.isArray(product.keyFeatures)
    ? product.keyFeatures
        .map((feature) => feature?.toString().trim())
        .filter(Boolean)
    : [];

  return {
    id: product.slug || product._id,
    slug: product.slug || "",
    mongoId: product._id,
    name: product.name || "Unnamed Product",
    description: product.shortDescription || "",
    image: primaryImage,
    gallery,
    price,
    originalPrice,
    discount: discountPercentage,
    saveAmount,
    rating: product.rating ?? product.ratings?.average ?? 0,
    reviews: product.reviews ?? product.ratings?.totalReviews ?? 0,
    availabilityStatus: product.availabilityStatus,
    brand: product.brand || "",
    category: product.category || "",
    currency: product.currency || "INR",
    keyFeatures,
  };
};

const mapProductDetail = (product = {}) => {
  const card = mapProductCard(product);
  const keyFeatures = Array.isArray(product.keyFeatures)
    ? product.keyFeatures
        .map((feature) => feature?.toString().trim())
        .filter(Boolean)
    : card.keyFeatures || [];
  return {
    ...card,
    description: product.description || card.description,
    shortDescription: product.shortDescription || card.description,
    metadata: product.metadata || {},
    attributes: product.attributes || {},
    variants: product.variants || [],
    stock: product.stock ?? 0,
    keyFeatures,
    features: keyFeatures,
  };
};

const decodeSlug = (value = "") =>
  String(value).replace(/-/g, " ").replace(/_/g, " ").trim();

export const fetchProducts = async (params = {}) => {
  const payload = await withApiHandling(
    () => api.get("/products", { params }),
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

export const updateOrder = async (orderId, payload) => {
  const response = await api.patch(`/orders/${orderId}`, payload);
  return response.data;
};

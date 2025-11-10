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
import {
  allProducts,
  merchDeals,
  topCategories,
  topBrands,
  dailyEssentials,
} from "../data/mock";

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

// --- MOCKED API CALLS ---
// Simulate backend responses using mock data (until real backend is connected)

const mockRequest = (data, delay = 500) =>
  new Promise((resolve) => setTimeout(() => resolve({ data }), delay));

export const getSmartphoneDeals = () => mockRequest(merchDeals);
export const getTopCategories = () => mockRequest(topCategories);
export const getTopBrands = () => mockRequest(topBrands);
export const getDailyEssentials = () => mockRequest(dailyEssentials);
export const getAllProducts = () => mockRequest(allProducts);

// Get products by brand slug (e.g., "apple" or "realme")
const slugifyBrand = (name = "") =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const getProductsByBrand = (slug) => {
  const merged = [...allProducts, ...merchDeals];
  const filtered = merged.filter(
    (p) => slugifyBrand(p.brand) === String(slug || "").toLowerCase()
  );
  return mockRequest(filtered);
};

// Get a single product by ID
export const getProductById = (id) => {
  const merged = [...allProducts, ...merchDeals];
  const product = merged.find((p) => p.id === id);
  return mockRequest(product);
};

// Get products by category slug (e.g., "mobile" or "electronics")
const slugifyCategory = (name = "") =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const getProductsByCategory = (slug) => {
  const merged = [...allProducts, ...merchDeals];
  const filtered = merged.filter(
    (p) => slugifyCategory(p.category) === String(slug || "").toLowerCase()
  );
  return mockRequest(filtered);
};

// Example of a real API call (for later use)
export const fetchProducts = async () => {
  try {
    const response = await api.get("/products");
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
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
  const response = await api.patch(`/user/address/update/${addressId}`, payload);
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

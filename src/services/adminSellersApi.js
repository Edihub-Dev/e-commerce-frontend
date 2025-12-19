import api from "../utils/api";

const ensureSuccess = (response, defaultMessage) => {
  const payload = response?.data || {};

  if (!payload.success) {
    throw new Error(payload.message || defaultMessage);
  }

  return payload.data;
};

export const fetchAdminSellers = async () => {
  const response = await api.get("/admin/sellers");
  return ensureSuccess(response, "Failed to fetch sellers") || [];
};

export const fetchAdminSellerProducts = async (params = {}) => {
  const response = await api.get("/admin/sellers/products", {
    params,
  });
  return ensureSuccess(response, "Failed to fetch seller products") || [];
};

export const updateAdminSellerProduct = async (productId, updates) => {
  const response = await api.put(
    `/admin/sellers/products/${productId}`,
    updates
  );
  return ensureSuccess(response, "Failed to update seller product");
};

export const deleteAdminSellerProduct = async (productId) => {
  const response = await api.delete(`/admin/sellers/products/${productId}`);
  return ensureSuccess(response, "Failed to delete seller product");
};

export const fetchAdminSellerOrders = async (params = {}) => {
  const response = await api.get("/admin/sellers/orders", {
    params,
  });
  return ensureSuccess(response, "Failed to fetch seller orders") || [];
};

export const updateAdminSellerOrder = async (orderId, updates) => {
  const response = await api.put(`/admin/sellers/orders/${orderId}`, updates);
  return ensureSuccess(response, "Failed to update seller order");
};

export const deleteAdminSellerOrder = async (orderId) => {
  const response = await api.delete(`/admin/sellers/orders/${orderId}`);
  return ensureSuccess(response, "Failed to delete seller order");
};

export const fetchAdminSellerCoupons = async (params = {}) => {
  const response = await api.get("/admin/sellers/coupons", {
    params,
  });
  return ensureSuccess(response, "Failed to fetch seller coupons") || [];
};

export const updateAdminSellerCoupon = async (couponId, updates) => {
  const response = await api.put(`/admin/sellers/coupons/${couponId}`, updates);
  return ensureSuccess(response, "Failed to update seller coupon");
};

export const deleteAdminSellerCoupon = async (couponId) => {
  const response = await api.delete(`/admin/sellers/coupons/${couponId}`);
  return ensureSuccess(response, "Failed to delete seller coupon");
};

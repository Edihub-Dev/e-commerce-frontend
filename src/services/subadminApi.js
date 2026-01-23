import api from "../utils/api";

const ensureSuccess = (response, defaultMessage) => {
  const payload = response?.data || {};

  if (!payload.success) {
    throw new Error(payload.message || defaultMessage);
  }

  return payload.data;
};

export const fetchSubadminSellers = async () => {
  const response = await api.get("/subadmin/sellers");
  return ensureSuccess(response, "Failed to fetch sellers") || [];
};

export const fetchSubadminSellerProducts = async (params = {}) => {
  const response = await api.get("/subadmin/sellers/products", { params });
  return ensureSuccess(response, "Failed to fetch seller products") || [];
};

export const fetchSubadminSellerOrders = async (params = {}) => {
  const response = await api.get("/subadmin/sellers/orders", { params });
  return ensureSuccess(response, "Failed to fetch seller orders") || [];
};

export const fetchSubadminSellerCoupons = async (params = {}) => {
  const response = await api.get("/subadmin/sellers/coupons", { params });
  return ensureSuccess(response, "Failed to fetch seller coupons") || [];
};

export const fetchSubadminCustomers = async () => {
  const response = await api.get("/subadmin/customers");
  return ensureSuccess(response, "Failed to fetch customers") || [];
};

export const updateSubadminOrderShipping = async (
  orderId,
  { courier, trackingId },
) => {
  const response = await api.patch(`/subadmin/orders/${orderId}/shipping`, {
    courier,
    trackingId,
  });
  return ensureSuccess(response, "Failed to update order shipping");
};

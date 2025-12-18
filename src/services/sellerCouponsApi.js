import api from "../utils/api";

export const fetchSellerCoupons = async (params = {}) => {
  const response = await api.get("/sellers/coupons", { params });
  const payload = response.data || {};

  if (payload.success === false) {
    throw new Error(payload.message || "Failed to load coupons");
  }

  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta || {},
  };
};

export const generateSellerCouponCode = async () => {
  const response = await api.post("/sellers/coupons/generate-code");
  const payload = response.data || {};

  if (payload.success === false) {
    throw new Error(payload.message || "Failed to generate code");
  }

  return payload.data?.code || "";
};

export const createSellerCoupon = async (payload) => {
  const response = await api.post("/sellers/coupons", payload);
  const data = response.data || {};

  if (data.success === false) {
    throw new Error(data.message || "Failed to create coupon");
  }

  return data.data;
};

export const updateSellerCoupon = async (id, payload) => {
  const response = await api.put(`/sellers/coupons/${id}`, payload);
  const data = response.data || {};

  if (data.success === false) {
    throw new Error(data.message || "Failed to update coupon");
  }

  return data.data;
};

export const deleteSellerCoupon = async (id) => {
  const response = await api.delete(`/sellers/coupons/${id}`);
  const data = response.data || {};

  if (data.success === false) {
    throw new Error(data.message || "Failed to delete coupon");
  }

  return data;
};

export const deleteSellerCouponsBulk = async (ids) => {
  const response = await api.post("/sellers/coupons/bulk-delete", { ids });
  const data = response.data || {};

  if (data.success === false) {
    throw new Error(data.message || "Failed to delete selected coupons");
  }

  return data.data || { deletedCount: 0 };
};

import api from "../utils/api";

export const fetchAdminCoupons = async () => {
  const response = await api.get("/admin/coupons");
  const payload = response.data || {};
  if (payload.success === false) {
    throw new Error(payload.message || "Failed to load coupons");
  }
  return payload.data || [];
};

export const generateAdminCouponCode = async () => {
  const response = await api.post("/admin/coupons/generate-code");
  const payload = response.data || {};
  if (payload.success === false) {
    throw new Error(payload.message || "Failed to generate code");
  }
  return payload.data?.code || "";
};

export const createAdminCoupon = async (payload) => {
  const response = await api.post("/admin/coupons", payload);
  const data = response.data || {};
  if (data.success === false) {
    throw new Error(data.message || "Failed to create coupon");
  }
  return data.data;
};

export const createAdminCouponsBulk = async (payload) => {
  const response = await api.post("/admin/coupons/bulk", payload);
  const data = response.data || {};
  if (data.success === false) {
    throw new Error(data.message || "Failed to create coupons");
  }
  return Array.isArray(data.data) ? data.data : [];
};

export const updateAdminCoupon = async (id, payload) => {
  const response = await api.put(`/admin/coupons/${id}`, payload);
  const data = response.data || {};
  if (data.success === false) {
    throw new Error(data.message || "Failed to update coupon");
  }
  return data.data;
};

export const deleteAdminCoupon = async (id) => {
  const response = await api.delete(`/admin/coupons/${id}`);
  const data = response.data || {};
  if (data.success === false) {
    throw new Error(data.message || "Failed to delete coupon");
  }
  return data;
};

export const deleteAdminCouponsBulk = async (ids) => {
  const response = await api.post("/admin/coupons/bulk-delete", { ids });
  const data = response.data || {};
  if (data.success === false) {
    throw new Error(data.message || "Failed to delete selected coupons");
  }
  return Array.isArray(data.deletedIds) ? data.deletedIds : [];
};

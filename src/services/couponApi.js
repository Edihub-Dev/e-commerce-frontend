import api from "../utils/api";

export const validateCoupon = async ({ code, orderAmount, items }) => {
  const response = await api.post("/coupons/validate", {
    code,
    orderAmount,
    items,
  });
  const payload = response.data || {};
  if (payload.success === false) {
    throw new Error(payload.message || "Failed to validate coupon");
  }
  return payload.data;
};

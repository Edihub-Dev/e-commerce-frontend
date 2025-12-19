import api from "../utils/api";

export const fetchAdminOrders = async (params = {}) => {
  const response = await api.get("/orders", {
    params: {
      ...params,
      // Hide seller-split orders from the main admin orders list; those
      // are surfaced via dedicated seller views instead.
      excludeSellerOrders: true,
    },
  });
  const payload = response.data || {};
  if (!payload.success) {
    throw new Error(payload.message || "Failed to fetch admin orders");
  }
  return {
    data: payload.data || [],
    meta: payload.meta || {},
    summary: payload.summary || {},
  };
};

export const deleteAdminOrder = async (orderId) => {
  const response = await api.delete(`/orders/${orderId}`);
  const payload = response.data || {};
  if (!payload.success) {
    throw new Error(payload.message || "Failed to delete order");
  }
  return payload;
};

export const deleteAdminOrdersBulk = async (orderIds = []) => {
  const response = await api.post("/orders/bulk-delete", { ids: orderIds });
  const payload = response.data || {};
  if (!payload.success) {
    throw new Error(payload.message || "Failed to delete selected orders");
  }
  return payload;
};

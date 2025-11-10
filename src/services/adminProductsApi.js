import api from "../utils/api";

export const fetchAdminProducts = async (params = {}) => {
  const response = await api.get("/admin/products", { params });
  return response.data;
};

export const fetchAdminProductById = async (id) => {
  const response = await api.get(`/admin/products/${id}`);
  return response.data;
};

export const createAdminProduct = async (payload) => {
  const response = await api.post("/admin/products", payload);
  return response.data;
};

export const updateAdminProduct = async (id, payload) => {
  const response = await api.put(`/admin/products/${id}`, payload);
  return response.data;
};

export const deleteAdminProduct = async (id) => {
  const response = await api.delete(`/admin/products/${id}`);
  return response.data;
};

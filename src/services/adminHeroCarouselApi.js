import api from "../utils/api";

export const fetchAdminHeroSlides = async () => {
  const response = await api.get("/admin/hero-carousel");
  return response.data;
};

export const createAdminHeroSlide = async (payload) => {
  const response = await api.post("/admin/hero-carousel", payload);
  return response.data;
};

export const updateAdminHeroSlide = async (id, payload) => {
  const response = await api.put(`/admin/hero-carousel/${id}`, payload);
  return response.data;
};

export const deleteAdminHeroSlide = async (id) => {
  const response = await api.delete(`/admin/hero-carousel/${id}`);
  return response.data;
};

export const reorderAdminHeroSlides = async (order) => {
  const response = await api.post("/admin/hero-carousel/reorder", { order });
  return response.data;
};

import api from "../utils/api";

export const fetchAdminOfferLightboxes = async () => {
  const response = await api.get("/admin/offer-lightbox");
  return response.data?.data || [];
};

export const createAdminOfferLightbox = async (payload) => {
  const response = await api.post("/admin/offer-lightbox", payload);
  return response.data?.data || null;
};

export const updateAdminOfferLightbox = async (id, payload) => {
  const response = await api.put(`/admin/offer-lightbox/${id}`, payload);
  return response.data?.data || null;
};

export const deleteAdminOfferLightbox = async (id) => {
  const response = await api.delete(`/admin/offer-lightbox/${id}`);
  return response.data?.data || null;
};

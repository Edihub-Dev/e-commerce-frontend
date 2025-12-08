import api from "../utils/api";

export const fetchAdminOfferLightbox = async () => {
  const response = await api.get("/admin/offer-lightbox");
  return response.data?.data || null;
};

export const upsertAdminOfferLightbox = async (payload) => {
  const response = await api.put("/admin/offer-lightbox", payload);
  return response.data?.data || null;
};

export const deleteAdminOfferLightbox = async () => {
  const response = await api.delete("/admin/offer-lightbox");
  return response.data?.data || null;
};

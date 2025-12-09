import api from "../utils/api";

export const fetchOfferLightboxes = async (options = {}) => {
  const params = new URLSearchParams();
  if (options.offersOnly === true) {
    params.append("offersOnly", "true");
  }

  const query = params.toString();
  const response = await api.get(
    query ? `/offer-lightbox?${query}` : "/offer-lightbox"
  );
  return response.data?.data || [];
};

export const fetchOfferLightbox = async (id) => {
  const response = await api.get(`/offer-lightbox/${id}`);
  return response.data?.data || null;
};

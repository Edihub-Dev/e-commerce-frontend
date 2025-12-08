import api from "../utils/api";

export const fetchOfferLightbox = async () => {
  const response = await api.get("/offer-lightbox");
  return response.data;
};

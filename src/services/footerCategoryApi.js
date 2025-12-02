import api, { withApiHandling } from "../utils/api";

export const fetchFooterCategories = () =>
  withApiHandling(
    () => api.get("/admin/footer-categories"),
    "Failed to load footer categories"
  );

export const fetchAvailableFooterCategories = () =>
  withApiHandling(
    () => api.get("/admin/footer-categories/available"),
    "Failed to load available product categories"
  );

export const createFooterCategory = (payload) =>
  withApiHandling(
    () => api.post("/admin/footer-categories", payload),
    "Failed to create footer category"
  );

export const updateFooterCategory = (id, payload) =>
  withApiHandling(
    () => api.put(`/admin/footer-categories/${id}`, payload),
    "Failed to update footer category"
  );

export const deleteFooterCategory = (id) =>
  withApiHandling(
    () => api.delete(`/admin/footer-categories/${id}`),
    "Failed to delete footer category"
  );

export const reorderFooterCategories = (orderedIds) =>
  withApiHandling(
    () => api.post("/admin/footer-categories/reorder", { orderedIds }),
    "Failed to reorder footer categories"
  );

export const fetchPublicFooterCategories = () =>
  withApiHandling(
    () => api.get("/footer-categories"),
    "Failed to load footer categories"
  );

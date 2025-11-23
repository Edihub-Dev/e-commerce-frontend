import api, { withApiHandling } from "../utils/api";

export const fetchPublicHelpTopics = () =>
  withApiHandling(
    () => api.get("/help-support/topics"),
    "Failed to load help topics"
  );

export const fetchAdminHelpTopics = () =>
  withApiHandling(
    () => api.get("/admin/help-support/topics"),
    "Failed to load help topics"
  );

export const createAdminHelpTopic = (payload) =>
  withApiHandling(
    () => api.post("/admin/help-support/topics", payload),
    "Failed to create help topic"
  );

export const updateAdminHelpTopic = (id, payload) =>
  withApiHandling(
    () => api.put(`/admin/help-support/topics/${id}`, payload),
    "Failed to update help topic"
  );

export const deleteAdminHelpTopic = (id) =>
  withApiHandling(
    () => api.delete(`/admin/help-support/topics/${id}`),
    "Failed to delete help topic"
  );

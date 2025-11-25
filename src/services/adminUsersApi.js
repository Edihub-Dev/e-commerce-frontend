import api from "../utils/api";

export const fetchAdminUsers = async () => {
  const response = await api.get("/admin/users");
  const payload = response.data || {};

  if (!payload.success) {
    throw new Error(payload.message || "Failed to fetch users");
  }

  return payload.data || [];
};

export const updateAdminUser = async (userId, updates) => {
  const response = await api.put(`/admin/users/${userId}`, updates);
  const payload = response.data || {};

  if (!payload.success) {
    throw new Error(payload.message || "Failed to update user");
  }

  return payload.data;
};

export const deleteAdminUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  const payload = response.data || {};

  if (!payload.success) {
    throw new Error(payload.message || "Failed to delete user");
  }

  return payload.data;
};

export const deleteAdminUsersBulk = async (userIds = []) => {
  const response = await api.post("/admin/users/bulk-delete", { ids: userIds });
  const payload = response.data || {};

  if (!payload.success) {
    throw new Error(payload.message || "Failed to delete selected users");
  }

  return payload.data;
};

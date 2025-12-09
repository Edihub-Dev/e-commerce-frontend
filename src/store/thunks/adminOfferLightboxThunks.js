import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchAdminOfferLightboxes,
  createAdminOfferLightbox,
  updateAdminOfferLightbox,
  deleteAdminOfferLightbox,
} from "../../services/adminOfferLightboxApi";

export const fetchAdminOfferLightboxesThunk = createAsyncThunk(
  "adminOfferLightbox/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchAdminOfferLightboxes();
      return response || [];
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to load offer lightbox";
      return rejectWithValue(message);
    }
  }
);

export const createAdminOfferLightboxThunk = createAsyncThunk(
  "adminOfferLightbox/create",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createAdminOfferLightbox(payload);
      return response;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to create offer lightbox";
      return rejectWithValue(message);
    }
  }
);

export const updateAdminOfferLightboxThunk = createAsyncThunk(
  "adminOfferLightbox/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await updateAdminOfferLightbox(id, data);
      return response;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to save offer lightbox";
      return rejectWithValue({
        message,
        errors: error?.response?.data?.errors || null,
        status: error?.response?.status || null,
      });
    }
  }
);

export const deleteAdminOfferLightboxThunk = createAsyncThunk(
  "adminOfferLightbox/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await deleteAdminOfferLightbox(id);
      return response;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to delete offer lightbox";
      return rejectWithValue(message);
    }
  }
);

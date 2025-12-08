import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchAdminOfferLightbox,
  upsertAdminOfferLightbox,
  deleteAdminOfferLightbox,
} from "../../services/adminOfferLightboxApi";

export const fetchAdminOfferLightboxThunk = createAsyncThunk(
  "adminOfferLightbox/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchAdminOfferLightbox();
      return response || null;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to load offer lightbox";
      return rejectWithValue(message);
    }
  }
);

export const deleteAdminOfferLightboxThunk = createAsyncThunk(
  "adminOfferLightbox/delete",
  async (_, { rejectWithValue }) => {
    try {
      const response = await deleteAdminOfferLightbox();
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

export const upsertAdminOfferLightboxThunk = createAsyncThunk(
  "adminOfferLightbox/upsert",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await upsertAdminOfferLightbox(payload);
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

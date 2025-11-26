import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchAdminHeroSlides,
  createAdminHeroSlide,
  updateAdminHeroSlide,
  deleteAdminHeroSlide,
  reorderAdminHeroSlides,
} from "../../services/adminHeroCarouselApi";

export const fetchAdminHeroCarouselThunk = createAsyncThunk(
  "adminHeroCarousel/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchAdminHeroSlides();
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load hero slides");
    }
  }
);

export const createAdminHeroCarouselThunk = createAsyncThunk(
  "adminHeroCarousel/create",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createAdminHeroSlide(payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create hero slide");
    }
  }
);

export const updateAdminHeroCarouselThunk = createAsyncThunk(
  "adminHeroCarousel/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await updateAdminHeroSlide(id, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update hero slide");
    }
  }
);

export const deleteAdminHeroCarouselThunk = createAsyncThunk(
  "adminHeroCarousel/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await deleteAdminHeroSlide(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete hero slide");
    }
  }
);

export const reorderAdminHeroCarouselThunk = createAsyncThunk(
  "adminHeroCarousel/reorder",
  async (order, { rejectWithValue }) => {
    try {
      const response = await reorderAdminHeroSlides(order);
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message || "Failed to reorder hero slides");
    }
  }
);

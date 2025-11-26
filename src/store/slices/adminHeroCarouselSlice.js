import { createSlice } from "@reduxjs/toolkit";
import {
  fetchAdminHeroCarouselThunk,
  createAdminHeroCarouselThunk,
  updateAdminHeroCarouselThunk,
  deleteAdminHeroCarouselThunk,
  reorderAdminHeroCarouselThunk,
} from "../thunks/adminHeroCarouselThunks";

const initialState = {
  items: [],
  status: "idle",
  error: null,
  saving: false,
  deletingId: null,
  reorderStatus: "idle",
};

const adminHeroCarouselSlice = createSlice({
  name: "adminHeroCarousel",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminHeroCarouselThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAdminHeroCarouselThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAdminHeroCarouselThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error?.message || null;
      })
      .addCase(createAdminHeroCarouselThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createAdminHeroCarouselThunk.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload) {
          state.items = [...state.items, action.payload].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
        }
      })
      .addCase(createAdminHeroCarouselThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || action.error?.message || null;
      })
      .addCase(updateAdminHeroCarouselThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateAdminHeroCarouselThunk.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload;
        if (updated?._id) {
          state.items = state.items
            .map((item) => (item._id === updated._id ? updated : item))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
      })
      .addCase(updateAdminHeroCarouselThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || action.error?.message || null;
      })
      .addCase(deleteAdminHeroCarouselThunk.pending, (state, action) => {
        state.deletingId = action.meta.arg;
        state.error = null;
      })
      .addCase(deleteAdminHeroCarouselThunk.fulfilled, (state, action) => {
        state.deletingId = null;
        const deleted = action.payload;
        if (deleted?._id) {
          state.items = state.items.filter((item) => item._id !== deleted._id);
        }
      })
      .addCase(deleteAdminHeroCarouselThunk.rejected, (state, action) => {
        state.deletingId = null;
        state.error = action.payload || action.error?.message || null;
      })
      .addCase(reorderAdminHeroCarouselThunk.pending, (state) => {
        state.reorderStatus = "loading";
        state.error = null;
      })
      .addCase(reorderAdminHeroCarouselThunk.fulfilled, (state, action) => {
        state.reorderStatus = "succeeded";
        state.items = Array.isArray(action.payload)
          ? action.payload
          : state.items;
      })
      .addCase(reorderAdminHeroCarouselThunk.rejected, (state, action) => {
        state.reorderStatus = "failed";
        state.error = action.payload || action.error?.message || null;
      });
  },
});

export default adminHeroCarouselSlice.reducer;

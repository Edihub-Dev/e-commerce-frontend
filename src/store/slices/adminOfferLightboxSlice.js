import { createSlice } from "@reduxjs/toolkit";
import {
  fetchAdminOfferLightboxesThunk,
  createAdminOfferLightboxThunk,
  updateAdminOfferLightboxThunk,
  deleteAdminOfferLightboxThunk,
} from "../thunks/adminOfferLightboxThunks";

const initialState = {
  list: [],
  status: "idle",
  error: null,
  saving: false,
  validationErrors: null,
  lastSavedAt: null,
  selectedId: null,
};

const adminOfferLightboxSlice = createSlice({
  name: "adminOfferLightbox",
  initialState,
  reducers: {
    resetAdminOfferLightboxState: () => initialState,
    selectOfferLightbox: (state, action) => {
      state.selectedId = action.payload || null;
      state.validationErrors = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOfferLightboxesThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(fetchAdminOfferLightboxesThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = Array.isArray(action.payload) ? action.payload : [];
        if (!state.list.length) {
          state.selectedId = null;
        } else if (
          state.selectedId &&
          !state.list.some((offer) => offer._id === state.selectedId)
        ) {
          state.selectedId = state.list[0]._id;
        } else if (!state.selectedId) {
          state.selectedId = state.list[0]._id;
        }
      })
      .addCase(fetchAdminOfferLightboxesThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.payload?.message || action.error?.message || null;
      })
      .addCase(createAdminOfferLightboxThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(createAdminOfferLightboxThunk.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload) {
          state.list = [action.payload, ...state.list];
          state.selectedId = action.payload._id || null;
        }
        state.lastSavedAt = Date.now();
      })
      .addCase(createAdminOfferLightboxThunk.rejected, (state, action) => {
        state.saving = false;
        const payload = action.payload;
        if (payload?.errors) {
          state.validationErrors = payload.errors;
          state.error = payload.message || "Failed to save offer lightbox";
        } else {
          state.error =
            typeof payload === "string"
              ? payload
              : payload?.message || action.error?.message || null;
        }
      })
      .addCase(updateAdminOfferLightboxThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(updateAdminOfferLightboxThunk.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload;
        if (updated?._id) {
          state.list = state.list.map((offer) =>
            offer._id === updated._id ? updated : offer
          );
          state.selectedId = updated._id;
        }
        state.lastSavedAt = Date.now();
      })
      .addCase(updateAdminOfferLightboxThunk.rejected, (state, action) => {
        state.saving = false;
        const payload = action.payload;
        if (payload?.errors) {
          state.validationErrors = payload.errors;
          state.error = payload.message || "Failed to save offer lightbox";
        } else {
          state.error =
            typeof payload === "string"
              ? payload
              : payload?.message || action.error?.message || null;
        }
      })
      .addCase(deleteAdminOfferLightboxThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(deleteAdminOfferLightboxThunk.fulfilled, (state, action) => {
        state.saving = false;
        const deleted = action.payload;
        if (deleted?._id) {
          state.list = state.list.filter((offer) => offer._id !== deleted._id);
          if (state.selectedId === deleted._id) {
            state.selectedId = state.list.length ? state.list[0]._id : null;
          }
        }
      })
      .addCase(deleteAdminOfferLightboxThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || action.error?.message || null;
      });
  },
});

export const { resetAdminOfferLightboxState, selectOfferLightbox } =
  adminOfferLightboxSlice.actions;

export default adminOfferLightboxSlice.reducer;

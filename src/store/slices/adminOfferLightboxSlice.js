import { createSlice } from "@reduxjs/toolkit";
import {
  fetchAdminOfferLightboxThunk,
  upsertAdminOfferLightboxThunk,
  deleteAdminOfferLightboxThunk,
} from "../thunks/adminOfferLightboxThunks";

const initialState = {
  data: null,
  status: "idle",
  error: null,
  saving: false,
  validationErrors: null,
  lastSavedAt: null,
};

const adminOfferLightboxSlice = createSlice({
  name: "adminOfferLightbox",
  initialState,
  reducers: {
    resetAdminOfferLightboxState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOfferLightboxThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(fetchAdminOfferLightboxThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload || null;
      })
      .addCase(fetchAdminOfferLightboxThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.payload?.message || action.error?.message || null;
      })
      .addCase(upsertAdminOfferLightboxThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(upsertAdminOfferLightboxThunk.fulfilled, (state, action) => {
        state.saving = false;
        state.data = action.payload || null;
        state.lastSavedAt = Date.now();
      })
      .addCase(upsertAdminOfferLightboxThunk.rejected, (state, action) => {
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
      .addCase(deleteAdminOfferLightboxThunk.fulfilled, (state) => {
        state.saving = false;
        state.data = null;
      })
      .addCase(deleteAdminOfferLightboxThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || action.error?.message || null;
      });
  },
});

export const { resetAdminOfferLightboxState } = adminOfferLightboxSlice.actions;

export default adminOfferLightboxSlice.reducer;

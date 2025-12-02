import { createSlice } from "@reduxjs/toolkit";
import {
  fetchAdminCouponsThunk,
  createAdminCouponThunk,
  createAdminCouponsBulkThunk,
  updateAdminCouponThunk,
  deleteAdminCouponThunk,
  deleteAdminCouponsBulkThunk,
} from "../thunks/adminCouponsThunks";

const sortCoupons = (list = []) =>
  [...list].sort((a, b) => {
    const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

const initialState = {
  items: [],
  status: "idle",
  error: "",
  mutationStatus: "idle",
  mutationError: "",
};

const adminCouponsSlice = createSlice({
  name: "adminCoupons",
  initialState,
  reducers: {
    resetAdminCouponsState: () => ({ ...initialState }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminCouponsThunk.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(fetchAdminCouponsThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload)
          ? sortCoupons(action.payload)
          : [];
      })
      .addCase(fetchAdminCouponsThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload || action.error?.message || "Failed to load coupons";
      })
      .addCase(createAdminCouponThunk.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = "";
      })
      .addCase(createAdminCouponThunk.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        if (action.payload) {
          state.items = sortCoupons([action.payload, ...state.items]);
        }
      })
      .addCase(createAdminCouponThunk.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError =
          action.payload || action.error?.message || "Failed to create coupon";
      })
      .addCase(createAdminCouponsBulkThunk.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = "";
      })
      .addCase(createAdminCouponsBulkThunk.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        if (Array.isArray(action.payload) && action.payload.length) {
          state.items = sortCoupons([...action.payload, ...state.items]);
        }
      })
      .addCase(createAdminCouponsBulkThunk.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError =
          action.payload || action.error?.message || "Failed to create coupons";
      })
      .addCase(updateAdminCouponThunk.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = "";
      })
      .addCase(updateAdminCouponThunk.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        if (action.payload?._id) {
          state.items = sortCoupons(
            state.items.map((item) =>
              item._id === action.payload._id ? action.payload : item
            )
          );
        }
      })
      .addCase(updateAdminCouponThunk.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError =
          action.payload || action.error?.message || "Failed to update coupon";
      })
      .addCase(deleteAdminCouponThunk.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = "";
      })
      .addCase(deleteAdminCouponThunk.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        const deletedId = action.payload?._id || action.meta?.arg;
        if (deletedId) {
          state.items = state.items.filter((item) => item._id !== deletedId);
        }
      })
      .addCase(deleteAdminCouponThunk.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError =
          action.payload || action.error?.message || "Failed to delete coupon";
      })
      .addCase(deleteAdminCouponsBulkThunk.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = "";
      })
      .addCase(deleteAdminCouponsBulkThunk.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        const deletedIds = Array.isArray(action.payload) ? action.payload : [];
        if (deletedIds.length) {
          const idSet = new Set(deletedIds.map(String));
          state.items = state.items.filter(
            (item) => !idSet.has(String(item._id))
          );
        }
      })
      .addCase(deleteAdminCouponsBulkThunk.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError =
          action.payload ||
          action.error?.message ||
          "Failed to delete selected coupons";
      });
  },
});

export const { resetAdminCouponsState } = adminCouponsSlice.actions;

export default adminCouponsSlice.reducer;

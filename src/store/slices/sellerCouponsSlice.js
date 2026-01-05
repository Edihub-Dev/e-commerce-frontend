import { createSlice } from "@reduxjs/toolkit";
import {
  fetchSellerCouponsThunk,
  createSellerCouponThunk,
  updateSellerCouponThunk,
  deleteSellerCouponThunk,
  deleteSellerCouponsBulkThunk,
  importSellerCouponsThunk,
} from "../thunks/sellerCouponsThunks";

const sortCoupons = (list = []) =>
  [...list].sort((a, b) => {
    const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

const initialState = {
  items: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
  status: "idle",
  error: "",
  mutationStatus: "idle",
  mutationError: "",
  importErrors: [],
  importStatus: "idle",
  importSummary: null,
  importMessage: "",
  stats: {
    total: 0,
    active: 0,
    single: 0,
    multi: 0,
    expiredSingle: 0,
    expiredMulti: 0,
    redeemed: 0,
    notRedeemed: 0,
  },
};

const sellerCouponsSlice = createSlice({
  name: "sellerCoupons",
  initialState,
  reducers: {
    resetSellerCouponsState: () => ({ ...initialState }),
    setSellerCouponsPage: (state, action) => {
      state.meta.page = Number(action.payload) || 1;
    },
    resetSellerCouponsImportState: (state) => {
      state.importStatus = "idle";
      state.importErrors = [];
      state.importSummary = null;
      state.importMessage = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSellerCouponsThunk.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(fetchSellerCouponsThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        const payload = action.payload || {};
        const coupons = Array.isArray(payload.data) ? payload.data : [];
        state.items = sortCoupons(coupons);
        if (payload.meta && typeof payload.meta === "object") {
          state.meta = {
            page: Number(payload.meta.page) || 1,
            limit: Number(payload.meta.limit) || coupons.length || 20,
            total: Number(payload.meta.total) || coupons.length,
            totalPages: Number(payload.meta.totalPages) || 1,
          };
        } else {
          state.meta = { ...initialState.meta, total: coupons.length };
        }
        const statsCandidate =
          payload.meta && typeof payload.meta === "object"
            ? payload.meta.stats
            : undefined;
        state.stats = {
          ...initialState.stats,
          ...(statsCandidate && typeof statsCandidate === "object"
            ? statsCandidate
            : {}),
        };
      })
      .addCase(fetchSellerCouponsThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload || action.error?.message || "Failed to load coupons";
      })
      .addCase(createSellerCouponThunk.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = "";
      })
      .addCase(createSellerCouponThunk.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        if (action.payload) {
          state.items = sortCoupons([action.payload, ...state.items]);
          state.meta.total += 1;
        }
      })
      .addCase(createSellerCouponThunk.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError =
          action.payload || action.error?.message || "Failed to create coupon";
      })
      .addCase(updateSellerCouponThunk.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = "";
      })
      .addCase(updateSellerCouponThunk.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        if (action.payload?._id) {
          state.items = sortCoupons(
            state.items.map((item) =>
              item._id === action.payload._id ? action.payload : item
            )
          );
        }
      })
      .addCase(updateSellerCouponThunk.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError =
          action.payload || action.error?.message || "Failed to update coupon";
      })
      .addCase(deleteSellerCouponThunk.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = "";
      })
      .addCase(deleteSellerCouponThunk.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        const deletedId = action.payload?._id || action.meta?.arg;
        if (deletedId) {
          state.items = state.items.filter((item) => item._id !== deletedId);
          state.meta.total = Math.max(state.meta.total - 1, 0);
        }
      })
      .addCase(deleteSellerCouponThunk.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError =
          action.payload || action.error?.message || "Failed to delete coupon";
      })
      .addCase(deleteSellerCouponsBulkThunk.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = "";
      })
      .addCase(deleteSellerCouponsBulkThunk.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        const ids = Array.isArray(action.payload?.ids)
          ? action.payload.ids.map(String)
          : [];
        if (ids.length) {
          const idSet = new Set(ids);
          state.items = state.items.filter(
            (item) => !idSet.has(String(item._id))
          );
          state.meta.total = Math.max(
            state.meta.total - (action.payload?.deletedCount || ids.length),
            0
          );
        }
      })
      .addCase(deleteSellerCouponsBulkThunk.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError =
          action.payload ||
          action.error?.message ||
          "Failed to delete selected coupons";
      })
      .addCase(importSellerCouponsThunk.pending, (state) => {
        state.importStatus = "loading";
        state.importErrors = [];
        state.importSummary = null;
        state.importMessage = "";
      })
      .addCase(importSellerCouponsThunk.fulfilled, (state, action) => {
        state.importStatus = "succeeded";
        const payload = action.payload || {};
        const created = Array.isArray(payload.created) ? payload.created : [];
        const errors = Array.isArray(payload.errors) ? payload.errors : [];
        if (created.length) {
          state.items = sortCoupons([...created, ...state.items]);
          state.meta.total = Math.max(state.meta.total + created.length, 0);
        }
        state.importErrors = errors;
        state.importSummary = {
          totalRows: Number(payload.totalRows) || created.length,
          createdCount: Number(payload.createdCount) || created.length,
          errorCount: Number(payload.errorCount) || errors.length,
        };
        state.importMessage = payload.message || "";
      })
      .addCase(importSellerCouponsThunk.rejected, (state, action) => {
        state.importStatus = "failed";
        const payload = action.payload || {};
        const details = Array.isArray(payload.details)
          ? payload.details
          : action.error?.details || [];
        state.importErrors = details;
        state.importMessage =
          payload.message ||
          action.error?.message ||
          "Failed to import coupons";
      });
  },
});

export const {
  resetSellerCouponsState,
  setSellerCouponsPage,
  resetSellerCouponsImportState,
} = sellerCouponsSlice.actions;

export default sellerCouponsSlice.reducer;

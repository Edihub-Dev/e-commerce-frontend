import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchSellerCoupons,
  createSellerCoupon,
  updateSellerCoupon,
  deleteSellerCoupon,
  deleteSellerCouponsBulk,
  importSellerCoupons,
} from "../../services/sellerCouponsApi";

export const fetchSellerCouponsThunk = createAsyncThunk(
  "sellerCoupons/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchSellerCoupons(params);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load coupons");
    }
  }
);

export const createSellerCouponThunk = createAsyncThunk(
  "sellerCoupons/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await createSellerCoupon(payload);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create coupon");
    }
  }
);

export const updateSellerCouponThunk = createAsyncThunk(
  "sellerCoupons/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await updateSellerCoupon(id, payload);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update coupon");
    }
  }
);

export const deleteSellerCouponThunk = createAsyncThunk(
  "sellerCoupons/delete",
  async (id, { rejectWithValue }) => {
    try {
      await deleteSellerCoupon(id);
      return { _id: id };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete coupon");
    }
  }
);

export const deleteSellerCouponsBulkThunk = createAsyncThunk(
  "sellerCoupons/deleteBulk",
  async (ids, { rejectWithValue }) => {
    try {
      const result = await deleteSellerCouponsBulk(ids);
      const deletedCount = Number(result?.deletedCount || 0);
      return {
        ids,
        deletedCount,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to delete selected coupons"
      );
    }
  }
);

export const importSellerCouponsThunk = createAsyncThunk(
  "sellerCoupons/import",
  async (rows, { rejectWithValue }) => {
    try {
      return await importSellerCoupons(rows);
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Failed to import coupons",
        details: error.details || [],
      });
    }
  }
);

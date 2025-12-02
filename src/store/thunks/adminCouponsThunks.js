import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchAdminCoupons,
  createAdminCoupon,
  createAdminCouponsBulk,
  updateAdminCoupon,
  deleteAdminCoupon,
  deleteAdminCouponsBulk,
} from "../../services/adminCouponsApi";

export const fetchAdminCouponsThunk = createAsyncThunk(
  "adminCoupons/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchAdminCoupons();
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load coupons");
    }
  }
);

export const createAdminCouponThunk = createAsyncThunk(
  "adminCoupons/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await createAdminCoupon(payload);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create coupon");
    }
  }
);

export const createAdminCouponsBulkThunk = createAsyncThunk(
  "adminCoupons/createBulk",
  async (payload, { rejectWithValue }) => {
    try {
      return await createAdminCouponsBulk(payload);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create coupons");
    }
  }
);

export const updateAdminCouponThunk = createAsyncThunk(
  "adminCoupons/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await updateAdminCoupon(id, payload);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update coupon");
    }
  }
);

export const deleteAdminCouponThunk = createAsyncThunk(
  "adminCoupons/delete",
  async (id, { rejectWithValue }) => {
    try {
      await deleteAdminCoupon(id);
      return { _id: id };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete coupon");
    }
  }
);

export const deleteAdminCouponsBulkThunk = createAsyncThunk(
  "adminCoupons/deleteBulk",
  async (ids, { rejectWithValue }) => {
    try {
      const deletedIds = await deleteAdminCouponsBulk(ids);
      return Array.isArray(deletedIds) ? deletedIds : [];
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to delete selected coupons"
      );
    }
  }
);

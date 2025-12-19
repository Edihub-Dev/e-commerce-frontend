import { createAsyncThunk } from "@reduxjs/toolkit";
import { validateCoupon } from "../../services/couponApi";

export const validateCouponThunk = createAsyncThunk(
  "coupon/validate",
  async ({ code, orderAmount, items }, { rejectWithValue }) => {
    try {
      return await validateCoupon({ code, orderAmount, items });
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to validate coupon";
      return rejectWithValue(serverMessage);
    }
  }
);

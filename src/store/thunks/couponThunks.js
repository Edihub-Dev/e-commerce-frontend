import { createAsyncThunk } from "@reduxjs/toolkit";
import { validateCoupon } from "../../services/couponApi";

export const validateCouponThunk = createAsyncThunk(
  "coupon/validate",
  async ({ code, orderAmount }, { rejectWithValue }) => {
    try {
      return await validateCoupon({ code, orderAmount });
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to validate coupon";
      return rejectWithValue(serverMessage);
    }
  }
);

import { createSlice } from "@reduxjs/toolkit";
import { validateCouponThunk } from "../thunks/couponThunks";

const initialState = {
  status: "idle",
  error: "",
  data: null,
};

const couponSlice = createSlice({
  name: "coupon",
  initialState,
  reducers: {
    resetCouponState: () => ({ ...initialState }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateCouponThunk.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(validateCouponThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
        state.error = "";
      })
      .addCase(validateCouponThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload ||
          action.error?.message ||
          "Failed to validate coupon";
      });
  },
});

export const { resetCouponState } = couponSlice.actions;

export default couponSlice.reducer;

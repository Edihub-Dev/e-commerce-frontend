import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  step: "order-summary",
  items: [],
  shippingAddress: null,
  paymentMethod: null,
  paymentStatus: "pending",
  orderId: null,
  totals: {
    subtotal: 0,
    shippingFee: 0,
    taxAmount: 0,
    discount: 0,
    total: 0,
    currency: "INR",
  },
};

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    resetCheckout: () => initialState,
    setCheckoutStep: (state, action) => {
      state.step = action.payload;
    },
    setCheckoutItems: (state, action) => {
      state.items = action.payload;
    },
    setShippingAddress: (state, action) => {
      state.shippingAddress = action.payload;
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },
    setPaymentStatus: (state, action) => {
      state.paymentStatus = action.payload;
    },
    setCheckoutTotals: (state, action) => {
      state.totals = {
        ...state.totals,
        ...action.payload,
      };
    },
    setOrderId: (state, action) => {
      state.orderId = action.payload;
    },
  },
});

export const {
  resetCheckout,
  setCheckoutStep,
  setCheckoutItems,
  setShippingAddress,
  setPaymentMethod,
  setPaymentStatus,
  setCheckoutTotals,
  setOrderId,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;

export const calculateTotals = (items, { shippingFee = 0, taxAmount = 0, discount = 0 } = {}) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(subtotal + shippingFee + taxAmount - discount, 0);
  return {
    subtotal,
    shippingFee,
    taxAmount,
    discount,
    total,
    currency: "INR",
  };
};

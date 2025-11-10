import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  list: [],
  selectedOrder: null,
  loading: false,
  error: null,
};

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    setOrders: (state, action) => {
      state.list = action.payload;
    },
    setSelectedOrder: (state, action) => {
      state.selectedOrder = action.payload;
    },
    setOrdersLoading: (state, action) => {
      state.loading = action.payload;
    },
    setOrdersError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setOrders,
  setSelectedOrder,
  setOrdersLoading,
  setOrdersError,
} = ordersSlice.actions;

export default ordersSlice.reducer;

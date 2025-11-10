import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchAdminOrders } from "../../services/adminOrdersApi";

export const fetchAdminOrdersThunk = createAsyncThunk(
  "adminOrders/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await fetchAdminOrders(params);
      return response;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to fetch orders";
      return rejectWithValue(message);
    }
  }
);

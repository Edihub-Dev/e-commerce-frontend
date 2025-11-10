import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
} from "../../services/adminProductsApi";

export const fetchAdminProductsThunk = createAsyncThunk(
  "adminProducts/fetch",
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetchAdminProducts(params);
      return response;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Failed to fetch products";
      return rejectWithValue(message);
    }
  }
);

export const createAdminProductThunk = createAsyncThunk(
  "adminProducts/create",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createAdminProduct(payload);
      return response;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Failed to create product";
      return rejectWithValue(message);
    }
  }
);

export const updateAdminProductThunk = createAsyncThunk(
  "adminProducts/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await updateAdminProduct(id, payload);
      return response;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Failed to update product";
      return rejectWithValue(message);
    }
  }
);

export const deleteAdminProductThunk = createAsyncThunk(
  "adminProducts/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await deleteAdminProduct(id);
      return response;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Failed to delete product";
      return rejectWithValue(message);
    }
  }
);

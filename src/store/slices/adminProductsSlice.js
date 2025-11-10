import { createSlice } from "@reduxjs/toolkit";
import {
  fetchAdminProductsThunk,
  createAdminProductThunk,
  updateAdminProductThunk,
  deleteAdminProductThunk,
} from "../thunks/adminProductsThunks";

const initialFilters = {
  search: "",
  category: "",
  status: "",
  stockStatus: "",
  dateRange: {
    startDate: "",
    endDate: "",
  },
};

const initialState = {
  items: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    counts: {
      lowStock: 0,
      outOfStock: 0,
    },
  },
  filters: initialFilters,
  sort: {
    field: "createdAt",
    order: "desc",
  },
  selection: {
    allSelected: false,
    selectedIds: [],
  },
  status: "idle",
  error: null,
};

const adminProductsSlice = createSlice({
  name: "adminProducts",
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.meta.page = 1;
    },
    clearFilters(state) {
      state.filters = { ...initialFilters };
      state.meta.page = 1;
    },
    setSort(state, action) {
      state.sort = action.payload;
      state.meta.page = 1;
    },
    setPage(state, action) {
      state.meta.page = action.payload;
    },
    setLimit(state, action) {
      state.meta.limit = action.payload;
      state.meta.page = 1;
    },
    toggleSelectAll(state, action) {
      const { selectAll } = action.payload;
      state.selection.allSelected = selectAll;
      state.selection.selectedIds = selectAll ? state.items.map((item) => item._id) : [];
    },
    toggleSelectRow(state, action) {
      const { id } = action.payload;
      if (state.selection.selectedIds.includes(id)) {
        state.selection.selectedIds = state.selection.selectedIds.filter((value) => value !== id);
      } else {
        state.selection.selectedIds.push(id);
      }
      state.selection.allSelected = state.selection.selectedIds.length === state.items.length;
    },
    resetSelection(state) {
      state.selection = { ...initialState.selection };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminProductsThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAdminProductsThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data || [];
        if (action.payload.meta) {
          state.meta = {
            ...state.meta,
            ...action.payload.meta,
          };
        }
        state.selection = { ...initialState.selection };
      })
      .addCase(fetchAdminProductsThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message || "Failed to load products";
      })
      .addCase(createAdminProductThunk.fulfilled, (state, action) => {
        state.items.unshift(action.payload.data);
        state.meta.total += 1;
        state.meta.totalPages = Math.max(Math.ceil(state.meta.total / state.meta.limit), 1);
      })
      .addCase(updateAdminProductThunk.fulfilled, (state, action) => {
        const updated = action.payload.data;
        state.items = state.items.map((item) => (item._id === updated._id ? updated : item));
      })
      .addCase(deleteAdminProductThunk.fulfilled, (state, action) => {
        const { _id } = action.payload.data;
        state.items = state.items.filter((item) => item._id !== _id);
        state.meta.total = Math.max(state.meta.total - 1, 0);
        state.meta.totalPages = Math.max(Math.ceil(state.meta.total / state.meta.limit), 1);
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setSort,
  setPage,
  setLimit,
  toggleSelectAll,
  toggleSelectRow,
  resetSelection,
} = adminProductsSlice.actions;

export default adminProductsSlice.reducer;

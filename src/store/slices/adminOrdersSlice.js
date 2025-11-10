import { createSlice } from "@reduxjs/toolkit";
import { fetchAdminOrdersThunk } from "../thunks/adminOrdersThunks";

const initialFilters = {
  search: "",
  status: "",
  dateRange: {
    startDate: "",
    endDate: "",
  },
  amountRange: {
    min: "",
    max: "",
  },
};

const initialSort = {
  field: "createdAt",
  order: "desc",
};

const initialState = {
  items: [],
  loading: false,
  error: null,
  filters: initialFilters,
  sort: initialSort,
  meta: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
  selection: {
    allSelected: false,
    selectedIds: [],
  },
  selectedDetails: null,
  summary: {
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  },
  lastUpdatedAt: null,
};

const adminOrdersSlice = createSlice({
  name: "adminOrders",
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.meta.page = 1;
    },
    resetFilters(state) {
      state.filters = { ...initialFilters };
      state.meta.page = 1;
    },
    setSelectedDetails(state, action) {
      state.selectedDetails = action.payload;
    },
    setSort(state, action) {
      state.sort = { ...state.sort, ...action.payload };
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
      state.selection.selectedIds = selectAll ? state.items.map((order) => order._id) : [];
    },
    toggleSelectRow(state, action) {
      const { id } = action.payload;
      if (state.selection.selectedIds.includes(id)) {
        state.selection.selectedIds = state.selection.selectedIds.filter((value) => value !== id);
      } else {
        state.selection.selectedIds = [...state.selection.selectedIds, id];
      }
      state.selection.allSelected = state.selection.selectedIds.length === state.items.length && state.items.length > 0;
    },
    clearSelection(state) {
      state.selection = { ...initialState.selection };
      state.selectedDetails = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOrdersThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminOrdersThunk.fulfilled, (state, action) => {
        state.loading = false;
        const { data = [], meta = {}, summary = {} } = action.payload || {};
        state.items = data;
        state.meta = {
          ...state.meta,
          ...meta,
          total: meta.total ?? data.length,
          totalPages: meta.totalPages ?? state.meta.totalPages,
        };
        state.summary = {
          processing: summary.processing ?? 0,
          shipped: summary.shipped ?? 0,
          delivered: summary.delivered ?? 0,
          cancelled: summary.cancelled ?? 0,
        };
        state.selection = { ...initialState.selection };
        state.lastUpdatedAt = Date.now();
      })
      .addCase(fetchAdminOrdersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Failed to load orders";
      });
  },
});

export const {
  setFilters,
  resetFilters,
  setSelectedDetails,
  setSort,
  setPage,
  setLimit,
  toggleSelectAll,
  toggleSelectRow,
  clearSelection,
} = adminOrdersSlice.actions;

export default adminOrdersSlice.reducer;

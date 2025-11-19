import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  addresses: [],
  loading: false,
  error: null,
};

const addressSlice = createSlice({
  name: "address",
  initialState,
  reducers: {
    resetAddressState: () => initialState,
    setAddresses: (state, action) => {
      state.addresses = action.payload;
    },
    setAddressLoading: (state, action) => {
      state.loading = action.payload;
    },
    setAddressError: (state, action) => {
      state.error = action.payload;
    },
    addAddress: (state, action) => {
      const newAddress = action.payload;
      if (newAddress.isDefault) {
        state.addresses = state.addresses.map((address) => ({
          ...address,
          isDefault: false,
        }));
      }
      state.addresses = [...state.addresses, newAddress];
    },
    updateAddress: (state, action) => {
      const updated = action.payload;
      state.addresses = state.addresses.map((address) =>
        address._id === updated._id ? updated : address
      );
    },
    updateAddressInStore: (state, action) => {
      const updated = action.payload;
      state.addresses = state.addresses.map((address) =>
        address._id === updated._id ? { ...address, ...updated } : address
      );
    },
    removeAddressFromStore: (state, action) => {
      const id = action.payload;
      state.addresses = state.addresses.filter((address) => address._id !== id);
    },
  },
});

export const {
  resetAddressState,
  setAddresses,
  setAddressLoading,
  setAddressError,
  addAddress,
  updateAddressInStore,
  removeAddressFromStore,
} = addressSlice.actions;

export default addressSlice.reducer;

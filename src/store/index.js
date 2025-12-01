import { configureStore } from "@reduxjs/toolkit";
import checkoutReducer from "../store/slices/checkoutSlice";
import addressReducer from "../store/slices/addressSlice";
import ordersReducer from "../store/slices/ordersSlice";
import adminProductsReducer from "../store/slices/adminProductsSlice";
import adminOrdersReducer from "../store/slices/adminOrdersSlice";
import adminHeroCarouselReducer from "../store/slices/adminHeroCarouselSlice";
import adminCouponsReducer from "../store/slices/adminCouponsSlice";
import couponReducer from "../store/slices/couponSlice";

const loadCheckoutState = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const serializedState = window.localStorage.getItem("checkoutState");
    if (!serializedState) {
      return undefined;
    }

    const parsed = JSON.parse(serializedState);

    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }

    return { checkout: parsed };
  } catch (error) {
    console.warn("Failed to load checkout state from storage", error);
    return undefined;
  }
};

const saveCheckoutState = (checkoutState) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serializedState = JSON.stringify(checkoutState);
    window.localStorage.setItem("checkoutState", serializedState);
  } catch (error) {
    console.warn("Failed to save checkout state to storage", error);
  }
};

const clearCheckoutState = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem("checkoutState");
  } catch (error) {
    console.warn("Failed to clear checkout state from storage", error);
  }
};

const preloadedState = loadCheckoutState();

const store = configureStore({
  reducer: {
    checkout: checkoutReducer,
    address: addressReducer,
    orders: ordersReducer,
    adminProducts: adminProductsReducer,
    adminOrders: adminOrdersReducer,
    adminHeroCarousel: adminHeroCarouselReducer,
    adminCoupons: adminCouponsReducer,
    coupon: couponReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  preloadedState,
});

store.subscribe(() => {
  const state = store.getState();
  const checkoutState = state.checkout;

  if (!checkoutState?.items?.length) {
    clearCheckoutState();
    return;
  }

  saveCheckoutState(checkoutState);
});

export default store;

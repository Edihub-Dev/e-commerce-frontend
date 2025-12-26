import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  step: "order-summary",
  items: [],
  shippingAddress: null,
  paymentMethod: null,
  paymentStatus: "pending",
  orderId: null,
  appliedCoupon: null,
  qrfolioUpload: null,
  qrfolioRequired: true,
  totals: {
    subtotal: 0,
    shippingFee: 0,
    taxAmount: 0,
    discount: 0,
    total: 0,
    currency: "INR",
    baseSubtotal: 0,
    baseTotal: 0,
  },
};

const TAX_PRESETS = [
  { matcher: /keychain/i, hsnCode: "8305", gstRate: 18 },
  {
    matcher: /ceramic\s+coffee\s+mug|coffee\s+mug|mug/i,
    hsnCode: "6912",
    gstRate: 12,
  },
  { matcher: /executive\s+diary|pen\s+set/i, hsnCode: "4820", gstRate: 18 },
  { matcher: /white\s+logo\s+cap|cap/i, hsnCode: "6501", gstRate: 18 },
  { matcher: /diary/i, hsnCode: "4820", gstRate: 18 },
  { matcher: /\bpen\b/i, hsnCode: "9608", gstRate: 18 },
  { matcher: /t\s*-?shirt|polo/i, hsnCode: "6109", gstRate: 5 },
];

const resolveTaxPreset = (name = "") => {
  const normalized = name.toString().trim();
  if (!normalized) {
    return null;
  }

  return TAX_PRESETS.find((preset) => preset.matcher.test(normalized)) || null;
};

const sanitizeCheckoutItem = (item = {}) => {
  const sanitized = { ...item };

  if (sanitized.hsnCode !== undefined && sanitized.hsnCode !== null) {
    const trimmed = String(sanitized.hsnCode).trim();
    sanitized.hsnCode = trimmed || undefined;
  } else if (sanitized.hsn !== undefined && sanitized.hsn !== null) {
    const trimmed = String(sanitized.hsn).trim();
    sanitized.hsnCode = trimmed || undefined;
  }

  const rawGstCandidate =
    sanitized.gstRate !== undefined && sanitized.gstRate !== null
      ? sanitized.gstRate
      : sanitized.taxRate !== undefined && sanitized.taxRate !== null
      ? sanitized.taxRate
      : undefined;

  let gstCandidate = rawGstCandidate;
  if (typeof gstCandidate === "string") {
    gstCandidate = gstCandidate.replace(/[^0-9.]+/g, "");
  }

  const parsedGst = Number(gstCandidate);
  sanitized.gstRate =
    Number.isFinite(parsedGst) && parsedGst > 0 ? parsedGst : undefined;

  if (!sanitized.hsnCode || sanitized.gstRate === undefined) {
    const preset = resolveTaxPreset(sanitized.name || sanitized.title || "");
    if (preset) {
      if (!sanitized.hsnCode) {
        sanitized.hsnCode = preset.hsnCode;
      }
      if (sanitized.gstRate === undefined) {
        sanitized.gstRate = preset.gstRate;
      }
    }
  }

  return sanitized;
};

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    resetCheckout: (state) => {
      const preservedOrderId = state.orderId || null;
      return {
        ...initialState,
        orderId: preservedOrderId,
      };
    },
    setCheckoutStep: (state, action) => {
      state.step = action.payload;
    },
    setCheckoutItems: (state, action) => {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      state.items = incoming.map(sanitizeCheckoutItem);
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
      const payload = action.payload || {};
      const { baseSubtotal, baseTotal, ...rest } = payload;

      state.totals = {
        ...state.totals,
        ...rest,
        ...(baseSubtotal !== undefined ? { baseSubtotal: baseSubtotal } : {}),
        ...(baseTotal !== undefined ? { baseTotal: baseTotal } : {}),
      };
    },
    setQrfolioUpload: (state, action) => {
      state.qrfolioUpload = action.payload || null;
    },
    setQrfolioRequirement: (state, action) => {
      const nextValue = Boolean(action.payload);
      state.qrfolioRequired = nextValue;
      if (!nextValue) {
        state.qrfolioUpload = null;
      }
    },
    setOrderId: (state, action) => {
      state.orderId = action.payload;
    },
    setAppliedCoupon: (state, action) => {
      state.appliedCoupon = action.payload;
    },
    clearAppliedCoupon: (state) => {
      state.appliedCoupon = null;
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
  setQrfolioUpload,
  setQrfolioRequirement,
  setOrderId,
  setAppliedCoupon,
  clearAppliedCoupon,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;

export const calculateTotals = (
  items,
  { shippingFee = 0, taxAmount, discount = 0, currency = "INR" } = {}
) => {
  const list = Array.isArray(items) ? items : [];

  const subtotal = list.reduce((sum, item) => {
    const price = Number(item?.price) || 0;
    const quantity = Number(item?.quantity) || 0;
    return sum + price * quantity;
  }, 0);

  let derivedTax = 0;
  if (taxAmount !== undefined && taxAmount !== null) {
    derivedTax = Number(taxAmount) || 0;
  } else {
    derivedTax = list.reduce((sum, item) => {
      const rate = Number(item?.gstRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        return sum;
      }
      const price = Number(item?.price) || 0;
      const quantity = Number(item?.quantity) || 0;
      return sum + (price * quantity * rate) / 100;
    }, 0);
  }

  const normalizedTax = Number(derivedTax.toFixed(2));
  const normalizedShipping = Number((Number(shippingFee) || 0).toFixed(2));
  const normalizedDiscount = Number((Number(discount) || 0).toFixed(2));
  const normalizedSubtotal = Number(subtotal.toFixed(2));
  const total = Math.max(
    Number(
      (
        normalizedSubtotal +
        normalizedShipping +
        normalizedTax -
        normalizedDiscount
      ).toFixed(2)
    ),
    0
  );

  return {
    subtotal: normalizedSubtotal,
    shippingFee: normalizedShipping,
    taxAmount: normalizedTax,
    discount: normalizedDiscount,
    total,
    currency,
  };
};

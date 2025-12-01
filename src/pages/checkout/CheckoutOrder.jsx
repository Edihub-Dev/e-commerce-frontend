import { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  setCheckoutStep,
  setCheckoutTotals,
  setAppliedCoupon,
  clearAppliedCoupon,
} from "../../store/slices/checkoutSlice";
import { calculateTotals } from "../../store/slices/checkoutSlice";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { validateCouponThunk } from "../../store/thunks/couponThunks";

const CheckoutOrder = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, totals, appliedCoupon } = useSelector(
    (state) => state.checkout
  );
  const couponState = useSelector((state) => state.coupon);
  const [shippingFee] = useState(29);
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || "");
  const computedTotals = useMemo(
    () =>
      calculateTotals(items, {
        shippingFee,
        discount: totals.discount,
        currency: totals.currency,
      }),
    [items, shippingFee, totals.discount, totals.currency]
  );

  const baseSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
    [items]
  );

  const isCouponLoading = couponState.status === "loading";
  const couponError = couponState.error;

  useEffect(() => {
    setCouponCode(appliedCoupon?.code || "");
  }, [appliedCoupon?.code]);

  const handleContinue = () => {
    dispatch(
      setCheckoutTotals({
        ...computedTotals,
        baseSubtotal,
        baseTotal:
          baseSubtotal + computedTotals.shippingFee + computedTotals.taxAmount,
      })
    );
    dispatch(setCheckoutStep("address"));
    navigate("/checkout/address");
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a coupon code");
      return;
    }

    try {
      const result = await dispatch(
        validateCouponThunk({ code, orderAmount: baseSubtotal })
      ).unwrap();

      dispatch(
        setAppliedCoupon({
          code: result.code,
          type: result.type,
          discountType: result.discountType,
          discountValue: result.discountValue,
          discountAmount: result.discountAmount,
        })
      );

      const updatedTotals = calculateTotals(items, {
        shippingFee,
        discount: result.discountAmount,
        currency: totals.currency,
      });

      const baseTotal =
        baseSubtotal + updatedTotals.shippingFee + updatedTotals.taxAmount;

      dispatch(
        setCheckoutTotals({
          ...updatedTotals,
          baseSubtotal,
          baseTotal,
        })
      );

      toast.success("Coupon applied");
    } catch (applyError) {
      const message =
        applyError?.message || couponError || "Unable to apply coupon";
      toast.error(message);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    dispatch(clearAppliedCoupon());
    const updatedTotals = calculateTotals(items, {
      shippingFee,
      discount: 0,
      currency: totals.currency,
    });

    const baseTotal =
      baseSubtotal + updatedTotals.shippingFee + updatedTotals.taxAmount;

    dispatch(
      setCheckoutTotals({
        ...updatedTotals,
        baseSubtotal,
        baseTotal,
      })
    );
  };

  if (!items.length) {
    return (
      <div className="p-8">
        <p className="text-center text-gray-500">No items in checkout.</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[2fr,1fr] gap-0">
      <div className="p-6 lg:p-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-secondary">
              Review your order
            </h2>
            <p className="text-sm text-medium-text mt-1">
              Confirm product details and pricing before continuing.
            </p>
          </div>
          <span className="text-sm text-primary bg-primary/10 px-3 py-1 rounded-full">
            Step 1 of 4
          </span>
        </div>

        <div className="space-y-5">
          {items.map((item, index) => (
            <motion.div
              key={`${item.id}-${item.size || "default"}-${index}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col md:flex-row gap-5 border border-slate-200 rounded-2xl p-5"
            >
              <div className="w-full md:w-40 lg:w-48 h-40 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://placehold.co/200x200/f8fafc/e2e8f0?text=Image";
                  }}
                />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-secondary">
                    {item.name}
                  </h3>
                  {item.size && (
                    <p className="text-sm text-medium-text mt-1 uppercase">
                      Size: {item.size}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-medium-text">
                  <span>Qty: {item.quantity}</span>
                  <span className="text-slate-300">|</span>
                  <span>Unit Price: ₹{item.price.toLocaleString()}</span>
                  <span className="text-slate-300">|</span>
                  <span>
                    Line Total: ₹{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  returns within 7 days of delivery
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold shadow-md shadow-primary/20 hover:bg-primary-dark transition"
          >
            Continue to Address
          </motion.button>
        </div>
      </div>

      <aside className="border-l border-slate-100 bg-slate-50 p-6 lg:p-8">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-secondary">
                  Redeem Coupon
                </h4>
                <p className="mt-1 text-xs text-medium-text">
                  Apply a coupon before reviewing price details.
                </p>
              </div>
              {appliedCoupon?.code && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                  Applied: {appliedCoupon.code}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="checkout-order-coupon" className="sr-only">
                  Coupon code
                </label>
                <input
                  id="checkout-order-coupon"
                  type="text"
                  value={couponCode}
                  onChange={(event) =>
                    setCouponCode(event.target.value.toUpperCase())
                  }
                  placeholder="MEGA50"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-700 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCouponLoading}
                />
              </div>

              {appliedCoupon?.code ? (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCouponLoading}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCouponLoading || !couponCode.trim()}
                >
                  {isCouponLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </button>
              )}
            </div>

            {couponError && !appliedCoupon?.code && (
              <p className="mt-2 text-xs text-rose-600">{couponError}</p>
            )}

            {appliedCoupon?.code && (
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <p>
                  Coupon applied successfully. Savings: ₹
                  {Number(appliedCoupon.discountAmount || 0).toLocaleString()}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-secondary">
              Price Details
            </h3>
            <div className="mt-4 space-y-4 text-sm text-medium-text">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{computedTotals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Fee</span>
                <span>₹{computedTotals.shippingFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>₹{computedTotals.taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium text-emerald-600">
                <span>Discount</span>
                <span>-₹{computedTotals.discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-secondary">
                <span>Total</span>
                <span>₹{computedTotals.total.toLocaleString()}</span>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};

export default CheckoutOrder;

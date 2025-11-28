import { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  setCheckoutStep,
  setCheckoutTotals,
} from "../../store/slices/checkoutSlice";
import { calculateTotals } from "../../store/slices/checkoutSlice";

const CheckoutOrder = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, totals } = useSelector((state) => state.checkout);
  const [shippingFee] = useState(29);
  const computedTotals = useMemo(
    () =>
      calculateTotals(items, {
        shippingFee,
        discount: totals.discount,
        currency: totals.currency,
      }),
    [items, shippingFee, totals.discount, totals.currency]
  );

  const handleContinue = () => {
    dispatch(setCheckoutTotals(computedTotals));
    dispatch(setCheckoutStep("address"));
    navigate("/checkout/address");
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

      <aside className="bg-white border-l border-slate-100 p-6 lg:p-8">
        <h3 className="text-lg font-semibold text-secondary">Price Details</h3>
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
          <div className="flex justify-between text-success font-medium">
            <span>Discount</span>
            <span>-₹{computedTotals.discount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-secondary border-t border-slate-200 pt-3">
            <span>Total</span>
            <span>₹{computedTotals.total.toLocaleString()}</span>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CheckoutOrder;

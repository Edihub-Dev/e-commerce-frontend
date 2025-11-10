import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  setCheckoutStep,
  setPaymentMethod,
  setPaymentStatus,
  setOrderId,
  resetCheckout,
} from "../../store/slices/checkoutSlice";
import { createOrder } from "../../utils/api";
import { toast } from "react-hot-toast";

const paymentOptions = [
  {
    id: "upi",
    title: "UPI",
    description: "Pay instantly using PhonePe, Google Pay or Paytm UPI.",
  },
  {
    id: "qr",
    title: "QR Code",
    description: "Scan a QR code and complete payment via your favourite app.",
  },
  {
    id: "card",
    title: "Credit / Debit Card",
    description: "Visa, Mastercard, Maestro and RuPay cards are accepted.",
  },
  {
    id: "netbanking",
    title: "Net Banking",
    description: "Pay securely using your bank's net banking portal.",
  },
  {
    id: "cod",
    title: "Cash on Delivery",
    description: "Pay in cash when the product is delivered to you.",
  },
];

const CheckoutPayment = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, shippingAddress, totals } = useSelector(
    (state) => state.checkout
  );
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!items.length) {
      navigate("/cart", { replace: true });
      return;
    }
    if (!shippingAddress) {
      navigate("/checkout/address", { replace: true });
      return;
    }
    dispatch(setCheckoutStep("payment"));
  }, [dispatch, items.length, shippingAddress, navigate]);

  const pricingPayload = useMemo(
    () => ({
      shippingFee: totals.shippingFee,
      taxAmount: totals.taxAmount,
      discount: totals.discount,
      currency: totals.currency,
    }),
    [totals]
  );

  const simulateGateway = () =>
    new Promise((resolve) => setTimeout(resolve, 1500));

  const handlePlaceOrder = async () => {
    if (!shippingAddress) {
      toast.error("Please provide a delivery address first");
      navigate("/checkout/address");
      return;
    }

    setIsProcessing(true);
    dispatch(setPaymentMethod(selectedMethod));

    const isCod = selectedMethod === "cod";

    const sanitizedAddress = {
      fullName: shippingAddress.fullName,
      mobile: shippingAddress.mobile,
      email: shippingAddress.email,
      pincode: shippingAddress.pincode,
      state: shippingAddress.state,
      city: shippingAddress.city,
      addressLine: shippingAddress.addressLine,
      alternatePhone: shippingAddress.alternatePhone || "",
    };

    try {
      if (!isCod) {
        await simulateGateway();
        toast.success("Payment authorised successfully");
      }

      const payload = {
        items: items.map(({ product, name, image, price, quantity, size }) => ({
          product,
          name,
          image,
          price,
          quantity,
          size,
        })),
        pricing: pricingPayload,
        shippingAddress: sanitizedAddress,
        payment: {
          method: selectedMethod,
          provider: !isCod ? "Demo Gateway" : undefined,
          status: isCod ? "pending" : "paid",
        },
      };

      const response = await createOrder(payload);
      const orderId = response?.data?._id;

      dispatch(setPaymentStatus(isCod ? "pending" : "paid"));
      dispatch(setOrderId(orderId));

      if (orderId) {
        navigate(`/checkout/confirmation/${orderId}`, {
          state: { order: response.data },
        });
      } else {
        navigate("/checkout/confirmation", {
          state: { order: response?.data },
        });
      }

      toast.success("Order placed successfully");
      dispatch(resetCheckout());
    } catch (error) {
      console.error("Failed to place order", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to place order";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[2fr,1fr] gap-0">
      <div className="p-6 lg:p-10 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-secondary">
              Payment Options
            </h2>
            <p className="text-sm text-medium-text mt-1">
              Choose a preferred payment method and complete your order.
            </p>
          </div>
          <span className="text-sm text-primary bg-primary/10 px-3 py-1 rounded-full">
            Step 3 of 4
          </span>
        </header>

        <div className="grid gap-4">
          {paymentOptions.map((option) => {
            const isActive = selectedMethod === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedMethod(option.id)}
                className={`text-left border rounded-2xl px-5 py-4 transition-colors ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-slate-200 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      isActive
                        ? "border-primary bg-primary"
                        : "border-slate-300"
                    }`}
                  >
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-secondary">
                      {option.title}
                    </p>
                    <p className="text-sm text-medium-text mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedMethod !== "cod" && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">
              Payment Preview
            </h3>
            <p className="text-sm text-medium-text mt-2">
              You will be redirected to a secure gateway to complete the
              payment. For this demo, we simulate the success flow.
            </p>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={() => navigate("/checkout/address")}
            className="px-6 py-3 rounded-xl border border-slate-200 text-secondary hover:bg-slate-50"
          >
            Back to Address
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold shadow-md shadow-primary/20 disabled:opacity-60 hover:bg-primary-dark transition"
          >
            {isProcessing
              ? selectedMethod === "cod"
                ? "Placing Order..."
                : "Processing Payment..."
              : selectedMethod === "cod"
              ? "Place Order"
              : "Pay & Place Order"}
          </motion.button>
        </div>
      </div>

      <aside className="bg-white border-l border-slate-100 p-6 lg:p-8 space-y-4">
        <h3 className="text-lg font-semibold text-secondary">Order Summary</h3>
        <div className="space-y-3 text-sm text-medium-text">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{totals.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping Fee</span>
            <span>₹{totals.shippingFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>₹{totals.taxAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-success font-medium">
            <span>Discount</span>
            <span>-₹{totals.discount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-secondary border-t border-slate-200 pt-3">
            <span>Total</span>
            <span>₹{totals.total.toLocaleString()}</span>
          </div>
        </div>
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-sm text-medium-text">
          All card and UPI transactions on MegaMart are 100% secure and
          encrypted.
        </div>
      </aside>
    </div>
  );
};

export default CheckoutPayment;

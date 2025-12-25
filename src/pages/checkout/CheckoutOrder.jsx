import { useEffect, useMemo, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  setCheckoutStep,
  setCheckoutTotals,
  setAppliedCoupon,
  clearAppliedCoupon,
  setQrfolioUpload,
} from "../../store/slices/checkoutSlice";
import { calculateTotals } from "../../store/slices/checkoutSlice";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { validateCouponThunk } from "../../store/thunks/couponThunks";

const CheckoutOrder = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, totals, appliedCoupon, qrfolioUpload } = useSelector(
    (state) => state.checkout
  );
  const qrfolioRequired = useSelector(
    (state) => state.checkout.qrfolioRequired
  );
  const couponState = useSelector((state) => state.coupon);
  const [shippingFee] = useState(0);
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || "");
  const [qrfolioPreview, setQrfolioPreview] = useState(() => {
    if (!qrfolioUpload) {
      return null;
    }
    if (qrfolioUpload.previewUrl) {
      return qrfolioUpload.previewUrl;
    }
    if (qrfolioUpload.imageUrl) {
      return qrfolioUpload.imageUrl;
    }
    return null;
  });
  const [qrfolioError, setQrfolioError] = useState("");
  const [qrfolioUploading, setQrfolioUploading] = useState(false);
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

  const resetQrfolioState = useCallback(() => {
    setQrfolioPreview(null);
    setQrfolioError("");
    dispatch(setQrfolioUpload(null));
  }, [dispatch]);

  const handleQrfolioFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setQrfolioError("Please upload a valid image file");
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        setQrfolioError("Image must be smaller than 3MB");
        return;
      }

      setQrfolioUploading(true);
      setQrfolioError("");

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string") {
          setQrfolioError("Failed to read image. Please try again.");
          setQrfolioUploading(false);
          return;
        }

        setQrfolioPreview(dataUrl);
        dispatch(
          setQrfolioUpload({
            fileName: file.name,
            mimeType: file.type,
            dataUrl,
            previewUrl: dataUrl,
          })
        );
        setQrfolioUploading(false);
      };

      reader.onerror = () => {
        setQrfolioError("Unable to read the selected file");
        setQrfolioUploading(false);
      };

      reader.readAsDataURL(file);
    },
    [dispatch]
  );

  const handleQrfolioRemove = useCallback(() => {
    resetQrfolioState();
  }, [resetQrfolioState]);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a coupon code");
      return;
    }

    try {
      const couponItems = items.map((item) => ({
        product: item.product || item.id || item._id,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
      }));

      const result = await dispatch(
        validateCouponThunk({
          code,
          orderAmount: baseSubtotal,
          items: couponItems,
        })
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

  const shellCardClass =
    "rounded-3xl border border-[#dbe6ff] bg-white/90 p-6 sm:p-7 lg:p-8 shadow-[0_34px_80px_-48px_rgba(59,130,246,0.45)] backdrop-blur-sm";
  const innerPanelClass =
    "rounded-2xl border border-[#e5edff] bg-white/80 p-5 sm:p-6 shadow-[0_22px_40px_-28px_rgba(59,130,246,0.25)]";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#f2f7ff] via-[#eef3ff] to-[#f8fbff] py-10 sm:py-12">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[1.05fr,1fr]">
          <section className={`${shellCardClass} space-y-6`}>
            <div>
              <h2 className="text-xl font-semibold text-secondary">
                Redeem Coupon
              </h2>
              <p className="mt-1 text-sm text-[#7b8bb4]">
                Confirm product details and pricing before continuing.
              </p>
            </div>

            <div className="space-y-5">
              <div className={innerPanelClass}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#274287]">
                  Price Details
                </h3>
                <p className="mt-1 text-xs text-[#7b8bb4]">
                  Apply your QRfolio referral code as a coupon code.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <div className="w-full flex-1 min-w-0 sm:min-w-[200px]">
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
                      className="w-full rounded-2xl border border-[#cfdcff] bg-white px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#1c2f63] shadow-[0_8px_22px_-18px_rgba(37,99,235,0.65)] transition focus:border-[#4c7dff] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isCouponLoading}
                    />
                  </div>

                  {appliedCoupon?.code ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-2.5 text-sm font-semibold text-[#d53f6a] shadow-[0_12px_26px_-20px_rgba(225,29,72,0.55)] transition hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      disabled={isCouponLoading}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4c7dff] via-[#3d6bed] to-[#2451d8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(37,99,235,0.65)] transition hover:from-[#547fff] hover:via-[#3b69ea] hover:to-[#1f47c5] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                  <p className="mt-3 text-xs font-medium text-[#d53f6a]">
                    {couponError}
                  </p>
                )}

                {appliedCoupon?.code && (
                  <div className="mt-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-xs font-medium text-[#047857]">
                    Coupon applied successfully. Savings: ₹
                    {Number(appliedCoupon.discountAmount || 0).toLocaleString()}
                  </div>
                )}
              </div>

              {qrfolioRequired && (
                <div className={innerPanelClass}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#274287]">
                    QRfolio QR Code
                  </h3>
                  <p className="mt-1 text-xs text-[#7b8bb4]">
                    Upload your QRfolio QR code image.
                  </p>

                  <div className="mt-5 space-y-4">
                    <label
                      htmlFor="checkout-qrfolio-upload"
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[#ccdbff] bg-[#f5f8ff] p-6 sm:p-8 text-center transition hover:border-[#4c7dff] hover:bg-[#ecf2ff]"
                    >
                      <div className="rounded-full bg-white p-4 shadow-[0_15px_35px_-20px_rgba(37,99,235,0.45)]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="h-10 w-10 text-[#4c7dff]"
                        >
                          <path
                            d="M12 5v14M5 12h14"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1b2f62]">
                          {qrfolioPreview
                            ? "Replace QR code"
                            : "Upload QR code"}
                        </p>
                        <p className="mt-1 text-xs text-[#7b8bb4]">
                          PNG, JPG, or WEBP up to 3MB.
                        </p>
                      </div>
                      <input
                        id="checkout-qrfolio-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleQrfolioFileChange}
                        disabled={qrfolioUploading}
                      />
                    </label>

                    {qrfolioUploading && (
                      <div className="flex items-center justify-center gap-2 text-sm text-[#1b2f62]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing image…</span>
                      </div>
                    )}

                    {qrfolioError && (
                      <p className="text-center text-xs font-medium text-[#d53f6a]">
                        {qrfolioError}
                      </p>
                    )}

                    {qrfolioPreview && (
                      <div className="flex flex-col gap-3 rounded-2xl border border-[#cfdcff] bg-white/90 p-4 shadow-[0_18px_32px_-30px_rgba(37,99,235,0.35)]">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#4c7dff]">
                            Preview
                          </p>
                          <button
                            type="button"
                            onClick={handleQrfolioRemove}
                            className="text-xs font-semibold text-[#d53f6a] hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center justify-center">
                          <img
                            src={qrfolioPreview}
                            alt="QRfolio preview"
                            className="h-36 w-36 rounded-2xl border border-[#dbe6ff] bg-white p-2 object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={`${shellCardClass} space-y-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-secondary">
                  Review your order
                </h2>
                <p className="mt-1 text-sm text-[#7b8bb4]">
                  Confirm product details and pricing before continuing.
                </p>
              </div>
              <span className="rounded-full bg-[#eef3ff] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[#3b5b99]">
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
                  className="flex w-full flex-col gap-5 rounded-2xl border border-[#e3ebff] bg-white/85 p-5 shadow-[0_18px_34px_-30px_rgba(37,99,235,0.35)] md:flex-row"
                >
                  <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-[#e3ebff] bg-[#f5f8ff] md:w-40 lg:w-44">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://placehold.co/200x200/f1f5ff/d0d9ff?text=Image";
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-secondary">
                        {item.name}
                      </h3>
                      {item.size && (
                        <p className="mt-1 text-sm uppercase tracking-wide text-[#7b8bb4]">
                          Size: {item.size}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[#7b8bb4]">
                      <span>Qty: {item.quantity}</span>
                      <span className="text-[#c3ccea]">|</span>
                      <span>Unit Price: ₹{item.price.toLocaleString()}</span>
                      <span className="text-[#c3ccea]">|</span>
                      <span>
                        Line Total: ₹
                        {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-[#a4b1d3]">
                      returns within 7 days of delivery
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className={innerPanelClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#274287]">
                Price Details
              </h3>
              <div className="mt-4 space-y-4 text-sm text-[#516497]">
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
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>
                    -₹
                    {Number(totals.discount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[#dbe6ff] pt-4 text-base font-semibold text-secondary">
                  <span>Total</span>
                  <span>₹{computedTotals.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              className="w-full rounded-2xl bg-gradient-to-r from-[#4c7dff] via-[#3d6bed] to-[#2451d8] py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-22px_rgba(37,99,235,0.65)] transition hover:from-[#547fff] hover:via-[#3b69ea] hover:to-[#1f47c5]"
            >
              Continue to Address
            </motion.button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CheckoutOrder;

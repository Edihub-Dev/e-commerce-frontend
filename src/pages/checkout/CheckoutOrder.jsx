import { useEffect, useMemo, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  setCheckoutStep,
  setCheckoutTotals,
  setAppliedCoupon,
  clearAppliedCoupon,
  setQrfolioUpload,
  setCheckoutItems,
} from "../../store/slices/checkoutSlice";
import { calculateTotals } from "../../store/slices/checkoutSlice";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { validateCouponThunk } from "../../store/thunks/couponThunks";
import { getProductById } from "../../utils/api";

const SIZE_REQUIRED_PRODUCT_IDS = new Set(["695222aa79763e5b5af59d35"]);

const CheckoutOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { items, totals, appliedCoupon, qrfolioUpload } = useSelector(
    (state) => state.checkout
  );
  const qrfolioRequired = useSelector(
    (state) => state.checkout.qrfolioRequired
  );
  const couponRequired = useSelector((state) => state.checkout.couponRequired);
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
  const [sizeErrors, setSizeErrors] = useState({});
  const [sizesByItemKey, setSizesByItemKey] = useState({});
  const [sizesLoading, setSizesLoading] = useState(false);
  const isQrfolioCoupon = Boolean(appliedCoupon?.isQrfolioCoupon);
  const isQrfolioCouponApplied = Boolean(
    appliedCoupon?.isQrfolioCoupon && appliedCoupon?.code?.trim()
  );
  const isQrfolioCouponRequired = Boolean(
    qrfolioRequired && !isQrfolioCouponApplied
  );
  const isCouponFulfilled = Boolean(appliedCoupon?.code?.trim());
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

  const normalizeSizeLabel = useCallback(
    (value) => String(value || "").trim().toUpperCase(),
    []
  );

  const resolveItemKey = useCallback((item) => {
    if (!item || typeof item !== "object") {
      return "";
    }

    const candidate = item.product || item.id || item._id;
    return candidate ? String(candidate).trim() : "";
  }, []);

  const resolveSizesForItem = useCallback(
    (item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      if (Array.isArray(item.sizes) && item.sizes.length) {
        return item.sizes;
      }

      const key = resolveItemKey(item);
      const entry = key ? sizesByItemKey[key] : null;
      return Array.isArray(entry?.sizes) ? entry.sizes : [];
    },
    [resolveItemKey, sizesByItemKey]
  );

  const isSizeRequired = useCallback(
    (item) => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const key = resolveItemKey(item);
      if (key && SIZE_REQUIRED_PRODUCT_IDS.has(key)) {
        return true;
      }

      if (item.showSizes) {
        return true;
      }

      const entry = key ? sizesByItemKey[key] : null;
      if (entry?.showSizes) {
        return true;
      }

      return Boolean(resolveSizesForItem(item).length);
    },
    [resolveItemKey, resolveSizesForItem, sizesByItemKey]
  );

  const getSelectedSizeInfo = useCallback(
    (item) => {
      const selected = normalizeSizeLabel(item?.size);
      if (!selected) {
        return null;
      }

      const sizes = resolveSizesForItem(item);
      return (
        sizes.find((entry) => normalizeSizeLabel(entry?.label) === selected) ||
        null
      );
    },
    [normalizeSizeLabel, resolveSizesForItem]
  );

  const handleSelectSize = useCallback(
    (index, label) => {
      const nextSize = normalizeSizeLabel(label);
      if (!nextSize) {
        return;
      }

      const updatedItems = items.map((item, idx) => {
        if (idx !== index) {
          return item;
        }
        return {
          ...item,
          size: nextSize,
        };
      });

      dispatch(setCheckoutItems(updatedItems));
      setSizeErrors((prev) => {
        const next = { ...(prev || {}) };
        delete next[index];
        return next;
      });
    },
    [dispatch, items, normalizeSizeLabel]
  );

  useEffect(() => {
    let cancelled = false;

    const loadSizes = async () => {
      const keys = items
        .map((item) => resolveItemKey(item))
        .filter(Boolean)
        .filter((key) => !sizesByItemKey[key]);

      if (!keys.length) {
        return;
      }

      setSizesLoading(true);

      try {
        const results = await Promise.all(
          keys.map(async (key) => {
            try {
              const response = await getProductById(key);
              const product = response?.data || null;
              if (!product) {
                return null;
              }
              return {
                key,
                showSizes: Boolean(product.showSizes),
                sizes: Array.isArray(product.sizes) ? product.sizes : [],
              };
            } catch (error) {
              return null;
            }
          })
        );

        if (cancelled) {
          return;
        }

        setSizesByItemKey((prev) => {
          const next = { ...(prev || {}) };
          results.filter(Boolean).forEach((entry) => {
            next[entry.key] = {
              showSizes: entry.showSizes,
              sizes: entry.sizes,
            };
          });
          return next;
        });
      } finally {
        if (!cancelled) {
          setSizesLoading(false);
        }
      }
    };

    loadSizes();

    return () => {
      cancelled = true;
    };
  }, [items, resolveItemKey, sizesByItemKey]);

  const applyCoupon = useCallback(
    async (codeValue, { silent = false, itemsOverride } = {}) => {
      const code = String(codeValue || "").trim().toUpperCase();
      if (!code) {
        if (!silent) {
          toast.error("Enter a coupon code");
        }
        return;
      }

      const itemsForCoupon = Array.isArray(itemsOverride) ? itemsOverride : items;
      const subtotalForCoupon = itemsForCoupon.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      );

      const couponItems = itemsForCoupon.map((item) => ({
        product: item.product || item.id || item._id,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
      }));

      const result = await dispatch(
        validateCouponThunk({
          code,
          orderAmount: subtotalForCoupon,
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
          isQrfolioCoupon: Boolean(result.isQrfolioCoupon),
        })
      );

      if (result.isQrfolioCoupon && result.qrfolio) {
        dispatch(
          setQrfolioUpload({
            imageUrl: result.qrfolio.imageUrl || result.qrfolio.link || null,
            link: result.qrfolio.link || null,
            name: result.qrfolio.name || null,
          })
        );
      } else {
        dispatch(setQrfolioUpload(null));
      }

      const updatedTotals = calculateTotals(itemsForCoupon, {
        shippingFee,
        discount: result.discountAmount,
        currency: totals.currency,
      });

      const baseTotal =
        subtotalForCoupon + updatedTotals.shippingFee + updatedTotals.taxAmount;

      dispatch(
        setCheckoutTotals({
          ...updatedTotals,
          baseSubtotal: subtotalForCoupon,
          baseTotal,
        })
      );

      if (!silent) {
        toast.success("Coupon applied");
      }
    },
    [
      dispatch,
      items,
      shippingFee,
      totals.currency,
    ]
  );

  useEffect(() => {
    setCouponCode(appliedCoupon?.code || "");
  }, [appliedCoupon?.code]);

  useEffect(() => {
    if (!qrfolioUpload) {
      setQrfolioPreview(null);
      return;
    }

    const nextPreview =
      qrfolioUpload.previewUrl || qrfolioUpload.imageUrl || null;

    setQrfolioPreview(nextPreview);

    if (nextPreview) {
      setQrfolioError("");
    }
  }, [qrfolioUpload]);

  const handleContinue = () => {
    if (sizesLoading) {
      toast.error("Please wait while product details are loading.");
      return;
    }

    const nextSizeErrors = {};

    items.forEach((item, index) => {
      if (!isSizeRequired(item)) {
        return;
      }

      const selected = normalizeSizeLabel(item?.size);
      if (!selected) {
        nextSizeErrors[index] = "Please select a size before continuing.";
        return;
      }

      const sizes = resolveSizesForItem(item);
      if (sizes.length) {
        const selectedInfo = getSelectedSizeInfo(item);
        if (!selectedInfo) {
          nextSizeErrors[index] = "Selected size is invalid. Please pick again.";
          return;
        }
        if (!selectedInfo.isAvailable || selectedInfo.stock <= 0) {
          nextSizeErrors[index] = `Size ${selectedInfo.label} is currently unavailable.`;
          return;
        }
        if (
          selectedInfo.stock > 0 &&
          Number(item.quantity || 0) > selectedInfo.stock
        ) {
          nextSizeErrors[index] = `Quantity unavailable. Max ${selectedInfo.stock} for size ${selectedInfo.label}.`;
        }
      }
    });

    if (Object.keys(nextSizeErrors).length) {
      setSizeErrors(nextSizeErrors);
      const firstKey = Object.keys(nextSizeErrors)[0];
      toast.error(nextSizeErrors[firstKey] || "Please select a size.");
      return;
    }

    if (couponRequired && !isCouponFulfilled) {
      const message = "Please apply a valid coupon code before continuing.";
      toast.error(message);
      return;
    }

    if (qrfolioRequired) {
      const hasQrfolioImage =
        qrfolioUpload &&
        Boolean(
          (typeof qrfolioUpload.dataUrl === "string" &&
            qrfolioUpload.dataUrl.trim()) ||
            (typeof qrfolioUpload.imageUrl === "string" &&
              qrfolioUpload.imageUrl.trim())
        );

      if (!hasQrfolioImage) {
        const message = "Please upload your QRfolio QR code before continuing.";
        setQrfolioError(message);
        toast.error(message);
        return;
      }
    }

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
    try {
      await applyCoupon(couponCode, { silent: false });
    } catch (applyError) {
      const message =
        applyError?.message || couponError || "Unable to apply coupon";
      toast.error(message);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search || "");
    const productId = (searchParams.get("productId") || "").trim();
    const coupon = (searchParams.get("coupon") || "").trim();

    if (!productId) {
      return;
    }

    let cancelled = false;

    const seed = async () => {
      try {
        const currentItemId =
          items?.[0]?.product || items?.[0]?.id || items?.[0]?._id || null;
        const currentProductId = currentItemId ? String(currentItemId).trim() : "";
        const shouldReplaceItems =
          !items.length ||
          items.length !== 1 ||
          currentProductId !== productId;

        if (shouldReplaceItems) {
          const result = await getProductById(productId);
          const product = result?.data || null;
          if (!product) {
            return;
          }

          const checkoutItem = {
            id: product._id || product.mongoId || product.productId || productId,
            product: product._id || product.mongoId || product.productId || productId,
            name: product.name,
            image: product.image,
            price: Number(product.price) || 0,
            quantity: 1,
            gstRate: product.gstRate,
            hsnCode: product.hsnCode,
            showSizes: Boolean(product.showSizes),
            sizes: Array.isArray(product.sizes) ? product.sizes : [],
          };

          if (!cancelled) {
            dispatch(clearAppliedCoupon());
            dispatch(setQrfolioUpload(null));
            dispatch(setCheckoutItems([checkoutItem]));
          }

          if (coupon) {
            const current = appliedCoupon?.code
              ? String(appliedCoupon.code).trim().toUpperCase()
              : "";
            const desired = coupon.toUpperCase();
            if (current !== desired) {
              if (!cancelled) {
                setCouponCode(desired);
              }
              await applyCoupon(desired, {
                silent: true,
                itemsOverride: [checkoutItem],
              });
            }
          }

          return;
        }

        if (coupon) {
          const current = appliedCoupon?.code ? String(appliedCoupon.code).trim().toUpperCase() : "";
          const desired = coupon.toUpperCase();
          if (current !== desired) {
            if (!cancelled) {
              setCouponCode(desired);
            }
            await applyCoupon(desired, { silent: true });
          }
        }
      } catch (error) {
        console.error("Failed to seed checkout from deep link", error);
      }
    };

    seed();

    return () => {
      cancelled = true;
    };
  }, [applyCoupon, appliedCoupon?.code, dispatch, items.length, location.search]);

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
        <p className={clsx('text-center', 'text-gray-500')}>No items in checkout.</p>
      </div>
    );
  }

  const shellCardClass =
    "rounded-3xl border border-[#dbe6ff] bg-white/90 p-6 sm:p-7 lg:p-8 shadow-[0_34px_80px_-48px_rgba(59,130,246,0.45)] backdrop-blur-sm";
  const innerPanelClass =
    "rounded-2xl border border-[#e5edff] bg-white/80 p-5 sm:p-6 shadow-[0_22px_40px_-28px_rgba(59,130,246,0.25)]";

  return (
    <div className={clsx('min-h-screen', 'overflow-x-hidden', 'bg-gradient-to-br', 'from-[#f2f7ff]', 'via-[#eef3ff]', 'to-[#f8fbff]', 'py-10', 'sm:py-12')}>
      <div className={clsx('mx-auto', 'w-full', 'max-w-6xl', 'px-3', 'sm:px-5', 'lg:px-8')}>
        <div className={clsx('grid', 'grid-cols-1', 'gap-6', 'sm:gap-8', 'lg:grid-cols-[1.05fr,1fr]')}>
          <section className={`${shellCardClass} space-y-6`}>
            <div>
              <h2 className={clsx('text-xl', 'font-semibold', 'text-secondary')}>
                Redeem Coupon
              </h2>
              <p className={clsx('mt-1', 'text-sm', 'text-[#7b8bb4]')}>
                Confirm product details and pricing before continuing.
              </p>
            </div>

            <div className="space-y-5">
              <div className={innerPanelClass}>
                <h3 className={clsx('text-sm', 'font-semibold', 'uppercase', 'tracking-wide', 'text-[#274287]')}>
                  Price Details
                </h3>
                <p className={clsx('mt-1', 'text-xs', 'text-[#7b8bb4]')}>
                  Apply your QRfolio referral code as a coupon code.
                </p>

                <div className={clsx('mt-4', 'flex', 'flex-col', 'gap-3', 'sm:flex-row', 'sm:flex-wrap', 'sm:items-center', 'sm:gap-4')}>
                  <div className={clsx('w-full', 'flex-1', 'min-w-0', 'sm:min-w-[200px]')}>
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
                      className={clsx('w-full', 'rounded-2xl', 'border', 'border-[#cfdcff]', 'bg-white', 'px-4', 'py-2.5', 'text-sm', 'font-semibold', 'uppercase', 'tracking-wide', 'text-[#1c2f63]', 'shadow-[0_8px_22px_-18px_rgba(37,99,235,0.65)]', 'transition', 'focus:border-[#4c7dff]', 'focus:outline-none', 'disabled:cursor-not-allowed', 'disabled:opacity-60')}
                      disabled={isCouponLoading}
                    />
                  </div>

                  {appliedCoupon?.code ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className={clsx('inline-flex', 'w-full', 'items-center', 'justify-center', 'gap-2', 'rounded-2xl', 'border', 'border-[#fecdd3]', 'bg-[#fff1f2]', 'px-4', 'py-2.5', 'text-sm', 'font-semibold', 'text-[#d53f6a]', 'shadow-[0_12px_26px_-20px_rgba(225,29,72,0.55)]', 'transition', 'hover:bg-[#ffe4e6]', 'disabled:cursor-not-allowed', 'disabled:opacity-60', 'sm:w-auto')}
                      disabled={isCouponLoading}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className={clsx('inline-flex', 'w-full', 'items-center', 'justify-center', 'gap-2', 'rounded-2xl', 'bg-gradient-to-r', 'from-[#4c7dff]', 'via-[#3d6bed]', 'to-[#2451d8]', 'px-5', 'py-2.5', 'text-sm', 'font-semibold', 'text-white', 'shadow-[0_12px_30px_-16px_rgba(37,99,235,0.65)]', 'transition', 'hover:from-[#547fff]', 'hover:via-[#3b69ea]', 'hover:to-[#1f47c5]', 'disabled:cursor-not-allowed', 'disabled:opacity-60', 'sm:w-auto')}
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
                  <p className={clsx('mt-3', 'text-xs', 'font-medium', 'text-[#d53f6a]')}>
                    {couponError}
                  </p>
                )}

                {appliedCoupon?.code && (
                  <div className={clsx('mt-4', 'rounded-2xl', 'border', 'border-[#bbf7d0]', 'bg-[#f0fdf4]', 'px-4', 'py-3', 'text-xs', 'font-medium', 'text-[#047857]')}>
                    Coupon applied successfully. Savings: ₹
                    {Number(appliedCoupon.discountAmount || 0).toLocaleString()}
                  </div>
                )}

                {couponRequired && !isCouponFulfilled && !couponError && (
                  <p className={clsx('mt-3', 'text-xs', 'font-medium', 'text-[#d97706]')}>
                    Coupon code is required before continuing.
                  </p>
                )}
              </div>

              {qrfolioRequired && (
                <div className={innerPanelClass}>
                  <h3 className={clsx('text-sm', 'font-semibold', 'uppercase', 'tracking-wide', 'text-[#274287]')}>
                    QRfolio QR Code
                  </h3>
                  <p className={clsx('mt-1', 'text-xs', 'text-[#7b8bb4]')}>
                    {isQrfolioCoupon
                      ? "Your QRfolio QR code is linked automatically from your QRfolio account."
                      : "Upload your QRfolio QR code image."}
                  </p>

                  <div className={clsx('mt-5', 'space-y-4')}>
                    {!isQrfolioCoupon && (
                      <label
                        htmlFor="checkout-qrfolio-upload"
                        className={clsx('flex', 'cursor-pointer', 'flex-col', 'items-center', 'justify-center', 'gap-3', 'rounded-3xl', 'border-2', 'border-dashed', 'border-[#ccdbff]', 'bg-[#f5f8ff]', 'p-6', 'sm:p-8', 'text-center', 'transition', 'hover:border-[#4c7dff]', 'hover:bg-[#ecf2ff]')}
                      >
                        <div className={clsx('rounded-full', 'bg-white', 'p-4', 'shadow-[0_15px_35px_-20px_rgba(37,99,235,0.45)]')}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className={clsx('h-10', 'w-10', 'text-[#4c7dff]')}
                          >
                            <path
                              d="M12 5v14M5 12h14"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className={clsx('text-sm', 'font-semibold', 'text-[#1b2f62]')}>
                            {qrfolioPreview
                              ? "Replace QR code"
                              : "Upload QR code"}
                          </p>
                          <p className={clsx('mt-1', 'text-xs', 'text-[#7b8bb4]')}>
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
                    )}

                    {qrfolioUploading && (
                      <div className={clsx('flex', 'items-center', 'justify-center', 'gap-2', 'text-sm', 'text-[#1b2f62]')}>
                        <Loader2 className={clsx('h-4', 'w-4', 'animate-spin')} />
                        <span>Processing image…</span>
                      </div>
                    )}

                    {qrfolioError && (
                      <p className={clsx('text-center', 'text-xs', 'font-medium', 'text-[#d53f6a]')}>
                        {qrfolioError}
                      </p>
                    )}

                    {qrfolioPreview && (
                      <div className={clsx('flex', 'flex-col', 'gap-3', 'rounded-2xl', 'border', 'border-[#cfdcff]', 'bg-white/90', 'p-4', 'shadow-[0_18px_32px_-30px_rgba(37,99,235,0.35)]')}>
                        <div className={clsx('flex', 'items-center', 'justify-between')}>
                          <div>
                            {isQrfolioCoupon ? (
                              <p className={clsx('text-sm', 'font-extrabold', 'tracking-tight', 'text-[#111827]')}>
                                Your QRfolio QR Code
                              </p>
                            ) : (
                              <p className={clsx('text-xs', 'font-semibold', 'uppercase', 'tracking-wide', 'text-[#4c7dff]')}>
                                Preview
                              </p>
                            )}
                          </div>
                          {!isQrfolioCoupon && (
                            <button
                              type="button"
                              onClick={handleQrfolioRemove}
                              className={clsx('text-xs', 'font-semibold', 'text-[#d53f6a]', 'hover:underline')}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className={clsx('mt-2', 'flex', 'items-center', 'justify-center')}>
                          <div className={clsx('relative', 'inline-flex', 'flex-col', 'items-center')}>
                            {isQrfolioCoupon && (
                              <p className={clsx('mb-3', 'text-base', 'font-extrabold', 'text-[#111827]')}>
                                {qrfolioUpload?.name || "QRfolio Profile"}
                              </p>
                            )}
                            <div className={clsx('relative', 'rounded-2xl', 'bg-white', 'p-3', 'shadow-[0_20px_45px_-26px_rgba(15,23,42,0.45)]')}>
                              <img
                                src={qrfolioPreview}
                                alt="QRfolio preview"
                                className={clsx('h-56', 'w-56', 'rounded-2xl', 'border', 'border-[#dbe6ff]', 'bg-white', 'object-contain')}
                              />
                              {isQrfolioCoupon && (
                                <div className={clsx('pointer-events-none', 'absolute', 'left-1/2', 'top-1/2', '-translate-x-1/2', '-translate-y-1/2')}>
                                  <div className={clsx('flex', 'h-12', 'w-12', 'items-center', 'justify-center', 'rounded-2xl', 'border-2', 'border-white', 'bg-gradient-to-b', 'from-[#2563eb]', 'to-[#1d4ed8]', 'shadow-[0_18px_40px_-20px_rgba(37,99,235,0.9)]')}>
                                    <span className={clsx('text-[10px]', 'font-semibold', 'leading-tight', 'tracking-wide', 'text-white', 'text-center')}>
                                      Qr
                                      <br />
                                      Folio
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {isQrfolioCoupon && !qrfolioPreview && !qrfolioError && (
                      <div className={clsx('flex', 'items-center', 'justify-center', 'gap-2', 'text-sm', 'text-[#1b2f62]')}>
                        <Loader2 className={clsx('h-4', 'w-4', 'animate-spin')} />
                        <span>Fetching your QRfolio QR code…</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={`${shellCardClass} space-y-6`}>
            <div className={clsx('flex', 'flex-wrap', 'items-start', 'justify-between', 'gap-3')}>
              <div>
                <h2 className={clsx('text-xl', 'font-semibold', 'text-secondary')}>
                  Review your order
                </h2>
                <p className={clsx('mt-1', 'text-sm', 'text-[#7b8bb4]')}>
                  Confirm product details and pricing before continuing.
                </p>
              </div>
              <span className={clsx('rounded-full', 'bg-[#eef3ff]', 'px-4', 'py-1', 'text-xs', 'font-semibold', 'uppercase', 'tracking-wide', 'text-[#3b5b99]')}>
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
                  className={clsx('flex', 'w-full', 'flex-col', 'gap-5', 'rounded-2xl', 'border', 'border-[#e3ebff]', 'bg-white/85', 'p-5', 'shadow-[0_18px_34px_-30px_rgba(37,99,235,0.35)]', 'md:flex-row')}
                >
                  <div className={clsx('flex', 'h-40', 'w-full', 'items-center', 'justify-center', 'overflow-hidden', 'rounded-2xl', 'border', 'border-[#e3ebff]', 'bg-[#f5f8ff]', 'md:w-40', 'lg:w-44')}>
                    <img
                      src={item.image}
                      alt={item.name}
                      className={clsx('max-h-full', 'max-w-full', 'object-contain')}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://placehold.co/200x200/f1f5ff/d0d9ff?text=Image";
                      }}
                    />
                  </div>
                  <div className={clsx('flex-1', 'space-y-3')}>
                    <div>
                      <h3 className={clsx('text-lg', 'font-semibold', 'text-secondary')}>
                        {item.name}
                      </h3>
                      {item.size && (
                        <p className={clsx('mt-1', 'text-sm', 'uppercase', 'tracking-wide', 'text-[#7b8bb4]')}>
                          Size: {item.size}
                        </p>
                      )}
                    </div>

                    {isSizeRequired(item) && (
                      <div className={clsx('space-y-2')}>
                        <p className={clsx('text-xs', 'font-semibold', 'uppercase', 'tracking-wide', 'text-[#274287]')}>
                          Select Size
                        </p>
                        <div className={clsx('flex', 'flex-wrap', 'items-center', 'gap-2')}>
                          {(resolveSizesForItem(item).length
                            ? resolveSizesForItem(item)
                            : [
                                { label: 'S', isAvailable: true },
                                { label: 'M', isAvailable: true },
                                { label: 'L', isAvailable: true },
                                { label: 'XL', isAvailable: true },
                                { label: 'XXL', isAvailable: true },
                              ]
                          ).map((size) => {
                            const label = normalizeSizeLabel(size?.label);
                            const isActive = normalizeSizeLabel(item?.size) === label;
                            const isDisabled = !size?.isAvailable;
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() => {
                                  if (isDisabled) {
                                    return;
                                  }
                                  handleSelectSize(index, label);
                                }}
                                disabled={isDisabled}
                                title={
                                  !size?.isAvailable
                                    ? "Currently unavailable"
                                    : undefined
                                }
                                className={clsx(
                                  'inline-flex',
                                  'items-center',
                                  'justify-center',
                                  'rounded-full',
                                  'border',
                                  'px-4',
                                  'py-1.5',
                                  'text-xs',
                                  'font-semibold',
                                  'uppercase',
                                  'tracking-wide',
                                  'transition',
                                  isActive
                                    ? ['border-[#2451d8]', 'bg-[#eef3ff]', 'text-[#2451d8]']
                                    : ['border-[#dbe6ff]', 'bg-white', 'text-[#516497]', 'hover:border-[#4c7dff]', 'hover:text-[#2451d8]'],
                                  isDisabled && ['cursor-not-allowed', 'opacity-50']
                                )}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {sizeErrors?.[index] && (
                          <p className={clsx('text-xs', 'font-medium', 'text-[#d53f6a]')}>
                            {sizeErrors[index]}
                          </p>
                        )}
                      </div>
                    )}
                    <div className={clsx('flex', 'flex-wrap', 'items-center', 'gap-3', 'text-sm', 'text-[#7b8bb4]')}>
                      <span>Qty: {item.quantity}</span>
                      <span className="text-[#c3ccea]">|</span>
                      <span>Unit Price: ₹{item.price.toLocaleString()}</span>
                      <span className="text-[#c3ccea]">|</span>
                      <span>
                        Line Total: ₹
                        {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                    <p className={clsx('text-sm', 'text-[#a4b1d3]')}>
                      returns within 7 days of delivery
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className={innerPanelClass}>
              <h3 className={clsx('text-sm', 'font-semibold', 'uppercase', 'tracking-wide', 'text-[#274287]')}>
                Price Details
              </h3>
              <div className={clsx('mt-4', 'space-y-4', 'text-sm', 'text-[#516497]')}>
                <div className={clsx('flex', 'justify-between')}>
                  <span>Subtotal</span>
                  <span>₹{computedTotals.subtotal.toLocaleString()}</span>
                </div>
                <div className={clsx('flex', 'justify-between')}>
                  <span>Shipping Fee</span>
                  <span>₹{computedTotals.shippingFee.toLocaleString()}</span>
                </div>
                <div className={clsx('flex', 'justify-between')}>
                  <span>Tax</span>
                  <span>₹{computedTotals.taxAmount.toLocaleString()}</span>
                </div>
                <div className={clsx('flex', 'justify-between')}>
                  <span>Discount</span>
                  <span>
                    -₹
                    {Number(totals.discount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className={clsx('flex', 'items-center', 'justify-between', 'border-t', 'border-[#dbe6ff]', 'pt-4', 'text-base', 'font-semibold', 'text-secondary')}>
                  <span>Total</span>
                  <span>₹{computedTotals.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              className={clsx('w-full', 'rounded-2xl', 'bg-gradient-to-r', 'from-[#4c7dff]', 'via-[#3d6bed]', 'to-[#2451d8]', 'py-3', 'text-sm', 'font-semibold', 'text-white', 'shadow-[0_20px_45px_-22px_rgba(37,99,235,0.65)]', 'transition', 'hover:from-[#547fff]', 'hover:via-[#3b69ea]', 'hover:to-[#1f47c5]')}
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

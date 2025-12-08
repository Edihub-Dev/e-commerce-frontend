import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, Sparkles, Copy } from "lucide-react";
import { fetchOfferLightbox } from "../../services/offerLightboxApi";
import { useNavigate } from "react-router-dom";

const OfferLightboxModal = () => {
  const [offer, setOffer] = useState(null);
  const [status, setStatus] = useState("idle");
  const [isVisible, setIsVisible] = useState(false);
  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);
  const copyFeedbackTimeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const loadOffer = async () => {
      setStatus("loading");
      try {
        const response = await fetchOfferLightbox();
        const payload = response?.data || null;
        if (!isMounted) return;
        setOffer(payload);
        setStatus("success");
        setIsVisible(Boolean(payload?.isActive !== false && payload));
      } catch (error) {
        console.error("Failed to load offer lightbox", error);
        if (!isMounted) return;
        setStatus("error");
      }
    };

    loadOffer();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!offer) {
      setIsVisible(false);
      return;
    }
    setIsVisible(Boolean(offer.isActive !== false));
  }, [offer]);

  useEffect(() => {
    if (!isVisible) {
      document.body.style.removeProperty("overflow");
      setCopyFeedbackVisible(false);
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
        copyFeedbackTimeoutRef.current = null;
      }
      if (previous) {
        document.body.style.overflow = previous;
      } else {
        document.body.style.removeProperty("overflow");
      }
    };
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const palette = useMemo(() => {
    return {
      background: offer?.backgroundColor || "#f8fafc",
      text: offer?.textColor || "#0f172a",
      accent: offer?.accentColor || "#008ecc",
    };
  }, [offer]);

  const couponCode = offer?.couponCode?.trim();
  const couponDescription = offer?.couponDescription?.trim();

  const showCopyFeedback = () => {
    setCopyFeedbackVisible(true);
    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
    }
    copyFeedbackTimeoutRef.current = setTimeout(() => {
      setCopyFeedbackVisible(false);
      copyFeedbackTimeoutRef.current = null;
    }, 1600);
  };

  const handleCopy = () => {
    if (!couponCode) {
      return;
    }

    try {
      navigator.clipboard
        .writeText(couponCode)
        .then(showCopyFeedback)
        .catch(() => {
          showCopyFeedback();
        });
    } catch (_error) {
      showCopyFeedback();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setCopyFeedbackVisible(false);
    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
      copyFeedbackTimeoutRef.current = null;
    }
  };

  const handlePrimaryAction = () => {
    if (!offer) return;

    const type = (offer.buttonLinkType || "none").toLowerCase();
    const rawValue = offer.buttonLinkValue || "";
    const value = rawValue.trim();

    if (!value && type !== "none") {
      handleClose();
      return;
    }

    if (type === "product") {
      navigate(`/product/${value}`);
      handleClose();
      return;
    }

    if (type === "category") {
      navigate(`/category/${value}`);
      handleClose();
      return;
    }

    if (type === "custom") {
      window.location.href = value;
      return;
    }

    if (type === "none") {
      handleClose();
    }
  };

  useEffect(() => {
    const handleOpenRequest = (event) => {
      if (event?.detail?.offer) {
        setOffer(event.detail.offer);
      }
      setIsVisible(true);
    };

    window.addEventListener("open-offer-lightbox", handleOpenRequest);
    return () => {
      window.removeEventListener("open-offer-lightbox", handleOpenRequest);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-3xl"
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-2 text-slate-500 shadow-lg transition hover:text-slate-700"
              aria-label="Close offers lightbox"
            >
              <X size={18} />
            </button>

            <div
              className="overflow-hidden rounded-[28px] border border-white/70 shadow-2xl"
              style={{
                backgroundColor: palette.background,
                color: palette.text,
              }}
            >
              {offer?.imageUrl ? (
                <div
                  className="relative h-44 w-full overflow-hidden bg-white md:hidden"
                  style={{
                    borderBottomLeftRadius: "28px",
                    borderBottomRightRadius: "28px",
                  }}
                >
                  <img
                    src={offer.imageUrl}
                    alt={offer?.title || "Offer artwork"}
                    className="h-full w-full object-contain"
                    style={{ objectPosition: "center" }}
                  />
                </div>
              ) : null}
              <div className="relative grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5 px-5 py-6 sm:px-10 sm:py-10">
                  <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm">
                    <Sparkles size={14} /> Special Offer
                  </div>
                  <div className="space-y-3">
                    <h2
                      className="text-3xl font-bold leading-tight sm:text-4xl"
                      style={{ color: palette.text }}
                    >
                      {offer?.title || "Unlock ₹150 off your first order"}
                    </h2>
                    {offer?.subtitle ? (
                      <p
                        className="text-base font-medium"
                        style={{ color: palette.text }}
                      >
                        {offer.subtitle}
                      </p>
                    ) : null}
                    {offer?.description ? (
                      <p
                        className="text-sm text-slate-600"
                        style={{ color: palette.text }}
                      >
                        {offer.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-black">
                        Coupon code
                      </span>
                      {couponCode ? (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-black shadow-sm transition hover:border-white focus:outline-none focus:ring-2 focus:ring-white/60"
                          >
                            <span>{couponCode}</span>
                            <Copy size={16} className="text-slate-500" />
                          </button>
                          <AnimatePresence>
                            {copyFeedbackVisible && (
                              <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                                animate={{ opacity: 1, y: -10, scale: 1 }}
                                exit={{ opacity: 0, y: 0, scale: 0.9 }}
                                transition={{ duration: 0.18 }}
                                className="pointer-events-none absolute right-3 top-0 -translate-y-full rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg"
                              >
                                Copied!
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-xs font-medium text-slate-500">
                          Coupon code coming soon
                        </div>
                      )}
                      {couponDescription ? (
                        <p className="text-xs text-slate-500">
                          {couponDescription}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition"
                      style={{ backgroundColor: palette.accent }}
                    >
                      {offer?.buttonLabel || "Take the offer"}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full text-xs font-medium text-slate-500 underline"
                    >
                      {offer?.secondaryLabel || "Nvm, I’ll pay full price"}
                    </button>
                  </div>
                </div>
                <div
                  className="relative hidden min-h-[360px] overflow-hidden bg-white md:block"
                  style={{
                    borderTopRightRadius: "28px",
                    borderBottomRightRadius: "28px",
                  }}
                >
                  {status === "loading" ? (
                    <div className="flex h-full items-center justify-center bg-black/10">
                      <Loader2 className="h-8 w-8 animate-spin text-white/80" />
                    </div>
                  ) : offer?.imageUrl ? (
                    <img
                      src={offer.imageUrl}
                      alt={offer?.title || "Offer artwork"}
                      className="h-full w-full object-contain"
                      style={{ objectPosition: "center" }}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 bg-black/10 text-white/70">
                      <Sparkles className="h-10 w-10" />
                      <p className="max-w-[220px] text-center text-sm font-medium">
                        Add a striking visual from the admin to make this pop-up
                        unforgettable.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfferLightboxModal;

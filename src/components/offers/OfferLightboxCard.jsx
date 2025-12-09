import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Copy } from "lucide-react";

const OfferLightboxCard = ({ offer }) => {
  const navigate = useNavigate();

  const palette = useMemo(
    () => ({
      background: offer?.backgroundColor || "#f8fafc",
      text: offer?.textColor || "#0f172a",
      accent: offer?.accentColor || "#008ecc",
      imageBackground: offer?.imageBackgroundColor || "#ffffff",
    }),
    [offer]
  );

  const couponCode = useMemo(
    () => offer?.couponCode?.trim() || "",
    [offer?.couponCode]
  );

  const couponDescription = useMemo(
    () => offer?.couponDescription?.trim() || "",
    [offer?.couponDescription]
  );

  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);
  const copyFeedbackTimeoutRef = useRef(null);

  const showCopyFeedback = useCallback(() => {
    setCopyFeedbackVisible(true);
    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
    }
    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedbackVisible(false);
      copyFeedbackTimeoutRef.current = null;
    }, 1600);
  }, []);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(() => {
    if (!couponCode) return;

    try {
      navigator.clipboard
        .writeText(couponCode)
        .then(showCopyFeedback)
        .catch(showCopyFeedback);
    } catch (_error) {
      showCopyFeedback();
    }
  }, [couponCode, showCopyFeedback]);

  const handleOpenLightbox = useCallback(() => {
    if (!offer) return;

    window.dispatchEvent(
      new CustomEvent("open-offer-lightbox", {
        detail: { offer },
      })
    );
  }, [offer]);

  const handlePrimaryAction = useCallback(() => {
    if (!offer) return;

    const type = (offer.buttonLinkType || "none").toLowerCase();
    const value = (offer.buttonLinkValue || "").trim();

    if (type === "product" && value) {
      navigate(`/product/${value}`);
      return;
    }

    if (type === "category" && value) {
      navigate(`/category/${value}`);
      return;
    }

    if (type === "custom" && value) {
      const isExternal = /^https?:\/\//i.test(value);
      if (isExternal) {
        window.open(value, "_blank", "noopener");
      } else if (value.startsWith("/")) {
        navigate(value);
      } else {
        window.location.href = value;
      }
      return;
    }

    handleOpenLightbox();
  }, [navigate, offer]);

  if (!offer) return null;

  const hasImage = Boolean(offer.imageUrl);
  const secondaryLabel = offer.secondaryLabel?.trim();
  const secondaryHref = offer.secondaryHref?.trim();

  return (
    <article
      className="relative flex flex-col overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-xl transition-transform hover:-translate-y-1 hover:shadow-2xl"
      style={{ backgroundColor: palette.background, color: palette.text }}
    >
      <span
        className={`absolute right-5 top-5 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow ${
          offer.isActive
            ? "bg-emerald-500 text-white"
            : "bg-slate-300 text-slate-600"
        }`}
      >
        {offer.isActive ? "Active" : "Hidden"}
      </span>

      {hasImage ? (
        <div
          className="relative h-44 w-full overflow-hidden md:hidden"
          style={{ backgroundColor: palette.imageBackground }}
        >
          <img
            src={offer.imageUrl}
            alt={offer.title || "Offer artwork"}
            className="h-full w-full object-cover"
            style={{ objectPosition: "center" }}
          />
        </div>
      ) : null}

      <div
        className={`relative grid gap-0 ${
          hasImage ? "md:grid-cols-[1.12fr_0.88fr]" : "md:grid-cols-1"
        }`}
      >
        <div className="space-y-5 px-5 py-6 sm:px-10 sm:py-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm">
            <Sparkles size={14} /> Special Offer
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              {offer.title || "Unlock amazing savings"}
            </h2>
            {offer.subtitle ? (
              <p
                className="text-base font-medium"
                style={{ color: palette.text }}
              >
                {offer.subtitle}
              </p>
            ) : null}
            {offer.description ? (
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
                  {copyFeedbackVisible ? (
                    <span
                      className="pointer-events-none absolute right-3 top-0 -translate-y-full rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-md"
                      aria-hidden
                    >
                      Copied!
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-xs font-medium text-slate-500">
                  Coupon code coming soon
                </div>
              )}
              {couponDescription ? (
                <p className="text-xs text-slate-500">{couponDescription}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handlePrimaryAction}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ backgroundColor: palette.accent }}
            >
              {offer.buttonLabel || "Take the offer"}
            </button>

            {secondaryLabel ? (
              secondaryHref ? (
                <a
                  href={secondaryHref}
                  target={
                    /^https?:/i.test(secondaryHref) ? "_blank" : undefined
                  }
                  rel={/^https?:/i.test(secondaryHref) ? "noopener" : undefined}
                  className="inline-flex text-xs font-medium text-slate-500 underline"
                >
                  {secondaryLabel}
                </a>
              ) : (
                <span className="text-xs font-medium text-slate-500 underline">
                  {secondaryLabel}
                </span>
              )
            ) : null}
          </div>
        </div>

        {hasImage ? (
          <div
            className="relative hidden min-h-[340px] overflow-hidden bg-white md:block"
            style={{ backgroundColor: palette.imageBackground }}
          >
            <img
              src={offer.imageUrl}
              alt={offer.title || "Offer artwork"}
              className="h-full w-full object-cover"
              style={{ objectPosition: "center" }}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default OfferLightboxCard;

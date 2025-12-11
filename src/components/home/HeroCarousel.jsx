import React, { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import api, { fetchProducts } from "../../utils/api";

const BackgroundRemovedImage = ({ src, threshold = 240, ...props }) => {
  const [processedSrc, setProcessedSrc] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      if (!isMounted) return;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      if (!context) {
        setProcessedSrc(src);
        return;
      }

      context.drawImage(img, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        if (red >= threshold && green >= threshold && blue >= threshold) {
          data[index + 3] = 0;
        }
      }

      context.putImageData(imageData, 0, 0);
      setProcessedSrc(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      if (isMounted) {
        setProcessedSrc(src);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [src, threshold]);

  return <img src={processedSrc || src} alt="" {...props} />;
};

const createSlug = (value) => {
  if (!value) {
    return "";
  }

  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
};

const preferUrl = (...values) =>
  values.reduce((picked, value) => (!picked && value ? value : picked), "");

const productLookupCache = new Map();

const FALLBACK_HERO_IMAGE =
  "https://shop.p2pdeal.net/images/og/mst-blockchain-merch-home.jpg";

const ensureAccessibleHeroAsset = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/hero-carousel\/primary\/landing-hero\.webp/i.test(trimmed)) {
    return FALLBACK_HERO_IMAGE;
  }

  return trimmed;
};

const HERO_CACHE_KEY = "shop-p2p-hero-cache-v1";
const HERO_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

const DEFAULT_HERO_SLIDES = [
  {
    id: "default-hero",
    overline: "Official Merch",
    title: "Unlock ₹200 off your first order",
    description:
      "Exclusive MST Blockchain apparel and accessories now available with fast nationwide delivery.",
    background: FALLBACK_HERO_IMAGE,
    spotlightImage: FALLBACK_HERO_IMAGE,
    showTitle: true,
    showOverline: true,
    showDescription: true,
    primaryCta: {
      label: "Shop Now",
      href: "/shop",
    },
    secondaryCta: null,
    showPrimaryCta: true,
    showSecondaryCta: false,
    order: 0,
    isActive: true,
  },
];

const isBrowser = typeof window !== "undefined";

const loadCachedSlides = () => {
  if (!isBrowser) {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(HERO_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.slides) || typeof parsed?.savedAt !== "number") {
      window.sessionStorage.removeItem(HERO_CACHE_KEY);
      return [];
    }

    if (Date.now() - parsed.savedAt > HERO_CACHE_TTL) {
      window.sessionStorage.removeItem(HERO_CACHE_KEY);
      return [];
    }

    return parsed.slides;
  } catch (error) {
    console.error("Failed to read cached hero slides", error);
    if (isBrowser) {
      window.sessionStorage.removeItem(HERO_CACHE_KEY);
    }
    return [];
  }
};

const persistSlidesCache = (slides) => {
  if (!isBrowser || !Array.isArray(slides) || !slides.length) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      HERO_CACHE_KEY,
      JSON.stringify({ slides, savedAt: Date.now() })
    );
  } catch (error) {
    console.error("Failed to persist hero slides cache", error);
  }
};

const getMetadataValue = (metadata, key) => {
  if (!metadata) {
    return "";
  }

  if (typeof metadata.get === "function") {
    const value = metadata.get(key);
    return typeof value === "string"
      ? value
      : value != null
      ? String(value)
      : "";
  }

  const raw = metadata[key];
  if (raw == null) {
    return "";
  }

  return typeof raw === "string" ? raw : String(raw);
};

const fetchProductMatchByName = async (name) => {
  const key = (name || "").toLowerCase();
  if (!key) {
    return null;
  }

  if (productLookupCache.has(key)) {
    return productLookupCache.get(key);
  }

  try {
    const { data } = await fetchProducts({ search: name, limit: 5 });
    const exactMatch = data.find(
      (product) => product?.name?.toLowerCase() === key
    );
    const fallback = exactMatch || data[0] || null;
    productLookupCache.set(key, fallback);
    return fallback;
  } catch (error) {
    console.error("Failed to resolve hero slide product", name, error);
    productLookupCache.set(key, null);
    return null;
  }
};

const normalizeHeroSlide = (slide, index) => {
  if (!slide || typeof slide !== "object") {
    return null;
  }

  const sanitize = (value, defaultValue = "") =>
    typeof value === "string" ? value.trim() : defaultValue;
  const sanitizeColor = (value) => {
    const trimmed = sanitize(value);
    return trimmed ? trimmed : undefined;
  };

  const metadata =
    slide &&
    typeof slide.metadata === "object" &&
    !Array.isArray(slide.metadata)
      ? slide.metadata
      : {};

  const imageUrl = ensureAccessibleHeroAsset(
    sanitize(slide.imageUrl || slide.spotlightImage || "")
  );
  const backgroundUrl = ensureAccessibleHeroAsset(
    sanitize(slide.backgroundUrl || slide.background || "")
  );
  const primaryLabel = sanitize(slide.primaryCta?.label);
  const primaryHrefRaw = sanitize(slide.primaryCta?.href || "");
  const productUrlFromMetadata = sanitize(
    getMetadataValue(metadata, "productUrl")
  );
  const productSlugFromMetadata = createSlug(
    getMetadataValue(metadata, "productSlug")
  );
  const productIdFromMetadata = sanitize(
    getMetadataValue(metadata, "productId")
  );
  const overlineSlug = createSlug(slide.overline);
  const titleSlug = createSlug(slide.title);
  const primaryHref = preferUrl(
    primaryHrefRaw,
    productUrlFromMetadata,
    productSlugFromMetadata &&
      `/product/${encodeURIComponent(productSlugFromMetadata)}`,
    productIdFromMetadata &&
      `/product/${encodeURIComponent(productIdFromMetadata)}`,
    overlineSlug && `/product/${encodeURIComponent(overlineSlug)}`,
    titleSlug && `/product/${encodeURIComponent(titleSlug)}`
  );
  const secondaryLabel = sanitize(slide.secondaryCta?.label || "");
  const secondaryHrefRaw = sanitize(slide.secondaryCta?.href || "");
  const categoryUrlFromMetadata = sanitize(
    getMetadataValue(metadata, "categoryUrl")
  );
  const categorySlugFromMetadata = createSlug(
    getMetadataValue(metadata, "categorySlug") ||
      getMetadataValue(metadata, "category") ||
      getMetadataValue(metadata, "categoryName") ||
      ""
  );
  const productCategoryFromMetadata = createSlug(
    getMetadataValue(metadata, "productCategory") || ""
  );
  const secondaryHref = preferUrl(
    secondaryHrefRaw,
    categoryUrlFromMetadata,
    categorySlugFromMetadata &&
      `/category/${encodeURIComponent(categorySlugFromMetadata)}`,
    productCategoryFromMetadata &&
      `/category/${encodeURIComponent(productCategoryFromMetadata)}`,
    titleSlug && `/category/${encodeURIComponent(titleSlug)}`
  );
  const resolvedSecondaryLabel =
    secondaryLabel || (secondaryHref ? "View All" : "");

  return {
    id: slide._id || slide.id || `hero-${index}`,
    overline: sanitize(slide.overline),
    title: sanitize(slide.title),
    description: sanitize(slide.description),
    titleColor: sanitizeColor(slide.titleColor),
    overlineColor: sanitizeColor(slide.overlineColor),
    descriptionColor: sanitizeColor(slide.descriptionColor),
    background: backgroundUrl || imageUrl,
    spotlightImage: imageUrl,
    showTitle: slide.showTitle !== false,
    showOverline: slide.showOverline !== false,
    showDescription: slide.showDescription !== false,
    primaryCta:
      primaryLabel && primaryHref
        ? {
            label: primaryLabel,
            href: primaryHref,
          }
        : null,
    secondaryCta: secondaryHref
      ? {
          label: resolvedSecondaryLabel,
          href: secondaryHref,
        }
      : null,
    showPrimaryCta: slide.showPrimaryCta !== false,
    showSecondaryCta: slide.showSecondaryCta !== false,
    order: Number.isFinite(Number(slide.order)) ? Number(slide.order) : index,
    isActive: slide.isActive !== false,
  };
};

const HeroCarousel = () => {
  const initialSlidesRef = useRef(null);
  if (initialSlidesRef.current === null) {
    const cached = loadCachedSlides();
    initialSlidesRef.current = cached.length ? cached : DEFAULT_HERO_SLIDES;
  }

  const [remoteSlides, setRemoteSlides] = useState(initialSlidesRef.current);
  const [isLoading, setIsLoading] = useState(
    initialSlidesRef.current === DEFAULT_HERO_SLIDES
  );

  useEffect(() => {
    let isMounted = true;

    const fetchSlides = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/hero-carousel");
        const records = Array.isArray(response?.data?.data)
          ? response.data.data
          : [];

        const resolvedSlides = await Promise.all(
          records.map(async (slide, index) => {
            if (!slide || typeof slide !== "object") {
              return null;
            }

            const normalized = normalizeHeroSlide(slide, index);
            if (!normalized || !normalized.isActive || !normalized.background) {
              return null;
            }

            const referenceName =
              normalized.overline?.trim() || normalized.title?.trim();

            if (!referenceName || normalized.primaryCta?.href !== "/shop") {
              return normalized;
            }

            const matchedProduct = await fetchProductMatchByName(referenceName);
            const resolvedProductIdRaw =
              matchedProduct?.slug ||
              matchedProduct?.id ||
              matchedProduct?.mongoId ||
              matchedProduct?._id;
            const resolvedProductId = resolvedProductIdRaw
              ? resolvedProductIdRaw.toString()
              : "";

            if (!matchedProduct || !resolvedProductId) {
              return normalized;
            }

            const next = { ...normalized };
            next.primaryCta = {
              label: normalized.primaryCta?.label || "Shop Now",
              href: `/product/${encodeURIComponent(resolvedProductId)}`,
            };

            if (!normalized.secondaryCta?.href) {
              const categorySource =
                matchedProduct.category ||
                matchedProduct.brand ||
                normalized.title;
              const categorySlug = createSlug(categorySource);
              if (categorySlug) {
                next.secondaryCta = {
                  label: normalized.secondaryCta?.label || "View All",
                  href: `/category/${encodeURIComponent(categorySlug)}`,
                };
              }
            }

            return next;
          })
        );

        if (isMounted) {
          const filteredSlides = resolvedSlides
            .filter(Boolean)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          if (filteredSlides.length > 0) {
            initialSlidesRef.current = filteredSlides;
            persistSlidesCache(filteredSlides);
            setRemoteSlides(filteredSlides);
          } else if (!loadCachedSlides().length) {
            setRemoteSlides(DEFAULT_HERO_SLIDES);
          }
        }
      } catch (error) {
        if (isMounted && !loadCachedSlides().length) {
          setRemoteSlides(DEFAULT_HERO_SLIDES);
        }
        console.error("Failed to load hero carousel slides", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSlides();

    return () => {
      isMounted = false;
    };
  }, []);

  const slidesToRender = useMemo(() => remoteSlides, [remoteSlides]);

  useEffect(() => {
    if (!isBrowser) {
      return undefined;
    }

    const preloaders = [];
    slidesToRender.slice(1).forEach((slide) => {
      const candidate = slide?.background || slide?.spotlightImage;
      if (!candidate) {
        return;
      }
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = candidate;
      preloaders.push(image);
    });

    return () => {
      preloaders.forEach((image) => {
        image.src = "";
      });
    };
  }, [slidesToRender]);

  useEffect(() => {
    const firstSlide = slidesToRender[0];
    const criticalImage =
      firstSlide?.background || firstSlide?.spotlightImage || "";

    if (!criticalImage) {
      return undefined;
    }

    const existing = document.head.querySelector(
      `link[data-hero-preload="${criticalImage}"]`
    );

    if (existing) {
      return undefined;
    }

    const preloadLink = document.createElement("link");
    preloadLink.rel = "preload";
    preloadLink.as = "image";
    preloadLink.href = criticalImage;
    preloadLink.crossOrigin = "anonymous";
    preloadLink.fetchPriority = "high";
    preloadLink.setAttribute("data-hero-preload", criticalImage);

    document.head.appendChild(preloadLink);

    return () => {
      if (preloadLink.parentNode) {
        preloadLink.parentNode.removeChild(preloadLink);
      }
    };
  }, [slidesToRender]);

  if (!slidesToRender.length) {
    if (isLoading) {
      return (
        <section
          className="relative overflow-hidden bg-slate-950 w-screen"
          style={{ left: "50%", transform: "translateX(-50%)" }}
          aria-hidden
        >
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden min-h-[55vh] md:min-h-[90vh]">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black animate-pulse" />
            <div className="absolute inset-0 bg-slate-950/60" />
            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pt-12 pb-16 text-center text-white sm:gap-7 sm:px-6 sm:pt-16 sm:pb-20">
              <div className="h-3 w-32 rounded-full bg-white/30" />
              <div className="h-10 w-3/4 rounded-full bg-white/25 sm:h-14" />
              <div className="hidden h-16 w-full max-w-xl rounded-2xl bg-white/20 sm:block" />
              <div className="flex flex-wrap items-center justify-center gap-4">
                <span className="h-10 w-32 rounded-full bg-[#008ECC]/40" />
                <span className="h-10 w-24 rounded-full bg-[#008ECC]/30" />
              </div>
            </div>
          </div>
        </section>
      );
    }

    return null;
  }

  return (
    <section
      className="relative overflow-hidden bg-slate-950  w-screen"
      style={{ left: "50%", transform: "translateX(-50%)" }}
    >
      <div className="w-full">
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={0}
          slidesPerView={1}
          pagination={{ clickable: true }}
          loop={slidesToRender.length > 1}
          autoplay={
            slidesToRender.length > 1
              ? {
                  delay: 5000,
                  disableOnInteraction: false,
                  reverseDirection: false,
                }
              : false
          }
          onSwiper={(instance) => {
            if (!instance?.autoplay?.start) {
              return;
            }
            try {
              const maybePromise = instance.autoplay.start();
              if (maybePromise && typeof maybePromise.catch === "function") {
                maybePromise.catch(() => {
                  /* Ignore autoplay promise rejection (common on mobile) */
                });
              }
            } catch (_error) {
              /* Ignore autoplay bootstrap errors */
            }
          }}
          onAutoplay={(_, event) => {
            if (event && typeof event.preventDefault === "function") {
              event.preventDefault();
            }
          }}
          className="hero-slider h-full min-h-[55vh] md:min-h-[90vh]"
          style={{ width: "100%" }}
        >
          {slidesToRender.map((slide, slideIndex) => {
            const backgroundImage = slide.background || slide.spotlightImage;
            const primaryCta = slide.primaryCta;
            const secondaryCta = slide.secondaryCta;
            const hasSecondaryCta = Boolean(
              secondaryCta?.label && secondaryCta?.href
            );
            const showPrimary = slide.showPrimaryCta !== false;
            const showSecondary =
              slide.showSecondaryCta !== false && hasSecondaryCta;
            const isFirstSlide = slideIndex === 0;

            return (
              <SwiperSlide
                key={slide.id}
                className="relative flex w-full min-h-[55vh] md:min-h-[90vh]"
                style={{ width: "100%" }}
              >
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden min-h-[55vh] md:min-h-[90vh]">
                  {backgroundImage ? (
                    <img
                      src={backgroundImage}
                      alt={slide.title || "Featured hero background"}
                      className="absolute inset-0 h-full w-full object-cover md:object-[center_20%]"
                      loading={isFirstSlide ? "eager" : "lazy"}
                      fetchPriority={isFirstSlide ? "high" : "auto"}
                      crossOrigin="anonymous"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-slate-950/55" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.18),transparent_70%)]" />

                  <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pt-10 pb-14 text-center text-white sm:gap-8 sm:px-6 sm:pt-12 sm:pb-16 md:gap-10 md:pt-16 md:pb-20">
                    {slide.showOverline !== false && slide.overline && (
                      <p
                        className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-200/80 sm:text-xs"
                        style={{ color: slide.overlineColor || undefined }}
                      >
                        {slide.overline}
                      </p>
                    )}
                    {slide.showTitle !== false && (
                      <h1
                        className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-6xl"
                        style={{ color: slide.titleColor || undefined }}
                      >
                        {slide.title}
                      </h1>
                    )}
                    {slide.showDescription !== false && slide.description && (
                      <p
                        className="hidden max-w-2xl text-xs text-slate-200 sm:block sm:text-sm md:text-lg"
                        style={{ color: slide.descriptionColor || undefined }}
                      >
                        {slide.description}
                      </p>
                    )}

                    {(showPrimary || showSecondary) && (
                      <div className="flex w-full flex-row flex-wrap items-center justify-center gap-3 sm:w-auto sm:gap-4">
                        {showPrimary && (
                          <Link
                            to={primaryCta.href}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#008ECC] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#008ECC]/30 transition hover:bg-[#009ee3] sm:px-5 sm:py-3 sm:text-sm"
                          >
                            {primaryCta.label}
                            <ChevronRight size={16} className="sm:size-5" />
                          </Link>
                        )}
                        {showSecondary && (
                          <Link
                            to={secondaryCta.href}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#008ECC] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#008ECC]/20 transition hover:bg-[#009ee3] sm:px-5 sm:py-3 sm:text-sm"
                          >
                            {secondaryCta.label}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
};

export default HeroCarousel;

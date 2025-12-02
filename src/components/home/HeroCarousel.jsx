import React, { useEffect, useMemo, useState } from "react";
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

  const imageUrl = sanitize(slide.imageUrl || slide.spotlightImage || "");
  const backgroundUrl = sanitize(slide.backgroundUrl || slide.background || "");
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
  const [remoteSlides, setRemoteSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
          setRemoteSlides(filteredSlides);
        }
      } catch (error) {
        if (isMounted) {
          setRemoteSlides([]);
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

  if (!slidesToRender.length) {
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
          loop={true}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            reverseDirection: false,
          }}
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
          className="hero-slider h-full min-h-[40vh] md:min-h-[82vh]"
          style={{ width: "100%" }}
        >
          {slidesToRender.map((slide) => {
            const backgroundImage = slide.background || slide.spotlightImage;
            const primaryCta = slide.primaryCta;
            const secondaryCta = slide.secondaryCta;
            const hasSecondaryCta = Boolean(
              secondaryCta?.label && secondaryCta?.href
            );
            const showPrimary = slide.showPrimaryCta !== false;
            const showSecondary =
              slide.showSecondaryCta !== false && hasSecondaryCta;

            return (
              <SwiperSlide
                key={slide.id}
                className="relative flex w-full min-h-[40vh] md:min-h-[82vh]"
                style={{ width: "100%" }}
              >
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden min-h-[40vh] md:min-h-[82vh]">
                  <div
                    className="absolute inset-0 bg-cover bg-center md:bg-[center_20%]"
                    style={{
                      backgroundImage: backgroundImage
                        ? `url(${backgroundImage})`
                        : undefined,
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/55" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.18),transparent_70%)]" />

                  <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 pt-6 text-center text-white sm:gap-6 sm:px-6 sm:pt-10 md:pt-14">
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

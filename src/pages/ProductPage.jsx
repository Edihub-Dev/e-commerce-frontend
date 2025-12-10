import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { getProductById } from "../utils/api";
import { useCart } from "../contexts/CartContext";
import { Star, StarHalf, MessageCircle } from "lucide-react";
import {
  pageVariants,
  fadeInLeft,
  fadeInRight,
  fadeInUp,
  buttonHover,
} from "../utils/animations";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Zoom, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/zoom";
import "swiper/css/autoplay";
import { useAppDispatch } from "../store/hooks";
import {
  resetCheckout,
  setCheckoutItems,
  setCheckoutStep,
  setCheckoutTotals,
  setShippingAddress,
  setPaymentMethod,
  setPaymentStatus,
  setOrderId,
  calculateTotals,
} from "../store/slices/checkoutSlice";
import SeoHead from "../components/seo/SeoHead";
import { findMstSeoConfigForName } from "../seo/mstSeoConfig";

const ProductPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState("");
  const { addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCartSeedRef = useRef(false);
  const dispatch = useAppDispatch();

  const LOCKED_AVAILABILITY_STATUSES = ["out_of_stock", "preorder"];
  const availabilityStatus = product?.availabilityStatus || "in_stock";
  const isNotReadyToShip =
    LOCKED_AVAILABILITY_STATUSES.includes(availabilityStatus);
  const isPurchaseDisabled = !product || isNotReadyToShip;

  const reviewsList = Array.isArray(product?.reviewsList)
    ? product.reviewsList
    : [];
  const commentReviews = reviewsList.filter(
    (review) => review?.review && review.review.trim().length > 0
  );
  const reviewsSummary = product?.reviewsSummary || {
    totalReviews: Number(product?.reviews ?? reviewsList.length ?? 0) || 0,
    average: Number(product?.rating ?? 0) || 0,
    totalScore:
      (Number(product?.reviews ?? reviewsList.length ?? 0) || 0) *
      (Number(product?.rating ?? 0) || 0),
  };

  const normalizedSizes = useMemo(() => {
    if (!product?.showSizes) {
      return [];
    }

    const STANDARD_SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
    const orderMap = STANDARD_SIZE_ORDER.reduce((acc, label, index) => {
      acc[label] = index;
      return acc;
    }, {});

    const entries = Array.isArray(product?.sizes) ? product.sizes : [];
    const seen = new Set();
    const normalized = entries
      .map((entry) => {
        const label = entry?.label?.toString().trim().toUpperCase();
        if (!label || seen.has(label)) {
          return null;
        }
        seen.add(label);
        const stock = Math.max(Number(entry?.stock ?? 0), 0);
        const isAvailable = Boolean(entry?.isAvailable ?? true) && stock > 0;
        return {
          label,
          isAvailable,
          stock,
        };
      })
      .filter(Boolean);

    return normalized.sort((a, b) => {
      const aOrder = orderMap[a.label] ?? STANDARD_SIZE_ORDER.length;
      const bOrder = orderMap[b.label] ?? STANDARD_SIZE_ORDER.length;
      if (aOrder === bOrder) {
        return a.label.localeCompare(b.label);
      }
      return aOrder - bOrder;
    });
  }, [product]);

  const productStock = useMemo(() => {
    const rawStock = Number(product?.stock ?? 0);
    return Number.isFinite(rawStock) ? Math.max(rawStock, 0) : 0;
  }, [product]);

  const mstSeoEntry = useMemo(() => {
    if (!product?.name) return null;
    return findMstSeoConfigForName(product.name);
  }, [product?.name]);

  useEffect(() => {
    if (fromCartSeedRef.current) {
      return;
    }

    if (!product) {
      return;
    }

    const navState = location.state;
    if (!navState?.fromCart) {
      return;
    }

    const requestedQuantity = Number(navState.quantity);
    const sanitizedQuantity = Number.isFinite(requestedQuantity)
      ? Math.max(1, Math.floor(requestedQuantity))
      : 1;

    if (product?.showSizes && navState.size) {
      const requestedSize = navState.size.toString().trim().toUpperCase();
      const sizeMatch = normalizedSizes.find(
        (size) => size.label === requestedSize
      );

      if (sizeMatch) {
        setSelectedSize(sizeMatch.label);
        const cappedQuantity = sizeMatch.stock > 0 ? sizeMatch.stock : 1;
        setQuantity(Math.max(1, Math.min(cappedQuantity, sanitizedQuantity)));
        fromCartSeedRef.current = true;
        return;
      }
    }

    const cappedQuantity = productStock > 0 ? productStock : sanitizedQuantity;
    setQuantity(Math.max(1, Math.min(cappedQuantity, sanitizedQuantity)));
    fromCartSeedRef.current = true;
  }, [location.state, normalizedSizes, product, productStock]);

  const averageRating = Number(reviewsSummary.average ?? 0);
  const totalReviews = Number(
    reviewsSummary.totalReviews ?? reviewsList.length ?? 0
  );
  const totalCommentReviews = commentReviews.length;
  const formattedTotalReviews = String(Math.max(totalReviews, 0)).padStart(
    2,
    "0"
  );
  const displayedReviews = showAllReviews
    ? commentReviews
    : commentReviews.slice(0, 3);

  const renderStarIcons = (rating, { size = 20, prefix = "star" } = {}) => {
    const icons = [];
    const normalized = Math.max(0, Math.min(Number(rating) || 0, 5));
    let fullStars = Math.floor(normalized);
    const remainder = normalized - fullStars;

    if (remainder >= 0.75 && fullStars < 5) {
      fullStars = Math.min(5, fullStars + 1);
    }

    const hasHalf = remainder >= 0.25 && remainder < 0.75 && fullStars < 5;

    for (let i = 0; i < fullStars && icons.length < 5; i += 1) {
      icons.push(
        <Star
          key={`${prefix}-full-${i}`}
          size={size}
          className="mr-1 text-yellow-400"
          fill="currentColor"
        />
      );
    }

    if (hasHalf && icons.length < 5) {
      icons.push(
        <StarHalf
          key={`${prefix}-half`}
          size={size}
          className="mr-1 text-yellow-400"
          fill="currentColor"
        />
      );
    }

    while (icons.length < 5) {
      const index = icons.length;
      icons.push(
        <Star
          key={`${prefix}-empty-${index}`}
          size={size}
          className="mr-1 text-slate-300"
          fill="none"
        />
      );
    }

    return icons;
  };

  // Product images - show only database-provided sources (gallery, thumbnail, fallback image)
  const galleryImages = Array.isArray(product?.gallery)
    ? product.gallery.filter(Boolean)
    : [];
  const fallbackImages = [product?.thumbnail, product?.image]
    .filter(Boolean)
    .filter((src) => !galleryImages.includes(src));
  const productImages = product ? [...galleryImages, ...fallbackImages] : [];
  const primaryImage = product?.thumbnail || product?.image || productImages[0];

  const buildImageAlt = (index = 0) => {
    const baseName = product?.name || "MST Blockchain merchandise";

    if (mstSeoEntry) {
      return `${mstSeoEntry.productName} image ${index + 1} - ${
        mstSeoEntry.primaryKeywords
      }`;
    }

    return `${baseName} image ${
      index + 1
    } - mst blockchain merch india, crypto merchandise, blockchain merch india`;
  };

  const availabilityMessage = (() => {
    switch (availabilityStatus) {
      case "preorder":
        return "Preorder • Not ready to ship";
      case "out_of_stock":
        return "Out of stock • Not ready to ship";
      case "low_stock":
        return "Low stock • Ready to ship";
      default:
        return "In stock • Ready to ship";
    }
  })();

  const availabilityIconClass = (() => {
    if (availabilityStatus === "preorder") return "text-blue-500";
    if (availabilityStatus === "out_of_stock") return "text-rose-500";
    if (availabilityStatus === "low_stock") return "text-amber-500";
    return "text-green-500";
  })();

  const selectedSizeInfo = useMemo(() => {
    if (!selectedSize) {
      return null;
    }

    return normalizedSizes.find((size) => size.label === selectedSize) || null;
  }, [normalizedSizes, selectedSize]);

  const isQuantityExceeded = useMemo(() => {
    if (product?.showSizes) {
      return (
        Boolean(selectedSizeInfo) &&
        selectedSizeInfo.stock > 0 &&
        quantity > selectedSizeInfo.stock
      );
    }

    return productStock > 0 && quantity > productStock;
  }, [product?.showSizes, selectedSizeInfo, quantity, productStock]);

  useEffect(() => {
    if (!normalizedSizes.length) {
      if (selectedSize) {
        setSelectedSize("");
      }
      return;
    }

    const isCurrentValid = normalizedSizes.some(
      (size) => size.label === selectedSize && size.isAvailable
    );

    if (!isCurrentValid) {
      setSelectedSize("");
      setQuantity(1);
      setSizeError("");
      return;
    }

    setSizeError("");
  }, [normalizedSizes, selectedSize]);

  useEffect(() => {
    if (product?.showSizes) {
      if (!selectedSizeInfo) {
        return;
      }

      if (selectedSizeInfo.stock > 0 && quantity > selectedSizeInfo.stock) {
        const capped = Math.max(selectedSizeInfo.stock || 1, 1);
        setQuantity(capped);
        setSizeError(`Quantity unavailable.`);
      } else {
        setSizeError("");
      }
      return;
    }

    if (productStock > 0 && quantity > productStock) {
      const capped = Math.max(productStock || 1, 1);
      setQuantity(capped);
      setSizeError(`Quantity unavailable.`);
    } else {
      setSizeError("");
    }
  }, [product?.showSizes, productStock, selectedSizeInfo, quantity]);

  const handleQuantityChange = (nextQuantity) => {
    setQuantity((prevQuantity) => {
      const sanitized = Math.max(1, nextQuantity);

      if (product?.showSizes) {
        if (
          selectedSizeInfo &&
          selectedSizeInfo.isAvailable &&
          selectedSizeInfo.stock > 0 &&
          sanitized > selectedSizeInfo.stock
        ) {
          setSizeError(`Quantity unavailable.`);
          return Math.max(selectedSizeInfo.stock, 1);
        }

        setSizeError("");
        return sanitized;
      }

      if (productStock > 0 && sanitized > productStock) {
        setSizeError(`Quantity unavailable.`);
        return Math.max(productStock || 1, 1);
      }

      setSizeError("");
      return sanitized;
    });
  };

  const handleAddToCart = () => {
    if (isPurchaseDisabled) {
      return;
    }

    if (product?.showSizes && !selectedSize) {
      setSizeError("Please select a size before adding to cart.");
      return;
    }

    if (
      selectedSizeInfo &&
      (selectedSizeInfo.stock <= 0 || !selectedSizeInfo.isAvailable)
    ) {
      setSizeError(`Size ${selectedSizeInfo.label} is currently unavailable.`);
      return;
    }

    if (
      selectedSizeInfo &&
      selectedSizeInfo.stock > 0 &&
      quantity > selectedSizeInfo.stock
    ) {
      setSizeError(
        `Quantity unavailable. Max ${selectedSizeInfo.stock} for size ${selectedSizeInfo.label}.`
      );
      return;
    }

    if (!product?.showSizes && productStock > 0 && quantity > productStock) {
      setSizeError(
        `Quantity unavailable. Max ${productStock} unit${
          productStock === 1 ? "" : "s"
        } available.`
      );
      return;
    }

    setSizeError("");

    const cartProductId =
      product.id ||
      product._id ||
      product.productId ||
      product.sku ||
      product.slug;

    const cartItemPayload = {
      ...product,
      id: cartProductId || product.id,
      size: selectedSize || undefined,
      image: primaryImage,
      hsnCode: product?.hsnCode,
      gstRate: product?.gstRate,
    };

    addItem(cartItemPayload, quantity);
  };

  const goToCheckout = () => {
    if (isPurchaseDisabled) {
      return;
    }

    if (product?.showSizes) {
      if (!selectedSize) {
        setSizeError("Please select a size before continuing to checkout.");
        return;
      }

      if (
        selectedSizeInfo &&
        (selectedSizeInfo.stock <= 0 || !selectedSizeInfo.isAvailable)
      ) {
        setSizeError(
          `Size ${selectedSizeInfo.label} is currently unavailable.`
        );
        return;
      }

      if (
        selectedSizeInfo &&
        selectedSizeInfo.stock > 0 &&
        quantity > selectedSizeInfo.stock
      ) {
        setSizeError(
          `Quantity unavailable. Max ${selectedSizeInfo.stock} for size ${selectedSizeInfo.label}.`
        );
        return;
      }
    } else if (productStock > 0 && quantity > productStock) {
      setSizeError(
        `Quantity unavailable. Max ${productStock} unit${
          productStock === 1 ? "" : "s"
        } available.`
      );
      return;
    }

    setSizeError("");

    const rawProductId = product._id || product.productId || product.id;
    const mongoIdRegex = /^[a-f\d]{24}$/i;

    const selectedItem = {
      id: product.id,
      name: product.name,
      image: primaryImage,
      price: product.price,
      quantity,
      size: selectedSize || undefined,
      hsnCode: product?.hsnCode,
      gstRate: product?.gstRate,
    };

    if (rawProductId && mongoIdRegex.test(rawProductId)) {
      selectedItem.product = rawProductId;
    }

    const shippingFee = 49;
    const totals = calculateTotals([selectedItem], { shippingFee });

    dispatch(resetCheckout());
    dispatch(setCheckoutItems([selectedItem]));
    dispatch(setCheckoutTotals(totals));
    dispatch(setShippingAddress(null));
    dispatch(setPaymentMethod(null));
    dispatch(setPaymentStatus("pending"));
    dispatch(setOrderId(null));
    dispatch(setCheckoutStep("order-summary"));

    navigate("/checkout/order", { state: { source: "buy-now" } });
  };

  useEffect(() => {
    let isCancelled = false;

    const loadProduct = async () => {
      try {
        const response = await getProductById(id);
        const fetched = response?.data;

        if (!isCancelled && fetched) {
          const normalizedFeatures = Array.isArray(fetched.features)
            ? fetched.features.filter(Boolean)
            : [];
          const normalizedReviewsList = Array.isArray(fetched.reviewsList)
            ? fetched.reviewsList
            : [];
          const normalizedReviewsSummary = fetched.reviewsSummary || {
            totalReviews:
              Number(fetched.reviews ?? fetched.ratings?.totalReviews ?? 0) ||
              0,
            average:
              Number(fetched.rating ?? fetched.ratings?.average ?? 0) || 0,
            totalScore: Number(fetched.ratings?.totalScore ?? 0) || 0,
          };

          setProduct({
            ...fetched,
            features: normalizedFeatures,
            reviewsList: normalizedReviewsList,
            reviewsSummary: normalizedReviewsSummary,
          });
          setShowAllReviews(false);
          setErrorMessage("");
          return;
        }
      } catch (error) {
        console.error("Failed to fetch product", error);
      }

      if (!isCancelled) {
        setProduct(null);
        setShowAllReviews(false);
        setErrorMessage("Product not found or currently unavailable.");
      }
    };

    loadProduct();
    const intervalId = setInterval(() => {
      loadProduct();
    }, 30000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [id]);

  // Double click to zoom is handled by Swiper's built-in zoom functionality

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        {errorMessage ? (
          <p className="text-sm font-medium text-red-500">{errorMessage}</p>
        ) : (
          <div className="animate-pulse">Loading product details...</div>
        )}
      </div>
    );
  }

  const canonicalPath = `/product/${id}`;
  const seoTitle =
    mstSeoEntry?.seoTitle ||
    `${product.name} | MST Blockchain Merchandise | Crypto Merchandise & Blockchain Merch India`;
  const seoDescription =
    mstSeoEntry?.seoDescription ||
    `Buy ${product.name} at the best price. Premium MST Blockchain merchandise with fast delivery across India. Crypto merchandise and blockchain merch india.`;

  const keywordParts = [];
  if (mstSeoEntry?.primaryKeywords)
    keywordParts.push(mstSeoEntry.primaryKeywords);
  if (mstSeoEntry?.secondaryKeywords)
    keywordParts.push(mstSeoEntry.secondaryKeywords);
  if (mstSeoEntry?.longTailKeywords)
    keywordParts.push(mstSeoEntry.longTailKeywords);
  if (mstSeoEntry?.tags) keywordParts.push(mstSeoEntry.tags);

  const fallbackKeywords = [
    product.name,
    product.category,
    product.brand,
    "mst",
    "blockchain",
    "merch",
    "crypto merchandise",
    "blockchain merch india",
  ]
    .filter(Boolean)
    .join(", ");

  const seoKeywords = keywordParts.length
    ? keywordParts.join(", ")
    : fallbackKeywords;

  const productUrl = `https://shop.p2pdeal.net${canonicalPath}`;
  const availabilityMap = {
    preorder: "https://schema.org/PreOrder",
    out_of_stock: "https://schema.org/OutOfStock",
    low_stock: "https://schema.org/LimitedAvailability",
    in_stock: "https://schema.org/InStock",
  };
  const offerAvailability =
    availabilityMap[availabilityStatus] || "https://schema.org/InStock";

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image:
      (productImages && productImages.length > 0
        ? productImages
        : primaryImage
        ? [primaryImage]
        : undefined) || undefined,
    description: seoDescription,
    brand: {
      "@type": "Brand",
      name: "MST Blockchain",
    },
    sku: product.sku || product.id,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: Number(product.price || 0) || undefined,
      availability: offerAvailability,
      itemCondition: "https://schema.org/NewCondition",
    },
    aggregateRating:
      totalReviews > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: averageRating || 0,
            reviewCount: totalReviews,
          }
        : undefined,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://shop.p2pdeal.net/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: "https://shop.p2pdeal.net/shop",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  return (
    <motion.div
      className="container mx-auto px-4 py-8 min-h-[80vh] flex flex-col items-center"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalPath={canonicalPath}
        openGraph={{
          title: seoTitle,
          description: seoDescription,
          image: primaryImage,
          type: "product",
        }}
        twitter={{
          title: seoTitle,
          description: seoDescription,
          image: primaryImage,
          card: "summary_large_image",
        }}
        schema={[productSchema, breadcrumbSchema]}
      />
      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Image Gallery */}
            <motion.div variants={fadeInLeft} className="relative">
              <div className="relative overflow-hidden rounded-lg bg-gray-50">
                <Swiper
                  style={{
                    "--swiper-pagination-color": "#008ECC",
                    "--swiper-pagination-bullet-size": "10px",
                    "--swiper-pagination-bullet-horizontal-gap": "6px",
                  }}
                  spaceBetween={10}
                  pagination={{
                    clickable: true,
                    dynamicBullets: true,
                  }}
                  zoom={true}
                  autoplay={{
                    delay: 2000, // Reduced from 3000 to 2000ms
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }}
                  loop={true}
                  speed={500} // Faster transition (reduced from 800ms)
                  modules={[Pagination, Zoom, Autoplay]}
                  className="w-full h-[400px] md:h-[500px] relative"
                >
                  {productImages.map((img, index) => (
                    <SwiperSlide key={index}>
                      <div className="swiper-zoom-container w-full h-full flex items-center justify-center p-4">
                        <img
                          src={img}
                          alt={buildImageAlt(index)}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Zoom is now handled by double-click on the image */}
              </div>

              {/* Pagination dots are now part of the main Swiper component */}
            </motion.div>
            {/* Product Details */}
            <motion.div variants={fadeInRight} className="flex flex-col h-full">
              <div className="flex-grow">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center">
                    {renderStarIcons(averageRating, {
                      size: 20,
                      prefix: "average-rating",
                    })}
                  </div>
                  <span className="text-gray-600 text-sm">
                    ({formattedTotalReviews})
                  </span>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline space-x-3 mb-1">
                    <p className="text-3xl font-bold text-primary">
                      ₹{product.price.toLocaleString()}
                    </p>
                    {product.originalPrice > product.price && (
                      <p className="text-lg text-gray-500 line-through">
                        ₹{product.originalPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                  {product.discount > 0 && (
                    <div className="flex flex-col items-start gap-1">
                      <span className="inline-block bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        Save ₹{product.saveAmount.toLocaleString()} (
                        {product.discount}% OFF)
                      </span>
                      <p className="text-xs text-slate-600">
                        Price excludes GST (added at checkout)
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="prose max-w-none mb-6 text-gray-600">
                  <p>{product.description}</p>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* Quantity and Add to Cart */}
              <div className="mt-auto pt-6 border-t border-gray-100">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-600">
                        Qty
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            !isPurchaseDisabled &&
                            handleQuantityChange(quantity - 1)
                          }
                          disabled={isPurchaseDisabled || quantity <= 1}
                          className={`h-9 w-9 rounded-full border text-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                            isPurchaseDisabled || quantity <= 1
                              ? "cursor-not-allowed border-slate-200 text-slate-300"
                              : "border-slate-300 text-slate-700 hover:border-blue-500 hover:text-blue-600"
                          }`}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <div className="flex h-10 w-16 items-center justify-center rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                          <input
                            type="tel"
                            min="1"
                            value={quantity}
                            onFocus={(event) => {
                              event.target.select();
                            }}
                            onChange={(event) => {
                              if (isPurchaseDisabled) {
                                return;
                              }

                              const digitsOnly = event.target.value.replace(
                                /[^0-9]/g,
                                ""
                              );
                              if (!digitsOnly.length) {
                                setQuantity("");
                                return;
                              }

                              const raw = Number(digitsOnly);
                              if (Number.isNaN(raw)) {
                                return;
                              }

                              handleQuantityChange(raw);
                            }}
                            className="w-full bg-transparent text-center text-lg font-semibold text-slate-700 focus:outline-none"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            !isPurchaseDisabled &&
                            handleQuantityChange(quantity + 1)
                          }
                          disabled={isPurchaseDisabled}
                          className={`h-9 w-9 rounded-full border text-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                            isPurchaseDisabled
                              ? "cursor-not-allowed border-slate-200 text-slate-300"
                              : "border-slate-300 text-slate-700 hover:border-blue-500 hover:text-blue-600"
                          }`}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {normalizedSizes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">
                          Sizes Available:
                        </span>
                        {normalizedSizes.map((size) => {
                          const isActive = selectedSize === size.label;
                          const isDisabled =
                            !size.isAvailable || isPurchaseDisabled;
                          return (
                            <button
                              key={size.label}
                              type="button"
                              onClick={() => {
                                if (isDisabled) {
                                  return;
                                }
                                setSelectedSize(size.label);
                                setQuantity((current) => {
                                  const safeQuantity = Math.max(1, current);
                                  if (
                                    size.stock > 0 &&
                                    safeQuantity > size.stock
                                  ) {
                                    setSizeError(
                                      `Only ${size.stock} unit${
                                        size.stock === 1 ? "" : "s"
                                      } available for size ${size.label}.`
                                    );
                                    return size.stock;
                                  }
                                  setSizeError("");
                                  return safeQuantity;
                                });
                              }}
                              disabled={isDisabled}
                              title={
                                !size.isAvailable
                                  ? "Currently unavailable"
                                  : undefined
                              }
                              className={`inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                                isActive
                                  ? "border-blue-600 bg-blue-50 text-blue-600"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600"
                              } ${
                                !size.isAvailable
                                  ? "cursor-not-allowed opacity-50"
                                  : ""
                              }`}
                            >
                              {size.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {sizeError && (
                      <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        {sizeError}
                      </div>
                    )}

                    <motion.button
                      type="button"
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors text-center whitespace-nowrap ${
                        isPurchaseDisabled || isQuantityExceeded
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-primary text-white hover:bg-primary/90"
                      }`}
                      whileHover={
                        isPurchaseDisabled || isQuantityExceeded
                          ? undefined
                          : buttonHover.whileHover
                      }
                      whileTap={
                        isPurchaseDisabled || isQuantityExceeded
                          ? undefined
                          : buttonHover.whileTap
                      }
                      disabled={isPurchaseDisabled || isQuantityExceeded}
                      onClick={handleAddToCart}
                    >
                      {isNotReadyToShip ? "Unavailable" : "Add to Cart"}
                    </motion.button>
                    <motion.button
                      type="button"
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors text-center whitespace-nowrap ${
                        isPurchaseDisabled || isQuantityExceeded
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                      whileHover={
                        isPurchaseDisabled || isQuantityExceeded
                          ? undefined
                          : buttonHover.whileHover
                      }
                      whileTap={
                        isPurchaseDisabled || isQuantityExceeded
                          ? undefined
                          : buttonHover.whileTap
                      }
                      disabled={isPurchaseDisabled || isQuantityExceeded}
                      onClick={goToCheckout}
                    >
                      {isNotReadyToShip ? "Notify Me" : "Buy Now"}
                    </motion.button>
                  </div>
                </div>

                {isNotReadyToShip && (
                  <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                    This item is currently unavailable for purchase. Please
                    check back soon.
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-500 flex items-center">
                  <svg
                    className={`h-5 w-5 mr-2 ${availabilityIconClass}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        availabilityStatus === "out_of_stock"
                          ? "M6 18L18 6M6 6l12 12"
                          : "M5 13l4 4L19 7"
                      }
                    />
                  </svg>
                  {availabilityMessage}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto mt-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Customer Reviews
              </h2>
              <p className="text-sm text-gray-500">
                Hear from shoppers who bought this product.
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-2 text-xs text-gray-500 font-medium">
              {totalCommentReviews > 0
                ? `${totalCommentReviews} customer review${
                    totalCommentReviews > 1 ? "s" : ""
                  }`
                : "No customer reviews yet"}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {totalCommentReviews > 0 && displayedReviews.length > 0 ? (
              displayedReviews.map((review, index) => (
                <div
                  key={`${review.reviewerName || "reviewer"}-${index}`}
                  className="border border-slate-100 rounded-xl p-4 bg-slate-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-secondary text-sm">
                      {review.reviewerName || "Verified Buyer"}
                    </div>
                    <div className="flex items-center">
                      {renderStarIcons(review.rating, {
                        size: 16,
                        prefix: `review-${index}`,
                      })}
                      <span className="ml-2 text-xs text-gray-500">
                        {review.ratedAt
                          ? new Date(review.ratedAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-3 text-sm text-medium-text">
                    <MessageCircle className="h-4 w-4 text-secondary mt-0.5" />
                    <p className="whitespace-pre-line break-words">
                      {review.review?.trim()
                        ? review.review
                        : "No additional comments provided."}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No reviews yet. Be the first to share your experience after
                purchasing!
              </p>
            )}
          </div>

          {totalCommentReviews > 3 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllReviews((prev) => !prev)}
                className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition"
              >
                {showAllReviews
                  ? "Show Less"
                  : `Show All Reviews (${totalCommentReviews})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductPage;

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getProductById } from "../utils/api";
import { useCart } from "../contexts/CartContext";
import { Star } from "lucide-react";
import {
  pageVariants,
  fadeInLeft,
  fadeInRight,
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

const ProductPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const sizes = ["S", "M", "L", "XL", "XXL"];
  const [selectedSize, setSelectedSize] = useState(sizes[1]);
  const { addItem } = useCart();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const LOCKED_AVAILABILITY_STATUSES = ["out_of_stock", "preorder"];
  const availabilityStatus = product?.availabilityStatus || "in_stock";
  const isNotReadyToShip = LOCKED_AVAILABILITY_STATUSES.includes(availabilityStatus);
  const isPurchaseDisabled = !product || isNotReadyToShip;

  // Product images - show only database-provided sources (gallery, thumbnail, fallback image)
  const galleryImages = Array.isArray(product?.gallery)
    ? product.gallery.filter(Boolean)
    : [];
  const fallbackImages = [product?.thumbnail, product?.image]
    .filter(Boolean)
    .filter((src) => !galleryImages.includes(src));
  const productImages = product ? [...galleryImages, ...fallbackImages] : [];
  const primaryImage = product?.thumbnail || product?.image || productImages[0];

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

  const handleAddToCart = () => {
    if (isPurchaseDisabled) {
      return;
    }
    addItem({
      ...product,
      quantity,
      size: selectedSize,
      image: primaryImage,
    });
  };

  const goToCheckout = () => {
    if (isPurchaseDisabled) {
      return;
    }

    const rawProductId = product._id || product.productId || product.id;
    const mongoIdRegex = /^[a-f\d]{24}$/i;

    const selectedItem = {
      id: product.id,
      name: product.name,
      image: primaryImage,
      price: product.price,
      quantity,
      size: selectedSize,
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
          setProduct({
            ...fetched,
            features: fetched.features || [
              "Material: 100% Polyester",
              "Color: White with Red Printed MST Logo",
              "Fit Type: Regular / Athletic",
              "Sizes Available: S, M, L, XL, XXL",
            ],
          });
          return;
        }
      } catch (error) {
        console.error("Failed to fetch product", error);
      }

      if (!isCancelled) {
        setProduct({
          id,
          name: "MST Blockchain Official Polo T-Shirt (White Edition)",
          image: "/assets/products/WHITE_FRONT.png",
          description:
            "Show your pride in the MST Blockchain community with this premium white polo t-shirt — crafted for comfort, style, and durability. Designed with a sleek printed MST logo, this shirt blends casual elegance with professional appeal. Whether you’re attending a blockchain event, trading from your desk, or relaxing on the weekend, this polo is your go-to merch.",
          price: 90199,
          originalPrice: 109999,
          discount: 18,
          saveAmount: 19800,
          rating: 4.5,
          reviews: 24,
          availabilityStatus: "in_stock",
          stock: 120,
          features: [
            "Material: 100% Polyester",
            "Color: White with Red Printed MST Logo",
            "Fit Type: Regular / Athletic",
            "Sizes Available: S, M, L, XL, XXL",
          ],
        });
      }
    };

    loadProduct();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Double click to zoom is handled by Swiper's built-in zoom functionality

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse">Loading product details...</div>
      </div>
    );
  }

  return (
    <motion.div
      className="container mx-auto px-4 py-8 min-h-[80vh] flex items-center"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
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
                          alt={`${product.name} ${index + 1}`}
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
                  <div className="flex items-center text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className="mr-1"
                        fill={
                          i < Math.round(product.rating ?? 0)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm text-secondary font-medium">
                    {Number(product.rating ?? 0).toFixed(1)} / 5
                  </span>
                  <span className="text-gray-600 text-sm">
                    ({product.reviews} reviews)
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
                    <span className="inline-block bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                      Save ₹{product.saveAmount.toLocaleString()} (
                      {product.discount}% OFF)
                    </span>
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
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          !isPurchaseDisabled &&
                          setQuantity((q) => Math.max(1, q - 1))
                        }
                        disabled={isPurchaseDisabled}
                        className={`px-4 py-2 text-xl font-medium transition-colors ${
                          isPurchaseDisabled
                            ? "cursor-not-allowed text-gray-300"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-lg font-semibold">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          !isPurchaseDisabled && setQuantity((q) => q + 1)
                        }
                        disabled={isPurchaseDisabled}
                        className={`px-4 py-2 text-xl font-medium transition-colors ${
                          isPurchaseDisabled
                            ? "cursor-not-allowed text-gray-300"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">
                        Sizes Available:
                      </span>
                      {sizes.map((size) => {
                        const isActive = selectedSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            className={`inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                              isActive
                                ? "border-blue-600 bg-blue-50 text-blue-600"
                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600"
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>

                    <motion.button
                      type="button"
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors text-center whitespace-nowrap ${
                        isPurchaseDisabled
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-primary text-white hover:bg-primary/90"
                      }`}
                      whileHover={
                        isPurchaseDisabled ? undefined : buttonHover.whileHover
                      }
                      whileTap={
                        isPurchaseDisabled ? undefined : buttonHover.whileTap
                      }
                      disabled={isPurchaseDisabled}
                      onClick={handleAddToCart}
                    >
                      {isNotReadyToShip ? "Unavailable" : "Add to Cart"}
                    </motion.button>
                    <motion.button
                      type="button"
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors text-center whitespace-nowrap ${
                        isPurchaseDisabled
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                      whileHover={
                        isPurchaseDisabled ? undefined : buttonHover.whileHover
                      }
                      whileTap={
                        isPurchaseDisabled ? undefined : buttonHover.whileTap
                      }
                      disabled={isPurchaseDisabled}
                      onClick={goToCheckout}
                    >
                      {isNotReadyToShip ? "Notify Me" : "Buy Now"}
                    </motion.button>
                  </div>
                </div>

                {isNotReadyToShip && (
                  <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                    This item is currently unavailable for purchase. Please check
                    back soon.
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
    </motion.div>
  );
};

export default ProductPage;

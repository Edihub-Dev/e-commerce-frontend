import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { AnimatePresence, motion } from "framer-motion";
import { X, UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react";

const DEFAULT_FORM = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  price: "",
  originalPrice: "",
  discountPercentage: "",
  saveAmount: "",
  rating: "",
  reviews: "",
  stock: "",
  status: "published",
  availabilityStatus: "in_stock",
  thumbnail: "",
  description: "",
  gallery: [],
  isFeatured: false,
  keyFeatures: [""],
};

const statusOptions = [
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const availabilityOptions = [
  { label: "In Stock", value: "in_stock" },
  { label: "Low Stock", value: "low_stock" },
  { label: "Out of Stock", value: "out_of_stock" },
  { label: "Preorder", value: "preorder" },
];

const modalVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

const ProductFormModal = ({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [localError, setLocalError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);

  const title = useMemo(
    () => (mode === "edit" ? "Edit Product" : "Add Product"),
    [mode]
  );
  const submitLabel = useMemo(
    () => (mode === "edit" ? "Save Changes" : "Create Product"),
    [mode]
  );

  useEffect(() => {
    if (isOpen) {
      const normalizedInitial = initialData || {};
      setFormState({
        ...DEFAULT_FORM,
        ...normalizedInitial,
        thumbnail: normalizedInitial.thumbnail || DEFAULT_FORM.thumbnail,
        gallery: Array.isArray(normalizedInitial.gallery)
          ? [...normalizedInitial.gallery]
          : [...DEFAULT_FORM.gallery],
        keyFeatures: Array.isArray(normalizedInitial.keyFeatures)
          ? normalizedInitial.keyFeatures.length
            ? [...normalizedInitial.keyFeatures]
            : [""]
          : [...DEFAULT_FORM.keyFeatures],
      });
      setLocalError("");
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "availabilityStatus") {
        const isLocked = ["out_of_stock", "preorder"].includes(value);
        const wasLocked = ["out_of_stock", "preorder"].includes(
          prev.availabilityStatus
        );

        if (isLocked) {
          next.stock = "0";
        } else if (wasLocked) {
          next.stock = "";
        }
      }

      return next;
    });
  };

  const handleToggleChange = (field) => (event) => {
    const { checked } = event.target;
    setFormState((prev) => ({ ...prev, [field]: checked }));
  };

  const handlePricingChange = (field) => (event) => {
    const { value } = event.target;
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      const priceValue = field === "price" ? value : next.price;
      const originalValue =
        field === "originalPrice" ? value : next.originalPrice;

      const priceNum = parseFloat(priceValue);
      const originalNum = parseFloat(originalValue);

      if (
        !Number.isNaN(priceNum) &&
        !Number.isNaN(originalNum) &&
        originalNum >= priceNum &&
        originalNum > 0
      ) {
        const save = originalNum - priceNum;
        next.discountPercentage = Math.round(
          (save / originalNum) * 100
        ).toString();
        next.saveAmount = save.toFixed(2);
      } else {
        next.discountPercentage = "";
        next.saveAmount = "";
      }

      return next;
    });
  };

  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleThumbnailUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLocalError("Please upload an image file for the thumbnail");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setLocalError("Thumbnail must be under 2MB");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      setFormState((prev) => ({ ...prev, thumbnail: dataUrl }));
      setLocalError("");
    } catch (error) {
      setLocalError("Failed to load thumbnail image");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (files.some((file) => !file.type.startsWith("image/"))) {
      setLocalError("All gallery files must be images");
      event.target.value = "";
      return;
    }

    const oversized = files.find((file) => file.size > MAX_IMAGE_SIZE);
    if (oversized) {
      setLocalError("Each gallery image must be under 2MB");
      event.target.value = "";
      return;
    }

    setIsGalleryUploading(true);
    try {
      const images = await Promise.all(files.map(readFileAsDataURL));
      setFormState((prev) => {
        const existing = Array.isArray(prev.gallery) ? prev.gallery : [];
        const additions = images.filter((image) => !existing.includes(image));
        return { ...prev, gallery: [...existing, ...additions] };
      });
      setLocalError("");
    } catch (error) {
      setLocalError("Failed to load gallery images");
    } finally {
      setIsGalleryUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveGalleryImage = (index) => {
    setFormState((prev) => {
      const nextGallery = (prev.gallery || []).filter(
        (_, idx) => idx !== index
      );
      return { ...prev, gallery: nextGallery };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setLocalError("");

    if (!formState.name.trim()) {
      setLocalError("Product name is required");
      return;
    }

    if (!formState.thumbnail.trim()) {
      setLocalError("Thumbnail URL is required");
      return;
    }

    if (!Array.isArray(formState.gallery) || formState.gallery.length === 0) {
      setLocalError("Add at least one gallery image");
      return;
    }

    if (!formState.price || Number.isNaN(Number(formState.price))) {
      setLocalError("Valid price is required");
      return;
    }

    const keyFeatures = Array.isArray(formState.keyFeatures)
      ? formState.keyFeatures.map((feature) => feature.trim()).filter(Boolean)
      : [];

    if (!keyFeatures.length) {
      setLocalError("Add at least one key feature");
      return;
    }

    if (
      formState.originalPrice &&
      (Number.isNaN(Number(formState.originalPrice)) ||
        Number(formState.originalPrice) < Number(formState.price))
    ) {
      setLocalError(
        "Original price must be a valid number greater than or equal to price"
      );
      return;
    }

    if (formState.stock !== "" && Number.isNaN(Number(formState.stock))) {
      setLocalError("Stock must be a number");
      return;
    }

    if (formState.rating) {
      const ratingNum = Number(formState.rating);
      if (Number.isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        setLocalError("Rating must be between 0 and 5");
        return;
      }
    }

    if (formState.reviews) {
      const reviewsNum = Number(formState.reviews);
      if (Number.isNaN(reviewsNum) || reviewsNum < 0) {
        setLocalError("Reviews must be 0 or more");
        return;
      }
    }

    onSubmit({
      ...formState,
      price: Number(formState.price),
      originalPrice: formState.originalPrice
        ? Number(formState.originalPrice)
        : undefined,
      discountPercentage: formState.discountPercentage
        ? Number(formState.discountPercentage)
        : undefined,
      saveAmount: formState.saveAmount
        ? Number(formState.saveAmount)
        : undefined,
      rating: formState.rating ? Number(formState.rating) : undefined,
      reviews: formState.reviews ? Number(formState.reviews) : undefined,
      stock: Number(
        ["out_of_stock", "preorder"].includes(formState.availabilityStatus)
          ? 0
          : formState.stock || 0
      ),
      gallery: Array.isArray(formState.gallery) ? formState.gallery : [],
      isFeatured: Boolean(formState.isFeatured),
      keyFeatures,
    });
  };

  const isStockLocked = ["out_of_stock", "preorder"].includes(
    formState.availabilityStatus
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl md:my-0 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {title}
                </h2>
                <p className="text-sm text-slate-500">
                  {mode === "edit"
                    ? "Update product details and inventory"
                    : "Create a new product listing"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-600"
                aria-label="Close"
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Product Name
                  <input
                    type="text"
                    value={formState.name}
                    onChange={handleChange("name")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Smartwatch E2"
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-medium text-slate-500 md:col-span-2">
                  Key Features
                  <div className="space-y-2">
                    {(formState.keyFeatures || []).map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(event) => {
                            const value = event.target.value;
                            setFormState((prev) => {
                              const nextFeatures = Array.isArray(
                                prev.keyFeatures
                              )
                                ? [...prev.keyFeatures]
                                : [""];
                              nextFeatures[index] = value;
                              return { ...prev, keyFeatures: nextFeatures };
                            });
                          }}
                          placeholder="E.g. Premium breathable fabric"
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormState((prev) => {
                              const nextFeatures = Array.isArray(
                                prev.keyFeatures
                              )
                                ? prev.keyFeatures.filter(
                                    (_, idx) => idx !== index
                                  )
                                : [];
                              return {
                                ...prev,
                                keyFeatures: nextFeatures.length
                                  ? nextFeatures
                                  : [""],
                              };
                            });
                          }}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-2 py-2 text-xs font-medium text-slate-500 hover:border-rose-200 hover:text-rose-500"
                          disabled={(formState.keyFeatures || []).length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormState((prev) => ({
                          ...prev,
                          keyFeatures: Array.isArray(prev.keyFeatures)
                            ? [...prev.keyFeatures, ""]
                            : ["", ""],
                        }));
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      Add Feature
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  id
                  <input
                    type="text"
                    value={formState.sku}
                    onChange={handleChange("sku")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="SW-302011"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Category
                  <input
                    type="text"
                    value={formState.category}
                    onChange={handleChange("category")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Smartwatch"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Brand
                  <input
                    type="text"
                    value={formState.brand}
                    onChange={handleChange("brand")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Megamart"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.price}
                    onChange={handlePricingChange("price")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="599.00"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Original Price (MRP)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.originalPrice}
                    onChange={handlePricingChange("originalPrice")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="799.00"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Discount (%)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formState.discountPercentage}
                    onChange={handleChange("discountPercentage")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Auto"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  You Save (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.saveAmount}
                    onChange={handleChange("saveAmount")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Auto"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Stock
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formState.stock}
                    onChange={handleChange("stock")}
                    disabled={isStockLocked}
                    className={`rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                      isStockLocked
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-200"
                    }`}
                    placeholder="40"
                  />
                  {isStockLocked && (
                    <span className="text-[11px] text-slate-500">
                      Stock is controlled automatically when status is{" "}
                      {formState.availabilityStatus === "preorder"
                        ? "Preorder"
                        : "Out of Stock"}
                      .
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Status
                  <select
                    value={formState.status}
                    onChange={handleChange("status")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Stock Status
                  <select
                    value={formState.availabilityStatus}
                    onChange={handleChange("availabilityStatus")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                  >
                    {availabilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Featured Product
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-xs text-slate-600">
                      Highlight this item in storefront collections
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(formState.isFeatured)}
                        onChange={handleToggleChange("isFeatured")}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label="Toggle featured product"
                      />
                      <span className="text-xs text-slate-600">
                        {formState.isFeatured ? "Yes" : "No"}
                      </span>
                    </span>
                  </div>
                </label>
              </div>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Thumbnail
                  </span>
                  <p className="text-xs text-slate-500">
                    Upload a primary image (max 2MB) that will be used as the
                    card preview.
                  </p>
                </div>
                <div
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center ${
                    formState.thumbnail
                      ? "border-blue-200 bg-white"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {formState.thumbnail ? (
                    <div className="relative">
                      <img
                        src={formState.thumbnail}
                        alt="Thumbnail preview"
                        className="h-28 w-28 rounded-2xl object-cover shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormState((prev) => ({ ...prev, thumbnail: "" }))
                        }
                        className="absolute -right-2 -top-2 inline-flex items-center justify-center rounded-full bg-white px-2 py-1 text-[10px] font-semibold shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Drag and drop image here, or click add image
                      </p>
                    </>
                  )}
                  <label className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700">
                    <UploadCloud size={14} />
                    {formState.thumbnail ? "Replace Image" : "Add Image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Gallery Images
                  </span>
                  <p className="text-xs text-slate-500">
                    Upload multiple images (under 2MB each) for the product
                    swiper.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(formState.gallery || []).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <img
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(index)}
                        className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                  <UploadCloud size={14} />
                  {isGalleryUploading ? "Uploading..." : "Add Gallery Images"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </label>
              </section>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Description
                <textarea
                  value={formState.description}
                  onChange={handleChange("description")}
                  rows={3}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="A short description about this product"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Rating (0 - 5)
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formState.rating}
                    onChange={handleChange("rating")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="4.5"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Reviews Count
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formState.reviews}
                    onChange={handleChange("reviews")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="135"
                  />
                </label>
              </div>

              {(localError || error) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  {localError || error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70"
                >
                  {isSubmitting ? "Saving..." : submitLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

ProductFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(["add", "edit"]).isRequired,
  initialData: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
};

ProductFormModal.defaultProps = {
  initialData: null,
  isSubmitting: false,
  error: "",
};

export default ProductFormModal;

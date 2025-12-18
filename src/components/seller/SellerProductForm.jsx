import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  Loader2,
  UploadCloud,
  Image as ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

const STANDARD_SIZE_LABELS = ["S", "M", "L", "XL", "XXL"];

const PRODUCT_TAX_PRESETS = [
  { matcher: /keychain/i, hsnCode: "8305", gstRate: 18 },
  {
    matcher: /ceramic\s+coffee\s+mug|coffee\s+mug|mug/i,
    hsnCode: "6912",
    gstRate: 12,
  },
  { matcher: /executive\s+diary|pen\s+set/i, hsnCode: "4820", gstRate: 18 },
  { matcher: /white\s+logo\s+cap|cap/i, hsnCode: "6501", gstRate: 18 },
  { matcher: /diary/i, hsnCode: "4820", gstRate: 18 },
  { matcher: /\bpen\b/i, hsnCode: "9608", gstRate: 18 },
  { matcher: /t\s*-?shirt|polo/i, hsnCode: "6109", gstRate: 5 },
];

const AVAILABILITY_OPTIONS = [
  { label: "In Stock", value: "in_stock" },
  { label: "Low Stock", value: "low_stock" },
  { label: "Out of Stock", value: "out_of_stock" },
  { label: "Preorder", value: "preorder" },
];

const STATUS_OPTIONS = [
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const buildDefaultSizes = () =>
  STANDARD_SIZE_LABELS.map((label) => ({
    label,
    isAvailable: true,
    stock: "0",
  }));

const computeSizeStockTotal = (sizes = []) =>
  sizes.reduce((total, entry) => {
    if (!entry || !entry.isAvailable) {
      return total;
    }
    const numeric = Number(entry.stock ?? 0);
    return Number.isFinite(numeric) ? total + Math.max(numeric, 0) : total;
  }, 0);

const defaultForm = {
  name: "",
  sku: "",
  description: "",
  category: "",
  brand: "",
  status: "published",
  availabilityStatus: "in_stock",
  price: "",
  originalPrice: "",
  discountPercentage: "",
  saveAmount: "",
  stock: "",
  lowStockThreshold: "",
  thumbnail: "",
  gallery: [],
  keyFeatures: [""],
  categoryPriority: "",
  showSizes: false,
  sizes: buildDefaultSizes(),
  hsnCode: "",
  gstRate: "",
  isFeatured: false,
};

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const SellerProductForm = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  onSuccess,
}) => {
  const [formState, setFormState] = useState(() => ({
    ...defaultForm,
    ...(initialValues || {}),
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState({
    thumbnail: false,
    gallery: false,
  });
  const [hasManualHsn, setHasManualHsn] = useState(
    Boolean(initialValues?.hsnCode)
  );
  const [hasManualGst, setHasManualGst] = useState(
    Boolean(initialValues?.gstRate)
  );

  useEffect(() => {
    if (!initialValues) {
      return;
    }
    setFormState({
      ...defaultForm,
      ...initialValues,
      sizes: Array.isArray(initialValues.sizes)
        ? initialValues.sizes
        : buildDefaultSizes(),
    });
    setHasManualHsn(Boolean(initialValues.hsnCode));
    setHasManualGst(Boolean(initialValues.gstRate));
  }, [initialValues]);

  const sizeStockTotal = useMemo(
    () => computeSizeStockTotal(formState.sizes),
    [formState.sizes]
  );

  useEffect(() => {
    if (!formState.showSizes) {
      return;
    }
    setFormState((prev) => {
      const nextTotal = computeSizeStockTotal(prev.sizes).toString();
      if (prev.stock === nextTotal) {
        return prev;
      }
      return { ...prev, stock: nextTotal };
    });
  }, [formState.showSizes, sizeStockTotal]);

  const updatePricingDerivedFields = (nextState) => {
    const priceValue = Number(nextState.price);
    const originalValue = Number(nextState.originalPrice);

    if (
      Number.isFinite(priceValue) &&
      Number.isFinite(originalValue) &&
      originalValue > 0 &&
      originalValue >= priceValue
    ) {
      const save = originalValue - priceValue;
      nextState.discountPercentage = Math.round(
        (save / originalValue) * 100
      ).toString();
      nextState.saveAmount = save.toFixed(2);
    } else {
      nextState.discountPercentage = "";
      nextState.saveAmount = "";
    }

    return nextState;
  };

  const maybeApplyTaxPreset = (value, nextState, prevState) => {
    if (!value) {
      return nextState;
    }

    const preset = PRODUCT_TAX_PRESETS.find((entry) =>
      entry.matcher.test(value)
    );
    if (!preset) {
      return nextState;
    }

    if (!hasManualHsn && !prevState.hsnCode) {
      nextState.hsnCode = preset.hsnCode.toString();
    }
    if (!hasManualGst && !prevState.gstRate) {
      nextState.gstRate = preset.gstRate.toString();
    }

    return nextState;
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormState((prev) => {
      let nextState = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "showSizes") {
        if (checked) {
          nextState.stock = computeSizeStockTotal(prev.sizes).toString();
        }
        return nextState;
      }

      if (name === "price" || name === "originalPrice") {
        nextState = updatePricingDerivedFields(nextState);
      }

      if (name === "name") {
        nextState = maybeApplyTaxPreset(value, nextState, prev);
      }

      return nextState;
    });
  };

  const handleTaxFieldChange = (event) => {
    const { name, value } = event.target;

    if (name === "hsnCode") {
      setHasManualHsn(Boolean(value.trim()));
    }
    if (name === "gstRate") {
      setHasManualGst(Boolean(value.trim()));
    }

    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (index, value) => {
    setFormState((prev) => {
      const features = [...prev.keyFeatures];
      features[index] = value;
      return { ...prev, keyFeatures: features };
    });
  };

  const addFeature = () => {
    setFormState((prev) => ({
      ...prev,
      keyFeatures: [...prev.keyFeatures, ""],
    }));
  };

  const removeFeature = (index) => {
    setFormState((prev) => ({
      ...prev,
      keyFeatures: prev.keyFeatures.filter((_, idx) => idx !== index),
    }));
  };

  const handleSizeAvailabilityToggle = (index, isAvailable) => {
    setFormState((prev) => ({
      ...prev,
      sizes: prev.sizes.map((entry, idx) =>
        idx === index ? { ...entry, isAvailable } : entry
      ),
    }));
  };

  const handleSizeStockChange = (index, stockValue) => {
    setFormState((prev) => ({
      ...prev,
      sizes: prev.sizes.map((entry, idx) =>
        idx === index ? { ...entry, stock: stockValue } : entry
      ),
    }));
  };

  const resetSizes = () => {
    setFormState((prev) => ({ ...prev, sizes: buildDefaultSizes() }));
  };

  const handleThumbnailChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Thumbnail must be an image file");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Thumbnail must be under 2MB");
      event.target.value = "";
      return;
    }

    setUploading((prev) => ({ ...prev, thumbnail: true }));
    try {
      const dataUrl = await readFileAsDataURL(file);
      setFormState((prev) => ({ ...prev, thumbnail: dataUrl }));
      setError("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load thumbnail");
    } finally {
      setUploading((prev) => ({ ...prev, thumbnail: false }));
      event.target.value = "";
    }
  };

  const handleGalleryChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (files.some((file) => !file.type.startsWith("image/"))) {
      toast.error("All gallery files must be images");
      event.target.value = "";
      return;
    }

    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
      toast.error("Each gallery image must be under 2MB");
      event.target.value = "";
      return;
    }

    setUploading((prev) => ({ ...prev, gallery: true }));
    try {
      const images = await Promise.all(files.map(readFileAsDataURL));
      setFormState((prev) => ({
        ...prev,
        gallery: [...prev.gallery, ...images].slice(0, 8),
      }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load gallery images");
    } finally {
      setUploading((prev) => ({ ...prev, gallery: false }));
      event.target.value = "";
    }
  };

  const removeGalleryImage = (index) => {
    setFormState((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, idx) => idx !== index),
    }));
  };

  const validateForm = () => {
    if (!formState.name.trim()) {
      return "Product name is required";
    }
    if (!formState.sku.trim()) {
      return "SKU is required";
    }
    if (!formState.category.trim()) {
      return "Category is required";
    }
    if (!formState.price || Number(formState.price) <= 0) {
      return "Price must be greater than zero";
    }
    if (!formState.originalPrice || Number(formState.originalPrice) <= 0) {
      return "Original price must be greater than zero";
    }
    if (!formState.thumbnail) {
      return "Thumbnail is required";
    }

    if (formState.showSizes) {
      const hasStock = formState.sizes.some((entry) => {
        if (!entry.isAvailable) {
          return false;
        }
        return Number(entry.stock) > 0;
      });

      if (!hasStock) {
        return "Please set stock for at least one available size";
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);

    const sizeTotal = formState.showSizes
      ? computeSizeStockTotal(formState.sizes)
      : Number(formState.stock || 0);

    const payload = {
      name: formState.name.trim(),
      sku: formState.sku.trim(),
      description: formState.description.trim(),
      category: formState.category.trim(),
      brand: formState.brand.trim(),
      price: Number(formState.price),
      originalPrice: Number(formState.originalPrice),
      stock: sizeTotal,
      availabilityStatus: formState.availabilityStatus,
      status: formState.status,
      thumbnail: formState.thumbnail,
      gallery: formState.gallery,
      keyFeatures: formState.keyFeatures.filter((feature) => feature.trim()),
      lowStockThreshold: Number(formState.lowStockThreshold || 0),
      categoryPriority: formState.categoryPriority.trim(),
      showSizes: Boolean(formState.showSizes),
      sizes: formState.showSizes
        ? formState.sizes.map((entry) => ({
            ...entry,
            stock: Number(entry.stock || 0),
          }))
        : [],
      hsnCode: formState.hsnCode.trim(),
      gstRate: formState.gstRate ? Number(formState.gstRate) : undefined,
      isFeatured: Boolean(formState.isFeatured),
    };

    if (formState.discountPercentage) {
      payload.discountPercentage = Number(formState.discountPercentage);
    }

    if (formState.saveAmount) {
      payload.saveAmount = Number(formState.saveAmount);
    }

    try {
      await onSubmit(payload, formState);
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      if (mode === "create") {
        setFormState(defaultForm);
        setHasManualGst(false);
        setHasManualHsn(false);
      }
    } catch (err) {
      const message = err?.message || "Failed to save product";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[2fr_1fr] xl:gap-8"
        >
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Product Name
                <input
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  placeholder="Premium Polo T-Shirt"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                SKU
                <input
                  name="sku"
                  value={formState.sku}
                  onChange={handleInputChange}
                  placeholder="SKU-001"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Category
                <input
                  name="category"
                  value={formState.category}
                  onChange={handleInputChange}
                  placeholder="Apparel"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Brand
                <input
                  name="brand"
                  value={formState.brand}
                  onChange={handleInputChange}
                  placeholder="p2pdeal"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Price (₹)
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price}
                  onChange={handleInputChange}
                  placeholder="599"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Original Price (₹)
                <input
                  name="originalPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.originalPrice}
                  onChange={handleInputChange}
                  placeholder="799"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Discount (%)
                <input
                  name="discountPercentage"
                  type="number"
                  min="0"
                  step="1"
                  value={formState.discountPercentage}
                  onChange={handleInputChange}
                  placeholder="Auto"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                You Save (₹)
                <input
                  name="saveAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.saveAmount}
                  onChange={handleInputChange}
                  placeholder="Auto"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Stock
                <input
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={formState.stock}
                  onChange={handleInputChange}
                  disabled={formState.showSizes}
                  readOnly={formState.showSizes}
                  title={
                    formState.showSizes
                      ? "Auto-calculated from size quantities"
                      : undefined
                  }
                  className={`rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                    formState.showSizes
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                      : "border-slate-200"
                  }`}
                  placeholder={
                    formState.showSizes
                      ? `Total from sizes: ${sizeStockTotal}`
                      : "40"
                  }
                />
                {formState.showSizes && (
                  <span className="text-[11px] text-slate-500">
                    Total from size quantities: {sizeStockTotal}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Status
                <select
                  name="status"
                  value={formState.status}
                  onChange={handleInputChange}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Stock Status
                <select
                  name="availabilityStatus"
                  value={formState.availabilityStatus}
                  onChange={handleInputChange}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                >
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Category Priority
                <input
                  name="categoryPriority"
                  value={formState.categoryPriority}
                  onChange={handleInputChange}
                  placeholder="P1"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Low Stock Threshold
                <input
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  step="1"
                  value={formState.lowStockThreshold}
                  onChange={handleInputChange}
                  placeholder="10"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Featured Product
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-600">
                    Highlight in storefront collections
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={Boolean(formState.isFeatured)}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-600">
                      {formState.isFeatured ? "Yes" : "No"}
                    </span>
                  </span>
                </div>
              </label>
            </section>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Description
              <textarea
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Add a short product description"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </label>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Size Availability
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Toggle sizes to manage per-size stock.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600">
                  <input
                    type="checkbox"
                    name="showSizes"
                    checked={Boolean(formState.showSizes)}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {formState.showSizes
                    ? "Shown on product page"
                    : "Hidden on product page"}
                </label>
              </div>

              {formState.showSizes ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-600">
                      Total size stock: {sizeStockTotal}
                    </span>
                    <button
                      type="button"
                      onClick={resetSizes}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600"
                    >
                      Reset sizes
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {formState.sizes.map((size, index) => {
                      const isActive = Boolean(size.isAvailable);
                      return (
                        <div
                          key={`${size.label}-${index}`}
                          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleSizeAvailabilityToggle(index, !isActive)
                              }
                              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                                isActive
                                  ? "border-blue-600 bg-blue-50 text-blue-600 hover:border-blue-700 hover:bg-blue-100"
                                  : "border-rose-200 bg-rose-50 text-rose-500 hover:border-rose-300 hover:bg-rose-100"
                              }`}
                            >
                              <span>{size.label}</span>
                              {!isActive && (
                                <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold uppercase text-rose-500 shadow-sm">
                                  Blocked
                                </span>
                              )}
                            </button>
                            <input
                              type="tel"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min="0"
                              value={isActive ? size.stock : ""}
                              onFocus={(event) => event.target.select()}
                              onChange={(event) =>
                                handleSizeStockChange(index, event.target.value)
                              }
                              disabled={!isActive}
                              placeholder="0"
                              className={`w-24 rounded-lg border px-2 py-1 text-xs font-semibold focus:border-blue-400 focus:outline-none ${
                                isActive
                                  ? "border-slate-200 bg-white text-slate-700"
                                  : "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                              }`}
                              aria-label={`${size.label} stock quantity`}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {isActive
                              ? "Adjust units for this size when available."
                              : "Blocked sizes stay hidden."}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tip: Total stock equals the sum of enabled size quantities.
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
                  Enable the toggle to manage per-size availability for this
                  listing.
                </p>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Thumbnail
                </span>
                <p className="text-xs text-slate-500">
                  Upload a primary image (max 2MB).
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
                      {uploading.thumbnail ? (
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
                    onChange={handleThumbnailChange}
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
                  Upload multiple images (under 2MB each).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {formState.gallery.map((image, index) => (
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
                      onClick={() => removeGalleryImage(index)}
                      className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                <UploadCloud size={14} />
                {uploading.gallery ? "Uploading..." : "Add Gallery Images"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryChange}
                  className="hidden"
                />
              </label>
            </section>

            <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Key Features
              </span>
              <div className="space-y-2">
                {formState.keyFeatures.map((feature, index) => (
                  <div
                    key={`feature-${index}`}
                    className="flex gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <input
                      value={feature}
                      onChange={(event) =>
                        handleFeatureChange(index, event.target.value)
                      }
                      placeholder="E.g. Premium breathable fabric"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:border-rose-200 hover:text-rose-500"
                      disabled={formState.keyFeatures.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFeature}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  <Plus size={14} /> Add Feature
                </button>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                HSN Code
                <input
                  name="hsnCode"
                  value={formState.hsnCode}
                  onChange={handleTaxFieldChange}
                  placeholder="6109"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500">
                  Auto-suggested from product name; edit if required.
                </span>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                GST Rate (%)
                <input
                  name="gstRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formState.gstRate}
                  onChange={handleTaxFieldChange}
                  placeholder="18"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500">
                  Leave blank to auto-fill from presets.
                </span>
              </label>
            </section>

            {(error || !error) && error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : mode === "edit" ? (
                  "Save Changes"
                ) : (
                  "Create Product"
                )}
              </button>
            </div>
          </div>

          <aside className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Summary</h2>
              <p className="mt-1 text-xs text-slate-500">
                Double-check pricing, inventory, and tax information before
                saving.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt>Name</dt>
                  <dd className="font-medium text-slate-900">
                    {formState.name || "-"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>SKU</dt>
                  <dd className="font-medium text-slate-900">
                    {formState.sku || "-"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Price</dt>
                  <dd className="font-medium text-emerald-600">
                    ₹{Number(formState.price || 0).toLocaleString("en-IN")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Stock</dt>
                  <dd className="font-medium text-slate-900">
                    {formState.showSizes
                      ? sizeStockTotal
                      : formState.stock || 0}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>HSN</dt>
                  <dd className="font-medium text-slate-900">
                    {formState.hsnCode || "-"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>GST</dt>
                  <dd className="font-medium text-slate-900">
                    {formState.gstRate || "-"}%
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </form>
      </div>
    </motion.div>
  );
};

SellerProductForm.propTypes = {
  mode: PropTypes.oneOf(["create", "edit"]),
  initialValues: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  onSuccess: PropTypes.func,
};

SellerProductForm.defaultProps = {
  mode: "create",
  initialValues: null,
  onCancel: () => {},
  onSuccess: () => {},
};

export const buildDefaultSellerProductForm = () => ({ ...defaultForm });

export default SellerProductForm;

import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { AnimatePresence, motion } from "framer-motion";
import { X, UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react";

const STANDARD_SIZE_LABELS = ["S", "M", "L", "XL", "XXL"];

const buildDefaultSizes = () =>
  STANDARD_SIZE_LABELS.map((label) => ({
    label,
    isAvailable: true,
    stock: 0,
  }));

const normalizeCategoryPriority = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  const raw = value.toString().trim().toUpperCase();
  if (!raw) {
    return "";
  }

  if (/^P\d{1,2}$/.test(raw)) {
    return raw;
  }

  const numeric = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return `P${numeric}`;
  }

  return "";
};

const normalizeSizes = (value) => {
  if (!Array.isArray(value) || !value.length) {
    return buildDefaultSizes();
  }

  const seen = new Set();
  const normalized = value
    .map((entry) => {
      const label = entry?.label?.toString().trim().toUpperCase();
      if (!label || seen.has(label)) {
        return null;
      }
      seen.add(label);
      return {
        label,
        isAvailable: Boolean(entry?.isAvailable ?? true),
        stock: Math.max(Number(entry?.stock ?? 0), 0),
      };
    })
    .filter(Boolean);

  STANDARD_SIZE_LABELS.forEach((label) => {
    if (!seen.has(label)) {
      normalized.push({ label, isAvailable: true, stock: 0 });
    }
  });

  return normalized.length ? normalized : buildDefaultSizes();
};

const computeSizeStockTotal = (sizes) => {
  const list = Array.isArray(sizes) ? sizes : [];
  return list.reduce((total, entry) => {
    if (!entry || !entry.isAvailable) {
      return total;
    }
    const numeric = Number(entry.stock ?? 0);
    if (!Number.isFinite(numeric)) {
      return total;
    }
    return total + Math.max(numeric, 0);
  }, 0);
};

const DEFAULT_FORM = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  categoryPriority: "",
  price: "",
  originalPrice: "",
  discountPercentage: "",
  saveAmount: "",
  stock: "",
  status: "published",
  availabilityStatus: "in_stock",
  thumbnail: "",
  description: "",
  gallery: [],
  isFeatured: false,
  keyFeatures: [""],
  sizes: buildDefaultSizes(),
  showSizes: false,
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
  const [draggingFeatureIndex, setDraggingFeatureIndex] = useState(null);
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
        sizes: normalizeSizes(normalizedInitial.sizes),
        showSizes: Boolean(normalizedInitial.showSizes),
        categoryPriority: normalizeCategoryPriority(
          normalizedInitial.categoryPriority
        ),
      });
      setLocalError("");
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const LOCKED_AVAILABILITY_STATUSES = ["out_of_stock", "preorder"];
  const isStockLocked = LOCKED_AVAILABILITY_STATUSES.includes(
    formState.availabilityStatus
  );

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "availabilityStatus") {
        if (LOCKED_AVAILABILITY_STATUSES.includes(value)) {
          next.stock = "0";
        } else {
          const totalStock = computeSizeStockTotal(normalizeSizes(prev.sizes));
          next.stock = totalStock.toString();
        }
      }

      return next;
    });
  };

  const handleToggleChange = (field) => (event) => {
    const { checked } = event.target;
    setFormState((prev) => {
      if (field === "showSizes") {
        const totalStock = computeSizeStockTotal(normalizeSizes(prev.sizes));
        return {
          ...prev,
          [field]: checked,
          stock:
            checked &&
            !LOCKED_AVAILABILITY_STATUSES.includes(prev.availabilityStatus)
              ? totalStock.toString()
              : prev.stock,
        };
      }

      return { ...prev, [field]: checked };
    });
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

  const normalizedSizes = useMemo(
    () => normalizeSizes(formState.sizes),
    [formState.sizes]
  );

  const sizeStockTotal = useMemo(
    () => computeSizeStockTotal(normalizedSizes),
    [normalizedSizes]
  );

  const handleToggleSizeAvailability = (label) => {
    setFormState((prev) => {
      const updated = normalizeSizes(prev.sizes).map((size) =>
        size.label === label
          ? { ...size, isAvailable: !size.isAvailable }
          : size
      );
      const totalStock = computeSizeStockTotal(updated);
      return {
        ...prev,
        sizes: updated,
        stock: LOCKED_AVAILABILITY_STATUSES.includes(prev.availabilityStatus)
          ? prev.stock
          : totalStock.toString(),
      };
    });
  };

  const handleResetSizes = () => {
    setFormState((prev) => {
      const defaults = buildDefaultSizes();
      const totalStock = computeSizeStockTotal(defaults);
      return {
        ...prev,
        sizes: defaults,
        stock: LOCKED_AVAILABILITY_STATUSES.includes(prev.availabilityStatus)
          ? prev.stock
          : totalStock.toString(),
      };
    });
  };

  const handleSizeStockChange = (label) => (event) => {
    const rawValue = event.target.value ?? "";
    const digitsOnly = rawValue.toString().replace(/[^0-9]/g, "");
    const numericValue = Math.max(Number(digitsOnly || 0), 0);
    setFormState((prev) => {
      const updated = normalizeSizes(prev.sizes).map((size) =>
        size.label === label ? { ...size, stock: numericValue } : size
      );
      const totalStock = computeSizeStockTotal(updated);
      return {
        ...prev,
        sizes: updated,
        stock: LOCKED_AVAILABILITY_STATUSES.includes(prev.availabilityStatus)
          ? prev.stock
          : totalStock.toString(),
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setLocalError("");

    if (!formState.name.trim()) {
      setLocalError("Product name is required");
      return;
    }

    if (!formState.category.trim()) {
      setLocalError("Category is required");
      return;
    }

    if (!formState.categoryPriority.trim()) {
      setLocalError("Set a category priority (e.g. P1, P2)");
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

    const normalizedFormSizes = normalizeSizes(formState.sizes);

    if (
      formState.showSizes &&
      !normalizedFormSizes.some((size) => size.isAvailable)
    ) {
      setLocalError(
        "Enable at least one size or turn off the size selector before saving"
      );
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
      stock: Number(
        ["out_of_stock", "preorder"].includes(formState.availabilityStatus)
          ? 0
          : formState.stock || 0
      ),
      gallery: Array.isArray(formState.gallery) ? formState.gallery : [],
      isFeatured: Boolean(formState.isFeatured),
      keyFeatures,
      sizes: normalizedFormSizes,
      showSizes: Boolean(formState.showSizes),
      category: formState.category,
      categoryPriority: normalizeCategoryPriority(formState.categoryPriority),
      brand: formState.brand,
    });
  };

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
                      <div
                        key={index}
                        className="flex gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1"
                        draggable
                        onDragStart={() => setDraggingFeatureIndex(index)}
                        onDragOver={(event) => {
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          setFormState((prev) => {
                            const features = Array.isArray(prev.keyFeatures)
                              ? [...prev.keyFeatures]
                              : [];
                            const fromIndex = draggingFeatureIndex;
                            const toIndex = index;
                            if (
                              fromIndex == null ||
                              fromIndex === toIndex ||
                              fromIndex < 0 ||
                              toIndex < 0 ||
                              fromIndex >= features.length ||
                              toIndex >= features.length
                            ) {
                              return prev;
                            }
                            const [moved] = features.splice(fromIndex, 1);
                            features.splice(toIndex, 0, moved);
                            return {
                              ...prev,
                              keyFeatures: features.length ? features : [""],
                            };
                          });
                          setDraggingFeatureIndex(null);
                        }}
                      >
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
                    placeholder="Menswear"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  Category Priority
                  <input
                    type="text"
                    value={formState.categoryPriority}
                    onChange={handleChange("categoryPriority")}
                    placeholder="P1"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500">
                    Use P1, P2, P3… Higher priority appears first in listings.
                  </span>
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
                    readOnly={formState.showSizes && !isStockLocked}
                    title={
                      formState.showSizes && !isStockLocked
                        ? "Auto-calculated from per-size stock"
                        : undefined
                    }
                    className={`rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                      isStockLocked || formState.showSizes
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                        : "border-slate-200"
                    }`}
                    placeholder={
                      isStockLocked
                        ? "Managed automatically"
                        : formState.showSizes
                        ? "Calculated from sizes"
                        : "40"
                    }
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
                  {formState.showSizes && !isStockLocked && (
                    <span className="text-[11px] text-slate-500">
                      Total from size quantities: {sizeStockTotal}
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
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Size Availability
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Toggle which sizes are purchasable and whether the
                      selector appears on the product page.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={Boolean(formState.showSizes)}
                      onChange={handleToggleChange("showSizes")}
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
                        onClick={handleResetSizes}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600"
                      >
                        Reset sizes
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {normalizedSizes.map((size) => {
                        const isActive = Boolean(size.isAvailable);
                        const stockValue = Number(size.stock ?? 0);
                        return (
                          <div
                            key={size.label}
                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleSizeAvailability(size.label)
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
                                value={
                                  isActive && !isStockLocked
                                    ? stockValue > 0
                                      ? stockValue
                                      : ""
                                    : ""
                                }
                                onFocus={(event) => event.target.select()}
                                onChange={handleSizeStockChange(size.label)}
                                disabled={!isActive || isStockLocked}
                                placeholder="0"
                                className={`w-24 rounded-lg border px-2 py-1 text-xs font-semibold focus:border-blue-400 focus:outline-none ${
                                  isActive && !isStockLocked
                                    ? "border-slate-200 bg-white text-slate-700"
                                    : "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                                }`}
                                aria-label={`${size.label} stock quantity`}
                              />
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {isActive
                                ? "Adjust units for this size when available."
                                : "Blocked sizes stay hidden for shoppers."}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Tip: Total stock equals the sum of enabled size
                      quantities.
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

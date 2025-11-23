import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchAdminProductsThunk,
  createAdminProductThunk,
} from "../store/thunks/adminProductsThunks";

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

const resolveTaxPreset = (name = "") => {
  const normalized = name.toString().trim();
  if (!normalized) {
    return null;
  }

  return (
    PRODUCT_TAX_PRESETS.find((preset) => preset.matcher.test(normalized)) ||
    null
  );
};

const normalizeCategoryPriority = (value) => {
  if (value === undefined || value === null) {
    return "P5";
  }

  const raw = value.toString().trim().toUpperCase();
  if (/^P\d{1,2}$/.test(raw)) {
    return raw;
  }

  const numeric = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return `P${numeric}`;
  }

  return "P5";
};

const parsePriorityValue = (value) => {
  const normalized = normalizeCategoryPriority(value);
  const numeric = parseInt(normalized.slice(1), 10);
  return Number.isNaN(numeric) ? Number.POSITIVE_INFINITY : numeric;
};

const buildDefaultSizes = () =>
  STANDARD_SIZE_LABELS.map((label) => ({
    label,
    isAvailable: true,
    stock: 0,
  }));

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

const defaultFormState = {
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
  isFeatured: false,
  keyFeatures: [""],
  sizes: buildDefaultSizes(),
  showSizes: true,
  categoryPriority: "",
  hsnCode: "",
  gstRate: "",
};

const FORM_STORAGE_KEY = "adminAddProductFormState";

const loadPersistedFormState = () => {
  if (typeof window === "undefined") {
    return defaultFormState;
  }

  try {
    const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) {
      return defaultFormState;
    }

    const parsed = JSON.parse(raw);
    const { rating, reviews, hsnCode, gstRate, ...rest } = parsed || {};
    const keyFeatures =
      Array.isArray(parsed.keyFeatures) && parsed.keyFeatures.length
        ? [...parsed.keyFeatures]
        : [""];
    const gallery = Array.isArray(parsed.gallery) ? [...parsed.gallery] : [];

    return {
      ...defaultFormState,
      ...rest,
      keyFeatures,
      gallery,
      isFeatured: Boolean(parsed.isFeatured),
      showSizes:
        typeof parsed.showSizes === "boolean"
          ? parsed.showSizes
          : defaultFormState.showSizes,
      sizes: normalizeSizes(parsed.sizes),
      categoryPriority: (() => {
        const stored = parsed.categoryPriority;
        if (typeof stored === "string" && stored.trim()) {
          return normalizeCategoryPriority(stored);
        }
        return defaultFormState.categoryPriority;
      })(),
      hsnCode:
        typeof hsnCode === "string"
          ? hsnCode
          : hsnCode != null
          ? String(hsnCode)
          : defaultFormState.hsnCode,
      gstRate:
        gstRate != null && gstRate !== ""
          ? String(gstRate)
          : defaultFormState.gstRate,
    };
  } catch (error) {
    console.warn("Failed to restore saved admin add product form", error);
    return defaultFormState;
  }
};

const AdminAddProductPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items } = useAppSelector((state) => state.adminProducts);
  const [formState, setFormState] = useState(() => loadPersistedFormState());
  const [hasManualCategoryPriority, setHasManualCategoryPriority] =
    useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasManualHsn, setHasManualHsn] = useState(false);
  const [hasManualGst, setHasManualGst] = useState(false);

  const handleCancel = () => {
    setFormState(defaultFormState);
    setHasManualCategoryPriority(false);
    setHasManualHsn(false);
    setHasManualGst(false);
    setFormErrors({});
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(FORM_STORAGE_KEY);
    }
    navigate("/admin/products");
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const { rating, reviews, ...rest } = formState;
      const normalizedSizesForStorage = normalizeSizes(formState.sizes);
      const payload = {
        ...rest,
        keyFeatures:
          Array.isArray(formState.keyFeatures) && formState.keyFeatures.length
            ? formState.keyFeatures
            : [""],
        gallery: Array.isArray(formState.gallery) ? formState.gallery : [],
        sizes: normalizedSizesForStorage,
        showSizes: Boolean(formState.showSizes),
        categoryPriority: (() => {
          const raw = formState.categoryPriority;
          if (typeof raw === "string" && raw.trim()) {
            return normalizeCategoryPriority(raw);
          }
          return "";
        })(),
      };

      window.localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist admin add product form", error);
    }
  }, [formState]);

  useEffect(() => {
    if (!items.length) {
      dispatch(fetchAdminProductsThunk({ limit: 100 }));
    }
  }, [dispatch, items.length]);

  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Set();
    items.forEach((product) => {
      if (product.category) {
        uniqueCategories.add(product.category);
      }
    });
    return Array.from(uniqueCategories);
  }, [items]);

  const categoryPriorityLookup = useMemo(() => {
    const map = new Map();
    items.forEach((product) => {
      const category = product?.category?.toString().trim();
      if (!category) {
        return;
      }

      const label = normalizeCategoryPriority(product?.categoryPriority);
      const numeric = parsePriorityValue(label);
      const existing = map.get(category);

      if (!existing || numeric < existing.numeric) {
        map.set(category, { label, numeric });
      }
    });

    return map;
  }, [items]);

  const brandOptions = useMemo(() => {
    const uniqueBrands = new Set();
    items.forEach((product) => {
      if (product.brand) {
        uniqueBrands.add(product.brand);
      }
    });
    return Array.from(uniqueBrands);
  }, [items]);

  const normalizedFormSizes = useMemo(
    () => normalizeSizes(formState.sizes),
    [formState.sizes]
  );

  const sizeStockTotal = useMemo(
    () => computeSizeStockTotal(normalizedFormSizes),
    [normalizedFormSizes]
  );

  const LOCKED_AVAILABILITY_STATUSES = ["out_of_stock", "preorder"];
  const isStockLockedForStatus = (status) =>
    LOCKED_AVAILABILITY_STATUSES.includes(status);

  const handleChange = (field) => (event) => {
    const value = event.target.value;

    if (field === "categoryPriority") {
      setHasManualCategoryPriority(true);
    } else if (field === "category") {
      setHasManualCategoryPriority(false);
    }

    setFormState((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "availabilityStatus") {
        if (isStockLockedForStatus(value)) {
          next.stock = "0";
        } else {
          const totalStock = computeSizeStockTotal(normalizeSizes(prev.sizes));
          next.stock = totalStock.toString();
        }
      }

      if (field === "category") {
        const normalizedCategory = value?.toString().trim();
        if (!normalizedCategory) {
          next.categoryPriority = defaultFormState.categoryPriority;
        } else {
          const match = categoryPriorityLookup.get(normalizedCategory);
          next.categoryPriority = match
            ? match.label
            : defaultFormState.categoryPriority;
        }
      }

      if (field === "name") {
        const preset = resolveTaxPreset(value);
        if (preset) {
          if (!hasManualHsn || !prev.hsnCode) {
            next.hsnCode = preset.hsnCode;
            setHasManualHsn(false);
          }
          if (!hasManualGst || !prev.gstRate) {
            next.gstRate = preset.gstRate.toString();
            setHasManualGst(false);
          }
        }
      }

      return next;
    });
  };

  const handleTaxFieldChange = (field) => (event) => {
    const value = event.target.value;
    if (field === "hsnCode") {
      setHasManualHsn(true);
    }
    if (field === "gstRate") {
      setHasManualGst(true);
    }
    setFormState((prev) => ({ ...prev, [field]: value }));
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
            checked && !isStockLockedForStatus(prev.availabilityStatus)
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

  const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB

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
      toast.error("Please upload an image file");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be smaller than 3MB");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      setFormState((prev) => ({ ...prev, thumbnail: dataUrl }));
      toast.success("Thumbnail added");
    } catch (error) {
      toast.error("Failed to load image");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const hasNonImage = files.some((file) => !file.type.startsWith("image/"));
    if (hasNonImage) {
      toast.error("All files must be images");
      event.target.value = "";
      return;
    }

    const oversize = files.find((file) => file.size > MAX_IMAGE_SIZE);
    if (oversize) {
      toast.error("Each image must be under 3MB");
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
      toast.success(
        `Added ${images.length} image${images.length > 1 ? "s" : ""}`
      );
    } catch (error) {
      toast.error("Failed to load gallery images");
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

  const handleToggleSizeAvailability = (label) => {
    setFormState((prev) => {
      const normalized = normalizeSizes(prev.sizes);
      const updated = normalized.map((size) =>
        size.label === label
          ? { ...size, isAvailable: !size.isAvailable }
          : size
      );
      const totalStock = computeSizeStockTotal(updated);
      return {
        ...prev,
        sizes: updated,
        stock: isStockLockedForStatus(prev.availabilityStatus)
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
      const normalized = normalizeSizes(prev.sizes);
      const updated = normalized.map((size) =>
        size.label === label
          ? {
              ...size,
              stock: numericValue,
            }
          : size
      );
      const totalStock = computeSizeStockTotal(updated);
      return {
        ...prev,
        sizes: updated,
        stock: isStockLockedForStatus(prev.availabilityStatus)
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
        stock: isStockLockedForStatus(prev.availabilityStatus)
          ? prev.stock
          : totalStock.toString() || "0",
      };
    });
  };

  useEffect(() => {
    const selectedCategory = formState.category?.toString().trim();
    if (!selectedCategory || hasManualCategoryPriority) {
      return;
    }

    const match = categoryPriorityLookup.get(selectedCategory);
    if (!match) {
      return;
    }

    setFormState((prev) => {
      const currentCategory = prev.category?.toString().trim();
      if (currentCategory !== selectedCategory) {
        return prev;
      }

      const currentPriority = normalizeCategoryPriority(prev.categoryPriority);

      if (currentPriority === match.label) {
        return prev;
      }

      return { ...prev, categoryPriority: match.label };
    });
  }, [categoryPriorityLookup, formState.category, hasManualCategoryPriority]);

  const handleKeyFeatureChange = (index, value) => {
    setFormState((prev) => {
      const nextFeatures = Array.isArray(prev.keyFeatures)
        ? [...prev.keyFeatures]
        : [""];
      nextFeatures[index] = value;
      return { ...prev, keyFeatures: nextFeatures };
    });
  };

  const handleAddKeyFeature = () => {
    setFormState((prev) => ({
      ...prev,
      keyFeatures: Array.isArray(prev.keyFeatures)
        ? [...prev.keyFeatures, ""]
        : ["", ""],
    }));
  };

  const handleRemoveKeyFeature = (index) => {
    setFormState((prev) => {
      const nextFeatures = Array.isArray(prev.keyFeatures)
        ? prev.keyFeatures.filter((_, idx) => idx !== index)
        : [];
      return {
        ...prev,
        keyFeatures: nextFeatures.length ? nextFeatures : [""],
      };
    });
  };

  const handleMoveKeyFeature = (fromIndex, toIndex) => {
    setFormState((prev) => {
      const features = Array.isArray(prev.keyFeatures)
        ? [...prev.keyFeatures]
        : [];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= features.length ||
        toIndex >= features.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const [moved] = features.splice(fromIndex, 1);
      features.splice(toIndex, 0, moved);
      return { ...prev, keyFeatures: features.length ? features : [""] };
    });
  };

  const validateForm = () => {
    const errors = {};

    if (!formState.name.trim()) {
      errors.name = "Product name is required";
    }

    if (!formState.description.trim()) {
      errors.description = "Product description is required";
    }

    if (!formState.sku.trim()) {
      errors.sku = "Product ID is required";
    }

    if (!formState.category.trim()) {
      errors.category = "Select a category";
    }

    if (!formState.categoryPriority.trim()) {
      errors.categoryPriority = "Set a priority (e.g. P1, P2)";
    }

    if (!formState.brand.trim()) {
      errors.brand = "Brand is required";
    }

    if (formState.hsnCode && !/^\d{2,}$/i.test(formState.hsnCode.trim())) {
      errors.hsnCode = "HSN code should contain at least 2 digits";
    }

    if (formState.gstRate !== "") {
      const gstNumeric = Number(formState.gstRate);
      if (Number.isNaN(gstNumeric) || gstNumeric < 0 || gstNumeric > 100) {
        errors.gstRate = "GST rate must be between 0 and 100";
      }
    }

    if (!formState.price || Number(formState.price) <= 0) {
      errors.price = "Enter a valid price";
    }

    if (formState.originalPrice) {
      const priceNum = Number(formState.price || 0);
      const originalNum = Number(formState.originalPrice);
      if (Number.isNaN(originalNum) || originalNum <= 0) {
        errors.originalPrice = "Original price must be a positive number";
      } else if (originalNum < priceNum) {
        errors.originalPrice =
          "Original price should be greater than or equal to price";
      }
    }

    const stockLocked = isStockLockedForStatus(formState.availabilityStatus);
    const stockValue = Number(formState.stock);
    const hasStockValue = formState.stock !== "" && !Number.isNaN(stockValue);

    if (!hasStockValue || stockValue < 0) {
      errors.stock = stockLocked
        ? "Stock is managed automatically"
        : "Enter available stock";
    } else if (!stockLocked && stockValue === 0) {
      errors.stock = "Enter available stock";
    }

    if (!formState.thumbnail.trim()) {
      errors.thumbnail = "Upload at least one image";
    }

    if (!Array.isArray(formState.gallery) || formState.gallery.length === 0) {
      errors.gallery = "Add at least one gallery image";
    }

    const keyFeatures = Array.isArray(formState.keyFeatures)
      ? formState.keyFeatures.map((feature) => feature.trim()).filter(Boolean)
      : [];

    if (!keyFeatures.length) {
      errors.keyFeatures = "Add at least one key feature";
    }

    if (formState.showSizes) {
      const enabledSizes = normalizeSizes(formState.sizes).filter(
        (size) => size.isAvailable
      );
      if (!enabledSizes.length) {
        errors.sizes = "Enable at least one size or turn off the size selector";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim(),
      category: formState.category,
      brand: formState.brand,
      status: formState.status,
      availabilityStatus: formState.availabilityStatus,
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
      sku: formState.sku.trim(),
      stock: isStockLockedForStatus(formState.availabilityStatus)
        ? 0
        : Number(formState.stock),
      lowStockThreshold: formState.lowStockThreshold
        ? Number(formState.lowStockThreshold)
        : undefined,
      thumbnail: formState.thumbnail,
      gallery: formState.gallery,
      isFeatured: Boolean(formState.isFeatured),
      keyFeatures: Array.isArray(formState.keyFeatures)
        ? formState.keyFeatures.map((feature) => feature.trim()).filter(Boolean)
        : [],
      sizes: normalizedFormSizes,
      showSizes: Boolean(formState.showSizes),
      categoryPriority: normalizeCategoryPriority(formState.categoryPriority),
    };

    const trimmedHsn = formState.hsnCode?.toString().trim();
    if (trimmedHsn) {
      payload.hsnCode = trimmedHsn;
    }

    if (formState.gstRate !== "") {
      const gstNumeric = Number(formState.gstRate);
      if (!Number.isNaN(gstNumeric)) {
        payload.gstRate = gstNumeric;
      }
    }

    try {
      await dispatch(createAdminProductThunk(payload)).unwrap();
      toast.success("Product added successfully!");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(FORM_STORAGE_KEY);
      }
      navigate("/admin/products");
    } catch (error) {
      const message =
        error?.message || "Failed to create product. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStockLocked = isStockLockedForStatus(formState.availabilityStatus);

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <Sidebar
          active="Products"
          className="hidden md:flex md:w-64 md:flex-none"
          onNavigate={() => setIsSidebarOpen(false)}
        />

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex md:hidden"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="bg-white w-72 max-w-sm h-full shadow-xl"
              >
                <Sidebar
                  active="Products"
                  className="flex w-full"
                  onNavigate={() => setIsSidebarOpen(false)}
                />
              </motion.div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="flex-1 bg-black/30"
                aria-label="Close sidebar"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            activeRange="All Date"
            onSelectRange={() => {}}
            adminName={user?.name || user?.username || "Admin"}
            adminRole={user?.role === "admin" ? "Administrator" : user?.role}
            notifications={{
              pendingOrders: 0,
              shippedOrders: 0,
              deliveredOrders: 0,
            }}
            showRangeSelector={false}
            showNotifications={false}
            onLogout={logout}
          />

          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">
                  Dashboard / Product / Add Product
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Add Product
                </h1>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600"
              >
                <ArrowLeft size={16} />
                Cancel
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]"
            >
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    General Information
                  </h2>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Product ID
                      </label>
                      <input
                        type="text"
                        value={formState.sku}
                        onChange={handleChange("sku")}
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm uppercase tracking-wide focus:border-blue-400 focus:outline-none ${
                          formErrors.sku
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                        placeholder="e.g. PROD-0001"
                      />
                      {formErrors.sku && (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.sku}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={formState.name}
                        onChange={handleChange("name")}
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                          formErrors.name
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                        placeholder="Type product name here..."
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          HSN Code
                        </label>
                        <input
                          type="text"
                          value={formState.hsnCode}
                          onChange={handleTaxFieldChange("hsnCode")}
                          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                            formErrors.hsnCode
                              ? "border-rose-300"
                              : "border-slate-200"
                          }`}
                          placeholder="e.g. 6109"
                        />
                        {formErrors.hsnCode ? (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.hsnCode}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Auto-fills from name when available; editable.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          GST Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formState.gstRate}
                          onChange={handleTaxFieldChange("gstRate")}
                          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                            formErrors.gstRate
                              ? "border-rose-300"
                              : "border-slate-200"
                          }`}
                          placeholder="e.g. 5"
                        />
                        {formErrors.gstRate ? (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.gstRate}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Enter 0-100. Suggested from product type.
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Key Features
                      </label>
                      <div className="mt-2 space-y-2">
                        {(formState.keyFeatures || []).map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={feature}
                              onChange={(event) =>
                                handleKeyFeatureChange(
                                  index,
                                  event.target.value
                                )
                              }
                              placeholder="E.g. Premium breathable fabric"
                              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyFeature(index)}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-2 py-2 text-xs font-medium text-slate-500 hover:border-rose-200 hover:text-rose-500"
                              disabled={
                                (formState.keyFeatures || []).length === 1
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleAddKeyFeature}
                          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          Add Feature
                        </button>
                      </div>
                      {formErrors.keyFeatures && (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.keyFeatures}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Category Priority
                      </label>
                      <input
                        type="text"
                        value={formState.categoryPriority}
                        onChange={handleChange("categoryPriority")}
                        placeholder="P1"
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                          formErrors.categoryPriority
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                      />
                      {formErrors.categoryPriority ? (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.categoryPriority}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Use priorities like P1, P2… Lower number shows first.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Brand
                      </label>
                      <input
                        type="text"
                        list="product-brand-suggestions"
                        value={formState.brand}
                        onChange={handleChange("brand")}
                        placeholder={
                          brandOptions.length
                            ? "Select or type brand..."
                            : "Type brand..."
                        }
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none ${
                          formErrors.brand
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                      />
                      <datalist id="product-brand-suggestions">
                        {brandOptions.map((brand) => (
                          <option key={brand} value={brand} />
                        ))}
                      </datalist>
                      {formErrors.brand && (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.brand}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Description
                      </label>
                      <textarea
                        rows={4}
                        value={formState.description}
                        onChange={handleChange("description")}
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                          formErrors.description
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                        placeholder="Type product description here..."
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.description}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    Media
                  </h2>
                  <div
                    className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center ${
                      formErrors.thumbnail
                        ? "border-rose-300 bg-rose-50/60"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    {formState.thumbnail ? (
                      <div className="relative">
                        <img
                          src={formState.thumbnail}
                          alt="Preview"
                          className="h-40 w-40 rounded-2xl object-cover shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFormState((prev) => ({ ...prev, thumbnail: "" }))
                          }
                          className="absolute -right-3 -top-3 rounded-full bg-white p-2 text-xs font-semibold shadow-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                          {isUploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-blue-500" />
                          )}
                        </div>
                        <p className="mt-4 text-sm text-slate-500">
                          Drag and drop image here, or click add image
                        </p>
                        <label className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                          <UploadCloud size={16} />
                          Add Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailUpload}
                            className="hidden"
                          />
                        </label>
                      </>
                    )}
                    {formErrors.thumbnail && (
                      <p className="mt-3 text-xs text-rose-500">
                        {formErrors.thumbnail}
                      </p>
                    )}
                  </div>
                  <div className="mt-6 w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Gallery Images
                      </h3>
                      <p className="text-xs text-slate-500">
                        Used for product swiper (max 3MB each)
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
                            className="h-32 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(index)}
                            className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                      <UploadCloud size={16} />
                      {isGalleryUploading
                        ? "Uploading..."
                        : "Add Gallery Images"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryUpload}
                        className="hidden"
                      />
                    </label>
                    {formErrors.gallery && (
                      <p className="text-xs text-rose-500">
                        {formErrors.gallery}
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    Pricing
                  </h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.price}
                        onChange={handlePricingChange("price")}
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                          formErrors.price
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                        placeholder="599.00"
                      />
                      {formErrors.price && (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.price}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Original Price (MRP)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.originalPrice}
                        onChange={handlePricingChange("originalPrice")}
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                          formErrors.originalPrice
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                        placeholder="799.00"
                      />
                      {formErrors.originalPrice && (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.originalPrice}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formState.discountPercentage}
                        onChange={handleChange("discountPercentage")}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                        placeholder="Auto"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        You Save (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.saveAmount}
                        onChange={handleChange("saveAmount")}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                        placeholder="Auto"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    Stock Settings
                  </h2>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Available Stock
                      </label>
                      <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
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
                          className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                            formErrors.stock
                              ? "border-rose-300"
                              : "border-slate-200"
                          } ${
                            isStockLocked || formState.showSizes
                              ? "bg-slate-100 text-slate-500"
                              : ""
                          }`}
                          placeholder={
                            isStockLocked
                              ? "Managed automatically"
                              : formState.showSizes
                              ? "Calculated from sizes"
                              : "e.g. 150"
                          }
                        />
                        {isStockLocked && (
                          <span className="text-xs text-slate-500">
                            Stock is locked for the selected status
                          </span>
                        )}
                      </div>
                      {formErrors.stock && (
                        <p className="text-xs text-rose-500">
                          {formErrors.stock}
                        </p>
                      )}
                      {formState.showSizes && !isStockLocked && (
                        <p className="text-xs text-slate-500">
                          Total from size quantities:{" "}
                          <span className="font-semibold text-slate-700">
                            {sizeStockTotal}
                          </span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Low Stock Threshold
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formState.lowStockThreshold}
                        onChange={handleChange("lowStockThreshold")}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                        placeholder="Optional (default 10)"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Size Availability
                      </h2>
                      <p className="text-xs text-slate-500">
                        Configure which standard sizes are in stock and whether
                        to show them on the product page.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(formState.showSizes)}
                        onChange={handleToggleChange("showSizes")}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {formState.showSizes
                        ? "Showing on product page"
                        : "Hidden on product page"}
                    </label>
                  </div>

                  {formState.showSizes ? (
                    <div className="mt-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                        <span className="font-medium">
                          Total available size stock:{" "}
                          <span className="text-slate-900">
                            {sizeStockTotal}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={handleResetSizes}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600"
                        >
                          Reset to defaults
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {normalizedFormSizes.map((size) => {
                          const isActive = Boolean(size.isAvailable);
                          const stockValue = Number(size.stock ?? 0);
                          return (
                            <div
                              key={size.label}
                              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
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
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-500 shadow-sm">
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
                                    isActive
                                      ? stockValue > 0
                                        ? stockValue
                                        : ""
                                      : ""
                                  }
                                  onFocus={(event) => event.target.select()}
                                  onChange={handleSizeStockChange(size.label)}
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
                                  ? "Adjust available units for this size."
                                  : "Blocked sizes are hidden from shoppers."}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Tip: Stock is the sum of all enabled sizes. Disable a
                        size to remove it from the total.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      Enable the toggle to manage per-size availability for this
                      product.
                    </p>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    Category
                  </h2>
                  <div className="mt-4 space-y-3">
                    <label className="text-xs font-medium text-slate-500">
                      Product Category
                    </label>
                    <input
                      type="text"
                      list="product-category-suggestions"
                      value={formState.category}
                      onChange={handleChange("category")}
                      placeholder={
                        categoryOptions.length
                          ? "Select or type category..."
                          : "Type category..."
                      }
                      className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none ${
                        formErrors.category
                          ? "border-rose-300"
                          : "border-slate-200"
                      }`}
                    />
                    <datalist id="product-category-suggestions">
                      {categoryOptions.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                    {formErrors.category && (
                      <p className="text-xs text-rose-500">
                        {formErrors.category}
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    Status
                  </h2>
                  <div className="mt-4 space-y-3">
                    <label className="text-xs font-medium text-slate-500">
                      Product Status
                    </label>
                    <select
                      value={formState.status}
                      onChange={handleChange("status")}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <label className="text-xs font-medium text-slate-500">
                      Stock Status
                    </label>
                    <select
                      value={formState.availabilityStatus}
                      onChange={handleChange("availabilityStatus")}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                    >
                      {availabilityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Featured Product
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(formState.isFeatured)}
                          onChange={handleToggleChange("isFeatured")}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          aria-label="Mark product as featured"
                        />
                        <span className="text-xs text-slate-600">
                          {formState.isFeatured ? "Yes" : "No"}
                        </span>
                      </span>
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => navigate("/admin/products")}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Add Product
                    </button>
                  </div>
                </section>
              </aside>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminAddProductPage;

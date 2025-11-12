import { useEffect, useMemo, useState } from "react";
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
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const availabilityOptions = [
  { label: "In Stock", value: "in_stock" },
  { label: "Low Stock", value: "low_stock" },
  { label: "Out of Stock", value: "out_of_stock" },
  { label: "Preorder", value: "preorder" },
];

const defaultFormState = {
  name: "",
  sku: "",
  description: "",
  category: "",
  brand: "",
  status: "draft",
  availabilityStatus: "in_stock",
  price: "",
  originalPrice: "",
  discountPercentage: "",
  saveAmount: "",
  rating: "",
  reviews: "",
  stock: "",
  lowStockThreshold: "",
  thumbnail: "",
  gallery: [],
  isFeatured: false,
  keyFeatures: [""],
};

const AdminAddProductPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items } = useAppSelector((state) => state.adminProducts);
  const [formState, setFormState] = useState(defaultFormState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const { user, logout } = useAuth();

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

  const brandOptions = useMemo(() => {
    const uniqueBrands = new Set();
    items.forEach((product) => {
      if (product.brand) {
        uniqueBrands.add(product.brand);
      }
    });
    return Array.from(uniqueBrands);
  }, [items]);

  const LOCKED_AVAILABILITY_STATUSES = ["out_of_stock", "preorder"];
  const isStockLockedForStatus = (status) =>
    LOCKED_AVAILABILITY_STATUSES.includes(status);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "availabilityStatus") {
        if (isStockLockedForStatus(value)) {
          next.stock = "0";
        } else if (isStockLockedForStatus(prev.availabilityStatus)) {
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
      toast.error("Please upload an image file");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be smaller than 2MB");
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
      toast.error("Each image must be under 2MB");
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

    if (!formState.brand.trim()) {
      errors.brand = "Brand is required";
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

    if (formState.rating) {
      const ratingNum = Number(formState.rating);
      if (Number.isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        errors.rating = "Rating must be between 0 and 5";
      }
    }

    if (formState.reviews) {
      const reviewsNum = Number(formState.reviews);
      if (Number.isNaN(reviewsNum) || reviewsNum < 0) {
        errors.reviews = "Reviews must be 0 or more";
      }
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
      rating: formState.rating ? Number(formState.rating) : undefined,
      reviews: formState.reviews ? Number(formState.reviews) : undefined,
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
    };

    try {
      await dispatch(createAdminProductThunk(payload)).unwrap();
      toast.success("Product added successfully!");
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <Sidebar active="Products" className="hidden md:flex md:w-64" />

        <div className="flex-1 flex flex-col">
          <Navbar
            onToggleSidebar={() => {}}
            activeRange="All Date"
            onSelectRange={() => {}}
            adminName={user?.name || user?.username || "Admin"}
            adminRole={user?.role === "admin" ? "Administrator" : user?.role}
            notifications={{
              pendingOrders: 0,
              shippedOrders: 0,
              deliveredOrders: 0,
            }}
            onLogout={logout}
          />

          <main className="flex-1 px-4 py-6 md:px-8">
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
                onClick={() => navigate("/admin/products")}
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
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          Rating (0 - 5)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={formState.rating}
                          onChange={handleChange("rating")}
                          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                            formErrors.rating
                              ? "border-rose-300"
                              : "border-slate-200"
                          }`}
                          placeholder="4.5"
                        />
                        {formErrors.rating && (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.rating}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          Reviews Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formState.reviews}
                          onChange={handleChange("reviews")}
                          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                            formErrors.reviews
                              ? "border-rose-300"
                              : "border-slate-200"
                          }`}
                          placeholder="135"
                        />
                        {formErrors.reviews && (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.reviews}
                          </p>
                        )}
                      </div>
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
                        Used for product swiper (max 2MB each)
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
                          className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                            formErrors.stock
                              ? "border-rose-300"
                              : "border-slate-200"
                          } ${
                            isStockLocked ? "bg-slate-100 text-slate-500" : ""
                          }`}
                          placeholder={
                            isStockLocked ? "Managed automatically" : "e.g. 150"
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

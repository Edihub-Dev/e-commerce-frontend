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

const discountTypeOptions = [
  { label: "None", value: "none" },
  { label: "Percentage", value: "percentage" },
  { label: "Flat amount", value: "flat" },
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
  basePrice: "",
  discountType: "none",
  discountValue: "",
  gst: "",
  stock: "",
  lowStockThreshold: "",
  thumbnail: "",
};

const AdminAddProductPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items } = useAppSelector((state) => state.adminProducts);
  const [formState, setFormState] = useState(defaultFormState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be smaller than 2MB");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setFormState((prev) => ({ ...prev, thumbnail: reader.result }));
        toast.success("Image loaded");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to load image");
    } finally {
      setIsUploading(false);
    }
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

    if (!formState.basePrice || Number(formState.basePrice) <= 0) {
      errors.basePrice = "Enter a valid base price";
    }

    if (!formState.stock || Number(formState.stock) < 0) {
      errors.stock = "Enter available stock";
    }

    if (
      formState.discountType !== "none" &&
      (!formState.discountValue || Number(formState.discountValue) < 0)
    ) {
      errors.discountValue = "Enter a valid discount value";
    }

    if (!formState.thumbnail.trim()) {
      errors.thumbnail = "Upload at least one image";
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
      price: Number(formState.basePrice),
      sku: formState.sku.trim(),
      stock: Number(formState.stock),
      lowStockThreshold: formState.lowStockThreshold
        ? Number(formState.lowStockThreshold)
        : undefined,
      discountPercentage:
        formState.discountType === "percentage"
          ? Number(formState.discountValue)
          : undefined,
      costPrice:
        formState.discountType === "flat"
          ? Math.max(
              Number(formState.basePrice) -
                Number(formState.discountValue || 0),
              0
            )
          : undefined,
      metadata: {
        gst: formState.gst,
        discountType: formState.discountType,
      },
      thumbnail: formState.thumbnail,
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
                            onChange={handleImageUpload}
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
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    Pricing
                  </h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Base Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.basePrice}
                        onChange={handleChange("basePrice")}
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                          formErrors.basePrice
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                        placeholder="Type base price here..."
                      />
                      {formErrors.basePrice && (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.basePrice}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Discount Type
                      </label>
                      <select
                        value={formState.discountType}
                        onChange={handleChange("discountType")}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                      >
                        {discountTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Discount Value
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.discountValue}
                        onChange={handleChange("discountValue")}
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                          formErrors.discountValue
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                        placeholder="Type discount value..."
                        disabled={formState.discountType === "none"}
                      />
                      {formErrors.discountValue && (
                        <p className="mt-1 text-xs text-rose-500">
                          {formErrors.discountValue}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        GST Amount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.gst}
                        onChange={handleChange("gst")}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                        placeholder="Type GST amount..."
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    Inventory
                  </h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Available Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formState.stock}
                        onChange={handleChange("stock")}
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${
                          formErrors.stock
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                        placeholder="e.g. 250"
                      />
                      {formErrors.stock && (
                        <p className="mt-1 text-xs text-rose-500">
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
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
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

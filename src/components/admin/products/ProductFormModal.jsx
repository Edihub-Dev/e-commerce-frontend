import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const DEFAULT_FORM = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  price: "",
  stock: "",
  status: "draft",
  availabilityStatus: "in_stock",
  thumbnail: "",
  description: "",
};

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
      setFormState({ ...DEFAULT_FORM, ...initialData });
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
    setFormState((prev) => ({ ...prev, [field]: value }));
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

    if (!formState.price || Number.isNaN(Number(formState.price))) {
      setLocalError("Valid price is required");
      return;
    }

    if (formState.stock !== "" && Number.isNaN(Number(formState.stock))) {
      setLocalError("Stock must be a number");
      return;
    }

    onSubmit({
      ...formState,
      price: Number(formState.price),
      stock: Number(formState.stock || 0),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl md:my-0"
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

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                    onChange={handleChange("price")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="599.00"
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
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="40"
                  />
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
              </div>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Thumbnail URL
                <input
                  type="text"
                  value={formState.thumbnail}
                  onChange={handleChange("thumbnail")}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="https://..."
                />
              </label>

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

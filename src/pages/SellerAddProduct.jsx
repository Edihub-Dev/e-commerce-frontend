import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import SellerProductForm, {
  buildDefaultSellerProductForm,
} from "../components/seller/SellerProductForm";
import {
  createSellerProduct,
  fetchSellerProductById,
  updateSellerProduct,
} from "../utils/api";

const mapApiProductToFormState = (product = {}) => {
  const fallback = buildDefaultSellerProductForm();

  const ensureArray = (value) =>
    Array.isArray(value) && value.length ? value : [""];

  const sizes = Array.isArray(product.sizes)
    ? product.sizes.map((size) => ({
        label: size?.label ?? "",
        isAvailable: Boolean(size?.isAvailable ?? true),
        stock: size?.stock != null ? String(size.stock) : "0",
      }))
    : fallback.sizes;

  return {
    ...fallback,
    name: product.name || fallback.name,
    sku: product.sku || fallback.sku,
    description: product.description || fallback.description,
    category: product.category || fallback.category,
    brand: product.brand || fallback.brand,
    status: product.status || fallback.status,
    availabilityStatus:
      product.availabilityStatus || fallback.availabilityStatus,
    price:
      product.price !== undefined && product.price !== null
        ? String(product.price)
        : fallback.price,
    originalPrice:
      product.originalPrice !== undefined && product.originalPrice !== null
        ? String(product.originalPrice)
        : fallback.originalPrice,
    discountPercentage:
      product.discountPercentage !== undefined &&
      product.discountPercentage !== null
        ? String(product.discountPercentage)
        : fallback.discountPercentage,
    saveAmount:
      product.saveAmount !== undefined && product.saveAmount !== null
        ? String(product.saveAmount)
        : fallback.saveAmount,
    stock:
      product.stock !== undefined && product.stock !== null
        ? String(product.stock)
        : fallback.stock,
    maxPurchaseQuantity:
      product.maxPurchaseQuantity !== undefined &&
      product.maxPurchaseQuantity !== null
        ? String(product.maxPurchaseQuantity)
        : fallback.maxPurchaseQuantity,
    lowStockThreshold:
      product.lowStockThreshold !== undefined &&
      product.lowStockThreshold !== null
        ? String(product.lowStockThreshold)
        : fallback.lowStockThreshold,
    thumbnail: product.thumbnail || fallback.thumbnail,
    gallery: Array.isArray(product.gallery)
      ? product.gallery
      : fallback.gallery,
    keyFeatures: ensureArray(product.keyFeatures),
    categoryPriority: product.categoryPriority || fallback.categoryPriority,
    showSizes: Boolean(product.showSizes),
    sizes,
    hsnCode: product.hsnCode || fallback.hsnCode,
    gstRate:
      product.gstRate !== undefined && product.gstRate !== null
        ? String(product.gstRate)
        : fallback.gstRate,
    isFeatured: Boolean(product.isFeatured),
  };
};

const SellerAddProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [initialValues, setInitialValues] = useState(() =>
    buildDefaultSellerProductForm()
  );
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    let isMounted = true;
    const loadProduct = async () => {
      setLoading(true);
      try {
        const response = await fetchSellerProductById(id);
        const productData = response?.data;
        if (!isMounted) return;
        setInitialValues(mapApiProductToFormState(productData));
      } catch (error) {
        if (!isMounted) return;
        const message = error?.message || "Failed to load product";
        toast.error(message);
        navigate("/seller/products");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate]);

  const handleSubmit = async (payload) => {
    if (isEditMode) {
      await updateSellerProduct(id, payload);
      toast.success("Product updated successfully");
    } else {
      await createSellerProduct(payload);
      toast.success("Product created successfully");
    }
    navigate("/seller/products");
  };

  const handleCancel = () => {
    navigate("/seller/products");
  };

  const headerTitle = isEditMode ? "Edit Product" : "Add Product";

  const memoizedInitialValues = useMemo(() => initialValues, [initialValues]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
            Dashboard / Products
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {headerTitle}
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-12 w-full animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        </div>
      ) : (
        <SellerProductForm
          mode={isEditMode ? "edit" : "create"}
          initialValues={memoizedInitialValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default SellerAddProduct;

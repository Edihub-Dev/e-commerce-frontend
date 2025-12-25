import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const computeStorageKey = () => {
    const userId = user?._id || user?.id || user?.email;
    if (isAuthenticated && userId) {
      return `p2pdeal:cart:${userId}`;
    }
    return "p2pdeal:cart:guest";
  };

  const [storageKey, setStorageKey] = useState(computeStorageKey);

  const [cartItems, setCartItems] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const initialKey = computeStorageKey();
      const storedCart = window.localStorage.getItem(initialKey);
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
      return [];
    }
  });

  // When the authenticated user changes, switch to that user's cart key
  useEffect(() => {
    const nextKey = computeStorageKey();
    setStorageKey(nextKey);

    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedCart = window.localStorage.getItem(nextKey);
      setCartItems(storedCart ? JSON.parse(storedCart) : []);
    } catch (error) {
      console.error("Failed to load user cart from localStorage", error);
      setCartItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?._id, user?.id, user?.email]);

  // Persist current cart for the active user/guest
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to persist cart to localStorage", error);
    }
  }, [cartItems, storageKey]);

  const sanitizeQuantity = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 1;
    }
    return Math.max(1, Math.floor(parsed));
  };

  const normalizeSizeToken = (size) =>
    typeof size === "string" ? size.trim().toUpperCase() : size ?? "";

  const findSizeEntry = (product, sizeToken) => {
    if (!product?.showSizes) {
      return null;
    }

    if (!Array.isArray(product?.sizes) || !product.sizes.length) {
      return null;
    }

    const normalizedToken = normalizeSizeToken(sizeToken);
    if (!normalizedToken) {
      return null;
    }

    return (
      product.sizes.find(
        (size) =>
          size?.label?.toString().trim().toUpperCase() === normalizedToken
      ) || null
    );
  };

  const computeAvailableQuantity = (product, sizeToken) => {
    if (!product) {
      return Number.POSITIVE_INFINITY;
    }

    if (product.showSizes) {
      const sizeEntry = findSizeEntry(product, sizeToken);

      if (sizeEntry) {
        if (sizeEntry.isAvailable === false) {
          return 0;
        }

        const sizeStock = Number(sizeEntry.stock);
        if (Number.isFinite(sizeStock)) {
          return Math.max(0, Math.floor(sizeStock));
        }
      }

      // If size was explicitly selected but not found, treat as unavailable
      if (sizeToken) {
        return 0;
      }
    }

    const rawStock = Number(product?.stock);
    if (Number.isFinite(rawStock)) {
      return Math.max(0, Math.floor(rawStock));
    }

    return Number.POSITIVE_INFINITY;
  };

  const computeMaxPerOrder = (entity) => {
    const raw = Number(entity?.maxPurchaseQuantity ?? 0);
    if (!Number.isFinite(raw) || raw <= 0) {
      return null;
    }
    return Math.floor(raw);
  };

  const formatLimitedQuantityMessage = (product, available, sizeToken) => {
    const productName = product?.name || "This item";
    const sizeLabel = sizeToken ? ` (size ${sizeToken})` : "";
    if (available <= 0) {
      return `${productName}${sizeLabel} is currently out of stock.`;
    }
    return `Only ${available} unit${
      available === 1 ? "" : "s"
    } of ${productName}${sizeLabel} are available.`;
  };

  const addItem = (product, quantity = 1) => {
    const hsnCode =
      typeof product?.hsnCode === "string"
        ? product.hsnCode.trim()
        : product?.hsnCode != null
        ? String(product.hsnCode).trim()
        : undefined;
    const gstRate =
      product?.gstRate !== undefined && product?.gstRate !== null
        ? Number(product.gstRate)
        : undefined;
    const variantSize =
      typeof product?.size === "string" && product.size.trim().length
        ? product.size.trim()
        : product?.size ?? undefined;
    const normalizedSizeToken = normalizeSizeToken(variantSize);
    const requestedQuantity = sanitizeQuantity(quantity);
    const maxAvailable = computeAvailableQuantity(product, normalizedSizeToken);
    const perOrderLimit = computeMaxPerOrder(product);

    if (Number.isFinite(maxAvailable) && maxAvailable <= 0) {
      toast.error(
        formatLimitedQuantityMessage(
          product,
          maxAvailable,
          normalizedSizeToken || ""
        )
      );
      return;
    }

    const mongoIdRegex = /^[a-f\d]{24}$/i;
    const rawProductId =
      product?.mongoId || product?._id || product?.product || product?.id;
    const normalizedProductId =
      typeof rawProductId === "string" && mongoIdRegex.test(rawProductId)
        ? rawProductId
        : undefined;

    let quantityChanged = false;
    let wasClamped = false;
    let clampLimit = null;

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => {
        const sameId = item.id === product.id;
        const sameSize = (item.size ?? null) === (variantSize ?? null);
        return sameId && sameSize;
      });
      if (existingItem) {
        const existingQuantity = sanitizeQuantity(existingItem.quantity);
        const desiredQuantity = existingQuantity + requestedQuantity;
        let nextQuantity = desiredQuantity;

        let effectiveMax = maxAvailable;
        const existingPerOrder = computeMaxPerOrder(existingItem);
        const orderLimit = existingPerOrder ?? perOrderLimit;
        if (orderLimit != null) {
          effectiveMax = Number.isFinite(effectiveMax)
            ? Math.min(effectiveMax, orderLimit)
            : orderLimit;
        }

        if (
          Number.isFinite(effectiveMax) &&
          desiredQuantity > Math.max(1, effectiveMax)
        ) {
          const limit = Math.max(1, effectiveMax);
          nextQuantity = Math.max(limit, existingQuantity);
          wasClamped = nextQuantity !== desiredQuantity;
          clampLimit = limit;
        }

        if (nextQuantity === existingQuantity) {
          wasClamped = true;
          clampLimit = clampLimit ?? maxAvailable;
          return prevItems;
        }

        quantityChanged = true;
        return prevItems.map((item) =>
          item.id === product.id &&
          (item.size ?? null) === (variantSize ?? null)
            ? {
                ...item,
                quantity: nextQuantity,
                hsnCode: hsnCode || item.hsnCode,
                gstRate: Number.isFinite(gstRate) ? gstRate : item.gstRate,
              }
            : item
        );
      }

      let effectiveMax = maxAvailable;
      if (perOrderLimit != null) {
        effectiveMax = Number.isFinite(effectiveMax)
          ? Math.min(effectiveMax, perOrderLimit)
          : perOrderLimit;
      }

      const initialQuantity = Number.isFinite(effectiveMax)
        ? Math.min(requestedQuantity, Math.max(1, effectiveMax))
        : requestedQuantity;

      if (Number.isFinite(effectiveMax) && initialQuantity <= 0) {
        wasClamped = true;
        clampLimit = effectiveMax;
        return prevItems;
      }

      if (initialQuantity < requestedQuantity) {
        wasClamped = true;
        clampLimit = effectiveMax;
      }

      const nextItem = {
        ...product,
        quantity: sanitizeQuantity(initialQuantity),
        size: variantSize,
      };

      if (normalizedProductId) {
        nextItem.product = normalizedProductId;
      }

      if (hsnCode) {
        nextItem.hsnCode = hsnCode;
      }
      if (Number.isFinite(gstRate)) {
        nextItem.gstRate = gstRate;
      }

      quantityChanged = true;
      return [...prevItems, nextItem];
    });

    if (!quantityChanged) {
      toast.info(
        formatLimitedQuantityMessage(
          product,
          clampLimit ?? maxAvailable,
          normalizedSizeToken || ""
        ),
        {
          autoClose: 2000,
        }
      );
      return;
    }

    if (wasClamped) {
      const limit = clampLimit ?? maxAvailable;
      toast.info(
        formatLimitedQuantityMessage(product, limit, normalizedSizeToken || ""),
        {
          autoClose: 2000,
        }
      );
      return;
    }

    toast.success(`${product.name} added to cart!`, { autoClose: 1000 });
  };

  const removeItem = (productId, size) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => {
        const sameId = item.id === productId;
        const sameSize = (item.size ?? null) === (size ?? null);
        return !(sameId && sameSize);
      })
    );
    toast.info(`Item removed from cart.`, { autoClose: 1000 });
  };

  const resolveEntryKey = (entry) => {
    if (!entry) {
      return null;
    }

    const rawId =
      entry.id ??
      entry.product ??
      entry.mongoId ??
      entry._id ??
      entry.slug ??
      null;

    if (!rawId) {
      return null;
    }

    const normalizedId = String(rawId).trim();
    if (!normalizedId) {
      return null;
    }

    const normalizedSize =
      entry.size === undefined || entry.size === null
        ? ""
        : String(entry.size).trim();

    return `${normalizedId}::${normalizedSize}`;
  };

  const removeItems = (itemsToRemove = []) => {
    if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) {
      return;
    }

    setCartItems((prevItems) => {
      const removalKeys = new Set(
        itemsToRemove
          .map((entry) => resolveEntryKey(entry))
          .filter((key) => Boolean(key))
      );

      if (!removalKeys.size) {
        return prevItems;
      }

      let didRemove = false;
      const nextItems = prevItems.filter((item) => {
        const key = resolveEntryKey(item);
        if (key && removalKeys.has(key)) {
          didRemove = true;
          return false;
        }
        return true;
      });

      return didRemove ? nextItems : prevItems;
    });
  };

  const updateQuantity = (productId, quantity, size) => {
    const normalizedSizeToken = normalizeSizeToken(size);
    const requestedQuantity = sanitizeQuantity(quantity);

    const existingItem = cartItems.find(
      (item) => item.id === productId && (item.size ?? null) === (size ?? null)
    );

    if (!existingItem) {
      return;
    }

    if (requestedQuantity <= 0) {
      removeItem(productId, size);
      return;
    }

    const maxAvailable = computeAvailableQuantity(
      existingItem,
      normalizedSizeToken
    );
    const perOrderLimit = computeMaxPerOrder(existingItem);

    if (Number.isFinite(maxAvailable) && maxAvailable <= 0) {
      removeItem(productId, size);
      toast.info(
        formatLimitedQuantityMessage(
          existingItem,
          maxAvailable,
          normalizedSizeToken || ""
        ),
        {
          autoClose: 2000,
        }
      );
      return;
    }

    let effectiveMax = maxAvailable;
    if (perOrderLimit != null) {
      effectiveMax = Number.isFinite(effectiveMax)
        ? Math.min(effectiveMax, perOrderLimit)
        : perOrderLimit;
    }

    const nextQuantity = Number.isFinite(effectiveMax)
      ? Math.min(requestedQuantity, Math.max(1, effectiveMax))
      : requestedQuantity;

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId && (item.size ?? null) === (size ?? null)
          ? { ...item, quantity: nextQuantity }
          : item
      )
    );

    if (nextQuantity < requestedQuantity) {
      toast.info(
        formatLimitedQuantityMessage(
          existingItem,
          effectiveMax,
          normalizedSizeToken || ""
        ),
        {
          autoClose: 2000,
        }
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch (error) {
        console.error("Failed to clear cart from localStorage", error);
      }
    }
  };

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const value = {
    cartItems,
    addItem,
    removeItem,
    removeItems,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

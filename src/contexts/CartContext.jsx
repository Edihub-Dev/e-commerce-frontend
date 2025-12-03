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

    const mongoIdRegex = /^[a-f\d]{24}$/i;
    const rawProductId =
      product?.mongoId || product?._id || product?.product || product?.id;
    const normalizedProductId =
      typeof rawProductId === "string" && mongoIdRegex.test(rawProductId)
        ? rawProductId
        : undefined;

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => {
        const sameId = item.id === product.id;
        const sameSize = (item.size ?? null) === (variantSize ?? null);
        return sameId && sameSize;
      });
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id &&
          (item.size ?? null) === (variantSize ?? null)
            ? {
                ...item,
                quantity: item.quantity + quantity,
                hsnCode: hsnCode || item.hsnCode,
                gstRate: Number.isFinite(gstRate) ? gstRate : item.gstRate,
              }
            : item
        );
      }

      const nextItem = {
        ...product,
        quantity,
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

      return [...prevItems, nextItem];
    });
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
    if (quantity <= 0) {
      removeItem(productId, size);
    } else {
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.id === productId && (item.size ?? null) === (size ?? null)
            ? { ...item, quantity }
            : item
        )
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

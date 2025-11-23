import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const computeStorageKey = () => {
    const userId = user?._id || user?.id || user?.email;
    if (isAuthenticated && userId) {
      return `megamart:cart:${userId}`;
    }
    return "megamart:cart:guest";
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

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
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
      };

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

  const removeItem = (productId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
    toast.info(`Item removed from cart.`, { autoClose: 1000 });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.id === productId ? { ...item, quantity } : item
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

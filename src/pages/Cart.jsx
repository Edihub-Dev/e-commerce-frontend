import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../contexts/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2, ShoppingCart as CartIcon } from "lucide-react";
import { useDispatch } from "react-redux";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
  buttonHover,
} from "../utils/animations";
import {
  resetCheckout,
  setCheckoutItems,
  setCheckoutTotals,
  setCheckoutStep,
} from "../store/slices/checkoutSlice";

const Cart = () => {
  const { cartItems, updateQuantity, removeItem, cartCount, cartTotal } =
    useCart();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const normalizedCartItems = React.useMemo(() => {
    const mongoIdRegex = /^[a-f\d]{24}$/i;

    return cartItems.map((item) => {
      const candidateId =
        item.product || item.mongoId || item._id || item.id || item.slug;
      const normalizedProductId =
        typeof candidateId === "string" && mongoIdRegex.test(candidateId)
          ? candidateId
          : undefined;

      return {
        ...item,
        product: normalizedProductId || item.product,
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
      };
    });
  }, [cartItems]);

  const handleProceedToCheckout = () => {
    if (!normalizedCartItems.length) {
      return;
    }

    dispatch(resetCheckout());
    dispatch(setCheckoutItems(normalizedCartItems));
    dispatch(
      setCheckoutTotals({
        subtotal: normalizedCartItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
        shippingFee: 0,
        taxAmount: 0,
        discount: 0,
        total: normalizedCartItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
      })
    );
    dispatch(setCheckoutStep("order"));
    navigate("/checkout/order");
  };

  if (cartCount === 0) {
    return (
      <motion.div
        className="container mx-auto px-4 py-16 text-center"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <CartIcon className="mx-auto h-24 w-24 text-gray-300" />
        </motion.div>
        <motion.h2
          className="mt-6 text-2xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Your Cart is Empty
        </motion.h2>
        <motion.p
          className="mt-2 text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Looks like you haven't added anything to your cart yet.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link
            to="/"
            className="mt-6 inline-block bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-dark transition-colors"
          >
            Start Shopping
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="container mx-auto max-w-4xl px-4 py-8 overflow-x-hidden"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.h1
        className="text-3xl font-bold mb-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        Your Shopping Cart ({cartCount} items)
      </motion.h1>

      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <AnimatePresence>
          {cartItems.map((item) => (
            <motion.div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
              variants={staggerItem}
              layout
              exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-24 w-24 flex-shrink-0 rounded-lg object-contain bg-slate-50"
                />

                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      to={`/product/${item.id}`}
                      className="text-base font-semibold text-slate-800 hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-slate-500">
                      Unit price: ₹{item.price.toLocaleString()}
                    </p>
                    {(() => {
                      const metaSegments = [];
                      if (item?.hsnCode) {
                        metaSegments.push(`HSN: ${item.hsnCode}`);
                      }
                      if (Number.isFinite(Number(item?.gstRate))) {
                        const displayGst = Number(item.gstRate)
                          .toFixed(2)
                          .replace(/\.00$/, "");
                        metaSegments.push(`GST: ${displayGst}%`);
                      }
                      if (item?.size) {
                        metaSegments.push(`Size: ${item.size}`);
                      }

                      if (!metaSegments.length) {
                        return null;
                      }

                      return (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {metaSegments.map((segment, index) => (
                            <React.Fragment key={`${item.id}-meta-${segment}`}>
                              {index > 0 ? (
                                <span className="text-slate-300">|</span>
                              ) : null}
                              <span>{segment}</span>
                            </React.Fragment>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1, item.size)
                        }
                        className="rounded-full p-1.5 transition hover:bg-slate-100"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-700">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1, item.size)
                        }
                        className="rounded-full p-1.5 transition hover:bg-slate-100"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <p className="text-base font-semibold text-slate-900 sm:text-right sm:text-lg">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <motion.button
                      onClick={() => removeItem(item.id, item.size)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-rose-500"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                    >
                      <Trash2 size={18} /> Remove
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="mt-8 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 140 }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              ORDER SUMMARY
            </p>
            <p className="mt-1 text-3xl font-semibold text-secondary">
              ₹{cartTotal.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400 sm:hidden">
              Taxes and shipping calculated at checkout.
            </p>
          </div>

          <motion.button
            onClick={handleProceedToCheckout}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark sm:w-auto sm:rounded-full"
            variants={buttonHover}
            whileHover="hover"
            whileTap="tap"
            type="button"
          >
            Proceed to Checkout
          </motion.button>
        </div>
        <p className="mt-3 hidden text-xs text-slate-400 sm:block">
          Taxes and shipping will be calculated at checkout.
        </p>
      </motion.div>
    </motion.div>
  );
};
export default Cart;

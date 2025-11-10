import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../contexts/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Plus, Minus, Trash2, ShoppingCart as CartIcon } from "lucide-react";
import {
  pageVariants,
  fadeInUp,
  staggerContainer,
  staggerItem,
  buttonHover,
} from "../utils/animations";
import {
  setCheckoutItems,
  setCheckoutTotals,
  setCheckoutStep,
  calculateTotals,
} from "../store/slices/checkoutSlice";

const Cart = () => {
  const { cartItems, updateQuantity, removeItem, cartTotal, cartCount } =
    useCart();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleProceedToCheckout = () => {
    if (!cartItems.length) {
      return;
    }

    const normalizedItems = cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      size: item.size,
    }));

    const totals = calculateTotals(normalizedItems, {
      shippingFee: 49,
      taxAmount: 0,
      discount: 0,
    });

    dispatch(setCheckoutItems(normalizedItems));
    dispatch(setCheckoutTotals(totals));
    dispatch(setCheckoutStep("order-summary"));
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
            to="/shop"
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
      className="container mx-auto px-4 py-8"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.h1
        className="text-3xl font-bold mb-8"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        Your Shopping Cart ({cartCount} items)
      </motion.h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
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
                  className="flex items-center gap-4 p-4 border rounded-lg"
                  variants={staggerItem}
                  layout
                  exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-contain rounded-md"
                  />
                  <div className="flex-grow">
                    <Link
                      to={`/product/${item.id}`}
                      className="font-semibold hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      ₹{item.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 border rounded-md p-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="font-semibold w-24 text-right">
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </p>
                  <motion.button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-500 hover:text-red-500"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 size={20} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
        <motion.div
          className="lg:w-1/3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="border rounded-lg p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-green-600">FREE</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total</span>
                <span>₹{cartTotal.toLocaleString()}</span>
              </div>
            </div>
            <motion.button
              className="w-full mt-6 bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors"
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
              type="button"
              onClick={handleProceedToCheckout}
            >
              Proceed to Checkout
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Cart;

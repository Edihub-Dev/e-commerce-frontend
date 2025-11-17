import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../contexts/CartContext";
import { cardHover, buttonHover } from "../utils/animations";

const ProductCard = ({ product }) => {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handleBuyNow = () => {
    if (!product?.id) return;

    navigate(`/product/${product.id}`);
  };

  return (
    <motion.div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden group flex flex-col h-full hover:shadow-xl transition-all duration-300 hover:border-primary/20 w-full"
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      style={{ minWidth: "150px" }} // Set a minimum width to prevent cards from becoming too narrow
    >
      <Link
        to={`/product/${product.id}`}
        className="block relative overflow-hidden bg-white group-hover:bg-gray-50 transition-colors duration-300"
      >
        {product.discount > 0 && (
          <div className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full z-10 shadow-md">
            {product.discount}% OFF
          </div>
        )}
        <div className="relative w-full pt-[100%] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3 md:p-4">
            <img
              src={product.image}
              crossOrigin="anonymous"
              alt={product.name}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://placehold.co/600x600/f8fafc/e2e8f0?text=Image+Not+Found";
                e.target.className = "w-full h-full object-cover";
              }}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
              }}
            />
          </div>
        </div>
      </Link>
      <div className="p-3 sm:p-4 border-t border-gray-100 flex-grow flex flex-col">
        <h3 className="text-xs sm:text-sm font-semibold text-dark-text mb-2 line-clamp-2 flex-grow min-h-[2.5em]">
          <Link to={`/product/${product.id}`} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto">
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mb-1 sm:mb-2">
            <p className="text-base sm:text-lg font-bold text-dark-text">
              ₹{product.price.toLocaleString()}
            </p>
            {product.originalPrice > product.price && (
              <p className="text-xs sm:text-sm text-gray-500 line-through">
                ₹{product.originalPrice.toLocaleString()}
              </p>
            )}
          </div>
          {product.saveAmount > 0 && (
            <p className="text-xs sm:text-sm font-medium text-success mb-2 sm:mb-3">
              Save - ₹{product.saveAmount.toLocaleString()}
            </p>
          )}
          <div className="flex flex-col xs:flex-row gap-2 w-full">
            <motion.button
              onClick={() => addItem(product)}
              className="w-full xs:flex-1 bg-primary/10 text-primary font-medium py-2 px-2 text-sm rounded-md hover:bg-primary hover:text-white transition-colors duration-200 whitespace-nowrap flex items-center justify-center min-h-[36px]"
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
            >
              <span className="truncate">Add to Cart</span>
            </motion.button>
            <motion.button
              className="w-full xs:flex-1 bg-primary text-white font-medium py-2 px-2 text-sm rounded-md hover:bg-primary/90 transition-colors duration-200 whitespace-nowrap flex items-center justify-center min-h-[36px]"
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
              type="button"
              onClick={handleBuyNow}
            >
              <span className="truncate">Buy Now</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;

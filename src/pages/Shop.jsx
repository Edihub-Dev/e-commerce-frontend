import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ProductCard from "../components/ProductCard";
import { getAllProducts } from "../utils/api";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../utils/animations";

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data } = await getAllProducts({ limit: "all" });
        if (isActive) {
          setProducts(data);
          setError("");
        }
      } catch (err) {
        console.error("Failed to load products", err);
        if (isActive) {
          setError(
            err.message || "Unable to load products. Please try again later."
          );
          setProducts([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isActive = false;
    };
  }, []);

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
        Shop All Products
      </motion.h1>
      {loading && (
        <div className="py-6 text-center text-sm text-slate-500">
          Loading products...
        </div>
      )}
      {error && !loading && (
        <div className="py-6 text-center text-sm text-red-500">{error}</div>
      )}
      {!loading && !error && products.length === 0 && (
        <div className="py-6 text-center text-sm text-slate-500">
          No products found. Check back soon!
        </div>
      )}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {products.map((product) => (
          <motion.div key={product.id} variants={staggerItem}>
            <ProductCard product={product} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default Shop;

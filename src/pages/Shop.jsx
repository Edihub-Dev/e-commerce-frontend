import React, { useState, useEffect, useMemo } from "react";
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

  const categories = useMemo(() => {
    const categoryMap = new Map();
    const parsePriority = (value) => {
      const raw = String(value || "")
        .trim()
        .toUpperCase();
      if (/^P\d{1,2}$/.test(raw)) {
        return parseInt(raw.slice(1), 10);
      }
      const numeric = parseInt(raw.replace(/[^0-9]/g, ""), 10);
      return Number.isNaN(numeric) ? 99 : numeric;
    };

    for (const product of products) {
      const category = (product.category || "").trim();
      if (!category) continue;

      const priority = parsePriority(product.categoryPriority);
      if (!categoryMap.has(category) || priority < categoryMap.get(category)) {
        categoryMap.set(category, priority);
      }
    }

    return Array.from(categoryMap.entries())
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [products]);

  return (
    <motion.div
      className="container mx-auto px-4 py-8"
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

      {!loading && !error && products.length > 0 && (
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryProducts = products
              .filter((product) => (product.category || "").trim() === category)
              .sort((a, b) => {
                const parsePriority = (value) => {
                  const raw = String(value || "")
                    .trim()
                    .toUpperCase();
                  if (/^P\d{1,2}$/.test(raw)) {
                    return parseInt(raw.slice(1), 10);
                  }
                  const numeric = parseInt(raw.replace(/[^0-9]/g, ""), 10);
                  return Number.isNaN(numeric) ? 99 : numeric;
                };

                return (
                  parsePriority(a.categoryPriority) -
                  parsePriority(b.categoryPriority)
                );
              });

            if (!categoryProducts.length) return null;

            return (
              <section key={category} className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-800">
                  {category}
                </h2>
                <motion.div
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {categoryProducts.map((product) => (
                    <motion.div key={product.id} variants={staggerItem}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default Shop;

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import ProductCard from "../components/ProductCard";
import { getProductsByCategory, getProductsByBrand } from "../utils/api";
import { pageVariants } from "../utils/animations";

const CategoryPage = () => {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const categoryName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  useEffect(() => {
    let active = true;

    const fetchCategoryProducts = async () => {
      setLoading(true);
      try {
        let productsToShow = [];

        const categoryResponse = await getProductsByCategory(slug, {
          limit: "all",
        });
        productsToShow = categoryResponse.data;

        if (!productsToShow.length) {
          const brandResponse = await getProductsByBrand(slug, { limit: "all" });
          productsToShow = brandResponse.data;
        }

        if (active) {
          setProducts(productsToShow);
          setError("");
        }
      } catch (err) {
        console.error("Failed to load category products", err);
        if (active) {
          setError(err.message || "Unable to load products for this category.");
          setProducts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCategoryProducts();

    return () => {
      active = false;
    };
  }, [slug]);

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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Category: {categoryName}
      </motion.h1>
      {loading && (
        <div className="py-6 text-center text-sm text-slate-500">
          Loading category products...
        </div>
      )}
      {error && !loading && (
        <div className="py-6 text-center text-sm text-red-500">{error}</div>
      )}
      {!loading && !error && products.length === 0 && (
        <div className="py-6 text-center text-sm text-slate-500">
          No products found in this category yet.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </motion.div>
  );
};

export default CategoryPage;

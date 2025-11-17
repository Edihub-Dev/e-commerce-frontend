import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchProducts } from "../../utils/api";

const CategoriesSection = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fallbackImage =
    "https://placehold.co/300x300/008ECC/FFFFFF.png?text=Category";

  useEffect(() => {
    let active = true;

    const fetchCategories = async () => {
      setLoading(true);
      try {
        const { data } = await fetchProducts({ limit: 200 });
        if (!active) return;

        const categoryMap = new Map();
        data.forEach((product) => {
          const rawName =
            typeof product.category === "string" ? product.category : "Other";
          const name = rawName.trim() || "Other";
          const slug = encodeURIComponent(
            name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "") || "other"
          );
          if (!name) return;
          if (!categoryMap.has(name)) {
            categoryMap.set(name, {
              name,
              slug,
              image: product.image || product.gallery?.[0] || fallbackImage,
            });
          }
        });

        const topCategories = Array.from(categoryMap.values()).slice(0, 7);
        setCategories(topCategories);
        setError("");
      } catch (err) {
        console.error("Failed to load categories", err);
        if (active) {
          setError(err.message || "Unable to load categories.");
          setCategories([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      active = false;
    };
  }, []);

  return (
    <nav className="md:hidden">
      <h2 className="sr-only">Top categories</h2>

      <div className="flex gap-3 overflow-y-hidden overflow-x-auto py-3">
        {loading && (
          <span className="text-sm text-slate-500">Loading categories…</span>
        )}
        {error && !loading && (
          <span className="text-sm text-red-500">{error}</span>
        )}
        {!loading && !error && categories.length === 0 && (
          <span className="text-sm text-slate-500">
            Categories will appear here once added.
          </span>
        )}
        {categories.map((category) => (
          <Link
            key={category.slug}
            to={`/category/${category.slug}`}
            className="flex-shrink-0 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-dark-text shadow-sm"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default CategoriesSection;

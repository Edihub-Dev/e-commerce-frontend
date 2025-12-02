/**
 * CategoriesSection was disabled at the user's request.
 * Uncomment the block below to restore the original implementation.
 */

/*
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { fetchCategories } from "../../utils/api";
import { staggerContainer, staggerItem } from "../../utils/animations";

const CategoriesSection = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const response = await fetchCategories();
        if (!active) return;

        const nextCategories = Array.isArray(response?.data)
          ? response.data
          : [];
        setCategories(nextCategories.slice(0, 8));
        setError("");
      } catch (err) {
        console.error("Failed to load categories", err);
        if (active) {
          setError(
            err?.message ?? "We couldn't load categories at the moment."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  const topCategories = useMemo(() => categories.slice(0, 8), [categories]);

  return (
    <motion.section
      className="bg-white rounded-xl shadow-sm p-6"
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-80px" }}
      variants={staggerContainer}
    >
      <SectionHeader
        title={
          <>
            Top <span style={{ color: "#008ECC" }}>Categories</span>
          </>
        }
        linkTo="/categories"
      />
      <div className="hidden grid-cols-4 gap-6 md:grid">
        {loading && (
          <p className="col-span-full text-center text-sm text-slate-500">
            Loading categories...
          </p>
        )}
        {error && !loading && (
          <p className="col-span-full text-center text-sm text-red-500">
            {error}
          </p>
        )}
        {!loading && !error && topCategories.length === 0 && (
          <p className="col-span-full text-center text-sm text-slate-500">
            New categories will appear here soon.
          </p>
        )}
        {topCategories.map((category) => (
          <motion.div key={category.slug} variants={staggerItem}>
            <Link
              to={`/category/${category.slug}`}
              className="group relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-50">
                <img
                  src={category.image || category.icon || "/images/category-placeholder.png"}
                  alt={category.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/images/category-placeholder.png";
                  }}
                />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-dark-text">
                {category.name}
              </h3>
              {category.productCount ? (
                <p className="text-xs text-slate-500">
                  {category.productCount} products
                </p>
              ) : null}
            </Link>
          </motion.div>
        ))}
      </div>

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
    </motion.section>
  );
};

export default CategoriesSection;
*/

const CategoriesSection = () => null;

export default CategoriesSection;

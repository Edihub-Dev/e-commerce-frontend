import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ProductCard from "../ProductCard";
import SectionHeader from "../SectionHeader";
import { getSmartphoneDeals as getMerchDeals } from "../../utils/api";
import { staggerContainer, staggerItem } from "../../utils/animations";

const DealsSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchDeals = async () => {
      setLoading(true);
      try {
        const { data } = await getMerchDeals({ limit: 50 });
        if (isMounted) {
          const sorted = Array.isArray(data)
            ? [...data].sort((a, b) => {
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
              })
            : [];
          setProducts(sorted.slice(0, 6));
          setError("");
        }
      } catch (err) {
        console.error("Failed to load featured products", err);
        if (isMounted) {
          setError(err.message || "Unable to load featured products.");
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDeals();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <motion.section
      className="w-full"
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-100px" }}
    >
      <div className="container mx-auto px-2 sm:px-4">
        <SectionHeader
          title={
            <>
              MST Blockchain Official{" "}
              <span style={{ color: "#008ECC" }}>Products</span>
            </>
          }
          linkTo="/shop"
          linkText="Shop Collection"
        />
        <motion.div
          className="w-full overflow-hidden flex flex-col"
          variants={staggerContainer}
        >
          {loading && (
            <div className="py-6 text-center text-sm text-slate-500">
              Loading featured products...
            </div>
          )}

          {error && !loading && (
            <div className="py-6 text-center text-sm text-red-500">{error}</div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-500">
              No featured products yet. Check back soon!
            </div>
          )}

          <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-4">
            {products.map((product) => (
              <motion.div
                key={product.id}
                variants={staggerItem}
                className="w-full min-w-0"
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>

          {/* View All Button - Only visible on small screens */}
          <div className="sm:hidden mt-4 w-full">
            <a
              href="/shop"
              className="w-full block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              View All
            </a>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default DealsSection;

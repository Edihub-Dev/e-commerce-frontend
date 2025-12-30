import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ProductCard from "../ProductCard";
import SectionHeader from "../SectionHeader";
import {
  getSmartphoneDeals as getMerchDeals,
  fetchProducts,
} from "../../utils/api";
import { staggerContainer, staggerItem } from "../../utils/animations";

const SellerSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerLoading, setSellerLoading] = useState(true);
  const [sellerError, setSellerError] = useState("");
  const SHOW_ADMIN_FIRST = false;

  const SKELETON_COUNT = 6;

  const sortSellerListings = (items = []) => {
    const parseSku = (sku) => {
      const normalized = String(sku || "")
        .trim()
        .toUpperCase();
      if (!normalized) {
        return { normalized, prefix: "", numeric: Number.POSITIVE_INFINITY };
      }

      const match = normalized.match(/^([A-Z]+)(\d+)/);
      if (!match) {
        return {
          normalized,
          prefix: normalized,
          numeric: Number.POSITIVE_INFINITY,
        };
      }

      return {
        normalized,
        prefix: match[1],
        numeric: Number.parseInt(match[2], 10),
      };
    };

    return [...items].sort((a, b) => {
      const aSku = parseSku(a?.sku);
      const bSku = parseSku(b?.sku);

      if (aSku.prefix !== bSku.prefix) {
        return aSku.prefix.localeCompare(bSku.prefix);
      }

      if (Number.isFinite(aSku.numeric) && Number.isFinite(bSku.numeric)) {
        return aSku.numeric - bSku.numeric;
      }

      return aSku.normalized.localeCompare(bSku.normalized);
    });
  };

  useEffect(() => {
    let isMounted = true;

    const fetchDeals = async () => {
      setLoading(true);
      try {
        const { data } = await getMerchDeals({
          limit: 50,
          excludeSellerProducts: true,
        });
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

  useEffect(() => {
    let isMounted = true;

    const fetchSellerHighlights = async () => {
      setSellerLoading(true);
      try {
        const payload = await fetchProducts(
          {
            onlySellerProducts: true,
            status: "published",
            sortBy: "createdAt",
            sortOrder: "desc",
            limit: 8,
          },
          { suppressToast: true }
        );

        if (!isMounted) return;

        const list = Array.isArray(payload?.data) ? payload.data : [];
        const sorted = sortSellerListings(list);
        setSellerProducts(sorted.slice(0, 8));
        setSellerError("");
      } catch (err) {
        console.error("Failed to load seller spotlight", err);
        if (isMounted) {
          setSellerError(err.message || "Unable to load seller products.");
          setSellerProducts([]);
        }
      } finally {
        if (isMounted) {
          setSellerLoading(false);
        }
      }
    };

    fetchSellerHighlights();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderOfficialSection = (isSecond = false) => (
    <div
      className={`container mx-auto px-2 sm:px-4 ${isSecond ? "mt-10" : ""}`}
    >
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
        <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-4 min-h-[360px]">
          {loading
            ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                <div
                  key={`mst-skeleton-${index}`}
                  className="w-full min-w-0 animate-pulse rounded-2xl border border-slate-200/60 bg-slate-100/40 px-4 py-5"
                  aria-hidden
                >
                  <div className="h-40 w-full rounded-xl bg-slate-200" />
                  <div className="mt-4 h-3 w-3/4 rounded-full bg-slate-200" />
                  <div className="mt-2 h-3 w-1/2 rounded-full bg-slate-200" />
                  <div className="mt-5 h-9 w-full rounded-full bg-slate-300/80" />
                </div>
              ))
            : products.map((product) => (
                <motion.div
                  key={product.id || product._id}
                  variants={staggerItem}
                  className="w-full min-w-0"
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
        </div>

        {error && !loading && (
          <div className="py-6 text-center text-sm text-red-500">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-500">
            No featured products yet. Check back soon!
          </div>
        )}

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
  );

  const renderSellerSection = (isSecond = false) => (
    <div
      className={`container mx-auto px-2 sm:px-4 ${isSecond ? "mt-10" : ""}`}
    >
      <SectionHeader
        title={
          <>
            Seller Hub Spotlight{" "}
            <span style={{ color: "#008ECC" }}>Combo Pack</span>
          </>
        }
        description="Fresh drops from our verified sellers"
        linkTo="/shop?seller=true"
        linkText="Browse Seller Products"
      />

      <motion.div
        className="w-full overflow-hidden"
        variants={staggerContainer}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {sellerLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`seller-skeleton-${index}`}
                  className="w-full min-w-0 animate-pulse rounded-2xl border border-slate-200/60 bg-white px-4 py-5 shadow-sm"
                >
                  <div className="h-40 w-full rounded-xl bg-slate-200" />
                  <div className="mt-4 h-3 w-3/4 rounded-full bg-slate-200" />
                  <div className="mt-2 h-3 w-1/2 rounded-full bg-slate-200" />
                  <div className="mt-5 h-9 w-full rounded-full bg-slate-200/80" />
                </div>
              ))
            : sellerProducts.map((product) => (
                <motion.div
                  key={product.id || product._id}
                  variants={staggerItem}
                  className="w-full min-w-0"
                >
                  <ProductCard product={product} variant="seller" />
                </motion.div>
              ))}
        </div>

        {sellerError && !sellerLoading && (
          <div className="py-6 text-center text-sm text-red-500">
            {sellerError}
          </div>
        )}

        {!sellerLoading && !sellerError && sellerProducts.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-500">
            Seller products will appear here once published.
          </div>
        )}

        <div className="mt-4 flex justify-center sm:hidden">
          <a
            href="/shop?seller=true"
            className="block w-full rounded-lg bg-gray-100 px-4 py-3 text-center text-gray-800 font-medium transition-colors hover:bg-gray-200"
          >
            View All Seller Products
          </a>
        </div>
      </motion.div>
    </div>
  );

  return (
    <motion.section
      className="w-full"
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-100px" }}
    >
      {SHOW_ADMIN_FIRST ? (
        <>
          {renderOfficialSection(false)}
          {renderSellerSection(true)}
        </>
      ) : (
        <>
          {renderSellerSection(false)}
          {renderOfficialSection(true)}
        </>
      )}
    </motion.section>
  );
};

export default SellerSection;

/*
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { getAllProducts } from "../../utils/api";
import { staggerContainer, staggerItem } from "../../utils/animations";

const BrandsSection = () => {
  const [brands, setBrands] = useState([]);
  const fallbackImage =
    "https://placehold.co/300x240/008ECC/FFFFFF.png?text=Brand";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchBrands = async () => {
      setLoading(true);
      try {
        const { data } = await getAllProducts({ limit: 120 });
        if (!active) return;

        const brandMap = new Map();
        data.forEach((product) => {
          const name = (product.brand || "Other").trim();
          if (!name) return;
          if (!brandMap.has(name)) {
            brandMap.set(name, {
              name,
              image: product.image || product.gallery?.[0] || fallbackImage,
              colorSeed: product.brand || product._id || name,
            });
          }
        });

        const topBrands = Array.from(brandMap.values()).slice(0, 3);
        setBrands(topBrands);
        setError("");
      } catch (err) {
        console.error("Failed to load brands", err);
        if (active) {
          setError(err.message || "Unable to load brands.");
          setBrands([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchBrands();

    return () => {
      active = false;
    };
  }, []);

  const getBrandColors = (seed = "") => {
    const palette = [
      { bg: "#313131", text: "#FFFFFF" },
      { bg: "#FFF3CC", text: "#222222" },
      { bg: "#FFECDF", text: "#222222" },
      { bg: "#E0F2FE", text: "#1E3A8A" },
      { bg: "#FDE68A", text: "#92400E" },
    ];

    const index = Math.abs(
      seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % palette.length;

    return palette[index] || palette[0];
  };

  return (
    <motion.section
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-100px" }}
    >
      <SectionHeader
        title={
          <>
            Top <span style={{ color: "#008ECC" }}>Electronics Brands</span>
          </>
        }
        linkTo="/brands"
      />
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
        variants={staggerContainer}
      >
        {loading && (
          <div className="col-span-full py-6 text-center text-sm text-slate-500">
            Loading brands...
          </div>
        )}
        {error && !loading && (
          <div className="col-span-full py-6 text-center text-sm text-red-500">
            {error}
          </div>
        )}
        {!loading && !error && brands.length === 0 && (
          <div className="col-span-full py-6 text-center text-sm text-slate-500">
            No highlighted brands yet.
          </div>
        )}
        {brands.map((brand) => (
          <motion.div
            key={brand.name}
            style={{ backgroundColor: getBrandColors(brand.colorSeed).bg }}
            className="rounded-lg p-6 flex flex-col justify-between h-52 relative overflow-hidden"
            variants={staggerItem}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
          >
            {(() => {
              const colors = getBrandColors(brand.colorSeed);
              return (
                <>
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest px-4 py-1 inline-block rounded"
                      style={{
                        color: colors.text,
                        backgroundColor: "rgba(255,255,255,0.2)",
                      }}
                    >
                      {brand.name}
                    </p>
                    <p
                      className="text-2xl font-bold mt-2"
                      style={{ color: colors.text }}
                    >
                      Up to 80% OFF
                    </p>
                  </div>
                  <Link
                    to={`/brand/${brand.name.toLowerCase()}`}
                    className="font-semibold hover:underline"
                    style={{ color: colors.text }}
                  >
                    Shop Now
                  </Link>
                  <img
                    src={brand.image}
                    alt={brand.name}
                    className="absolute right-0 bottom-0 h-4/5 w-auto object-contain"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                </>
              );
            })()}
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};

export default BrandsSection;
*/

const BrandsSection = () => null;

export default BrandsSection;

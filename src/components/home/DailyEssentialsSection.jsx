/*
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { getAllProducts } from "../../utils/api";
import { staggerContainer, staggerItem } from "../../utils/animations";

const DailyEssentialsSection = () => {
  const [essentials, setEssentials] = useState([]);
  const fallbackImage =
    "https://placehold.co/300x300/008ECC/FFFFFF.png?text=Essentials";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchEssentials = async () => {
      setLoading(true);
      try {
        const { data } = await getAllProducts({ limit: 50 });
        if (!active) return;

        const enriched = data
          .map((product) => {
            const discount = product.discount ?? 0;
            return {
              id: product.id,
              name: product.name,
              category: product.category,
              image: product.image || product.gallery?.[0] || fallbackImage,
              discount,
            };
          })
          .filter((item) => item.discount > 0)
          .sort((a, b) => b.discount - a.discount)
          .slice(0, 6);

        setEssentials(enriched);
        setError("");
      } catch (err) {
        console.error("Failed to load essentials", err);
        if (active) {
          setError(err.message || "Unable to load daily essentials.");
          setEssentials([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchEssentials();

    return () => {
      active = false;
    };
  }, []);

  return (
    <motion.section
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-100px" }}
    >
      <SectionHeader
        title={
          <>
            Daily <span style={{ color: "#008ECC" }}>Essentials</span>
          </>
        }
        linkTo="/category/essentials"
      />
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        variants={staggerContainer}
      >
        {loading && (
          <div className="col-span-full py-6 text-center text-sm text-slate-500">
            Loading daily essentials...
          </div>
        )}
        {error && !loading && (
          <div className="col-span-full py-6 text-center text-sm text-red-500">
            {error}
          </div>
        )}
        {!loading && !error && essentials.length === 0 && (
          <div className="col-span-full py-6 text-center text-sm text-slate-500">
            No essentials deals available yet.
          </div>
        )}
        {essentials.map((item) => (
          <motion.div key={item.name} variants={staggerItem}>
            <Link
              to={`/category/${(item.category || item.name).toLowerCase().replace(/\s+/g, "-")}`}
              className="group block bg-medium-bg rounded-lg p-4 text-center hover:shadow-lg transition-shadow"
            >
              <motion.img
                src={item.image}
                alt={item.name}
                className="h-32 w-full object-contain mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = fallbackImage;
                }}
              />
              <p className="font-semibold text-dark-text">{item.name}</p>
              <p className="font-bold text-lg text-primary">
                UP to {item.discount}% OFF
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};

export default DailyEssentialsSection;
*/

const DailyEssentialsSection = () => null;

export default DailyEssentialsSection;

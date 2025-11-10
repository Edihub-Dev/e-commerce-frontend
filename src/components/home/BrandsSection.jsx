import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { getTopBrands } from "../../utils/api";
import { staggerContainer, staggerItem } from "../../utils/animations";

const BrandsSection = () => {
  const [brands, setBrands] = useState([]);
  const fallbackImage =
    "https://placehold.co/300x240/008ECC/FFFFFF.png?text=Brand";

  useEffect(() => {
    getTopBrands().then((res) => setBrands(res.data));
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
            Top <span style={{ color: "#008ECC" }}>Electronics Brands</span>
          </>
        }
        linkTo="/brands"
      />
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
        variants={staggerContainer}
      >
        {brands.map((brand) => (
          <motion.div
            key={brand.name}
            style={{ backgroundColor: brand.bgColor }}
            className="rounded-lg p-6 flex flex-col justify-between h-52 relative overflow-hidden"
            variants={staggerItem}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
          >
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest px-4 py-1 inline-block rounded"
                style={{
                  color: brand.textColor,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              >
                {brand.name}
              </p>
              <p
                className="text-2xl font-bold mt-2"
                style={{ color: brand.textColor }}
              >
                UP to 80% OFF
              </p>
            </div>
            <Link
              to={`/brand/${brand.name.toLowerCase()}`}
              className="font-semibold hover:underline"
              style={{ color: brand.textColor }}
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
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};

export default BrandsSection;

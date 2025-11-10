import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { getDailyEssentials } from "../../utils/api";
import { staggerContainer, staggerItem } from "../../utils/animations";

const DailyEssentialsSection = () => {
  const [essentials, setEssentials] = useState([]);
  const fallbackImage =
    "https://placehold.co/300x300/008ECC/FFFFFF.png?text=Essentials";

  useEffect(() => {
    getDailyEssentials().then((res) => setEssentials(res.data));
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
        {essentials.map((item) => (
          <motion.div key={item.name} variants={staggerItem}>
            <Link
              to={`/category/${item.name.toLowerCase()}`}
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

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { getTopCategories } from "../../utils/api";
import { staggerContainer, staggerItem } from "../../utils/animations";

const CategoriesSection = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getTopCategories().then((res) => setCategories(res.data));
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
            Shop From <span style={{ color: "#008ECC" }}>Top Categories</span>
          </>
        }
        linkTo="/categories"
      />

      <motion.div
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4 text-center"
        variants={staggerContainer}
      >
        {categories.map((category) => (
          <motion.div key={category.name} variants={staggerItem}>
            <Link
              to={`/category/${category.name.toLowerCase()}`}
              className="group block"
            >
              <motion.div
                className="bg-medium-bg rounded-full w-28 h-28 mx-auto flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-300"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300"
                />
              </motion.div>
              <p className="mt-2 font-semibold text-dark-text group-hover:text-primary">
                {category.name}
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};

export default CategoriesSection;

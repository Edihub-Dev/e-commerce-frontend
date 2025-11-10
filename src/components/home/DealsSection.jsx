import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ProductCard from "../ProductCard";
import SectionHeader from "../SectionHeader";
import { getSmartphoneDeals as getMerchDeals } from "../../utils/api";
import { staggerContainer, staggerItem } from "../../utils/animations";

const DealsSection = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    getMerchDeals().then((res) => setProducts(res.data));
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
              MST Blockchain Official Polo{" "}
              <span style={{ color: "#008ECC" }}>T-Shirt</span>
            </>
          }
          linkTo="/category/mst-blockchain-official-polo-t-shirt"
          linkText="Shop Collection"
        />
        <motion.div
          className="w-full overflow-hidden flex flex-col"
          variants={staggerContainer}
        >
          <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-4">
            {products.map((product, index) => (
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
              href="/category/mst-blockchain-official-polo-t-shirt"
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

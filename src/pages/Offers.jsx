import React from "react";
import { motion } from "framer-motion";
import { pageVariants } from "../utils/animations";

const Offers = () => (
  <motion.div
    className="min-h-[60vh] w-full bg-white"
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
  />
);

export default Offers;

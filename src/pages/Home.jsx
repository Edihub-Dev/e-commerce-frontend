import React from "react";
import { motion } from "framer-motion";
import HeroCarousel from "../components/home/HeroCarousel";
import DealsSection from "../components/home/DealsSection";
import MobileOffersRibbon from "../components/home/MobileOffersRibbon";
// import CategoriesSection from '../components/home/CategoriesSection';
// import BrandsSection from '../components/home/BrandsSection';
// import DailyEssentialsSection from '../components/home/DailyEssentialsSection';
import { pageVariants } from "../utils/animations";

const Home = () => {
  return (
    <motion.div
      className="space-y-8 md:space-y-12 mb-24 md:mb-8"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <HeroCarousel />
      <div className="container mx-auto px-4 space-y-8 md:space-y-12">
        <DealsSection />
        {/* Commented out sections as per request
        <CategoriesSection />
        <BrandsSection />
        <DailyEssentialsSection />
        */}
      </div>
      <MobileOffersRibbon />
    </motion.div>
  );
};

export default Home;

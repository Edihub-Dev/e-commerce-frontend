import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { pageVariants, scaleIn } from "../utils/animations";

const Profile = () => {
  const { user } = useAuth();
  return (
    <motion.div
      className="container mx-auto px-4 py-16"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.h1
        className="text-3xl font-bold mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        My Profile
      </motion.h1>
      <motion.div
        className="bg-white p-8 rounded-lg shadow border"
        variants={scaleIn}
        initial="initial"
        animate="animate"
      >
        <p>
          <strong>Name:</strong> {user?.name ?? "-"}
        </p>
        <p>
          <strong>Email:</strong> {user?.email ?? "-"}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default Profile;

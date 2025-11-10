import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pageVariants } from '../utils/animations';

const NotFound = () => {
    return (
        <motion.div 
            className="container mx-auto px-4 py-16 text-center"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <motion.h1 
                className="text-6xl font-bold text-primary"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
                404
            </motion.h1>
            <motion.h2 
                className="mt-4 text-3xl font-bold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                Page Not Found
            </motion.h2>
            <motion.p 
                className="mt-2 text-gray-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                Sorry, the page you are looking for does not exist.
            </motion.p>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
            >
                <Link to="/" className="mt-8 inline-block bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-dark transition-colors">
                    Go to Homepage
                </Link>
            </motion.div>
        </motion.div>
    );
};

export default NotFound;

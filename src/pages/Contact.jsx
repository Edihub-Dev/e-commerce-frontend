import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants, fadeInUp } from '../utils/animations';

const Contact = () => {
    return (
        <motion.div 
            className="container mx-auto px-4 py-16"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <motion.h1 
                className="text-3xl font-bold mb-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                Contact Us
            </motion.h1>
            <motion.p 
                className="text-lg text-gray-700"
                variants={fadeInUp}
                initial="initial"
                animate="animate"
            >
                If you have any questions, feel free to reach out to us at <a href="mailto:support@megamart.com" className="text-primary">support@megamart.com</a>.
            </motion.p>
        </motion.div>
    );
};

export default Contact;

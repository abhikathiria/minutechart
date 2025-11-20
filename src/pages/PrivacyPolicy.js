import React from 'react';
import { motion } from 'framer-motion';
import { FaLock, FaGlobe, FaCheckCircle, FaTimesCircle, FaChevronRight } from 'react-icons/fa';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const PrivacyPolicy = () => {
    const companyName = "NGraph (a New Tech Infosol Product)";
    const effectiveDate = "November 12, 2025"; // **TODO: Update this date**

    return (
        <div className="min-h-screen bg-[#0b0d10] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                    visible: { transition: { staggerChildren: 0.1 } }
                }}
                className="max-w-6xl mx-auto p-6 md:p-10 bg-gray-900 rounded-xl shadow-2xl border border-indigo-900/50"
            >
                <motion.header variants={fadeUp} className="text-center mb-10 border-b border-indigo-700/50 pb-5">
                    <FaLock className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white">Privacy Policy</h1>
                    <p className="text-sm text-gray-500 mt-2">Effective Date: {effectiveDate}</p>
                    <p className="text-md text-gray-400 mt-3">
                        Your privacy and trust are of paramount importance to {companyName}.
                    </p>
                </motion.header>

                <motion.section variants={fadeUp} className="mb-8">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center gap-2"><FaChevronRight className='w-4 h-4'/> 1. Information We Collect</h2>
                    <p className="text-gray-300 mb-3">
                        We collect information necessary to provide and secure the **NGraph** service.
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2 text-gray-400">
                        <li>**Account Data:** Name, email, company name, phone number, and billing information (for subscriptions).</li>
                        <li>**Operational Data (Non-Personal):** Database connection strings, SQL query structures, dashboard configuration settings, and module usage metrics. **We do not store the underlying raw data from your SQL databases.**</li>
                        <li>**Usage Data:** IP address, browser type, login dates, and activities within the NGraph platform for security and improvement.</li>
                    </ul>
                </motion.section>

                <motion.section variants={fadeUp} className="mb-8">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center gap-2"><FaChevronRight className='w-4 h-4'/> 2. How We Use Your Information</h2>
                    <p className="text-gray-300 mb-3">
                        We use the collected information for the following purposes:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2 text-gray-400">
                        <li>**Service Delivery:** To manage your account, process subscriptions, and execute dashboard queries.</li>
                        <li>**Security:** To protect the integrity and security of the NGraph platform and prevent fraud.</li>
                        <li>**Customer Support:** To provide technical assistance and respond to inquiries or complaints.</li>
                        <li>**Improvement:** To monitor usage trends and debug/enhance the platform's features and performance.</li>
                    </ul>
                </motion.section>

                <motion.section variants={fadeUp} className="mb-8">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center gap-2"><FaChevronRight className='w-4 h-4'/> 3. Data Security and Tenancy</h2>
                    <p className="text-gray-300 mb-3">
                        We employ industry-standard security measures, including encryption, to protect your data.
                    </p>
                    <div className="bg-indigo-900/50 p-4 rounded-lg text-sm">
                        <p className="font-semibold text-white mb-2">Note on Multi-Tenancy:</p>
                        <p className="text-gray-300">NGraph ensures strict **data isolation** between separate client accounts. Your configuration data and non-personal operational metrics are logically separated and secured, ensuring one tenant cannot access another's data or configuration.</p>
                    </div>
                </motion.section>

                <motion.section variants={fadeUp} className="mb-8">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center gap-2"><FaChevronRight className='w-4 h-4'/> 4. Disclosure of Information</h2>
                    <p className="text-gray-300">
                        We will not share your personal data with third parties except in the following limited circumstances:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2 text-gray-400">
                        <li>With trusted third-party service providers (e.g., payment processors, hosting services) who assist us in operating the platform.</li>
                        <li>When required by law or legal process.</li>
                        <li>To enforce our Terms of Service or protect our rights.</li>
                    </ul>
                </motion.section>

                <motion.footer variants={fadeUp} className="mt-10 border-t border-indigo-700/50 pt-5 text-center">
                    <p className="text-gray-500 text-sm">
                        For any questions regarding this policy, please contact us at: info@ntillp.com
                    </p>
                </motion.footer>
            </motion.div>
        </div>
    );
};

export default PrivacyPolicy;
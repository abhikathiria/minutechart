import React from 'react';
import { motion } from 'framer-motion';
import { FaFileContract, FaUserShield, FaChartArea, FaChevronRight } from 'react-icons/fa';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const TermsOfService = () => {
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
                    <FaFileContract className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white">Terms of Service</h1>
                    <p className="text-sm text-gray-500 mt-2">Effective Date: {effectiveDate}</p>
                    <p className="text-md text-gray-400 mt-3">
                        These Terms govern your use of the **NGraph** analytics platform.
                    </p>
                </motion.header>

                <motion.section variants={fadeUp} className="mb-8">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center gap-2"><FaChevronRight className='w-4 h-4'/> 1. Acceptance of Terms</h2>
                    <p className="text-gray-300">
                        By accessing or using the NGraph service, you agree to be bound by these Terms of Service. If you are using the Service on behalf of an organization, you are agreeing to these Terms for that organization and warrant that you have the authority to do so.
                    </p>
                </motion.section>

                <motion.section variants={fadeUp} className="mb-8">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center gap-2"><FaChevronRight className='w-4 h-4'/> 2. Description of Service</h2>
                    <p className="text-gray-300">
                        NGraph provides a cloud-based, multi-tenant dashboard and analytics platform that connects securely to customer SQL databases to display real-time visualizations.
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2 text-gray-400 mt-3">
                        <li>**Data Responsibility:** You acknowledge that **NGraph** does not host or process your raw database content. We only process metadata (queries, connection strings) and the resultant visualization data.</li>
                        <li>**Service Levels:** Availability and performance are subject to your purchased subscription plan.</li>
                    </ul>
                </motion.section>

                <motion.section variants={fadeUp} className="mb-8">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center gap-2"><FaChevronRight className='w-4 h-4'/> 3. User Accounts and Roles</h2>
                    <div className="bg-indigo-900/50 p-4 rounded-lg text-sm">
                        <ul className="list-disc list-inside ml-4 space-y-2 text-gray-300">
                            <li>**Customer/User:** Holds a paid subscription and uses the visualization features.</li>
                            <li>**Admin:** Manages a defined set of Customer/User accounts, handles billing, and may configure modules.</li>
                            <li>**SuperAdmin:** Holds ultimate control over the platform, including system-wide settings, user management, and administrative configuration.</li>
                        </ul>
                        <p className="mt-3 text-white font-semibold">
                            You are responsible for maintaining the confidentiality of your account password and access keys.
                        </p>
                    </div>
                </motion.section>

                <motion.section variants={fadeUp} className="mb-8">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center gap-2"><FaChevronRight className='w-4 h-4'/> 4. Subscriptions and Payment</h2>
                    <p className="text-gray-300">
                        Access to the Service is provided on a subscription basis. By purchasing a subscription, you agree to pay {companyName} the subscription fees indicated for that service.
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2 text-gray-400 mt-3">
                        <li>**Billing:** Fees are billed in advance on a recurring, periodic basis (e.g., monthly or annually).</li>
                        <li>**Cancellations:** Subscriptions may be cancelled at any time, but no refunds will be provided for any unused portion of the subscription period.</li>
                    </ul>
                </motion.section>

                <motion.section variants={fadeUp} className="mb-8">
                    <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center gap-2"><FaChevronRight className='w-4 h-4'/> 5. Termination</h2>
                    <p className="text-gray-300">
                        {companyName} reserves the right to suspend or terminate your account and access to the Service immediately, without prior notice or liability, if you breach these Terms.
                    </p>
                </motion.section>

                <motion.footer variants={fadeUp} className="mt-10 border-t border-indigo-700/50 pt-5 text-center">
                    <p className="text-gray-500 text-sm">
                        For questions concerning these Terms, please contact us at: info@ntillp.com
                    </p>
                </motion.footer>
            </motion.div>
        </div>
    );
};

export default TermsOfService;
import React from "react";

export default function ScreenLoader({ text = "Just a moment… we’ll take you there soon." }) {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-[9999]">
            {/* Spinner */}
            <div className="w-16 h-16 border-4 border-blue-300 border-t-blue-700 rounded-full animate-spin"></div>

            {/* Message */}
            <p className="mt-6 text-lg font-medium text-blue-900 text-center px-4">
                {text}
            </p>
        </div>
    );
}

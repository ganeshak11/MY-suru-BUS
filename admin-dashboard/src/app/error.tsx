'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[AppError]', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-md">
                <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
                    Something went wrong
                </h2>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                </p>
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}

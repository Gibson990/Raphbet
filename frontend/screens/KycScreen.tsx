import React, { useState } from 'react';
import { ShieldExclamationIcon } from '../components/icons';
import { ToastMessage } from '../App';

interface KycScreenProps {
    onSubmit: () => void;
    addToast: (message: string, type: ToastMessage['type']) => void;
}

const KycScreen: React.FC<KycScreenProps> = ({ onSubmit, addToast }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            addToast('Please upload your NIDA card.', 'error');
            return;
        }
        setIsSubmitting(true);
        addToast('Submitting for verification...', 'info');
        // Simulate network delay
        setTimeout(() => {
            setIsSubmitting(false);
            addToast('Verification successful! Welcome to Raph Bet.', 'success');
            onSubmit();
        }, 2000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark p-4">
            <div className="w-full max-w-md mx-auto bg-white dark:bg-neutral-dark-gray rounded-xl shadow-lg p-8 text-center">
                <ShieldExclamationIcon className="h-16 w-16 text-primary mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-neutral-dark dark:text-neutral-light mb-2">
                    Account Verification Required
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    To comply with regulations, please upload a clear picture of your National ID (NIDA) to activate your account.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label
                            htmlFor="nida-upload"
                            className="relative cursor-pointer bg-white dark:bg-neutral-gray rounded-md font-medium text-primary hover:text-orange-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                        >
                            <div className="w-full flex justify-center items-center px-6 py-10 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </svg>
                                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                        <span className="p-2">Upload a file</span>
                                        <input id="nida-upload" name="nida-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg" />
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                                </div>
                            </div>
                        </label>
                        {file && (
                           <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                                Selected file: <span className="font-semibold">{file.name}</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!file || isSubmitting}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Verifying...' : 'Submit for Verification'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default KycScreen;

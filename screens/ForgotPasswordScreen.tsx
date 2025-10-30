import React, { useState } from 'react';
import { SoccerBallIcon } from '../components/icons';
import type { ToastMessage } from '../App';

interface ForgotPasswordScreenProps {
    addToast: (message: string, type: ToastMessage['type']) => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ addToast }) => {
    const [email, setEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            addToast('Please enter your email address', 'error');
            return;
        }

        // Mock password reset email
        setResetSent(true);
        addToast('Password reset instructions sent to your email!', 'success');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark p-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="flex flex-col items-center mb-8">
                    <SoccerBallIcon className="h-16 w-16 text-primary" />
                    <h1 className="text-4xl font-bold text-neutral-dark dark:text-neutral-light mt-2">
                        Reset <span className="text-primary">Password</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {resetSent 
                            ? 'Check your email for reset instructions'
                            : 'Enter your email to reset your password'
                        }
                    </p>
                </div>

                <div className="bg-white dark:bg-neutral-dark-gray rounded-xl shadow-lg p-6">
                    {!resetSent ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Send Reset Instructions
                            </button>
                        </form>
                    ) : (
                        <div className="text-center">
                            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                                We've sent password reset instructions to:
                                <br />
                                <strong className="text-primary">{email}</strong>
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Didn't receive the email? Check your spam folder or
                                <button 
                                    onClick={() => setResetSent(false)}
                                    className="text-primary hover:text-orange-600 ml-1"
                                >
                                    try again
                                </button>
                            </p>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <a 
                            href="/login"
                            className="text-sm text-primary hover:text-orange-600"
                        >
                            Back to Sign In
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordScreen;
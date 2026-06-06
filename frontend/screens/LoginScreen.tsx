import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ToastMessage } from '../App';
import { GoogleIcon, SoccerBallIcon } from '../components/icons';

interface LoginScreenProps {
    addToast: (message: string, type: ToastMessage['type']) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ addToast }) => {
    const { login } = useAuth();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const handlePhoneSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation for Tanzanian numbers
        if (/^0[67]\d{8}$/.test(phone)) {
            setOtpSent(true);
            addToast('OTP sent to your number!', 'success');
        } else {
            addToast('Please enter a valid Tanzanian mobile number (e.g., 0712345678).', 'error');
        }
    };

    const handleOtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (otp === '1234') { // Mock OTP
            login('phone', phone);
            addToast('Login successful!', 'success');
        } else {
            addToast('Invalid OTP.', 'error');
        }
    };

    const handleGoogleLogin = () => {
        login('google', 'user@raphbet.com');
        addToast('Login successful!', 'success');
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark p-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="flex flex-col items-center mb-8">
                    <SoccerBallIcon className="h-16 w-16 text-primary" />
                    <h1 className="text-4xl font-bold text-neutral-dark dark:text-neutral-light mt-2">
                        Raph <span className="text-primary">Bet</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome Back</p>
                </div>

                <div className="bg-white dark:bg-neutral-dark-gray rounded-xl shadow-lg p-6 space-y-6">
                    {!otpSent ? (
                        <form onSubmit={handlePhoneSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Mobile Number
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="0712 345 678"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Send OTP
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleOtpSubmit} className="space-y-4">
                             <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Enter OTP
                                </label>
                                <input
                                    id="otp"
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="1234"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Verify & Login
                            </button>
                            <button onClick={() => setOtpSent(false)} className="text-center w-full text-sm text-primary hover:underline">
                                Change number
                            </button>
                        </form>
                    )}
                    <div className="relative flex items-center">
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-gray hover:bg-gray-50 dark:hover:bg-neutral-dark-gray"
                    >
                        <GoogleIcon className="mr-2 w-5 h-5" />
                        Continue with Google
                    </button>
                </div>
                
                <a
                    href="/admin.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 block w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-accent underline transition-colors"
                >
                    Go to Admin Dashboard
                </a>
            </div>
        </div>
    );
};

export default LoginScreen;
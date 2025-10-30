import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ToastMessage } from '../App';
import { GoogleIcon, SoccerBallIcon } from '../components/icons';
import { useNavigate } from 'react-router-dom';

interface SignupScreenProps {
    addToast: (message: string, type: ToastMessage['type']) => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ addToast }) => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        acceptedTerms: false
    });
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        feedback: ''
    });

    const validatePassword = (password: string) => {
        let score = 0;
        let feedback = [];

        if (password.length >= 8) score++;
        else feedback.push('At least 8 characters');

        if (/[A-Z]/.test(password)) score++;
        else feedback.push('One uppercase letter');

        if (/[a-z]/.test(password)) score++;
        else feedback.push('One lowercase letter');

        if (/[0-9]/.test(password)) score++;
        else feedback.push('One number');

        if (/[^A-Za-z0-9]/.test(password)) score++;
        else feedback.push('One special character');

        setPasswordStrength({
            score,
            feedback: feedback.join(', ')
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (name === 'password') {
            validatePassword(value);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate form
        if (!formData.email && !formData.phone) {
            addToast('Please provide either email or phone number', 'error');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            addToast('Passwords do not match', 'error');
            return;
        }

        if (passwordStrength.score < 3) {
            addToast('Please use a stronger password', 'error');
            return;
        }

        if (!formData.acceptedTerms) {
            addToast('Please accept the terms and conditions', 'error');
            return;
        }

        // Mock signup success
        login(formData.email ? 'google' : 'phone', formData.email || formData.phone);
        addToast('Account created successfully!', 'success');
        navigate('/');
    };

    const handleGoogleSignup = () => {
        login('google', 'user@raphbet.com');
        addToast('Account created with Google successfully!', 'success');
        navigate('/');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="flex flex-col items-center mb-8">
                    <SoccerBallIcon className="h-16 w-16 text-primary" />
                    <h1 className="text-4xl font-bold text-neutral-dark dark:text-white mt-2">
                        Join <span className="text-primary">Raph Bet</span>
                    </h1>
                    <p className="text-gray-500 dark:text-white mt-1">Create your account</p>
                </div>

                <div className="bg-white dark:bg-neutral-dark-gray rounded-xl shadow-lg p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-white">
                                Mobile Number (Optional if email provided)
                            </label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="0712 345 678"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
                            />
                            {formData.password && (
                                <div className="mt-1">
                                    <div className="h-2 grid grid-cols-5 gap-1">
                                        {[1,2,3,4,5].map((level) => (
                                            <div 
                                                key={level}
                                                className={`h-full rounded ${
                                                    level <= passwordStrength.score
                                                        ? 'bg-primary'
                                                        : 'bg-gray-200 dark:bg-gray-700'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    {passwordStrength.feedback && (
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {passwordStrength.feedback}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-transparent"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                id="acceptedTerms"
                                name="acceptedTerms"
                                type="checkbox"
                                checked={formData.acceptedTerms}
                                onChange={handleChange}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <label htmlFor="acceptedTerms" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                I accept the <a href="/terms" className="text-primary hover:text-orange-600">Terms and Conditions</a>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Create Account
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="relative flex items-center">
                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                            <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                        </div>

                        <button
                            onClick={handleGoogleSignup}
                            className="mt-6 w-full flex items-center justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-gray hover:bg-gray-50 dark:hover:bg-neutral-dark-gray"
                        >
                            <GoogleIcon className="mr-2 w-5 h-5" />
                            Sign up with Google
                        </button>
                    </div>

                    <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Already have an account?{' '}
                        <a href="/login" className="text-primary hover:text-orange-600">
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupScreen;
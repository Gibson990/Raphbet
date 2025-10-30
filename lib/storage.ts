// Storage keys
const STORAGE_KEYS = {
    AUTH: 'raphbet.auth',
    WALLET: 'raphbet.wallet',
    BETSLIP: 'raphbet.betslip',
    BETS: 'raphbet.bets',
    TRANSACTIONS: 'raphbet.transactions',
    PREFERENCES: 'raphbet.preferences'
} as const;

// Type-safe storage value validation
const isValidJSON = (str: string): boolean => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};

// Storage adapter with type safety and namespacing
export const storage = {
    get: <T>(key: keyof typeof STORAGE_KEYS): T | null => {
        const item = localStorage.getItem(STORAGE_KEYS[key]);
        if (!item) return null;
        return isValidJSON(item) ? JSON.parse(item) : null;
    },

    set: <T>(key: keyof typeof STORAGE_KEYS, value: T): void => {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
    },

    remove: (key: keyof typeof STORAGE_KEYS): void => {
        localStorage.removeItem(STORAGE_KEYS[key]);
    },

    clear: (preserveKeys: Array<keyof typeof STORAGE_KEYS> = []): void => {
        Object.keys(STORAGE_KEYS).forEach(key => {
            if (!preserveKeys.includes(key as keyof typeof STORAGE_KEYS)) {
                localStorage.removeItem(STORAGE_KEYS[key as keyof typeof STORAGE_KEYS]);
            }
        });
    }
};

// Mock data seeding for development
export const seedMockData = (isDev: boolean = false) => {
    if (!isDev) return;

    // Seed mock wallet data if empty
    if (!storage.get('WALLET')) {
        storage.set('WALLET', {
            balance: 100000, // 100,000 TSH
            transactions: [
                {
                    id: 'mock-tx-1',
                    type: 'Top-up',
                    amount: 100000,
                    description: 'Initial balance',
                    date: new Date().toISOString()
                }
            ]
        });
    }

    // Seed mock preferences if empty
    if (!storage.get('PREFERENCES')) {
        storage.set('PREFERENCES', {
            darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            oddsFormat: 'decimal',
            language: 'en'
        });
    }
};

// Usage example:
/*
import { storage, seedMockData } from './lib/storage';

// In development environment
if (process.env.NODE_ENV === 'development') {
    seedMockData(true);
}

// Get typed data
const auth = storage.get<{user: User | null}>('AUTH');
const wallet = storage.get<{balance: number}>('WALLET');

// Store data
storage.set('WALLET', { balance: 50000 });

// Clear all except preferences
storage.clear(['PREFERENCES']);
*/
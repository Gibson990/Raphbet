import { useOutletContext } from 'react-router-dom';
import type { UseVirtualWalletReturn } from './useVirtualWallet';
import type { ToastMessage } from '../App';

/** Shared data passed from App down to the routed screens via <Outlet context>. */
export interface AppOutletContext {
  wallet: UseVirtualWalletReturn;
  addToast: (message: string, type?: ToastMessage['type']) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useAppOutlet = () => useOutletContext<AppOutletContext>();

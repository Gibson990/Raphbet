import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/layout/BrandLogo';
import TermsContent from '../components/auth/TermsContent';

export type LegalDoc = 'terms' | 'privacy' | 'responsible';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <>
    <h3 className="font-bold text-base text-neutral-dark dark:text-white">{title}</h3>
    <p>{children}</p>
  </>
);

const PrivacyContent: React.FC = () => (
  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4">
    <Section title="1. Data We Collect">We collect the information you provide at sign-up (phone or email), KYC documents used for verification, and basic usage data needed to operate the service.</Section>
    <Section title="2. How We Use It">Your data is used to create and secure your account, verify your identity (KYC), prevent fraud, and improve the product. We do not sell your personal data.</Section>
    <Section title="3. Storage & Security">Data is stored securely and access is restricted. KYC documents are handled by our verification provider and retained only as required by regulation.</Section>
    <Section title="4. Your Rights">You may request access to, correction of, or deletion of your personal data, subject to legal retention requirements. Contact support@raphbet.com.</Section>
    <Section title="5. Cookies">We use only the storage necessary for the app to function (such as your session and currency preference).</Section>
  </div>
);

const ResponsibleContent: React.FC = () => (
  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4">
    <Section title="Bet for fun, not for income">Betting should be entertainment, never a way to make money or recover losses. Only stake what you can comfortably afford to lose.</Section>
    <Section title="Stay in control">Set yourself limits on time and budget. Take regular breaks and never bet while stressed, upset, or under the influence.</Section>
    <Section title="18+ only">You must be at least 18 years old to use Raphbet. Underage gambling is illegal and strictly prohibited.</Section>
    <Section title="Warning signs">Chasing losses, betting more than planned, or letting betting affect your work or relationships are signs to step back.</Section>
    <Section title="Get help">If gambling stops being fun, seek support. In Tanzania, contact the Gaming Board of Tanzania (GBT) for guidance and a list of support resources.</Section>
  </div>
);

const DOCS: Record<LegalDoc, { title: string; body: React.ReactNode }> = {
  terms: { title: 'Terms & Conditions', body: <TermsContent /> },
  privacy: { title: 'Privacy Policy', body: <PrivacyContent /> },
  responsible: { title: 'Responsible Gaming', body: <ResponsibleContent /> },
};

const LegalScreen: React.FC<{ doc: LegalDoc }> = ({ doc }) => {
  const navigate = useNavigate();
  const { title, body } = DOCS[doc];
  return (
    <div className="min-h-screen bg-neutral-light-gray dark:bg-neutral-dark">
      <header className="bg-white dark:bg-neutral-dark-gray border-b border-gray-200 dark:border-neutral-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-sm font-semibold text-gray-500 hover:text-primary">← Back</button>
          <BrandLogo size="sm" />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-5">{title}</h1>
        <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-5 sm:p-7">
          {body}
        </div>
        <p className="text-xs text-gray-400 mt-6">Raphbet operates with virtual credits for entertainment. Play responsibly. 18+.</p>
      </main>
    </div>
  );
};

export default LegalScreen;

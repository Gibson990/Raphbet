import React from 'react';

const TermsContent: React.FC = () => {
    return (
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-bold text-base text-neutral-dark dark:text-white">1. Introduction</h3>
            <p>Welcome to Raphbet. These terms govern your use of the Raphbet platform, where you can place wagers on football events such as the FIFA World Cup. By creating an account you agree to these terms. It is your responsibility to ensure that online betting is legal in your jurisdiction before using the service.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">2. Eligibility</h3>
            <p>You must be 18 years of age or older to use Raphbet. By creating an account you confirm that you are of legal age and that participation in real-money betting is permitted where you live.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">3. Account Registration &amp; Verification (KYC)</h3>
            <p>To deposit, bet or withdraw you must register an account and complete identity verification (KYC) with a valid government-issued ID. All information must be accurate and truthful. We may suspend or close accounts with incomplete, duplicate or false information, and may request re-verification at any time.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">4. Wallet &amp; Funds</h3>
            <p>Your Raphbet wallet balance is denominated in US dollars (USD) and represents real funds. Placing a bet debits your wallet; winning bets are credited at the odds shown when the bet was accepted. Odds are priced by Raphbet and are final once a bet is placed. We do not offer credit — you can only bet funds available in your wallet.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">5. Deposits and Withdrawals (Cryptocurrency)</h3>
            <p>Deposits and withdrawals are processed in cryptocurrency (such as USDT or BTC) through our payment provider; your wallet is credited with the equivalent USD value at the time of deposit. Withdrawals are paid to the crypto wallet address you provide and may be subject to identity verification, security review and minimum/maximum limits. You are solely responsible for providing a correct withdrawal address — transactions sent on-chain cannot be reversed.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">6. Bet Settlement</h3>
            <p>Bets are settled on official full-time results (including any markets explicitly offered, such as totals or both-teams-to-score). If a match is abandoned, postponed or voided, affected bets are voided and stakes returned to your wallet. In the event of an obvious pricing or system error, Raphbet reserves the right to void the affected bet.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">7. Responsible Gaming</h3>
            <p>Betting should be entertainment, not a source of income or a way to recover losses. Only stake what you can comfortably afford to lose. If gambling stops being fun, please take a break and seek support. You must be 18+.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">8. Prohibited Activities</h3>
            <p>Fraud, money laundering, use of multiple accounts, automated bots, collusion, or exploitation of software vulnerabilities is strictly prohibited and will result in account closure and forfeiture of related funds.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">9. Amendments</h3>
            <p>We may amend these terms at any time. Changes take effect once posted on the platform. Your continued use of the service constitutes acceptance of the updated terms.</p>
        </div>
    );
};

export default TermsContent;

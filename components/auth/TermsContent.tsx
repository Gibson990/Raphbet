import React from 'react';

const TermsContent: React.FC = () => {
    return (
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-6 max-h-[60vh] overflow-y-auto p-4">
            <h3 className="font-bold text-base text-neutral-dark dark:text-white">1. Introduction</h3>
            <p>Welcome to Raph Bet. These terms and conditions outline the rules and regulations for the use of Raph Bet's services, in accordance with the Gaming Act, Cap. 41 of the laws of Tanzania, and as regulated by the Gaming Board of Tanzania (GBT).</p>
            
            <h3 className="font-bold text-base text-neutral-dark dark:text-white">2. Eligibility</h3>
            <p>You must be 18 years of age or older to use our services. By creating an account, you confirm that you are of legal age. It is your responsibility to ensure that your participation is legal in your jurisdiction.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">3. Account Registration & Verification (KYC)</h3>
            <p>To place bets, you must register an account and complete our Know Your Customer (KYC) process. This requires providing a valid government-issued identification, such as a National Identification Card (NIDA). All information provided must be accurate and truthful. We reserve the right to suspend accounts with incomplete or false information.</p>
            
            <h3 className="font-bold text-base text-neutral-dark dark:text-white">4. Virtual Credits</h3>
            <p>Raph Bet operates using virtual credits only. These credits have no monetary value and cannot be exchanged for real money. This platform is for entertainment purposes only. Any balance shown is purely for simulation.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">5. Responsible Gaming</h3>
            <p>We are committed to responsible gaming. Betting should be an enjoyable pastime, not a way to make money. Please bet responsibly and only wager what you can afford to lose. If you feel you may have a gambling problem, please seek help from relevant support organizations.</p>

             <h3 className="font-bold text-base text-neutral-dark dark:text-white">6. Deposits and Withdrawals</h3>
            <p>All financial transactions, including deposits via mobile money (Airtel Money, M-Pesa) and other methods, are simulated. No real money is processed. Withdrawals are also simulated and result in the transfer of virtual credits only.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">7. Prohibited Activities</h3>
            <p>Any fraudulent activity, including the use of multiple accounts, automated bots, or exploitation of software vulnerabilities, is strictly prohibited and will result in immediate account termination.</p>

            <h3 className="font-bold text-base text-neutral-dark dark:text-white">8. Amendments</h3>
            <p>We reserve the right to amend these terms and conditions at any time. Any changes will be effective immediately upon posting on our platform. Your continued use of the service constitutes acceptance of the new terms.</p>
        </div>
    );
};

export default TermsContent;

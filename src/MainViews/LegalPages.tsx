import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export const LegalPages = ({ onBack }: any) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-black text-zinc-300 relative pb-32 font-sans">
      
      {/* GLOBAL BACKDROP */}
      <div className="fixed inset-0 z-[-1] bg-black pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
      </div>

      {/* HEADER WITH ANTI-COLLISION PADDING */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-zinc-800 pr-16 sm:pr-24 shadow-xl">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </button>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
          Legal & Compliance
        </h1>
      </div>

      <div className="sticky top-[93px] z-40 flex border-b border-zinc-800 bg-black/90 backdrop-blur-md shadow-md">
        <button 
          onClick={() => setActiveTab('privacy')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors ${
            activeTab === 'privacy' ? 'bg-zinc-900 text-[#fe9a00] border-b-2 border-[#fe9a00]' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Shield className="w-4 h-4" /> Privacy Policy
        </button>
        <button 
          onClick={() => setActiveTab('terms')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-colors ${
            activeTab === 'terms' ? 'bg-zinc-900 text-[#fe9a00] border-b-2 border-[#fe9a00]' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <FileText className="w-4 h-4" /> Terms of Service
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="prose prose-invert prose-zinc max-w-none prose-headings:font-black prose-headings:italic prose-headings:uppercase prose-headings:tracking-tighter prose-h2:text-2xl prose-h2:text-white prose-p:text-sm prose-p:font-bold prose-p:leading-relaxed prose-p:text-zinc-400 mb-12">
          
          {activeTab === 'privacy' && (
            <div className="animate-fade-in">
              <h2>Privacy Policy</h2>
              <p>Last Updated: August 2026</p>

              <div className="mt-8 space-y-8">
                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">1. Information We Collect</h3>
                  <p>When you register for an AM Crew account, subscribe to Saturday AM+, or make a purchase in the AM Shop, we collect information that identifies you. This may include your name, email address, country/county of residence, and payment information (processed securely via third-party providers).</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">2. How We Use Your Information</h3>
                  <p>We use the information we collect to operate, maintain, and provide the features and functionality of the App. This includes processing subscriptions, delivering merchandise, calculating global leaderboard statistics, and providing customer support.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">3. Third-Party Services</h3>
                  <p>We do not sell your data. We share information with trusted third parties only to the extent necessary to run the App (e.g., Stripe for payments, Shopify for merchandise fulfillment, and Supabase for secure database hosting).</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">4. Data Security</h3>
                  <p>We implement appropriate technical and organizational security measures to protect your personal information against accidental or unlawful destruction, loss, alteration, and unauthorized disclosure.</p>
                </section>
                
                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">5. Contact Us</h3>
                  <p>If you have any questions about this Privacy Policy, please contact us at support@saturday-am.com.</p>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="animate-fade-in">
              <h2>Terms of Service</h2>
              <p>Last Updated: August 2026</p>

              <div className="mt-8 space-y-8">
                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">1. Acceptance of Terms</h3>
                  <p>By downloading, accessing, or using the Saturday AM app, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">2. User Conduct & Account Termination</h3>
                  <p>Saturday AM fosters a diverse and welcoming community. We reserve the right to immediately suspend or permanently ban any user account without prior notice or refund if we determine that the user has engaged in:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2 text-sm font-bold text-zinc-400">
                    <li>Harassment, hate speech, bullying, or abusive behavior toward creators, staff, or other users.</li>
                    <li>Uploading or sharing offensive, illegal, or sexually explicit content.</li>
                    <li>Using bots, scripts, or exploits to manipulate the Super Hype leaderboards, voting systems, or fandom point tracking.</li>
                    <li>Attempting to bypass paywalls or illegally distributing premium Saturday AM content.</li>
                  </ul>
                  <p className="mt-3">Decisions regarding account bans are at the sole discretion of the Saturday AM moderation team and are final.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">3. Refund Policy</h3>
                  <p><strong>Digital Subscriptions:</strong> Due to the immediate access granted to our digital manga vault, all subscriptions to Saturday AM+ and individual digital purchases are final and non-refundable. If your account is terminated due to a violation of our User Conduct policy, you will not receive a refund for any remaining time on your active subscription. You may cancel your recurring subscription at any time through your account settings to prevent future charges.</p>
                  <p className="mt-3"><strong>Physical Merchandise:</strong> Items purchased through the AM Shop are eligible for return or exchange within 30 days of delivery, provided the items are unworn, unwashed, and in their original packaging. Please contact support to initiate a physical return.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">4. Intellectual Property</h3>
                  <p>All manga, artwork, logos, and digital assets within the App are the exclusive property of Saturday AM and its creators. Unauthorized reproduction, distribution, or scraping of content is strictly prohibited.</p>
                </section>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM THUMB ZONE RETURN */}
        <div className="mt-12 border-t border-zinc-800 pt-8">
          <button 
            onClick={onBack}
            className="w-full max-w-sm mx-auto py-4 bg-zinc-900 border border-zinc-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Return to App
          </button>
        </div>

      </div>
    </div>
  );
};
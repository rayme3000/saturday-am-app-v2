import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, FileText, AlertTriangle } from 'lucide-react';

export const LegalPages = ({ onBack }: any) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  // Scroll to top when switching tabs
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-black text-zinc-300 relative pb-24 font-sans">
      
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-zinc-800">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </button>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
          Legal & Compliance
        </h1>
      </div>

      {/* TABS */}
      <div className="sticky top-[93px] z-40 flex border-b border-zinc-800 bg-black/90 backdrop-blur-md">
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

      {/* CONTENT AREA */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        
        {/* DEV WARNING */}
        <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-red-400 font-black uppercase tracking-widest text-[10px] mb-1">Developer Notice</span>
            <span className="text-zinc-400 text-xs font-bold leading-relaxed">
              This is placeholder text designed to pass basic App Store and payment processor UI checks. You must replace this with your official legal documentation before processing real transactions.
            </span>
          </div>
        </div>

        <div className="prose prose-invert prose-zinc max-w-none prose-headings:font-black prose-headings:italic prose-headings:uppercase prose-headings:tracking-tighter prose-h2:text-2xl prose-h2:text-white prose-p:text-sm prose-p:font-bold prose-p:leading-relaxed prose-p:text-zinc-400">
          
          {activeTab === 'privacy' && (
            <div className="animate-fade-in">
              <h2>Privacy Policy</h2>
              <p>Last Updated: [Insert Date]</p>

              <div className="mt-8 space-y-6">
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
                  <p>If you have any questions about this Privacy Policy, please contact us at [Insert Support Email].</p>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="animate-fade-in">
              <h2>Terms of Service</h2>
              <p>Last Updated: [Insert Date]</p>

              <div className="mt-8 space-y-6">
                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">1. Acceptance of Terms</h3>
                  <p>By downloading, accessing, or using the Saturday AM app, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">2. Saturday AM+ Subscriptions</h3>
                  <p>Subscriptions to Saturday AM+ are billed on a recurring basis (monthly or annually) depending on the plan selected. You may cancel your subscription at any time through your account settings. Cancellations apply to the following billing cycle, and no partial refunds will be provided.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">3. User Conduct</h3>
                  <p>Users must not engage in harassment, post offensive content, or attempt to manipulate the Super Hype leaderboards. Violation of these rules may result in immediate account termination without refund.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">4. Intellectual Property</h3>
                  <p>All manga, artwork, logos, and digital assets within the App are the exclusive property of Saturday AM and its creators. Unauthorized reproduction, distribution, or scraping of content is strictly prohibited.</p>
                </section>
                
                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">5. Purchases & Refunds</h3>
                  <p>Physical merchandise purchased through the AM Shop is subject to our standard shipping and return policies. Digital subscription purchases are final and non-refundable except where required by law.</p>
                </section>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
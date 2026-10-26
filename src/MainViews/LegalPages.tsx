import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, FileText, Scale } from 'lucide-react';

export const LegalPages = ({ onBack }: any) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'dmca_ai'>('privacy');

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
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </button>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
          Legal & Compliance
        </h1>
      </div>

      <div className="sticky top-[93px] z-40 flex border-b border-zinc-800 bg-black/90 backdrop-blur-md shadow-md overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('privacy')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'privacy' ? 'bg-zinc-900 text-[#fe9a00] border-b-2 border-[#fe9a00]' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Shield className="w-4 h-4 shrink-0" /> Privacy & Data
        </button>
        <button 
          onClick={() => setActiveTab('terms')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'terms' ? 'bg-zinc-900 text-[#fe9a00] border-b-2 border-[#fe9a00]' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" /> Terms of Service
        </button>
        <button 
          onClick={() => setActiveTab('dmca_ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'dmca_ai' ? 'bg-zinc-900 text-[#fe9a00] border-b-2 border-[#fe9a00]' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" /> DMCA, AI & Safety
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="prose prose-invert prose-zinc max-w-none prose-headings:font-black prose-headings:italic prose-headings:uppercase prose-headings:tracking-tighter prose-h2:text-2xl prose-h2:text-white prose-p:text-sm prose-p:font-bold prose-p:leading-relaxed prose-p:text-zinc-400 mb-12">
          
          {activeTab === 'privacy' && (
            <div className="animate-fade-in">
              <h2>Privacy Policy & Data Disclosures</h2>
              <p>Last Updated: October 2026</p>

              <div className="mt-8 space-y-8">
                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">1. Explicit List of Information We Collect</h3>
                  <p>When you register for a Saturday AM account, subscribe to Saturday AM+, interact with manga chapters, or make a purchase, we collect the following categories of personal and behavioral data:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2 text-sm font-bold text-zinc-400">
                    <li><strong>Account & Identity Data:</strong> Your first and last name, username, email address, country/region of residence, and (only when redeeming physical prize/store bundles) physical shipping address, phone number, and date of birth.</li>
                    <li><strong>Reading & Behavioral Telemetry:</strong> Chapters read, page-level reading progress (`reading_history`), favorite/bookshelf series, Hypes given, Smart Comments/Emoji reactions, banner clicks, and series page visits (`useTelemetry`) used to calculate Fandom Scores and global leaderboards.</li>
                    <li><strong>Payment & Transaction Data:</strong> All credit/debit card numbers and billing credentials are tokenized and processed directly by <strong>Stripe</strong> or <strong>Shopify</strong>. Saturday AM never stores raw credit card numbers or CVV security codes on our servers.</li>
                    <li><strong>Device & Local Storage Data:</strong> Browser local/session storage tokens used to maintain login sessions, dismissed notification IDs, and Progressive Web App (PWA) installation preferences.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">2. Third-Party Service Providers (Sub-Processors)</h3>
                  <p>We do not sell or rent your personal data to data brokers or third-party advertisers. To operate the App, we share necessary operational data exclusively with the following infrastructure providers:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2 text-sm font-bold text-zinc-400">
                    <li><strong>Supabase, Inc.:</strong> Secure cloud PostgreSQL database hosting, user authentication, and serverless Edge Functions.</li>
                    <li><strong>Stripe, Inc.:</strong> PCI-DSS Level 1 compliant subscription billing, 3-day free trial processing, and Stripe Connect creator tip/commission payouts.</li>
                    <li><strong>Cloudflare, Inc. (Cloudflare R2 & CDN):</strong> Global Content Delivery Network and object storage for manga pages, avatars, and media assets.</li>
                    <li><strong>Resend, Inc.:</strong> Transactional email delivery (account confirmation, password resets, store access codes, and creator tip notifications).</li>
                    <li><strong>Shopify, Inc.:</strong> Physical merchandise fulfillment and AM Shop order verification.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">3. Children's Privacy & Age Restrictions (COPPA Compliance)</h3>
                  <p>Saturday AM is intended strictly for users who are <strong>at least 13 years of age</strong> (or <strong>16 years of age</strong> in the European Economic Area and United Kingdom). We do not knowingly collect, solicit, or store personal information from children under 13 without verifiable parental consent in compliance with the Children's Online Privacy Protection Act (COPPA). If we learn that we have inadvertently collected personal data from a child under 13, we will immediately delete that account and all associated data. Parents or guardians who believe their child under 13 has registered may contact us at <strong>support@saturday-am.com</strong> for immediate removal.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">4. Data Retention & Your Right to Delete (GDPR / CCPA / CPRA)</h3>
                  <p>We retain your account and reading history data for as long as your account remains active. Under the California Consumer Privacy Act (CCPA/CPRA), the EU General Data Protection Regulation (GDPR), and Apple/Google App Store policies, you have the right to access, export, or permanently delete your personal data at any time:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2 text-sm font-bold text-zinc-400">
                    <li><strong>Instant In-App Account & Data Deletion:</strong> You can permanently scrub your account, profile, reading history, likes, comments, and authentication credentials at any time by going to <strong>Settings &rarr; Data &amp; Privacy Rights &rarr; Delete Account</strong> inside the App.</li>
                    <li><strong>Do Not Sell or Share My Personal Information:</strong> Saturday AM does not sell personal information as defined under CCPA/CPRA and honors Global Privacy Control (GPC) browser signals.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">5. Digital Autographs & Non-Biometric Notice</h3>
                  <p>Creator signatures displayed in the Bingo Book and on Series pages are pre-supplied static promotional graphic assets unlocked via event PINs or referrals. Saturday AM does not collect, scan, or store biometric identifiers or biometric information (as defined under the Illinois Biometric Information Privacy Act or similar laws) from users.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">6. Privacy Contact</h3>
                  <p>For data access requests, privacy inquiries, or account assistance, contact our Privacy Officer at <strong>support@saturday-am.com</strong> or <strong>publisher@saturday-am.com</strong>.</p>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="animate-fade-in">
              <h2>Terms of Service</h2>
              <p>Last Updated: October 2026</p>

              <div className="mt-8 space-y-8">
                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">1. Acceptance of Terms & Eligibility</h3>
                  <p>By accessing, browsing, or registering for the Saturday AM App ("Service"), you agree to be bound by these Terms of Service and our Privacy Policy. You represent and warrant that you are at least 13 years of age (or 16+ in the EEA/UK).</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">2. Subscriptions, 3-Day Free Trials & 1-Click Cancellation (FTC Negative Option Disclosure)</h3>
                  <p><strong>Recurring Billing:</strong> Saturday AM+ Pro memberships are offered on a monthly ($1.99/month) or annual ($35.99/year standard, or $20.00/year with a valid Creator/Partner Referral Code) auto-renewing basis.</p>
                  <p className="mt-3"><strong>3-Day Free Trial Terms:</strong> When you subscribe to the Annual Plan using a valid partner referral link or code, you receive a <strong>3-Day Free Trial</strong> ($0.00 due today). Unless you cancel before the end of your 3-day trial period, your payment method on file will automatically be charged <strong>$20.00/year</strong> at the conclusion of the 72-hour trial, and annually thereafter until canceled.</p>
                  <p className="mt-3"><strong>1-Click Cancellation:</strong> You may cancel your trial or recurring subscription at any time in one click with no penalty by navigating to <strong>Settings &rarr; Billing &amp; Plan &rarr; Cancel Subscription</strong>. Upon cancellation, you will never be charged again, and your earned Fandom Score, reading history, and unlocked Bingo Book signatures will remain saved on your free account.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">3. Virtual Items, Hypes, Fandom Score & Creator Tips</h3>
                  <p><strong>No Monetary Value:</strong> Weekly Hypes, Super Hypes, Fandom Scores, Leaderboard Ranks, Avatar Frames, Hype Card Skins, and Bingo Book digital signatures are licensed solely for entertainment within the App. They are not property, are non-transferable, cannot be redeemed for cash or fiat currency, and hold <strong>zero monetary or securities value</strong>.</p>
                  <p className="mt-3"><strong>Creator Support Tips:</strong> Voluntary tips/donations sent to creators via Stripe Checkout are non-refundable gifts of support and do not confer equity, ownership, or contractual rights.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">4. User Conduct & Community Moderation</h3>
                  <p>We reserve the right to remove any comment or suspend any user account that engages in harassment, hate speech, threats of violence, sexually explicit posts, spam, or leaderboard manipulation. Users can report any comment or reaction directly inside the App for immediate review.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">5. Intellectual Property</h3>
                  <p>All manga series, characters, artwork, logos, and digital assets within the App are protected by copyright and trademark laws and are owned by Saturday AM and its respective creators. Unauthorized scraping, redistribution, or use of any Saturday AM content to train artificial intelligence models is strictly prohibited.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">6. Binding Arbitration & Class-Action Waiver</h3>
                  <p className="uppercase text-xs text-zinc-300 border border-zinc-800 bg-zinc-900/60 p-4 rounded-xl">
                    PLEASE READ CAREFULLY: EXCEPT WHERE PROHIBITED BY LAW, YOU AND SATURDAY AM AGREE THAT ANY DISPUTE, CLAIM, OR CONTROVERSY ARISING OUT OF OR RELATING TO THESE TERMS OR THE APP SHALL BE RESOLVED SOLELY THROUGH BINDING INDIVIDUAL ARBITRATION AND NOT IN A CLASS, REPRESENTATIVE, OR CONSOLIDATED ACTION OR PROCEEDING. YOU EXPRESSLY WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS-ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
                  </p>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'dmca_ai' && (
            <div className="animate-fade-in">
              <h2>DMCA Safe Harbor, AI Disclosure & Safety Policy</h2>
              <p>Last Updated: October 2026</p>

              <div className="mt-8 space-y-8">
                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">1. Artificial Intelligence (AI) Transparency Disclosure</h3>
                  <p><strong>Automated Comment Moderation:</strong> Saturday AM utilizes automated profanity filters and AI-assisted moderation (`moderate-comments`) to screen user-submitted community comments and Smart Reactions for hate speech, harassment, and spam to keep our community safe.</p>
                  <p className="mt-3"><strong>Human-Created Manga & No AI Training on User Data:</strong> Saturday AM celebrates human creators. We do <strong>not</strong> use your personal data, comments, fan mail, or creator artwork to train proprietary or third-party generative AI models. Any automated recommendations or moderation outputs are provided "AS-IS" without warranty.</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">2. DMCA Copyright Safe Harbor Notice (17 U.S.C. § 512)</h3>
                  <p>Saturday AM respects the intellectual property rights of others and complies with the Digital Millennium Copyright Act (DMCA). We maintain a strict repeat-infringer termination policy. If you believe that any content or user-submitted material on the App infringes your copyright, please send a written DMCA takedown notice containing:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2 text-sm font-bold text-zinc-400">
                    <li>Identification of the copyrighted work claimed to have been infringed;</li>
                    <li>Identification of the material that is claimed to be infringing and its location in the App;</li>
                    <li>Your contact information (name, mailing address, telephone number, and email address);</li>
                    <li>A statement that you have a good-faith belief that use of the material is not authorized by the copyright owner; and</li>
                    <li>A statement, under penalty of perjury, that the information in the notification is accurate and that you are authorized to act on behalf of the copyright owner, along with your physical or electronic signature.</li>
                  </ul>
                  <p className="mt-3"><strong>Designated Copyright / DMCA Contact:</strong> Send notices to <strong>publisher@saturday-am.com</strong> (Subject: "DMCA Takedown Notice").</p>
                </section>

                <section>
                  <h3 className="text-[#fe9a00] text-lg mb-2">3. Community Crisis & Self-Harm Support Resources</h3>
                  <p>If you or someone you know is going through a difficult time, experiencing a mental health crisis, or having thoughts of self-harm, please know that you are not alone and free, confidential support is available 24/7 from real human professionals:</p>
                  <div className="bg-zinc-900 border border-[#fe9a00]/50 p-4 rounded-xl mt-3 text-xs text-white space-y-1.5">
                    <p><strong>• U.S. &amp; Canada Suicide &amp; Crisis Lifeline:</strong> Call or text <strong>988</strong> (Available 24/7, free and confidential) or chat at <strong>988lifeline.org</strong></p>
                    <p><strong>• Crisis Text Line:</strong> Text <strong>HOME</strong> to <strong>741741</strong></p>
                    <p><strong>• U.K.:</strong> Call <strong>111</strong> (NHS) or <strong>116 123</strong> (Samaritans)</p>
                    <p><strong>• International Resources:</strong> Find support in your country at <strong>findahelpline.com</strong></p>
                  </div>
                </section>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM THUMB ZONE RETURN */}
        <div className="mt-12 border-t border-zinc-800 pt-8">
          <button 
            onClick={onBack}
            className="w-full max-w-sm mx-auto py-4 bg-zinc-900 border border-zinc-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Return to App
          </button>
        </div>

      </div>
    </div>
  );
};
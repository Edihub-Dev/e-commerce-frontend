import React from "react";
import { Wrench, Clock } from "lucide-react";

const MAINTENANCE_MESSAGE =
  import.meta.env.VITE_MAINTENANCE_MESSAGE ||
  "We're polishing a few things behind the scenes. Thanks for your patience!";
const MAINTENANCE_WINDOW =
  import.meta.env.VITE_MAINTENANCE_WINDOW ||
  "We'll be back online 1st January 2026.";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">
              p2pdeal
            </p>
            <p className="text-lg font-semibold">
              We&rsquo;re under maintenance
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-white/60">
          <Clock className="h-4 w-4" />
          <span>{MAINTENANCE_WINDOW}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-8">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-emerald-400/40 via-sky-400/30 to-purple-500/40 opacity-60" />
            <div className="relative backdrop-blur-3xl bg-white/5 border border-white/10 rounded-3xl px-8 py-12 shadow-2xl">
              <p className="text-sm uppercase tracking-widest text-emerald-300/80 mb-3">
                Scheduled Upgrade
              </p>
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight md:leading-tight">
                {/* Our storefront is getting a fresh tune-up */}
                Free Gift Offer Start From 1st January 2026
              </h1>
              <p className="mt-6 text-base md:text-lg text-white/70 leading-relaxed">
                {MAINTENANCE_MESSAGE}
              </p>
              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/70">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                <span>
                  Systems monitored 24/7 &bull; Reach out at support@p2pdeal.net
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-white/60 text-sm">
            <div className="flex-1 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
              <p className="font-semibold text-white/80">What this means</p>
              <p className="mt-2 leading-relaxed">
                Checkout, account management, and seller dashboards are
                temporarily unavailable while we deploy updates.
              </p>
            </div>
            <div className="flex-1 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
              <p className="font-semibold text-white/80">Need assistance?</p>
              <p className="mt-2 leading-relaxed">
                Drop us an email and we&rsquo;ll help with urgent requests right
                away. We appreciate your patience.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-8 py-6 text-center text-xs text-white/40">
        &copy; {new Date().getFullYear()} p2pdeal. All rights reserved.
      </footer>
    </div>
  );
};

export default Maintenance;

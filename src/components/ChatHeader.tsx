import { Zap, Shield } from 'lucide-react';

export const ChatHeader = () => {
  return (
    <header className="relative p-4 border-b border-border bg-metallic-dark/90 backdrop-blur-sm overflow-hidden">
      {/* Animated scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-arc to-transparent animate-hud-scan" />
      </div>

      <div className="relative flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          {/* Arc Reactor Icon */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full gradient-arc animate-pulse-arc" />
            <div className="absolute inset-1 rounded-full bg-metallic-dark" />
            <div className="absolute inset-2 rounded-full gradient-arc opacity-80" />
            <Zap className="relative w-5 h-5 text-accent-foreground" />
          </div>

          <div>
            <h1 className="font-display text-xl font-bold tracking-wider text-glow-gold">
              <span className="text-secondary">J.A.R.V.I.S.</span>
            </h1>
            <p className="text-xs text-muted-foreground font-body tracking-wide">
              Just A Rather Very Intelligent System
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-metallic-mid border border-accent/30">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-body text-accent uppercase tracking-wider">
              Online
            </span>
          </div>
          <div className="p-2 rounded-lg bg-metallic-mid border border-border">
            <Shield className="w-5 h-5 text-secondary" />
          </div>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-accent/50" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-accent/50" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-accent/50" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-accent/50" />
    </header>
  );
};

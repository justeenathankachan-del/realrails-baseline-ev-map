"use client";

interface TopbarProps {
  stationCount: number;
  dataSource: string;
  isLoading: boolean;
  onAbout?: () => void;
}

export function Topbar({
  stationCount,
  dataSource,
  isLoading,
  onAbout,
}: TopbarProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 h-16 px-6 flex items-center bg-[#020617]/85 backdrop-blur-xl border-b border-cyan-400/20">

      <div className="flex items-center gap-4">
        <div
          className={`w-3 h-3 rounded-full ${
            isLoading
              ? "bg-yellow-400 animate-pulse"
              : "bg-cyan-400 animate-pulse-glow"
          }`}
        />

        <div>
          <h1 className="text-white font-semibold tracking-[0.18em] text-base">
            EV NETWORK COMMAND CENTRE
          </h1>

          <p className="text-[10px] text-cyan-300/70 tracking-[0.3em]">
            GLOBAL ELECTRIC MOBILITY INTELLIGENCE
          </p>
        </div>
      </div>

      <div className="ml-auto flex gap-2 items-center">
        <span className="font-mono text-[10px] border border-cyan-400/40 text-cyan-300 px-2 py-1 rounded-full">
          {stationCount.toLocaleString()} STATIONS
        </span>

        <span className="font-mono text-[10px] border border-cyan-400/40 text-cyan-300 px-2 py-1 rounded-full">
          OCM LIVE
        </span>

        <button
          onClick={onAbout}
          className="font-mono text-[10px] border border-white/20 text-white/80 px-3 py-1 rounded-full hover:border-cyan-400 hover:text-cyan-300 transition"
        >
          ABOUT
        </button>
      </div>

    </header>
  );
}
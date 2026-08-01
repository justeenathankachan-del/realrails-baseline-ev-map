"use client";

interface TopbarProps {
  stationCount: number;
  dataSource:   string;
  isLoading:    boolean;
}

export function Topbar({ stationCount, dataSource, isLoading }: TopbarProps) {
  return (
    <header className="h-14 bg-dex-surface border-b border-dex-border flex items-center px-5 gap-3 shrink-0 z-50">

      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${
            isLoading
              ? "bg-yellow-500 animate-pulse"
              : "bg-dex-cyan animate-pulse-glow"
          }`}
        />
        
        <span className="text-dex-tx3 text-xs tracking-wider hidden sm:block">
          / REAL RAILS INTELLIGENCE
        </span>
      </div>

      <div className="w-px h-5 bg-dex-border mx-2" />

      <span className="text-dex-tx3 text-xs font-mono tracking-wide">
        SUPPLY CHAIN RAIL — EV CHARGING NETWORK
      </span>

      <div className="ml-auto flex items-center gap-2">
        {isLoading ? (
          <span className="font-mono text-[10px] border border-yellow-500 text-yellow-500 px-2.5 py-1 rounded-sm tracking-widest">
            LOADING...
          </span>
        ) : (
          <span className="font-mono text-[11px] text-dex-cyan">
            {stationCount.toLocaleString()} stations
          </span>
        )}

        <span
          className={`font-mono text-[10px] border px-2.5 py-1 rounded-sm tracking-widest ${
            dataSource === "OpenChargeMap"
              ? "border-dex-cyan   text-dex-cyan"
              : "border-yellow-500 text-yellow-500"
          }`}
        >
          {dataSource === "OpenChargeMap" ? "OCM LIVE" : "MOCK DATA"}
        </span>

        <span className="font-mono text-[10px] border border-dex-indigo text-dex-indigo px-2.5 py-1 rounded-sm tracking-widest">
          GLOBAL
        </span>

        <span className="font-mono text-[10px] border border-yellow-500 text-yellow-500 px-2.5 py-1 rounded-sm tracking-widest">
          UTIL: SYNTHETIC
        </span>
      </div>
    </header>
  );
}
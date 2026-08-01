"use client";

import { useEffect, useState } from "react";

type Props = {
  metrics: {
    total_stations: number;
    dc_fast: number;
    operators: number;
    countries: number;
  };
  onRefresh?: () => void;
  topOperators?: {
    operator_name?: string;
    operator_id?: string | number;
    count: number;
  }[];
};

export function Sidebar({ metrics, onRefresh, topOperators = [] }: Props) {

  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [localOperators, setLocalOperators] = useState<
    { operator_name?: string; operator_id?: string | number; count: number }[]
  >([]);

  useEffect(() => {
    if (topOperators.length > 0) return;

    const fetchOperators = async () => {
      try {
        const res = await fetch(`${API}/api/top-operators`);

        if (!res.ok) {
          setLocalOperators([]);
          return;
        }

        const data = await res.json();
        setLocalOperators(Array.isArray(data) ? data : []);
      } catch {
        setLocalOperators([]);
      }
    };

    fetchOperators();
  }, [topOperators]);

  const operatorsToShow =
    topOperators.length > 0 ? topOperators : localOperators;

  // 🔥 UPDATED LOGIC (Independent at TOP)
  const unknownOperator = operatorsToShow.find(
    (op) => String(op.operator_id) === "0"
  );

  const validOperators = operatorsToShow
    .filter((op) => String(op.operator_id) !== "0")
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  const finalOperators = unknownOperator
    ? [
        { ...unknownOperator, operator_name: "Independent" },
        ...validOperators,
      ]
    : validOperators;

  return (
    <aside className="w-[360px] h-full bg-dex-surface border-l border-dex-border flex flex-col">

      <div className="flex-1 overflow-y-auto px-5 py-5">

        {/* SECTION A */}
        <div className="mb-8">
          <p className="text-[11px] tracking-widest text-dex-tx3 uppercase mb-2">
            SECTION A — RAIL INTELLIGENCE
          </p>

          <h1 className="text-lg font-semibold text-white mb-1">
            Global EV Charging Network
          </h1>

          <p className="text-sm text-dex-tx3 mb-6">
            Supply Chain Rail · Data Layer
          </p>

          <div className="grid grid-cols-2 gap-3">

            <MetricCard
              label="Total Stations"
              value={(metrics.total_stations ?? 0).toLocaleString()}
              accent="cyan"
            />

            <MetricCard
              label="Total Public Nodes"
              value={(metrics.dc_fast ?? 0).toLocaleString()}
            />

            <MetricCard
              label="Operators"
              value={(metrics.operators ?? 0).toLocaleString()}
            />

            <MetricCard
              label="Network Density"
              value={(metrics.countries ?? 0).toLocaleString()}
            />

          </div>
        </div>

        {/* SECTION B */}
        <div className="mb-8 border-t border-dex-border pt-6">
          <p className="text-[11px] tracking-widest text-dex-tx3 uppercase mb-3">
            SECTION B — WHY THIS MATTERS
          </p>

          <p className="text-sm text-[#9CA3AF] leading-relaxed">
            EV charging infrastructure forms the operational backbone of the electric mobility ecosystem. 
            Without sufficient network density, adoption slows regardless of vehicle affordability or policy incentives. 
            High-density regions accelerate usage through convenience and reliability, while underserved geographies 
            highlight clear deployment opportunities for infrastructure operators and capital allocators.
          </p>
        </div>

        {/* SECTION C */}
        <div className="mb-8 border-t border-dex-border pt-6">
          <p className="text-[11px] tracking-widest text-dex-tx3 uppercase mb-3">
            SECTION C — WHO CONTROLS THE RAIL
          </p>

          {finalOperators.length === 0 ? (
            <p className="text-sm text-dex-tx3">
              No data available
            </p>
          ) : (
            <div className="space-y-2">
              {finalOperators.map((op, i) => {

                let label = op.operator_name;

                if (!label || label.trim() === "") {
                  if (String(op.operator_id) === "0") {
                    label = "Independent / Un assigned operator"; // 🔥 updated
                  } else {
                    label = String(op.operator_id);
                  }
                }

                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-white">
                      {label}
                    </span>
                    <span className="text-dex-cyan">
                      {(op.count ?? 0).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION D */}
        <div className="border-t border-dex-border pt-6">
          <p className="text-[11px] tracking-widest text-dex-tx3 uppercase mb-4">
            SECTION D — DATA CONTROLS
          </p>

          <div className="flex gap-3">

            <button
              onClick={onRefresh}
              className="flex-1 font-mono text-[11px] border border-dex-border text-white px-3 py-2 rounded-sm hover:border-dex-cyan transition"
            >
              REFRESH
            </button>

            <a
              href={`${API}/api/stations/csv`}
              target="_blank"
              className="flex-1 font-mono text-[11px] border border-dex-border text-white px-3 py-2 rounded-sm text-center hover:border-dex-cyan transition"
            >
              DOWNLOAD
            </a>

          </div>
        </div>

        <div className="h-16" />

      </div>
    </aside>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "cyan";
}) {
  return (
    <div className="bg-dex-surface border border-dex-border rounded-md p-3">

      <p
        className={`text-sm font-semibold ${
          accent === "cyan" ? "text-dex-cyan" : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="text-xs text-dex-tx3 mt-1">
        {label}
      </p>

    </div>
  );
}
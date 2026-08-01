"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import FilterPanel from "@/components/Filterpanel";

const MapStage = dynamic(() => import("@/components/MapStage"), {
  ssr: false,
});

type CountryOption = {
  country_id: number;
  country_name: string;
};

export default function Page() {
  // ✅ ONLY FIX: fallback added (NO logic/UI change)
  const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const [stationCount, setStationCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [filters, setFilters] = useState({
    level: "ALL",
    region: [] as string[],
    operator: "",
  });

  const [operatorId, setOperatorId] = useState<number | null>(null);

  const [backendMetrics, setBackendMetrics] = useState<any>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [topOperators, setTopOperators] = useState<any[]>([]);
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${API}/api/metrics`);
        const data = await res.json();
        setBackendMetrics(data);
      } catch {
        setBackendMetrics(null);
      }
    };

    fetchMetrics();
  }, [refreshKey]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(`${API}/api/filters/countries`);
        const data = await res.json();
        setCountries(data);
      } catch {}
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchOperator = async () => {
      const q = filters.operator?.trim();

      if (!q) {
        setOperatorId(null);
        return;
      }

      try {
        const res = await fetch(
          `${API}/api/filters/operators?q=${q}`
        );

        if (!res.ok) {
          setOperatorId(null);
          return;
        }

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          setOperatorId(null);
          return;
        }

        const exact = data.find(
          (op: any) =>
            op.operator_name?.toLowerCase() === q.toLowerCase()
        );

        if (exact) {
          setOperatorId(exact.operator_id);
          return;
        }

        const startsWith = data.find((op: any) =>
          op.operator_name?.toLowerCase().startsWith(q.toLowerCase())
        );

        if (startsWith) {
          setOperatorId(startsWith.operator_id);
          return;
        }

        setOperatorId(data[0].operator_id);

      } catch {
        setOperatorId(null);
      }
    };

    fetchOperator();
  }, [filters.operator]);

  useEffect(() => {
    const fetchTopOperators = async () => {
      try {
        let url = `${API}/api/top-operators`;

        const params = new URLSearchParams();

        if (filters.region.length > 0) {
          filters.region.forEach((id) => {
            const numericId = Number(id);
            if (!isNaN(numericId)) {
              params.append("country_id", numericId.toString());
            }
          });
        }

        if (operatorId) {
          params.append("operator_id", operatorId.toString());
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        setTopOperators(Array.isArray(data) ? data : []);
      } catch {
        setTopOperators([]);
      }
    };

    fetchTopOperators();
  }, [filters, operatorId]);

  useEffect(() => {
    const fetchTotal = async () => {
      try {
        let url = `${API}/api/stations/count`;

        const params = new URLSearchParams();

        if (filters.region.length > 0) {
          filters.region.forEach((id) => {
            const numericId = Number(id);
            if (!isNaN(numericId)) {
              params.append("country_id", numericId.toString());
            }
          });
        }

        if (operatorId) {
          params.append("operator_id", operatorId.toString());
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        setFilteredTotal(data?.total ?? 0);
      } catch {
        setFilteredTotal(null);
      }
    };

    fetchTotal();
  }, [filters, operatorId]);

  const isFiltered =
    filters.region.length > 0 || operatorId !== null;

  const totalStations = isFiltered
    ? filteredTotal ?? 0
    : backendMetrics?.total_stations ?? 0;

  const networkDensity =
    backendMetrics?.countries && backendMetrics?.countries > 0
      ? Math.floor(
          (backendMetrics.total_stations || 0) /
          backendMetrics.countries
        )
      : 0;

  const metrics = {
    total_stations: totalStations,

    dc_fast: isFiltered
      ? Math.floor(totalStations * 0.6)
      : backendMetrics?.public_access ?? Math.floor(stationCount * 0.6),

    operators: isFiltered
      ? topOperators.length
      : backendMetrics?.operators ?? 0,

    countries: networkDensity,
  };

  return (
    <div className="w-screen h-screen bg-dex-surface text-white flex flex-col overflow-hidden">

      <Topbar
        stationCount={stationCount}
        dataSource="OpenChargeMap"
        isLoading={!backendMetrics}
      />

      <div className="absolute top-16 left-6 z-50">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          countryOptions={countries}
        />
      </div>

      <div className="flex flex-1 w-full h-full">

        <div className="flex-1 h-full bg-dex-surface">
          <MapStage
            key={refreshKey}
            onCountChange={setStationCount}
            filters={{
              ...filters,
              operator: operatorId ? operatorId.toString() : "",
            }}
          />
        </div>

        <Sidebar
          metrics={metrics}
          onRefresh={triggerRefresh}
          topOperators={topOperators}
        />

      </div>
    </div>
  );
}
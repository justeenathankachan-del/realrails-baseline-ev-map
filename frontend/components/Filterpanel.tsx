"use client";

import { useState, useMemo, useRef, useEffect } from "react";

type FilterState = {
  level: string;
  region: string[];
  operator: string;
};

type CountryOption = {
  country_id: number;
  country_name: string;
};

type Props = {
  filters?: FilterState;
  onChange?: (filters: FilterState) => void;
  countryOptions?: CountryOption[];
};

export default function FilterPanel({
  filters = { level: "ALL", region: [], operator: "" },
  onChange = () => {},
  countryOptions = [],
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = useMemo(() => {
    return countryOptions.filter((c) =>
      c.country_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [countryOptions, searchTerm]);

  // ✅ SINGLE SELECT (minimal change)
  const toggleCountry = (id: string) => {
    onChange({
      ...filters,
      region: filters.region.includes(id) ? [] : [id],
    });
  };

  const selectedCount = filters.region.length;

  const selectedLabel = useMemo(() => {
    if (selectedCount === 0) return "Select Country";

    const selected = countryOptions.find(
      (c) => String(c.country_id) === filters.region[0]
    );

    return selected?.country_name || "Select Country";
  }, [filters.region, countryOptions]);

  return (
    <div className="bg-[#0B1117]/90 backdrop-blur-md border border-[#1F2937] px-4 py-3 rounded-lg flex gap-3 items-center z-50">
        
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`text-xs px-3 py-1.5 rounded w-56 text-left flex justify-between items-center transition
          
          ${
            selectedCount > 0
              ? "bg-[#030712] border border-[#38BDF8] text-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.4)]"
              : "bg-[#030712] border border-[#1F2937] text-[#E5E7EB]"
          }`}
        >
          <span className="truncate">
            {selectedLabel}
          </span>

          <span className="text-[10px] opacity-50">
            {isOpen ? "▲" : "▼"}
          </span>
        </button>

        {isOpen && (
          <div className="absolute top-11 left-0 w-64 bg-[#0D141C] border border-[#1F2937] rounded shadow-2xl flex flex-col">
            <input
              autoFocus
              placeholder="Search countries..."
              className="p-2.5 text-xs bg-[#161B22] border-b border-[#1F2937] outline-none text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="max-h-60 overflow-y-auto p-1">
              {filteredCountries.map((c) => {
                const id = String(c.country_id);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[#1F2937] cursor-pointer text-xs text-gray-300 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={filters.region.includes(id)}
                      onChange={() => toggleCountry(id)}
                      className="accent-[#38BDF8]"
                    />
                    {c.country_name}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ✅ OPERATOR → SAME BLUE STYLE WHEN ACTIVE */}
      <input
        placeholder="Search operator"
        value={filters.operator}
        onChange={(e) => onChange({ ...filters, operator: e.target.value })}
        className={`text-xs px-3 py-1.5 rounded w-48 transition-all duration-200
          ${
            filters.operator && filters.operator !== ""
              ? "bg-[#030712] border border-[#38BDF8] text-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.4)]"
              : "bg-[#030712] border border-[#1F2937] text-[#E5E7EB]"
          }
        `}
      />
    </div>
  );
}
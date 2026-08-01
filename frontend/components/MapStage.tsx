"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Filters = {
  region: string[] | string;
  operator: string;
};

type Props = {
  onCountChange?: (count: number) => void;
  filters?: Filters;
};

export default function MapStage({ onCountChange, filters }: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<any>(null);
  const isLoadedRef = useRef(false);

  const shouldMoveRef = useRef(false);
  const isInitialMoveRef = useRef(false);

  const isFilterModeRef = useRef(false);
  const blockNextMoveRef = useRef(false); // ✅ NEW

  const fetchStations = async () => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    const zoom = map.getZoom();

    let params: URLSearchParams;

    const isFiltered =
      (Array.isArray(filters?.region) && filters.region.length > 0) ||
      (!!filters?.operator && filters.operator !== "");

    if (isFiltered && shouldMoveRef.current) {
      params = new URLSearchParams({
        min_lat: "-90",
        max_lat: "90",
        min_lng: "-180",
        max_lng: "180",
        zoom: Math.floor(zoom).toString(),
      });
    } else {
      const bounds = map.getBounds();
      if (!bounds) return;

      params = new URLSearchParams({
        min_lat: bounds.getSouth().toString(),
        max_lat: bounds.getNorth().toString(),
        min_lng: bounds.getWest().toString(),
        max_lng: bounds.getEast().toString(),
        zoom: Math.floor(zoom).toString(),
      });
    }

    if (filters?.region) {
      if (Array.isArray(filters.region)) {
        filters.region.forEach((id) => {
          if (id && id !== "ALL" && id !== "") {
            params.append("country_id", id);
          }
        });
      } else if (
        typeof filters.region === "string" &&
        filters.region !== "ALL" &&
        filters.region !== ""
      ) {
        params.append("country_id", filters.region);
      }
    }

    if (filters?.operator && filters.operator !== "") {
      params.append("operator_id", filters.operator);
    }

    const API = process.env.NEXT_PUBLIC_API_BASE_URL;
    const url = `${API}/api/stations/filtered?${params.toString()}`;
    console.log("🔍 FETCH URL:", url);

    try {
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      const featuresArray = data?.features || [];

      const geojson: any = {
        type: "FeatureCollection",
        features: featuresArray.map((p: any) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [p.lng, p.lat],
          },
        })),
      };

      const source = map.getSource("stations") as maplibregl.GeoJSONSource;
      if (source) source.setData(geojson);

      // ✅ FIXED: block next move event
      if (featuresArray.length > 0 && shouldMoveRef.current) {
        let sumLat = 0;
        let sumLng = 0;

        featuresArray.forEach((p: any) => {
          sumLat += p.lat;
          sumLng += p.lng;
        });

        const centerLat = sumLat / featuresArray.length;
        const centerLng = sumLng / featuresArray.length;

        blockNextMoveRef.current = true; // 🔥 KEY FIX

        map.flyTo({
          center: [centerLng, centerLat],
          zoom: Math.max(map.getZoom(), 4.5),
          duration: 800,
        });

        shouldMoveRef.current = false;
        return;
      }

      onCountChange?.(data?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const debouncedFetch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchStations, 300);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [10, 50],
      zoom: 3.5,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      isLoadedRef.current = true;

      map.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "stations-layer",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": 3.5,
          "circle-color": "#22D3EE",
          "circle-opacity": 0.8,
        },
      });

      fetchStations();
    });

    // ✅ FINAL LOCK + FIX
    map.on("moveend", () => {
      if (blockNextMoveRef.current) {
        blockNextMoveRef.current = false;
        return;
      }

      if (isFilterModeRef.current) return; // 🔒 LOCK

      debouncedFetch();
    });

    map.on("zoomend", () => {
      if (blockNextMoveRef.current) {
        blockNextMoveRef.current = false;
        return;
      }

      if (isFilterModeRef.current) return; // 🔒 LOCK

      debouncedFetch();
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoadedRef.current) {
      const isFiltered =
        (Array.isArray(filters?.region) && filters.region.length > 0) ||
        (!!filters?.operator && filters.operator !== "");

      shouldMoveRef.current = true;
      isFilterModeRef.current = isFiltered;

      fetchStations();
    }
  }, [JSON.stringify(filters)]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#020617]"
    />
  );
}
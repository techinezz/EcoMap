"use client";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";

// --- 1. DEFINE & EXPORT LOCATION TYPES ---
interface NominatimSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
}

export interface TargetLocation {
  center: [number, number];
  bounds: [[number, number], [number, number]];
}
// --- END NEW TYPES ---

// --- 2. DEFINE COMPONENT PROPS ---
interface EcoMapOverlayProps {
  onLocationSelect: (target: TargetLocation) => void;
}
// --- END NEW PROPS ---

export default function EcoMapOverlayComponent({
  onLocationSelect,
}: EcoMapOverlayProps) {
  const router = useRouter();

  // --- 3. ADD STATE FOR SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // --- END NEW STATE ---

  // --- 4. ADD FUNCTIONS TO FETCH & HANDLE SEARCH ---
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=5`
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 500);
  };

  // Handle clicking on a suggestion
  const handleSuggestionClick = (suggestion: NominatimSuggestion) => {
    const { lat, lon, boundingbox } = suggestion;

    // Validate boundingbox before parsing
    if (!boundingbox || boundingbox.length !== 4) {
        console.error("Invalid boundingbox received:", boundingbox);
        // Optionally show an error to the user
        setSearchQuery(""); // Clear search query on error too
        setSuggestions([]);
        return; // Stop processing
    }


    try {
        const bounds: [[number, number], [number, number]] = [
            [parseFloat(boundingbox[0]), parseFloat(boundingbox[2])], // [lat_min, lon_min]
            [parseFloat(boundingbox[1]), parseFloat(boundingbox[3])], // [lat_max, lon_max]
        ];

        const target: TargetLocation = {
            center: [parseFloat(lat), parseFloat(lon)],
            bounds: bounds,
        };

        // 1. Send the location data UP to the parent component
        onLocationSelect(target);

        // 2. Clear the search bar text and clear suggestions
        setSearchQuery(""); // <<< CHANGED HERE
        setSuggestions([]);

    } catch (error) {
        console.error("Error processing suggestion:", error, suggestion);
        setSearchQuery(""); // Clear search query on error
        setSuggestions([]);
    }
  };
  // --- END NEW FUNCTIONS ---

  return (
    <div className="relative">
      {/* Search Bar Component */}
      <div
        className={`
          bg-white shadow-lg w-200 mt-[20] ml-10 shadow-md
          px-5
          overflow-hidden max-h-20 rounded-full py-3 pb-[.7vw]
        `}
      >
        <div className="flex items-center ">
          <div
            className="flex items-center space-x-2 pl-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push("/")}
          >
            <img src="/logo.svg" alt="EcoMap's Logo" className="w-9 h-9 " />
            <h1 className="text-xl font-semibold text-[#25491B]">EcoMap</h1>
          </div>
          <p className="ml-3 text-[#25491B]">|</p>
          <div className="ml-3 text-[#25491B] text-lg">
            <input
              className="w-130 border-none focus:outline-none"
              placeholder="Search"
              value={searchQuery}
              onChange={handleSearchChange}
              // Added onFocus to potentially re-fetch if needed, or clear suggestions
              onFocus={() => { if (searchQuery.length >= 3) fetchSuggestions(searchQuery); }}
              onBlur={() => setTimeout(() => setSuggestions([]), 200)} // Delay helps handle click before blur clears
            />
          </div>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <ul
          className="absolute bg-white shadow-lg rounded-md mt-1 ml-10 w-130 overflow-hidden z-[2000]"
          style={{
            // Position it relative to the search bar container
            // Adjust left/top/width as needed based on your layout
            left: "6px", // Example alignment
            width: "49rem", // w-130
            top: "100%", // Position below the search bar div
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              // Use onMouseDown instead of onClick to fire before onBlur clears suggestions
              onMouseDown={() => handleSuggestionClick(s)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
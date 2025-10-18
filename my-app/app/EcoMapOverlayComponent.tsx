"use client";
import React, { useState, useRef } from "react";

// --- 1. DEFINE & EXPORT LOCATION TYPES ---
// Type for Nominatim (OpenStreetMap) search results
interface NominatimSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  // [lat_min, lat_max, lon_min, lon_max]
  boundingbox: [string, string, string, string];
}

// Type for our target location (exported so other components can use it)
export interface TargetLocation {
  center: [number, number];
  bounds: [[number, number], [number, number]];
}
// --- END NEW TYPES ---

// --- 2. DEFINE COMPONENT PROPS ---
interface EcoMapOverlayProps {
  // This function will send the selected location
  // up to the parent (Home) component.
  onLocationSelect: (target: TargetLocation) => void;
}
// --- END NEW PROPS ---

export default function EcoMapOverlayComponent({
  onLocationSelect,
}: EcoMapOverlayProps) {
  // --- 3. ADD STATE FOR SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  // Timer ref for debouncing (prevents API spam)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // --- END NEW STATE ---

  // --- 4. ADD FUNCTIONS TO FETCH & HANDLE SEARCH ---
  const fetchSuggestions = async (query: string) => {
    // Don't search if query is too short
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      // Fetch data from OpenStreetMap's search service (Nominatim)
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

  // Handle typing in the search bar
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if query is too short
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    // Set a new timer to fetch after 500ms
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 500); // 500ms debounce
  };

  // Handle clicking on a suggestion
  const handleSuggestionClick = (suggestion: NominatimSuggestion) => {
    const { lat, lon, boundingbox } = suggestion;

    // Create the bounds for the map to fly to
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

    // 2. Update the search bar text and clear suggestions
    setSearchQuery(suggestion.display_name);
    setSuggestions([]);
  };
  // --- END NEW FUNCTIONS ---

  return (
    // This wrapper needs to be 'relative' to position the dropdown
    <div className="relative">
      {/* This is your original component */}
      <div
        className={`
          bg-white shadow-lg w-200 mt-[20] ml-10 shadow-md 
          px-5 
          overflow-hidden max-h-20 rounded-full py-3 pb-[.7vw]
        `}
      >
        <div className="flex items-center ">
          <div className="flex items-center space-x-2 pl-3">
            <img src="/logo.svg" alt="EcoMap's Logo" className="w-9 h-9 " />
            <h1 className="text-xl font-semibold text-[#25491B]">EcoMap</h1>
          </div>
          <p className="ml-3 text-[#25491B]">|</p>
          <div className="ml-3 text-[#25491B] text-lg">
            {/* --- 5. UPDATE THE INPUT --- */}
            <input
              className="w-130 border-none focus:outline-none"
              placeholder="Search"
              value={searchQuery}
              onChange={handleSearchChange}
              // Hide suggestions if input loses focus (with a small delay)
              onBlur={() => setTimeout(() => setSuggestions([]), 200)}
            />
            {/* --- END UPDATED INPUT --- */}
          </div>
        </div>
      </div>

      {/* --- 6. ADD THE SUGGESTIONS DROPDOWN --- */}
      {suggestions.length > 0 && (
        <ul
          className="absolute bg-white shadow-lg rounded-md mt-1 ml-10 w-130 overflow-hidden z-[2000]"
          style={{
            // Position it to align with your search bar
            // You may need to adjust these pixel values
            left: "6px",
            width: "49rem", // w-130
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onClick={() => handleSuggestionClick(s)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
      {/* --- END SUGGESTIONS DROPDOWN --- */}
    </div>
  );
}

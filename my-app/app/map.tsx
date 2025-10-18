'use client';

// ✅ 1. Import ZoomControl
import { MapContainer, TileLayer, FeatureGroup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet-draw';

// ... (Icon fix and DrawControl component remain the same) ...
// Fix Leaflet’s default marker icon paths which can break in Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * A "headless" React component that handles the native Leaflet-Draw logic.
 */
function DrawControl({
  drawMode,
  onDrawStop,
  onLayerCreated,
}: {
  drawMode: string | null;
  onDrawStop: () => void;
  onLayerCreated: (layer: L.Layer) => void;
}) {
  // ... (No changes here)
  const map = useMap();
  const drawInstanceRef = useRef<L.Draw.Polygon | null>(null);
  useEffect(() => {
    if (drawMode === 'polygon') {
      drawInstanceRef.current = new L.Draw.Polygon(map as any, {
        shapeOptions: {
          color: '#488a36ff',
        },
      });
      drawInstanceRef.current.enable();
    } else {
      if (drawInstanceRef.current) {
        drawInstanceRef.current.disable();
        drawInstanceRef.current = null;
      }
    }
    return () => {
      if (drawInstanceRef.current) {
        drawInstanceRef.current.disable();
        drawInstanceRef.current = null;
      }
    };
  }, [drawMode, map]);
  useEffect(() => {
    const handleCreated = (e: L.LeafletEvent) => {
      onLayerCreated(e.layer);
    };
    const handleDrawStop = () => {
      onDrawStop();
    };
    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.DRAWSTOP, handleDrawStop);
    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.DRAWSTOP, handleDrawStop);
    };
  }, [map, onLayerCreated, onDrawStop]);
  return null;
}
type Overlay = "None" | "Air Quality" | "Carbon Footprint";
const OVERLAYS: Overlay[] = ["None", "Air Quality", "Carbon Footprint"];
export default function EcoMap({ onCoordinatesFinished }: { onCoordinatesFinished?: (coordinates: any[]) => void }) {
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const [isOverlayMenuOpen, setIsOverlayMenuOpen] = useState(false);
  const [selectedOverlay, setSelectedOverlay] = useState<Overlay>("None");
  const handleToggleDrawing = () => {
    setDrawMode((prevMode) => (prevMode === 'polygon' ? null : 'polygon'));
  };
  
  const handleLayerCreated = (layer: L.Layer) => {
    if (featureGroupRef.current) {
      featureGroupRef.current.addLayer(layer);
    }
    console.log('Shape added');

    // Automatically send coordinates when shape is completed
    if (featureGroupRef.current) {
      const layers = featureGroupRef.current.getLayers();
      const allGeoJSON = layers.map((l) => (l as L.Polygon).toGeoJSON());
      const allCoordinates = allGeoJSON.map(geojson => geojson.geometry.coordinates);

      if (onCoordinatesFinished && allCoordinates.length > 0) {
        onCoordinatesFinished(allCoordinates);
      }
    }
  };
  
  const handleClearLayers = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setDrawMode(null);
    console.log('All shapes cleared');
  };
const toggleOverlayMenu = () => {
    setIsOverlayMenuOpen(!isOverlayMenuOpen);
  };

  const handleOverlayChange = (overlay: Overlay) => {
    setSelectedOverlay(overlay);
    console.log("Selected overlay:", overlay);
    // Add logic here to show/hide the actual map layers
    // e.g., if (overlay === 'Air Quality') { ... }

    // You can choose to close the menu on selection if you want:
    // setIsOverlayMenuOpen(false);
  };
  // Standardized button class: 48px, rounded, flex-centered
  const baseButtonClass =
    'rounded-full border-none cursor-pointer transition-colors flex items-center justify-center h-12 w-12';

  return (
    <div className="relative h-screen w-full">
      
      {/* Button container */}
      <div
        className="absolute top-[42px] left-[880px] z-[1000]"
      >
        {/* This is the single white pill container */}
        <div className='bg-white rounded-full shadow-md flex flex-row items-center p-1.5 gap-1.5'>
          
          {/* 1. Pen Button (always visible, color changes) */}
          <button
            onClick={handleToggleDrawing}
            className={`${baseButtonClass}  ${
              drawMode === 'polygon' 
                ? 'bg-[rgba(171,210,169,0.44)] hover:bg-[rgba(171,210,169,0.6)]' 
                : 'bg-white hover:bg-gray-100'
            }`}
          >
            <img 
              src="/pen-tool.svg" 
              alt="Draw Area" 
              className="w-7 h-7" 
            />
          </button>
          
          {/* ✅ 2. Eraser Button (NOW ALWAYS VISIBLE)
            Removed the {drawMode === 'polygon' && ...} wrapper
          */}
          <button
            onClick={handleClearLayers}
            className={`${baseButtonClass} bg-white text-black hover:bg-gray-100`}
          >
            <img 
              src="/eraser.svg" 
              alt="Clear All" 
              className="w-7 h-7" 
            />
          </button>
{/* 3. Map/Overlay Button - ✅ Added onClick */}
          <button
            onClick={toggleOverlayMenu}
className={`${baseButtonClass} ${
              isOverlayMenuOpen // Check if the overlay menu is open
                ? 'bg-[rgba(171,210,169,0.44)] hover:bg-[rgba(171,210,169,0.6)]' // Apply green highlight
                : 'bg-white hover:bg-gray-100' // Default white
            }`}
          >
            <img 
              src="/map.svg" 
              alt="Overlay" 
              className="w-7 h-7" 
            />
          </button>
        </div>

        {/* ✅ 4. NEW: Overlay Dropdown Menu */}
        {isOverlayMenuOpen && (
          <div className="absolute top-full mt-2 w-56 bg-white rounded-xl shadow-lg p-4 z-[1001]">
            <h3 className="text-sm font-semibold text-[#25491B] mb-3">Map Overlays</h3>
            <div className="space-y-3 text-sm">
              {OVERLAYS.map((overlay) => (
                <label
                  key={overlay}
                  className="flex items-center cursor-pointer"
                >
                  {/* The hidden radio button */}
                  <input
                    type="radio"
                    name="overlay-selection"
                    value={overlay}
                    checked={selectedOverlay === overlay}
                    onChange={() => handleOverlayChange(overlay)}
                    className="sr-only peer"
                  />
                  {/* The custom visual circle */}
                <span
                  className="
                    h-4 w-4 
                    rounded-full 
                    border-2 border-[#25491B]
                    bg-white
                    transition-colors 
                    duration-150
                    
                    peer-checked:bg-[#25491B]
                    peer-checked:border-[#25491B]
                  "
                ></span>
                  {/* The label text */}
                  <span className="ml-2 text-[#25491B]">{overlay}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* The Leaflet Map Container */}
      <MapContainer
        center={[40.7128, -74.0060]}
        zoom={13}
        className="h-full w-full"
        zoomControl={false} // Disable the default control
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup ref={featureGroupRef} />
        <DrawControl
          drawMode={drawMode}
          onDrawStop={() => setDrawMode(null)}
          onLayerCreated={handleLayerCreated}
        />

        {/* Add the new control in the desired position */}
        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}
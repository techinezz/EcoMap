'use client';

// ✅ 1. Imports
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import L, { LatLngTuple } from 'leaflet'; // Import LatLngTuple
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useEffect, useState, useRef } from 'react';
import 'leaflet-draw';

// ✅ 2. Icon Fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ✅ 3. DrawControl Component (Typo fixed)
function DrawControl({
  drawMode,
  onDrawStop,
  onLayerCreated,
}: {
  drawMode: string | null;
  onDrawStop: () => void;
  onLayerCreated: (layer: L.Layer) => void;
}) {
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
        // Fixed typo here (was drawInstanceDrawef)
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

// ✅ 4. Overlay Types
type Overlay = 'None' | 'Air Quality' | 'Tree Removal';
const OVERLAYS: Overlay[] = ['None', 'Air Quality', 'Tree Removal'];

// Define the world boundaries
const worldBounds: L.LatLngBoundsExpression = [
  [-90, -180], // Southwest corner (lat, lng)
  [90, 180], // Northeast corner (lat, lng)
];

// ✅ 5. UPDATED: MapController with smarter zoom logic
function MapController({
  selectedOverlay,
  defaultCenter,
  treeLossZoom,
  globalMaxZoom,
}: {
  selectedOverlay: Overlay;
  defaultCenter: LatLngTuple;
  treeLossZoom: number;
  globalMaxZoom: number;
}) {
  const map = useMap();
  const prevOverlayRef = useRef<Overlay>();

  useEffect(() => {
    const prevOverlay = prevOverlayRef.current;

    if (prevOverlay !== selectedOverlay) {
      if (selectedOverlay === 'Tree Removal') {
        // Switched TO Tree Removal
        const currentZoom = map.getZoom();

        // Only fly if user is zoomed IN further than the target zoom
        if (currentZoom > treeLossZoom) {
          map.flyTo(defaultCenter, treeLossZoom);
        }
        
        // Always lock the max zoom
        map.setMaxZoom(treeLossZoom);

      } else if (prevOverlay === 'Tree Removal') {
        // Switched FROM Tree Removal: Just unlock max zoom
        map.setMaxZoom(globalMaxZoom);
      }
      // If switching between 'None' and 'Air Quality', do nothing.
    }

    prevOverlayRef.current = selectedOverlay;
  }, [selectedOverlay, map, defaultCenter, treeLossZoom, globalMaxZoom]);

  return null;
}

// ✅ 6. EcoMap Component
export default function EcoMap({
  onCoordinatesFinished,
}: {
  onCoordinatesFinished?: (coordinates: any[]) => void;
}) {
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const [isOverlayMenuOpen, setIsOverlayMenuOpen] = useState(false);
  const [selectedOverlay, setSelectedOverlay] = useState<Overlay>('None');

  // --- Define map locations and zooms ---
  const newYorkCenter: LatLngTuple = [40.7128, -74.006];
  const defaultZoom = 13;
  const treeLossZoom = 11; // Target zoom out for tree loss
  const globalMaxZoom = 19; // Default max zoom for OSM

  const handleToggleDrawing = () => {
    setDrawMode((prevMode) => (prevMode === 'polygon' ? null : 'polygon'));
  };

  const handleLayerCreated = (layer: L.Layer) => {
    if (featureGroupRef.current) {
      featureGroupRef.current.addLayer(layer);
    }
    console.log('Shape added');

    if (featureGroupRef.current) {
      const layers = featureGroupRef.current.getLayers();
      const allGeoJSON = layers.map((l) => (l as L.Polygon).toGeoJSON());
      const allCoordinates = allGeoJSON.map(
        (geojson) => geojson.geometry.coordinates,
      );

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
    console.log('Selected overlay:', overlay);
  };

  const baseButtonClass =
    'rounded-full border-none cursor-pointer transition-colors flex items-center justify-center h-12 w-12';

  // --- Tile Layer Definitions ---
  const waqiAttribution =
    '&copy; <a href="https://waqi.info/">World Air Quality Index</a>';
  const airQualityUrl = `https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${process.env.NEXT_PUBLIC_AIR_QUALITY_KEY}`;

  const gfwAttribution =
    '&copy; <a href="https://www.globalforestwatch.org/">Global Forest Watch</a>';
  const treeLossUrl =
    'https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.8/loss_year/{z}/{x}/{y}.png';

  return (
    <div className="relative h-screen w-full">
      {/* Button container (No changes) */}
      <div className="absolute top-[42px] left-[880px] z-[1000]">
        <div className="bg-white rounded-full shadow-md flex flex-row items-center p-1.5 gap-1.5">
          {/* 1. Pen Button */}
          <button
            onClick={handleToggleDrawing}
            className={`${baseButtonClass}  ${
              drawMode === 'polygon'
                ? 'bg-[rgba(171,210,169,0.44)] hover:bg-[rgba(171,210,169,0.6)]'
                : 'bg-white hover:bg-gray-100'
            }`}
          >
            <img src="/pen-tool.svg" alt="Draw Area" className="w-7 h-7" />
          </button>

          {/* 2. Eraser Button */}
          <button
            onClick={handleClearLayers}
            className={`${baseButtonClass} bg-white text-black hover:bg-gray-100`}
          >
            <img src="/eraser.svg" alt="Clear All" className="w-7 h-7" />
          </button>

          {/* 3. Map/Overlay Button */}
          <button
            onClick={toggleOverlayMenu}
            className={`${baseButtonClass} ${
              isOverlayMenuOpen
                ? 'bg-[rgba(171,210,169,0.44)] hover:bg-[rgba(171,210,169,0.6)]'
                : 'bg-white hover:bg-gray-100'
            }`}
          >
            <img src="/map.svg" alt="Overlay" className="w-7 h-7" />
          </button>
        </div>

        {/* 4. Overlay Dropdown Menu (No changes) */}
        {isOverlayMenuOpen && (
          <div className="absolute top-full mt-2 w-56 bg-white rounded-xl shadow-lg p-4 z-[1001]">
            <h3 className="text-sm font-semibold text-[#25491B] mb-3">
              Map Overlays
            </h3>
            <div className="space-y-3 text-sm">
              {OVERLAYS.map((overlay) => (
                <label
                  key={overlay}
                  className="flex items-center cursor-pointer"
                >
                  <input
                    type="radio"
                    name="overlay-selection"
                    value={overlay}
                    checked={selectedOverlay === overlay}
                    onChange={() => handleOverlayChange(overlay)}
                    className="sr-only peer"
                  />
                  <span
                    className="
                      h-4 w-4 rounded-full border-2 border-[#25491B]
                      bg-white transition-colors duration-150
                      peer-checked:bg-[#25491B] peer-checked:border-[#25491B]
                    "
                  ></span>
                  <span className="ml-2 text-[#25491B]">{overlay}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* The Leaflet Map Container */}
      <MapContainer
        center={newYorkCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        zoomControl={false}
        minZoom={3}
        maxZoom={globalMaxZoom} // Set the default max zoom
        maxBounds={worldBounds}
      >
        {/* 1. Base Map Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
        />

        {/* 2. Conditional Overlay Layers */}

        {/* Air Quality Layer (WAQI Dots/Numbers) */}
        {selectedOverlay === 'Air Quality' && (
          <TileLayer
            url={airQualityUrl}
            attribution={waqiAttribution}
            opacity={0.7}
            pane="overlayPane"
          />
        )}

        {/* Tree Removal Layer (GFW Pink) */}
        {selectedOverlay === 'Tree Removal' && (
          <TileLayer
            url={treeLossUrl}
            attribution={gfwAttribution}
            opacity={0.7}
            pane="overlayPane"
            maxZoom={12} // This tells the *tile layer* to stretch
            noWrap={true}
          />
        )}

        {/* 3. Drawing and Controls (No changes) */}
        <FeatureGroup ref={featureGroupRef} />
        <DrawControl
          drawMode={drawMode}
          onDrawStop={() => setDrawMode(null)}
          onLayerCreated={handleLayerCreated}
        />
        <ZoomControl position="bottomright" />

        {/* ✅ 6. Add the controller to the map */}
        <MapController
          selectedOverlay={selectedOverlay}
          defaultCenter={newYorkCenter}
          treeLossZoom={treeLossZoom}
          globalMaxZoom={globalMaxZoom}
        />
      </MapContainer>
    </div>
  );
}
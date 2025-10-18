'use client';

// ✅ 1. Imports
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  ZoomControl,
  useMap,
  Marker,
  useMapEvents,
} from 'react-leaflet';
import L, { LatLngTuple, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useEffect, useState, useRef, useCallback } from 'react';
import 'leaflet-draw';

// Marker Cluster Imports
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Turf Imports
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint, polygon as turfPolygon } from '@turf/helpers';

// ✅ 2. Icon Fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ✅ 3. DrawControl Component (No changes)
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

// ✅ 4. Overlay & Cluster Types
type Overlay = 'None' | 'Air Quality' | 'Tree Removal';
const OVERLAYS: Overlay[] = ['None', 'Air Quality', 'Tree Removal'];

interface TreeCluster {
  id: string;
  center: LatLngTuple;
  count: number;
}

// Define the world boundaries
const worldBounds: L.LatLngBoundsExpression = [
  [-90, -180], // Southwest
  [90, 180], // Northeast
];

// ✅ 5. MapController (No changes needed here)
function MapController({
  selectedOverlay,
  currentCenter,
  treeLossZoom,
  globalMaxZoom,
}: {
  selectedOverlay: Overlay;
  currentCenter: LatLngTuple;
  treeLossZoom: number;
  globalMaxZoom: number;
}) {
  const map = useMap();
  const prevOverlayRef = useRef<Overlay>();

  useEffect(() => {
    const prevOverlay = prevOverlayRef.current;

    if (prevOverlay !== selectedOverlay) {
      if (selectedOverlay === 'Tree Removal') {
        const currentZoom = map.getZoom();
        if (currentZoom > treeLossZoom) {
          map.flyTo(currentCenter, treeLossZoom);
        }
        map.setMaxZoom(treeLossZoom);
      } else if (prevOverlay === 'Tree Removal') {
        map.setMaxZoom(globalMaxZoom);
      }
    }
    prevOverlayRef.current = selectedOverlay;
  }, [selectedOverlay, map, currentCenter, treeLossZoom, globalMaxZoom]);

  return null;
}

// ✅ 6. LocationFinder (No changes needed here)
function LocationFinder({
  onLocationFound,
}: {
  onLocationFound: (center: LatLngTuple) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userCenter: LatLngTuple = [latitude, longitude];
          map.flyTo(userCenter, 13);
          onLocationFound(userCenter);
        },
        () => {
          console.log('Geolocation permission denied. Staying at default location.');
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

// ✅ 7. MapClickHandler (No changes needed here)
function MapClickHandler({
  isTreeModeActive,
  featureGroupRef,
  brushSize,
  onTreesPlaced,
  maxClusters,
  currentClusterCount,
  onMaxClustersReached,
}: {
  isTreeModeActive: boolean;
  featureGroupRef: React.RefObject<L.FeatureGroup>;
  brushSize: number;
  onTreesPlaced: (clusterData: {
    center: LatLngTuple;
    count: number;
    individualTrees: LatLngTuple[];
  }) => void;
  maxClusters: number;
  currentClusterCount: number;
  onMaxClustersReached: () => void;
}) {
  const isPointInPolygons = useCallback((point: L.LatLng): boolean => {
    if (!featureGroupRef.current) return false;

    const turfPt = turfPoint([point.lng, point.lat]);
    let isInside = false;

    featureGroupRef.current.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        const geoJsonCoords = layer
          .getLatLngs()[0]
          .map((latlng) => [latlng.lng, latlng.lat]);
        if (
          geoJsonCoords.length > 0 &&
          (geoJsonCoords[0][0] !== geoJsonCoords[geoJsonCoords.length - 1][0] ||
           geoJsonCoords[0][1] !== geoJsonCoords[geoJsonCoords.length - 1][1])
        ) {
          geoJsonCoords.push(geoJsonCoords[0]);
        }
        const turfPoly = turfPolygon([geoJsonCoords]);
        if (booleanPointInPolygon(turfPt, turfPoly)) {
          isInside = true;
        }
      }
    });
    return isInside;
  }, [featureGroupRef]);

  useMapEvents({
    click(e) {
      if (isTreeModeActive && currentClusterCount < maxClusters && isPointInPolygons(e.latlng)) {
        const treesToAddCount = brushSize;
        const individualTrees: LatLngTuple[] = [];
        const scatterRadius = 0.0005;

        for (let i = 0; i < treesToAddCount; i++) {
          const offsetX = (Math.random() - 0.5) * scatterRadius * 2;
          const offsetY = (Math.random() - 0.5) * scatterRadius * 2;
          individualTrees.push([e.latlng.lat + offsetY, e.latlng.lng + offsetX]);
        }
        onTreesPlaced({
          center: [e.latlng.lat, e.latlng.lng],
          count: treesToAddCount,
          individualTrees: individualTrees,
        });

      } else if (isTreeModeActive && currentClusterCount >= maxClusters) {
        console.log(`Maximum cluster limit (${maxClusters}) reached!`);
        onMaxClustersReached();
      } else if (isTreeModeActive) {
        console.log('Click outside drawn polygons. Plant trees inside!');
      }
    },
  });

  return null;
}

// ✅ 8. Define the custom tree icon
const treeIcon = L.icon({
  iconUrl: '/placedtree.svg',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
});

// ✅ 9. Main EcoMap Component
export default function EcoMap({
  onCoordinatesFinished,
}: {
  onCoordinatesFinished?: (coordinates: any[]) => void;
}) {
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const [isOverlayMenuOpen, setIsOverlayMenuOpen] = useState(false);
  const [selectedOverlay, setSelectedOverlay] = useState<Overlay>('None');
  const mapRef = useRef<L.Map>(null);

  // --- Tree Planting State ---
  const [isTreeModeActive, setIsTreeModeActive] = useState(false);
  const [brushSize, setBrushSize] = useState(10);
  const [placedTrees, setPlacedTrees] = useState<LatLngTuple[]>([]);
  const [treeClusters, setTreeClusters] = useState<TreeCluster[]>([]);
  const MAX_CLUSTERS = 20;

  // --- Alert State ---
  const [showMaxClusterAlert, setShowMaxClusterAlert] = useState(false);

  // --- Map locations and zooms ---
  const newYorkCenter: LatLngTuple = [40.7128, -74.006];
  const defaultZoom = 13;
  const treeLossZoom = 11;
  const globalMaxZoom = 19;
  const [currentCenter, setCurrentCenter] = useState<LatLngTuple>(newYorkCenter);

  // --- Handlers ---
  const handleToggleDrawing = () => {
    setIsTreeModeActive(false);
    setDrawMode((prevMode) => (prevMode === 'polygon' ? null : 'polygon'));
  };

  const handleLayerCreated = (layer: L.Layer) => {
    if (featureGroupRef.current) {
      featureGroupRef.current.addLayer(layer);
    }
    console.log('Shape added');
    if (onCoordinatesFinished) {
     if (featureGroupRef.current) {
       const layers = featureGroupRef.current.getLayers();
       const allGeoJSON = layers.map((l) => (l as L.Polygon).toGeoJSON());
       const allCoordinates = allGeoJSON.map(
         (geojson) => geojson.geometry.coordinates,
       );
        onCoordinatesFinished(allCoordinates);
      }
    }
  };

  const handleClearLayers = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setPlacedTrees([]);
    setTreeClusters([]);
    setDrawMode(null);
    setIsTreeModeActive(false);
    console.log('All shapes and trees cleared');
  };

  const toggleOverlayMenu = () => {
    setIsOverlayMenuOpen(!isOverlayMenuOpen);
  };

  const handleOverlayChange = (overlay: Overlay) => {
    setSelectedOverlay(overlay);
    console.log('Selected overlay:', overlay);
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(currentCenter, defaultZoom);
      mapRef.current.setMaxZoom(globalMaxZoom);
      setSelectedOverlay('None');
      setIsTreeModeActive(false);
    }
  };

  // --- Tree Mode Handlers ---
  const handleToggleTreeMode = () => {
    setDrawMode(null);
    setIsTreeModeActive((prev) => !prev);
  };

  const handleBrushSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(Number(event.target.value));
  };

  const handleDonePlanting = () => {
    console.log('Cluster data:', treeClusters);
    setIsTreeModeActive(false);
  };

  const handleTreesPlaced = useCallback(
    (clusterData: {
      center: LatLngTuple;
      count: number;
      individualTrees: LatLngTuple[];
    }) => {
      if (treeClusters.length >= MAX_CLUSTERS) {
        console.log(`Max cluster limit (${MAX_CLUSTERS}) reached, cannot add more.`);
        triggerMaxClusterAlert();
        return;
      }

      const { center, count, individualTrees } = clusterData;

      setTreeClusters((prevClusters) => [
        ...prevClusters,
        { id: Date.now().toString(), center, count },
      ]);
      setPlacedTrees((prevTrees) => [...prevTrees, ...individualTrees]);

    },
    [treeClusters.length] // Dependency
  );

  // --- Alert Handler ---
  const triggerMaxClusterAlert = useCallback(() => {
    if (showMaxClusterAlert) return;

    setShowMaxClusterAlert(true);
    setTimeout(() => {
      setShowMaxClusterAlert(false);
    }, 2500);
  }, [showMaxClusterAlert]);

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
    // Make the outer div relative for absolute positioning of the alert
    <div className="relative h-screen w-full">
      {/* Button container */}
      <div className="absolute top-[42px] left-[880px] z-[1000] flex flex-col items-end gap-2">
        {/* Top row of buttons */}
        <div className="bg-white rounded-full shadow-md flex flex-row items-center p-1.5 gap-1.5">
           {/* Pen Button */}
           <button
            onClick={handleToggleDrawing}
            className={`${baseButtonClass} ${
              drawMode === 'polygon'
                ? 'bg-[rgba(171,210,169,0.44)] hover:bg-[rgba(171,210,169,0.6)]'
                : 'bg-white hover:bg-gray-100'
            }`}
             title="Draw Area"
          >
            <img src="/pen-tool.svg" alt="Draw Area" className="w-7 h-7" />
          </button>
          {/* Eraser Button */}
          <button
            onClick={handleClearLayers}
            className={`${baseButtonClass} bg-white text-black hover:bg-gray-100`}
            title="Clear Shapes and Trees"
          >
            <img src="/eraser.svg" alt="Clear All" className="w-7 h-7" />
          </button>
          {/* Map/Overlay Button */}
          <button
            onClick={toggleOverlayMenu}
            className={`${baseButtonClass} ${
              isOverlayMenuOpen
                ? 'bg-[rgba(171,210,169,0.44)] hover:bg-[rgba(171,210,169,0.6)]'
                : 'bg-white hover:bg-gray-100'
            }`}
             title="Map Overlays"
          >
            <img src="/map.svg" alt="Overlay" className="w-7 h-7" />
          </button>
          {/* Recenter Button */}
          <button
            onClick={handleRecenter}
            className={`${baseButtonClass} bg-white text-black hover:bg-gray-100`}
            title="Center on My Location"
          >
            <img src="/gps.svg" alt="Center on my location" className="w-7 h-7" />
          </button>
          {/* Tree Planting Button */}
          <button
            onClick={handleToggleTreeMode}
            className={`${baseButtonClass} ${
              isTreeModeActive
                ? 'bg-[rgba(171,210,169,0.44)] hover:bg-[rgba(171,210,169,0.6)]'
                : 'bg-white hover:bg-gray-100'
            }`}
            title="Plant Trees"
          >
            <img src="/tree.svg" alt="Plant Trees" className="w-7 h-7" />
          </button>
        </div>

        {/* Conditional Overlay Menu */}
        {isOverlayMenuOpen && (
           <div className="w-64 bg-white rounded-xl shadow-lg p-4 z-[1001] self-end">
            <h3 className="text-sm font-semibold text-[#25491B] mb-3">
              Map Overlays
            </h3>
            <div className="space-y-3 text-sm">
              {OVERLAYS.map((overlay) => (
                <label key={overlay} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="overlay-selection"
                    value={overlay}
                    checked={selectedOverlay === overlay}
                    onChange={() => handleOverlayChange(overlay)}
                    className="sr-only peer"
                  />
                  <span className="h-4 w-4 rounded-full border-2 border-[#25491B] bg-white transition-colors duration-150 peer-checked:bg-[#25491B] peer-checked:border-[#25491B]"></span>
                  <span className="ml-2 text-[#25491B]">{overlay}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Conditional Tree Planting UI */}
        {isTreeModeActive && (
          <div className="w-64 bg-white rounded-xl shadow-lg p-4 z-[1001] self-end">
            <label htmlFor="brushSize" className="block text-sm font-medium text-[#25491B]">
              Trees per click: <span className="font-semibold">{brushSize}</span>
              <span className="block text-xs text-gray-500 mt-1">
                Clicks Made: {treeClusters.length} / {MAX_CLUSTERS}
              </span>
            </label>
            <input
              id="brushSize"
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={handleBrushSizeChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-1 mb-3 accent-[#488a36]"
              disabled={treeClusters.length >= MAX_CLUSTERS}
            />
            <button
              onClick={handleDonePlanting}
              className="w-full px-4 py-2 bg-[#488a36] text-white rounded-md hover:bg-[#3a6e2b] transition-colors text-sm"
            >
              Done Planting & Log Cluster Data
            </button>
          </div>
        )}
      </div>

       {/* Max Cluster Alert Message (UPDATED STYLES) */}
       {showMaxClusterAlert && (
        <div
          className="absolute top-10 left-255 transform -translate-x-1/2 z-[9999] // High z-index
                     px-4 py-2 bg-red-500/70 // Opacity 70% using shorthand
                     text-white text-sm rounded-md shadow-lg
                     transition-opacity duration-300"
        >
          Maximum number of clusters ({MAX_CLUSTERS}) reached!
        </div>
      )}

      {/* The Leaflet Map Container */}
      <MapContainer
        ref={mapRef}
        center={newYorkCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        zoomControl={false}
        minZoom={3}
        maxZoom={globalMaxZoom}
        maxBounds={worldBounds}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
        />

        {/* Conditional Overlays */}
        {selectedOverlay === 'Air Quality' && (
          <TileLayer url={airQualityUrl} attribution={waqiAttribution} opacity={0.7} pane="overlayPane" />
        )}
        {selectedOverlay === 'Tree Removal' && (
          <TileLayer url={treeLossUrl} attribution={gfwAttribution} opacity={0.7} pane="overlayPane" maxZoom={12} noWrap={true} />
        )}

        {/* Drawing Feature Group */}
        <FeatureGroup ref={featureGroupRef} />

        {/* Placed Tree Markers */}
        <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
        >
          {placedTrees.map((pos, index) => (
            <Marker key={index} position={pos} icon={treeIcon} />
          ))}
        </MarkerClusterGroup>

        {/* Controls and Controllers */}
        <DrawControl drawMode={drawMode} onDrawStop={() => setDrawMode(null)} onLayerCreated={handleLayerCreated} />
        <ZoomControl position="bottomright" />
        <LocationFinder onLocationFound={setCurrentCenter} />
        <MapController selectedOverlay={selectedOverlay} currentCenter={currentCenter} treeLossZoom={treeLossZoom} globalMaxZoom={globalMaxZoom} />
        <MapClickHandler
            isTreeModeActive={isTreeModeActive}
            featureGroupRef={featureGroupRef}
            brushSize={brushSize}
            onTreesPlaced={handleTreesPlaced}
            maxClusters={MAX_CLUSTERS}
            currentClusterCount={treeClusters.length}
            onMaxClustersReached={triggerMaxClusterAlert}
        />
      </MapContainer>
    </div>
  );
}
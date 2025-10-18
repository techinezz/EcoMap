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
  CircleMarker, // Keep CircleMarker if you might switch back
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

// ✅ 3. DrawControl Component
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


// ✅ 4. Overlay, Cluster & Simulation Types
type Overlay = 'None' | 'Air Quality' | 'Tree Removal';
const OVERLAYS: Overlay[] = ['None', 'Air Quality', 'Tree Removal'];

type SimulationMode = 'trees' | 'solar' | 'pavement' | 'park' | null;

interface PointCluster {
  id: string;
  center: LatLngTuple;
  count: number;
}

interface PointPlacement {
    id: string;
    center: LatLngTuple;
}

// Define the world boundaries
const worldBounds: L.LatLngBoundsExpression = [
  [-90, -180], // Southwest
  [90, 180], // Northeast
];

// ✅ 5. MapController (Carefully checked props and dependencies)
function MapController({
  selectedOverlay, // Prop
  currentCenter,   // Prop
  treeLossZoom,    // Prop
  globalMaxZoom,   // Prop
}: {
  selectedOverlay: Overlay;
  currentCenter: LatLngTuple;
  treeLossZoom: number;
  globalMaxZoom: number;
}) {
  const map = useMap(); // Hook result
  const prevOverlayRef = useRef<Overlay>(); // Ref

  useEffect(() => {
    // All variables in the dependency array are defined in this scope
    // selectedOverlay, currentCenter, treeLossZoom, globalMaxZoom are props
    // map is from useMap hook
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
  }, [selectedOverlay, map, currentCenter, treeLossZoom, globalMaxZoom]); // Dependency array

  return null;
}


// ✅ 6. LocationFinder
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


// ✅ 7. MapClickHandler
function MapClickHandler({
  simulationMode,
  featureGroupRef,
  brushSize,
  onItemPlaced,
  maxClusters,
  currentClusterCount,
  onMaxClustersReached,
}: {
  simulationMode: SimulationMode;
  featureGroupRef: React.RefObject<L.FeatureGroup>;
  brushSize: number;
  onItemPlaced: (data: {
    mode: SimulationMode;
    center: LatLngTuple;
    count?: number;
    individualPoints?: LatLngTuple[];
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
      if (!simulationMode) return;

      if (currentClusterCount >= maxClusters) {
        console.log(`Maximum click limit (${maxClusters}) reached!`);
        onMaxClustersReached();
        return;
      }

      if (isPointInPolygons(e.latlng)) {
        const center: LatLngTuple = [e.latlng.lat, e.latlng.lng];

        if (simulationMode === 'trees' || simulationMode === 'solar') {
          const count = brushSize;
          const individualPoints: LatLngTuple[] = [];
          const scatterRadius = 0.0005;

          for (let i = 0; i < count; i++) {
            const offsetX = (Math.random() - 0.5) * scatterRadius * 2;
            const offsetY = (Math.random() - 0.5) * scatterRadius * 2;
            individualPoints.push([center[0] + offsetY, center[1] + offsetX]);
          }
          onItemPlaced({ mode: simulationMode, center, count, individualPoints });

        } else if (simulationMode === 'pavement' || simulationMode === 'park') {
          onItemPlaced({ mode: simulationMode, center });
        }
      } else {
        console.log(`Click outside drawn polygons. Place ${simulationMode} inside!`);
      }
    },
  });

  return null;
}

// ✅ 8. Define Custom Icons
const treeIcon = L.icon({
  iconUrl: '/placedtree.svg',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
});

const solarIcon = L.icon({
  iconUrl: '/sun.svg',
  iconSize: [25, 25],
  iconAnchor: [12, 12],
});

const pavementIcon = L.icon({
    iconUrl: '/road.svg',
    iconSize: [25, 25],
    iconAnchor: [12, 12],
});

const parkIcon = L.icon({
    iconUrl: '/park.svg',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
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
  const [selectedOverlay, setSelectedOverlay] = useState<Overlay>('None'); // State variable
  const mapRef = useRef<L.Map>(null);

  // --- Simulation State ---
  const [simulationMode, setSimulationMode] = useState<SimulationMode>(null);
  const [brushSize, setBrushSize] = useState(10);
  const [placedTrees, setPlacedTrees] = useState<LatLngTuple[]>([]);
  const [treeClusters, setTreeClusters] = useState<PointCluster[]>([]);
  const [placedSolarPanels, setPlacedSolarPanels] = useState<LatLngTuple[]>([]);
  const [solarClusters, setSolarClusters] = useState<PointCluster[]>([]);
  const [placedPavementPoints, setPlacedPavementPoints] = useState<PointPlacement[]>([]);
  const [placedParks, setPlacedParks] = useState<PointPlacement[]>([]);

  const MAX_CLUSTERS = 20;

  // --- Alert State ---
  const [showMaxClusterAlert, setShowMaxClusterAlert] = useState(false);

  // --- Map locations and zooms ---
  const newYorkCenter: LatLngTuple = [40.7128, -74.006];
  const defaultZoom = 13;
  const treeLossZoom = 11; // Constant value
  const globalMaxZoom = 19; // Constant value
  const [currentCenter, setCurrentCenter] = useState<LatLngTuple>(newYorkCenter); // State variable

  // --- Handlers ---
  const handleToggleDrawing = () => {
    setSimulationMode(null);
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
    setPlacedSolarPanels([]);
    setSolarClusters([]);
    setPlacedPavementPoints([]);
    setPlacedParks([]);
    setDrawMode(null);
    setSimulationMode(null);
    console.log('All shapes and simulation items cleared');
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
      setSimulationMode(null);
    }
  };

  const handleToggleSimulationMode = (mode: SimulationMode) => {
     setDrawMode(null);
     setSimulationMode(prevMode => prevMode === mode ? null : mode);
  };

  const handleBrushSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(Number(event.target.value));
  };

  const handleDoneSimulating = () => {
    console.log('Tree Cluster data:', treeClusters);
    console.log('Solar Cluster data:', solarClusters);
    console.log('Pavement Point data:', placedPavementPoints);
    console.log('Park Point data:', placedParks);
    setSimulationMode(null);
  };

  const handleItemPlaced = useCallback(
    (data: {
      mode: SimulationMode;
      center: LatLngTuple;
      count?: number;
      individualPoints?: LatLngTuple[];
    }) => {
      const currentTotalClicks = treeClusters.length + solarClusters.length + placedPavementPoints.length + placedParks.length;
      if (currentTotalClicks >= MAX_CLUSTERS) {
        console.log(`Max click limit (${MAX_CLUSTERS}) reached.`);
        triggerMaxClusterAlert();
        return;
      }

      const { mode, center, count, individualPoints } = data;
      const newItemId = Date.now().toString();

      if (mode === 'trees' && count && individualPoints) {
        setTreeClusters((prev) => [...prev, { id: newItemId, center, count }]);
        setPlacedTrees((prev) => [...prev, ...individualPoints]);
      } else if (mode === 'solar' && count && individualPoints) {
        setSolarClusters((prev) => [...prev, { id: newItemId, center, count }]);
        setPlacedSolarPanels((prev) => [...prev, ...individualPoints]);
      } else if (mode === 'pavement') {
        setPlacedPavementPoints((prev) => [...prev, { id: newItemId, center }]);
      } else if (mode === 'park') {
        setPlacedParks((prev) => [...prev, { id: newItemId, center }]);
      }
    },
    [treeClusters.length, solarClusters.length, placedPavementPoints.length, placedParks.length]
  );

  const triggerMaxClusterAlert = useCallback(() => {
    if (showMaxClusterAlert) return;
    setShowMaxClusterAlert(true);
    setTimeout(() => {
      setShowMaxClusterAlert(false);
    }, 2500);
  }, [showMaxClusterAlert]);

  const baseButtonClass =
    'rounded-full border-none cursor-pointer transition-colors flex items-center justify-center h-12 w-12';

  const totalClicksMade = treeClusters.length + solarClusters.length + placedPavementPoints.length + placedParks.length;

  const waqiAttribution =
    '&copy; <a href="https://waqi.info/">World Air Quality Index</a>';
  const airQualityUrl = `https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${process.env.NEXT_PUBLIC_AIR_QUALITY_KEY}`;

  const gfwAttribution =
    '&copy; <a href="https://www.globalforestwatch.org/">Global Forest Watch</a>';
  const treeLossUrl =
    'https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.8/loss_year/{z}/{x}/{y}.png';

  return (
    <div className="relative h-screen w-full">
      {/* Button container */}
      <div className="absolute top-[36px] left-[880px] z-[1000] flex flex-col items-end gap-2">
        {/* Top row of buttons */}
        <div className="bg-white rounded-full shadow-md flex flex-row items-center p-1.5 gap-1.5">
          {/* Pen Button */}
          <button
            onClick={handleToggleDrawing}
            className={`${baseButtonClass} ${
              drawMode === 'polygon'
                ? 'bg-green-100 ring-2 ring-green-500'
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
            title="Clear Shapes & Items"
          >
            <img src="/eraser.svg" alt="Clear All" className="w-7 h-7" />
          </button>

          {/* Map/Overlay Button */}
          <button
            onClick={toggleOverlayMenu}
            className={`${baseButtonClass} ${
              isOverlayMenuOpen
                ? 'bg-green-100 ring-2 ring-green-500'
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
            onClick={() => handleToggleSimulationMode('trees')}
            className={`${baseButtonClass} ${
              simulationMode === 'trees'
                ? 'bg-green-100 ring-2 ring-green-500'
                : 'bg-white hover:bg-gray-100'
            }`}
            title="Plant Trees"
          >
            <img src="/tree.svg" alt="Plant Trees" className="w-7 h-7" />
          </button>

          {/* Solar Panel Button */}
          <button
            onClick={() => handleToggleSimulationMode('solar')}
            className={`${baseButtonClass} ${
              simulationMode === 'solar'
                ? 'bg-yellow-100 ring-2 ring-yellow-500'
                : 'bg-white hover:bg-gray-100'
            }`}
            title="Place Solar Panels"
          >
            <img src="/sun.svg" alt="Place Solar Panels" className="w-7 h-7" />
          </button>

          {/* Permeable Pavement Button */}
          <button
            onClick={() => handleToggleSimulationMode('pavement')}
            className={`${baseButtonClass} ${
              simulationMode === 'pavement'
                ? 'bg-blue-100 ring-2 ring-blue-500'
                : 'bg-white hover:bg-gray-100'
            }`}
            title="Add Permeable Pavement"
          >
             <img src="/road.svg" alt="Add Permeable Pavement" className="w-7 h-7" />
          </button>

          {/* Park Button */}
           <button
            onClick={() => handleToggleSimulationMode('park')}
            className={`${baseButtonClass} ${
              simulationMode === 'park'
                ? 'bg-lime-100 ring-2 ring-lime-500'
                : 'bg-white hover:bg-gray-100'
            }`}
            title="Add Park Area"
          >
             <img src="/park.svg" alt="Add Park Area" className="w-7 h-7" />
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

        {/* Conditional Simulation UI */}
        {simulationMode && (
          <div className="w-64 bg-white rounded-xl shadow-lg p-4 z-[1001] self-end">
            <label htmlFor="brushSize" className="block text-sm font-medium text-[#25491B]">
              {simulationMode === 'trees' && 'Trees per click:'}
              {simulationMode === 'solar' && 'Panels per click:'}
              {simulationMode === 'pavement' && 'Pavement Placement (1 per click)'}
              {simulationMode === 'park' && 'Park Placement (1 per click)'}
              {(simulationMode === 'trees' || simulationMode === 'solar') && (
                 <span className="font-semibold"> {brushSize}</span>
              )}
               <span className="block text-xs text-gray-500 mt-1">
                 Total Clicks: {totalClicksMade} / {MAX_CLUSTERS}
               </span>
            </label>
             {(simulationMode === 'trees' || simulationMode === 'solar') && (
                <input
                id="brushSize"
                type="range"
                min="1"
                max="100"
                value={brushSize}
                onChange={handleBrushSizeChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-1 mb-3 accent-[#488a36]"
                disabled={totalClicksMade >= MAX_CLUSTERS}
                />
             )}

            <button
              onClick={handleDoneSimulating}
              className="w-full mt-2 px-4 py-2 bg-[#488a36] text-white rounded-md hover:bg-[#3a6e2b] transition-colors text-sm"
            >
              Done Simulating & Log Data
            </button>
          </div>
        )}
      </div>

       {/* Max Cluster Alert Message */}
       {showMaxClusterAlert && (
            <div
            className="absolute top-10 left-1/2 transform -translate-x-1/2 z-[99999]
                        px-4 py-2 bg-red-500/70
                        text-white text-sm rounded-md shadow-lg
                        transition-opacity duration-300"
            >
            Maximum number of clicks ({MAX_CLUSTERS}) reached!
            </div>
       )}

      {/* The Leaflet Map Container */}
      <MapContainer
        ref={mapRef}
        center={newYorkCenter}
        zoom={defaultZoom}
        className={`h-full w-full ${simulationMode ? 'cursor-crosshair' : ''}`}
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

        {/* Placed Items Layers */}
        <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
          {placedTrees.map((pos, index) => (
            <Marker key={`tree-${index}`} position={pos} icon={treeIcon} />
          ))}
        </MarkerClusterGroup>

        <MarkerClusterGroup chunkedLoading maxClusterRadius={20}>
          {placedSolarPanels.map((pos, index) => (
            <Marker key={`solar-${index}`} position={pos} icon={solarIcon} />
          ))}
        </MarkerClusterGroup>

        {placedPavementPoints.map((pavement) => (
           <Marker
             key={pavement.id}
             position={pavement.center}
             icon={pavementIcon}
           />
        ))}

         {placedParks.map((park) => (
           <Marker
             key={park.id}
             position={park.center}
             icon={parkIcon}
           />
        ))}

        <div className='absolute top-[38px] right-[100px] z-1001 bg-[#25491B] rounded-full p-4 text-white text-bd cursor-pointer'>
          <button className='cursor-pointer'>Start Challenge</button>
        </div>

        {/* Controls and Controllers */}
        <DrawControl drawMode={drawMode} onDrawStop={() => setDrawMode(null)} onLayerCreated={handleLayerCreated} />
        <ZoomControl position="bottomright" />
        <LocationFinder onLocationFound={setCurrentCenter} />
        <MapController selectedOverlay={selectedOverlay} currentCenter={currentCenter} treeLossZoom={treeLossZoom} globalMaxZoom={globalMaxZoom} />
        <MapClickHandler
            simulationMode={simulationMode}
            featureGroupRef={featureGroupRef}
            brushSize={brushSize}
            onItemPlaced={handleItemPlaced}
            maxClusters={MAX_CLUSTERS}
            currentClusterCount={totalClicksMade}
            onMaxClustersReached={triggerMaxClusterAlert}
        />
      </MapContainer>
    </div>
  );
}
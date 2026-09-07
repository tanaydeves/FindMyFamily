import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Navigation,
  Compass,
  Battery,
  BatteryMedium,
  BatteryLow,
  Maximize2,
  MapPin,
  ExternalLink,
  ChevronRight,
  Crosshair,
  Layers,
  Plus,
  Minus,
  Radio,
  UserPlus,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { FamilyMember, LanguageCode } from '../types';
import { calculateDistance, calculateBearing } from '../services/navigationMath';

import L from 'leaflet';

// Default Sangam, Prayagraj coordinates
const DEFAULT_LAT = 25.4358;
const DEFAULT_LNG = 81.8463;

// Safeguard lat/lng values against NaN, undefined, or invalid numbers
function getSafeCoord(val: any, fallback: number): number {
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

interface Props {
  myLocation: { latitude: number; longitude: number };
  myDeviceName: string;
  myColor?: string;
  myBattery?: number;
  compassHeading?: number;
  pairedMembers: FamilyMember[];
  selectedMember: FamilyMember | null;
  onSelectMember: (member: FamilyMember | null) => void;
  onNavigateToArrow: (member: FamilyMember) => void;
  onBack: () => void;
  onAddDemoMember?: () => void;
  isOffline?: boolean;
  lang?: LanguageCode;
}

type MapLayerType = 'voyager' | 'osm' | 'satellite' | 'tactical';

export const MapScreen: React.FC<Props> = ({
  myLocation,
  myDeviceName,
  myColor = '#4ADE80',
  myBattery = 92,
  compassHeading = 0,
  pairedMembers,
  selectedMember,
  onSelectMember,
  onNavigateToArrow,
  onBack,
  onAddDemoMember,
  isOffline = false,
  lang = 'en',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const landmarkMarkersRef = useRef<L.Marker[]>([]);
  const myMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const radarCirclesRef = useRef<L.Circle[]>([]);
  const riversRef = useRef<L.Polyline[]>([]);

  const pairedMembersRef = useRef(pairedMembers);
  pairedMembersRef.current = pairedMembers;

  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeLayerType, setActiveLayerType] = useState<MapLayerType>('voyager');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true);

  const safeMyLat = getSafeCoord(myLocation?.latitude, DEFAULT_LAT);
  const safeMyLng = getSafeCoord(myLocation?.longitude, DEFAULT_LNG);

  // Filter and sanitize members with valid coordinates
  const validMembers = useMemo(() => {
    return (pairedMembers || []).map((m, idx) => ({
      ...m,
      lastLat: getSafeCoord(m.lastLat, DEFAULT_LAT + (idx + 1) * 0.0012),
      lastLng: getSafeCoord(m.lastLng, DEFAULT_LNG + (idx + 1) * 0.0015),
    }));
  }, [pairedMembers]);

  // Configure Leaflet default icons safely
  useEffect(() => {
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    } catch {}
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Prevent "Map container is already initialized" error during React re-renders/StrictMode
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }

    try {
      const map = L.map(container, {
        center: [safeMyLat, safeMyLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Primary CartoDB Voyager tiles
      const voyagerLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: 'abcd',
          attribution: '&copy; CARTO &copy; OpenStreetMap',
        }
      );

      voyagerLayer.addTo(map);
      tileLayerRef.current = voyagerLayer;
      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Add Kumbh River Confluence vectors (Ganga & Yamuna)
      const gangaRiverCoords: [number, number][] = [
        [25.4520, 81.8750],
        [25.4450, 81.8790],
        [25.4380, 81.8820],
        [25.4310, 81.8850],
        [25.4240, 81.8900],
        [25.4150, 81.9050],
      ];
      const yamunaRiverCoords: [number, number][] = [
        [25.4300, 81.8500],
        [25.4280, 81.8650],
        [25.4290, 81.8780],
        [25.4310, 81.8850], // Sangam confluence meeting point
      ];

      const gangaLine = L.polyline(gangaRiverCoords, {
        color: '#0284C7',
        weight: 6,
        opacity: 0.45,
        dashArray: '10, 6',
      }).addTo(map);

      const yamunaLine = L.polyline(yamunaRiverCoords, {
        color: '#0D9488',
        weight: 6,
        opacity: 0.45,
        dashArray: '10, 6',
      }).addTo(map);

      riversRef.current = [gangaLine, yamunaLine];

      // Distance range rings around center
      const r1 = L.circle([safeMyLat, safeMyLng], {
        radius: 100,
        color: '#4ADE80',
        weight: 1.5,
        opacity: 0.6,
        fillColor: '#4ADE80',
        fillOpacity: 0.04,
        dashArray: '4, 4',
      }).addTo(map);

      const r2 = L.circle([safeMyLat, safeMyLng], {
        radius: 300,
        color: '#16A34A',
        weight: 1,
        opacity: 0.35,
        fillOpacity: 0.02,
        dashArray: '6, 6',
      }).addTo(map);

      radarCirclesRef.current = [r1, r2];

      // Dynamic resize listener
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(container);
      }

      // Invalidate sizes at various timings to prevent zero-height tile calculation
      const timers = [50, 150, 300, 600, 1000].map((t) =>
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, t)
      );

      return () => {
        timers.forEach(clearTimeout);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        if (container) {
          delete (container as any)._leaflet_id;
        }
      };
    } catch (err) {
      console.error('[MapScreen] Failed to initialize Leaflet map:', err);
    }
  }, []);

  // Update Tile Layer when Layer Type changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (activeLayerType === 'voyager') {
      const layer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      );
      layer.addTo(map);
      tileLayerRef.current = layer;
    } else if (activeLayerType === 'osm') {
      const layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      });
      layer.addTo(map);
      tileLayerRef.current = layer;
    } else if (activeLayerType === 'satellite') {
      const layer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18 }
      );
      layer.addTo(map);
      tileLayerRef.current = layer;
    } else if (activeLayerType === 'tactical') {
      // Offline tactical vector grid (dark background + grid pattern, no external tiles)
    }
  }, [activeLayerType]);

  // Update Landmark POIs (Kumbh Mela / Sangam key reference points)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear old landmarks
    landmarkMarkersRef.current.forEach((m) => m.remove());
    landmarkMarkersRef.current = [];

    if (!showLandmarks) return;

    const landmarks = [
      { name: 'Triveni Sangam Ghat', lat: 25.4310, lng: 81.8850, icon: '🕉️', type: 'spiritual' },
      { name: 'Kumbh Sector 1 Camp', lat: 25.4380, lng: 81.8650, icon: '⛺', type: 'camp' },
      { name: 'Medical Post Alpha', lat: 25.4340, lng: 81.8720, icon: '🏥', type: 'medical' },
      { name: 'Police & Lost-Found Camp', lat: 25.4390, lng: 81.8700, icon: '👮', type: 'police' },
      { name: 'Pontoon Bridge #3', lat: 25.4320, lng: 81.8790, icon: '🌉', type: 'bridge' },
    ];

    landmarks.forEach((poi) => {
      const poiHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: rgba(15, 23, 42, 0.85); color: #F8FAFC; backdrop-filter: blur(4px); padding: 1px 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); font-size: 9px; font-weight: 700; white-space: nowrap; margin-bottom: 2px;">
            ${poi.name}
          </div>
          <div style="width: 24px; height: 24px; border-radius: 50%; background: #0F172A; border: 2px solid #38BDF8; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 11px;">
            ${poi.icon}
          </div>
        </div>
      `;

      const poiIcon = L.divIcon({
        html: poiHtml,
        className: 'custom-poi-marker',
        iconSize: [100, 44],
        iconAnchor: [50, 40],
      });

      const m = L.marker([poi.lat, poi.lng], { icon: poiIcon, zIndexOffset: 200 }).addTo(map);
      landmarkMarkersRef.current.push(m);
    });
  }, [showLandmarks, mapLoaded]);

  // Update "Me" Marker and Distance Rings
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const latLng: [number, number] = [safeMyLat, safeMyLng];

    const myHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background-color: rgba(34, 197, 94, 0.22); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(22, 101, 52, 0.3); animation: pulse-ring 3s infinite;"></div>
        <div style="width: 30px; height: 30px; border-radius: 50%; background-color: #1B4332; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 10px; z-index: 10;">
          ME
        </div>
      </div>
    `;

    const myIcon = L.divIcon({
      html: myHtml,
      className: 'custom-me-marker',
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    });

    if (myMarkerRef.current) {
      myMarkerRef.current.setLatLng(latLng);
      myMarkerRef.current.setIcon(myIcon);
    } else {
      myMarkerRef.current = L.marker(latLng, { icon: myIcon, zIndexOffset: 1000 }).addTo(map);
      myMarkerRef.current.bindPopup(`<b>${myDeviceName} (Me)</b><br/>🔋 ${myBattery}% Battery`);
    }

    // Update Radar Circles Center
    radarCirclesRef.current.forEach((c) => c.setLatLng(latLng));
  }, [safeMyLat, safeMyLng, myDeviceName, myBattery, mapLoaded]);

  // Update Family Member Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const currentMarkerIds = new Set(Object.keys(markersRef.current));
    const activeMemberIds = new Set(validMembers.map((m) => m.id));

    // Remove deleted markers
    currentMarkerIds.forEach((id) => {
      if (!activeMemberIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update member markers
    validMembers.forEach((member) => {
      const latLng: [number, number] = [member.lastLat, member.lastLng];
      const isSelected = selectedMember?.id === member.id;
      const batteryVal = member.battery ?? 90;
      const initial = (member.name || 'F').charAt(0).toUpperCase();

      const memberHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: ${
          isSelected ? 'scale(1.2)' : 'scale(1.0)'
        }; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
          <div style="background: white; padding: 2px 7px; border-radius: 12px; border: 1.5px solid ${
            isSelected ? '#1B4332' : '#CBD5E1'
          }; box-shadow: 0 3px 6px rgba(0,0,0,0.15); font-size: 10px; font-weight: 700; color: #0D2119; white-space: nowrap; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
            <span>${member.name.split(' ')[0]}</span>
            <span style="color: ${batteryVal <= 20 ? '#DC2626' : '#166534'}; font-size: 9px; font-family: monospace;">🔋${batteryVal}%</span>
          </div>
          <div style="width: 34px; height: 34px; border-radius: 50%; background-color: ${
            member.color || '#38BDF8'
          }; border: 3px solid ${
        isSelected ? '#1B4332' : 'white'
      }; box-shadow: 0 4px 8px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: #0D2119; font-weight: 800; font-size: 13px;">
            ${initial}
          </div>
        </div>
      `;

      const memberIcon = L.divIcon({
        html: memberHtml,
        className: `custom-member-marker-${member.id}`,
        iconSize: [90, 60],
        iconAnchor: [45, 54],
      });

      if (markersRef.current[member.id]) {
        markersRef.current[member.id].setLatLng(latLng);
        markersRef.current[member.id].setIcon(memberIcon);
      } else {
        const marker = L.marker(latLng, { icon: memberIcon, zIndexOffset: 800 }).addTo(map);
        marker.on('click', () => {
          const latest = pairedMembersRef.current.find((m) => m.id === member.id) || member;
          onSelectMember(latest);
        });
        markersRef.current[member.id] = marker;
      }
    });
  }, [validMembers, selectedMember, onSelectMember, mapLoaded]);

  // Update Route Polyline connecting Me -> Selected Member
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (selectedMember) {
      const safeTargetLat = getSafeCoord(selectedMember.lastLat, safeMyLat);
      const safeTargetLng = getSafeCoord(selectedMember.lastLng, safeMyLng);

      const latLngs: [number, number][] = [
        [safeMyLat, safeMyLng],
        [safeTargetLat, safeTargetLng],
      ];

      if (polylineRef.current) {
        polylineRef.current.setLatLngs(latLngs);
      } else {
        polylineRef.current = L.polyline(latLngs, {
          color: '#16A34A',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.9,
        }).addTo(map);
      }
    } else {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    }
  }, [safeMyLat, safeMyLng, selectedMember, mapLoaded]);

  // Center / Fit Map Bounds
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;

    const points: [number, number][] = [[safeMyLat, safeMyLng]];
    validMembers.forEach((m) => points.push([m.lastLat, m.lastLng]));

    if (points.length === 1) {
      mapInstanceRef.current.setView(points[0], 16, { animate: true });
    } else {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  };

  const handleCenterMe = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([safeMyLat, safeMyLng], 16, { animate: true });
  };

  const handleZoomIn = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomOut();
  };

  // Launch Native Directions in Google Maps / Apple Maps
  const handleOpenExternalMaps = (member: FamilyMember) => {
    const lat = getSafeCoord(member.lastLat, safeMyLat);
    const lng = getSafeCoord(member.lastLng, safeMyLng);
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(gmapsUrl, '_blank');
  };

  // Metrics for selected member
  const selectedDistance = selectedMember
    ? calculateDistance(
        safeMyLat,
        safeMyLng,
        getSafeCoord(selectedMember.lastLat, safeMyLat),
        getSafeCoord(selectedMember.lastLng, safeMyLng)
      )
    : 0;

  const selectedBearing = selectedMember
    ? calculateBearing(
        safeMyLat,
        safeMyLng,
        getSafeCoord(selectedMember.lastLat, safeMyLat),
        getSafeCoord(selectedMember.lastLng, safeMyLng)
      )
    : 0;

  const walkingEtaMins = Math.max(1, Math.round(selectedDistance / 66));

  const getBatteryIcon = (lvl: number) => {
    if (lvl > 50) return <Battery className="w-4 h-4 text-[#166534]" />;
    if (lvl > 20) return <BatteryMedium className="w-4 h-4 text-[#D97706]" />;
    return <BatteryLow className="w-4 h-4 text-[#DC2626]" />;
  };

  return (
    <div
      id="map-screen"
      className="flex-1 flex flex-col h-full w-full bg-[#F8FAF9] text-[#0D2119] select-none relative overflow-hidden min-h-0"
    >
      {/* Top Header Bar */}
      <header className="h-16 px-4 sm:px-6 border-b border-[#E2E8F0] bg-[#FFFFFF] flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-[#0D2119] hover:bg-[#E2E8F0]/60 active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="headline-md text-lg sm:text-xl text-[#0D2119] flex items-center gap-2">
              <span>Real-Time Map</span>
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            </h2>
            <div className="label-sm text-[#5C7168] font-medium flex items-center gap-1.5">
              <span>Sangam Kumbh Grid</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-[#166534]">
                {validMembers.length + 1} Devices
              </span>
            </div>
          </div>
        </div>

        {/* Top Actions: Layer Picker & Fit View */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="p-2 rounded-xl bg-white border border-[#E2E8F0] text-[#1B4332] shadow-xs hover:bg-[#F8FAF9] active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              title="Change Map Style"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Layer Selection Dropdown */}
            {showLayerMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="label-sm font-bold text-[#5C7168] px-2 py-1 mb-1">
                  Map View Style
                </div>
                {[
                  { id: 'voyager' as MapLayerType, label: 'Carto Voyager', desc: 'Fast & Clean' },
                  { id: 'osm' as MapLayerType, label: 'OpenStreetMap', desc: 'Detailed Roads' },
                  { id: 'satellite' as MapLayerType, label: 'Satellite View', desc: 'Aerial Imagery' },
                  { id: 'tactical' as MapLayerType, label: 'Offline Tactical', desc: 'Zero Data Grid' },
                ].map((lyr) => (
                  <button
                    key={lyr.id}
                    onClick={() => {
                      setActiveLayerType(lyr.id);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex flex-col transition-all cursor-pointer ${
                      activeLayerType === lyr.id
                        ? 'bg-[#DCFCE7] text-[#166534] font-bold'
                        : 'text-[#0D2119] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <span>{lyr.label}</span>
                    <span className="text-[10px] text-[#5C7168] font-normal">{lyr.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleFitAll}
            className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#1B4332] label-sm font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#F8FAF9] active:scale-95 transition-all cursor-pointer"
            title="Fit All Members in View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit All</span>
          </button>
        </div>
      </header>

      {/* Map Canvas Viewport Stage */}
      <div
        className={`flex-1 relative w-full h-full min-h-0 overflow-hidden z-10 ${
          activeLayerType === 'tactical' ? 'map-tactical-grid' : 'bg-[#E2E8F0]'
        }`}
      >
        {/* Leaflet container */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {/* Quick Zoom & Recenter Floating Controls (Bottom Right of canvas) */}
        <div className="absolute right-4 bottom-6 z-20 flex flex-col gap-2 shadow-lg rounded-2xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] p-1">
          <button
            onClick={handleCenterMe}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#1B4332] hover:bg-[#F1F5F9] active:scale-90 transition-all cursor-pointer"
            title="Re-center on Me"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <div className="h-px bg-[#E2E8F0] mx-1" />
          <button
            onClick={handleZoomIn}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#0D2119] hover:bg-[#F1F5F9] active:scale-90 transition-all cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#0D2119] hover:bg-[#F1F5F9] active:scale-90 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Quick Member Picker Bar (Top Left overlay) */}
        <div className="absolute top-4 left-4 z-20 max-w-[calc(100%-80px)] overflow-x-auto no-scrollbar flex items-center gap-2 p-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-md">
          {validMembers.length === 0 ? (
            <div className="px-3 py-1 text-xs text-[#5C7168] flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[#16A34A] animate-pulse" />
              <span>Scanning circle for family...</span>
            </div>
          ) : (
            validMembers.map((member) => {
              const isSel = selectedMember?.id === member.id;
              const bat = member.battery ?? 90;
              return (
                <button
                  key={member.id}
                  onClick={() => onSelectMember(isSel ? null : member)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isSel
                      ? 'bg-[#1B4332] text-white shadow-xs'
                      : 'bg-white text-[#0D2119] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold text-black shrink-0"
                    style={{ backgroundColor: member.color || '#38BDF8' }}
                  >
                    {(member.name || 'F').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[80px]">{member.name.split(' ')[0]}</span>
                  <span
                    className={`text-[9px] font-mono ${
                      isSel ? 'text-[#4ADE80]' : bat <= 20 ? 'text-[#DC2626]' : 'text-[#5C7168]'
                    }`}
                  >
                    {bat}%
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Tactical / Offline Indicator Badge (Top Right overlay) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
          <div className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] text-xs font-mono font-bold text-[#0D2119] shadow-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
            <span>GPS Active</span>
          </div>
          {isOffline && (
            <div className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[10px] font-bold text-[#92400E] shadow-sm flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              <span>Offline Grid</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Selected Member Navigation Sheet OR Quick Helper Bar */}
      {selectedMember ? (
        <div className="p-4 sm:px-6 bg-white border-t border-[#E2E8F0] shrink-0 z-20 shadow-lg rounded-t-2xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-[#0D2119] ring-2 ring-[#E2E8F0] shadow-xs"
                style={{ backgroundColor: selectedMember.color || '#38BDF8' }}
              >
                {(selectedMember.name || 'F').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="body-lg font-bold text-[#0D2119] flex items-center gap-2">
                  <span>{selectedMember.name}</span>
                  <span className="text-xs font-mono font-normal text-[#5C7168]">
                    ({Math.max(1, Math.round((Date.now() - (selectedMember.lastUpdated || Date.now())) / 1000))}s ago)
                  </span>
                </h3>
                <div className="flex items-center gap-3 mt-0.5 text-xs font-semibold text-[#5C7168]">
                  <span className="flex items-center gap-1">
                    {getBatteryIcon(selectedMember.battery ?? 90)}
                    <span
                      className={
                        (selectedMember.battery ?? 90) <= 20 ? 'text-[#DC2626] font-bold' : ''
                      }
                    >
                      {selectedMember.battery ?? 90}% Battery
                    </span>
                  </span>
                  <span>•</span>
                  <span>
                    Distance: <strong>{selectedDistance}m</strong> (~{walkingEtaMins} min walk)
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectMember(null)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#94A3B8] hover:text-[#0D2119] hover:bg-[#F1F5F9] cursor-pointer"
            >
              Clear Route
            </button>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={() => handleOpenExternalMaps(selectedMember)}
              className="py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#012D1D] active:scale-[0.98] text-white label-md font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Navigation className="w-4 h-4 text-[#4ADE80]" />
              <span>Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            <button
              onClick={() => onNavigateToArrow(selectedMember)}
              className="py-3 px-4 rounded-xl bg-[#DCFCE7] hover:bg-[#BBF7D0] border border-[#86EFAC] active:scale-[0.98] text-[#166534] label-md font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Compass className="w-4 h-4 text-[#166534]" />
              <span>Direction Radar</span>
              <ChevronRight className="w-4 h-4 text-[#166534]" />
            </button>
          </div>
        </div>
      ) : (
        /* Summary Footer when no member selected */
        <div className="p-3 sm:px-6 bg-white border-t border-[#E2E8F0] shrink-0 z-20 flex items-center justify-between text-xs text-[#5C7168] font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>Tap any friend's pin on the map to see route & walking directions</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFitAll}
              className="text-[#1B4332] font-bold hover:underline cursor-pointer"
            >
              Show All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

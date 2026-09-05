import React, { useEffect, useRef, useState } from 'react';
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
  User,
  Signal,
  MessageSquare,
  AlertTriangle,
  RotateCw,
  Crosshair,
} from 'lucide-react';
import { FamilyMember, LanguageCode } from '../types';
import { calculateDistance, calculateBearing } from '../services/navigationMath';

// Declare Leaflet global type from CDN script
declare const L: any;

interface Props {
  myLocation: { latitude: number; longitude: number };
  myDeviceName: string;
  myColor?: string;
  myBattery?: number;
  pairedMembers: FamilyMember[];
  selectedMember: FamilyMember | null;
  onSelectMember: (member: FamilyMember | null) => void;
  onNavigateToArrow: (member: FamilyMember) => void;
  onBack: () => void;
  lang?: LanguageCode;
}

export const MapScreen: React.FC<Props> = ({
  myLocation,
  myDeviceName,
  myColor = '#4ADE80',
  myBattery = 92,
  pairedMembers,
  selectedMember,
  onSelectMember,
  onNavigateToArrow,
  onBack,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const myMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    if (typeof L === 'undefined') {
      console.warn('Leaflet library is not loaded');
      return;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [myLocation.latitude, myLocation.longitude],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      // Add lightweight scale control
      L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Trigger map resize after DOM mount
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } catch (err) {
      console.error('Failed to initialize map:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update "Me" Marker
  useEffect(() => {
    if (!mapInstanceRef.current || typeof L === 'undefined') return;

    const map = mapInstanceRef.current;
    const latLng = [myLocation.latitude, myLocation.longitude];

    const myHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(27, 67, 50, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #1B4332; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 10px;">
          ME
        </div>
      </div>
    `;

    const myIcon = L.divIcon({
      html: myHtml,
      className: 'custom-me-marker',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (myMarkerRef.current) {
      myMarkerRef.current.setLatLng(latLng);
      myMarkerRef.current.setIcon(myIcon);
    } else {
      myMarkerRef.current = L.marker(latLng, { icon: myIcon, zIndexOffset: 1000 }).addTo(map);
      myMarkerRef.current.bindPopup(`<b>${myDeviceName} (Me)</b><br/>🔋 ${myBattery}% Battery`);
    }
  }, [myLocation.latitude, myLocation.longitude, myDeviceName, myBattery]);

  // Update Family Member Markers
  useEffect(() => {
    if (!mapInstanceRef.current || typeof L === 'undefined') return;

    const map = mapInstanceRef.current;
    const currentMarkerIds = new Set(Object.keys(markersRef.current));
    const activeMemberIds = new Set(pairedMembers.map((m) => m.id));

    // Remove obsolete markers
    currentMarkerIds.forEach((id) => {
      if (!activeMemberIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update member markers
    pairedMembers.forEach((member) => {
      const latLng = [member.lastLat, member.lastLng];
      const isSelected = selectedMember?.id === member.id;
      const batteryVal = member.battery ?? 90;
      const initial = member.name.charAt(0).toUpperCase();

      const memberHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: ${
          isSelected ? 'scale(1.15)' : 'scale(1.0)'
        }; transition: transform 0.2s ease;">
          <div style="background: white; padding: 2px 6px; border-radius: 12px; border: 1.5px solid #E2E8F0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 10px; font-weight: 700; color: #0D2119; white-space: nowrap; margin-bottom: 2px; display: flex; align-items: center; gap: 3px;">
            <span>${member.name.split(' ')[0]}</span>
            <span style="color: ${batteryVal <= 20 ? '#DC2626' : '#166534'}; font-size: 9px;">🔋${batteryVal}%</span>
          </div>
          <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${
            member.color || '#38BDF8'
          }; border: 3px solid ${
        isSelected ? '#1B4332' : 'white'
      }; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: #0D2119; font-weight: 800; font-size: 12px;">
            ${initial}
          </div>
        </div>
      `;

      const memberIcon = L.divIcon({
        html: memberHtml,
        className: `custom-member-marker-${member.id}`,
        iconSize: [80, 56],
        iconAnchor: [40, 52],
      });

      if (markersRef.current[member.id]) {
        markersRef.current[member.id].setLatLng(latLng);
        markersRef.current[member.id].setIcon(memberIcon);
      } else {
        const marker = L.marker(latLng, { icon: memberIcon }).addTo(map);
        marker.on('click', () => {
          onSelectMember(member);
        });
        markersRef.current[member.id] = marker;
      }
    });
  }, [pairedMembers, selectedMember, onSelectMember]);

  // Update Route Polyline connecting Me -> Selected Member
  useEffect(() => {
    if (!mapInstanceRef.current || typeof L === 'undefined') return;

    const map = mapInstanceRef.current;

    if (selectedMember) {
      const latLngs = [
        [myLocation.latitude, myLocation.longitude],
        [selectedMember.lastLat, selectedMember.lastLng],
      ];

      if (polylineRef.current) {
        polylineRef.current.setLatLngs(latLngs);
      } else {
        polylineRef.current = L.polyline(latLngs, {
          color: '#1B4332',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.85,
        }).addTo(map);
      }
    } else {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    }
  }, [myLocation, selectedMember]);

  // Center / Fit Map Bounds
  const handleFitAll = () => {
    if (!mapInstanceRef.current || typeof L === 'undefined') return;

    const points: [number, number][] = [[myLocation.latitude, myLocation.longitude]];
    pairedMembers.forEach((m) => points.push([m.lastLat, m.lastLng]));

    if (points.length === 1) {
      mapInstanceRef.current.setView(points[0], 16);
    } else {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  };

  const handleCenterMe = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.animateView
      ? mapInstanceRef.current.setView([myLocation.latitude, myLocation.longitude], 16)
      : mapInstanceRef.current.panTo([myLocation.latitude, myLocation.longitude]);
  };

  // Launch Native Directions in Google Maps / Apple Maps
  const handleOpenExternalMaps = (member: FamilyMember) => {
    const lat = member.lastLat;
    const lng = member.lastLng;
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(gmapsUrl, '_blank');
  };

  // Calculate metrics for selected member
  const selectedDistance = selectedMember
    ? calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        selectedMember.lastLat,
        selectedMember.lastLng
      )
    : 0;

  const selectedBearing = selectedMember
    ? calculateBearing(
        myLocation.latitude,
        myLocation.longitude,
        selectedMember.lastLat,
        selectedMember.lastLng
      )
    : 0;

  // Approximate ETA walking at 4 km/h (~66 m/min)
  const walkingEtaMins = Math.max(1, Math.round(selectedDistance / 66));

  const getBatteryIcon = (lvl: number) => {
    if (lvl > 50) return <Battery className="w-4 h-4 text-[#166534]" />;
    if (lvl > 20) return <BatteryMedium className="w-4 h-4 text-[#D97706]" />;
    return <BatteryLow className="w-4 h-4 text-[#DC2626]" />;
  };

  return (
    <div
      id="map-screen"
      className="flex-1 flex flex-col h-full w-full bg-[#F8FAF9] text-[#0D2119] select-none relative overflow-hidden"
    >
      {/* Top Bar */}
      <header className="h-16 px-4 sm:px-6 border-b border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between shrink-0 z-20 shadow-xs">
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
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
            </h2>
            <div className="label-sm text-[#5C7168] font-medium">
              Live Location & Battery Tracker
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFitAll}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-[#1B4332] label-sm font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#F8FAF9] cursor-pointer"
            title="Fit All Members in View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit All</span>
          </button>
          <button
            onClick={handleCenterMe}
            className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] text-[#1B4332] flex items-center justify-center shadow-xs hover:bg-[#F8FAF9] cursor-pointer"
            title="Re-center on Me"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Leaflet Map Canvas Viewport */}
      <div className="flex-1 relative w-full h-full bg-[#E5E5E5] overflow-hidden z-10">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Quick Floating Controls (Top Right overlay) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-[#E2E8F0] text-xs font-mono font-bold text-[#0D2119] shadow-md flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#1B4332]" />
            <span>{pairedMembers.length + 1} Pins Active</span>
          </div>
        </div>

        {/* Floating Quick Member Picker Bar (Top Left overlay) */}
        <div className="absolute top-4 left-4 z-20 max-w-[calc(100%-80px)] overflow-x-auto no-scrollbar flex items-center gap-2 p-1.5 rounded-2xl bg-white/90 backdrop-blur-md border border-[#E2E8F0] shadow-md">
          {pairedMembers.map((member) => {
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
                  {member.name.charAt(0).toUpperCase()}
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
          })}
        </div>
      </div>

      {/* Bottom Selected Member Details & Navigation Action Sheet */}
      {selectedMember ? (
        <div className="p-4 sm:px-6 bg-white border-t border-[#E2E8F0] shrink-0 z-20 shadow-lg rounded-t-2xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-[#0D2119] ring-2 ring-[#E2E8F0] shadow-xs"
                style={{ backgroundColor: selectedMember.color || '#38BDF8' }}
              >
                {selectedMember.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="body-lg font-bold text-[#0D2119] flex items-center gap-2">
                  <span>{selectedMember.name}</span>
                  <span className="text-xs font-mono font-normal text-[#5C7168]">
                    ({Math.round((Date.now() - selectedMember.lastUpdated) / 1000)}s ago)
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
                    ETA: <strong>~{walkingEtaMins} min walk</strong>
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

          {/* Navigation Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Direct Google / Apple Maps External Directions */}
            <button
              onClick={() => handleOpenExternalMaps(selectedMember)}
              className="py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#012D1D] active:scale-[0.98] text-white label-md font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Navigation className="w-4 h-4 text-[#4ADE80]" />
              <span>Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* In-App Direction Radar Compass Lock */}
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
            <span>Tap any friend's pin on the map to see live battery & get directions!</span>
          </div>
          <button
            onClick={handleFitAll}
            className="text-[#1B4332] font-bold hover:underline cursor-pointer"
          >
            Show All
          </button>
        </div>
      )}
    </div>
  );
};

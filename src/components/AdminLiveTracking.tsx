import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Bus as BusIcon, Navigation, Info, Clock, MapPin } from 'lucide-react';

// Component to handle map centering and auto-fitting bounds when bus locations change
function MapBoundsUpdater({ buses, selectedBusId }: { buses: BusLocation[], selectedBusId: string | null }) {
  const map = useMap();
  useEffect(() => {
    const selectedBus = buses.find(b => b.id === selectedBusId);
    if (selectedBus) {
      map.setView([selectedBus.lat, selectedBus.lng], 16);
    } else if (buses.length > 0) {
      const validBuses = buses.filter(b => b.lat && b.lng);
      if (validBuses.length > 0) {
        const bounds = L.latLngBounds(validBuses.map(b => [b.lat, b.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [buses, selectedBusId, map]);
  return null;
}

// Create a custom SVG icon for the bus with rotation support
const createBusIcon = (rotation: number = 0) => new L.DivIcon({
  html: `<div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out; width: 32px; height: 32px; background-color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
    </svg>
  </div>`,
  className: 'bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

interface BusLocation {
  id: string;
  busId: string;
  busNumber: string;
  lat: number;
  lng: number;
  driver?: string;
  lastUpdated: any; // Firestore Timestamp
  routeId?: string;
  route?: string;
  isTripInProgress?: boolean;
  tripStartTime?: any;
  reachedStops?: string[];
}

interface AnimatedBusMarkerProps {
  bus: BusLocation;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

// Animated Marker Component for smooth movement
const AnimatedBusMarker: React.FC<AnimatedBusMarkerProps> = ({ bus, onSelect, isSelected }) => {
  const [currentPos, setCurrentPos] = useState<[number, number]>([bus.lat, bus.lng]);
  const [rotation, setRotation] = useState(0);
  const lastPosRef = useRef<[number, number]>([bus.lat, bus.lng]);
  const targetPosRef = useRef<[number, number]>([bus.lat, bus.lng]);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const markerRef = useRef<L.Marker>(null);
  const duration = 3000;

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  useEffect(() => {
    if (bus.lat !== targetPosRef.current[0] || bus.lng !== targetPosRef.current[1]) {
      const dy = bus.lat - targetPosRef.current[0];
      const dx = bus.lng - targetPosRef.current[1];
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      setRotation(90 - angle);

      lastPosRef.current = currentPos;
      targetPosRef.current = [bus.lat, bus.lng];
      startTimeRef.current = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        
        const lat = lastPosRef.current[0] + (targetPosRef.current[0] - lastPosRef.current[0]) * progress;
        const lng = lastPosRef.current[1] + (targetPosRef.current[1] - lastPosRef.current[1]) * progress;
        
        setCurrentPos([lat, lng]);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [bus.lat, bus.lng]);

  const status = getBusStatus(bus.lastUpdated);

  return (
    <Marker
      ref={markerRef}
      position={currentPos}
      icon={createBusIcon(rotation)}
      eventHandlers={{ click: () => onSelect(bus.id) }}
    >
      <Popup className="rounded-xl">
        <div className="p-1 min-w-[180px]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900">{bus.busNumber}</span>
            <span className={`text-[10px] font-bold uppercase ${status === 'online' ? 'text-green-600' : 'text-slate-400'}`}>{status}</span>
          </div>
          <div className="space-y-1 text-xs text-slate-500">
            <p>Driver: {bus.driver || 'N/A'}</p>
            {bus.isTripInProgress && <p className="text-green-600 font-bold">Trip Active</p>}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

const getBusStatus = (lastUpdated: any) => {
  if (!lastUpdated) return 'offline';
  const lastUpdateDate = lastUpdated.toDate ? lastUpdated.toDate() : new Date(lastUpdated);
  const diff = (new Date().getTime() - lastUpdateDate.getTime()) / 1000;
  return diff < 120 ? 'online' : 'offline';
};

const center: [number, number] = [12.9716, 77.5946];

const RouteProgressCard: React.FC<{ route: any, bus: BusLocation | undefined, onTrack: (id: string) => void }> = ({ route, bus, onTrack }) => {
  const [etas, setEtas] = useState<Record<string, string>>({});
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setApiKeyError(true);
      return;
    }
    
    if (typeof window.google === 'object' && typeof window.google.maps === 'object') {
      setGoogleMapsLoaded(true);
      return;
    }

    if (document.querySelector('script[src^="https://maps.googleapis.com/maps/api/js"]')) {
      const checkInterval = setInterval(() => {
        if (typeof window.google === 'object' && typeof window.google.maps === 'object') {
          setGoogleMapsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleMapsLoaded(true);
    document.head.appendChild(script);
  }, [apiKey]);

  const stops = [route.startPoint, ...(route.stops || []), route.endPoint].filter(Boolean);
  
  let currentStopIndex = -1;
  let isTripInProgress = false;
  let tripStartTime = null;
  let reachedStops = bus?.reachedStops || [];

  if (bus) {
    isTripInProgress = !!bus.isTripInProgress;
    tripStartTime = bus.tripStartTime;
    
    if (isTripInProgress) {
      for (let i = stops.length - 1; i >= 0; i--) {
        if (reachedStops.includes(stops[i])) {
          currentStopIndex = i;
          break;
        }
      }
    }
  }

  useEffect(() => {
    const calculateETAs = async () => {
      if (isTripInProgress && googleMapsLoaded && bus && bus.lat && bus.lng) {
        const remainingStops = stops.slice(currentStopIndex + 1);
        if (remainingStops.length === 0) return;

        const routeDoc = route;
        const stopCoordinates = routeDoc.stopCoordinates || {};
        const destinations = remainingStops.map(stop => stopCoordinates[stop]).filter(Boolean);

        if (destinations.length === 0) return;

        try {
          const response = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distance,status,condition'
            },
            body: JSON.stringify({
              origins: [{
                waypoint: {
                  location: {
                    latLng: {
                      latitude: bus.lat,
                      longitude: bus.lng
                    }
                  }
                }
              }],
              destinations: destinations.map(coord => ({
                waypoint: {
                  location: {
                    latLng: {
                      latitude: coord.lat,
                      longitude: coord.lng
                    }
                  }
                }
              })),
              travelMode: 'DRIVE',
              routingPreference: 'TRAFFIC_AWARE'
            })
          });

          if (!response.ok) {
            throw new Error(`Routes API error: ${response.statusText}`);
          }

          const data = await response.json();
          const newEtas: Record<string, string> = {};
          
          data.forEach((element: any) => {
            const destIndex = element.destinationIndex || 0;
            const stop = remainingStops[destIndex];
            
            if (element.status?.code === undefined || element.status?.code === 0) {
              const durationSeconds = parseInt(element.duration.replace('s', ''));
              const minutes = Math.round(durationSeconds / 60);
              newEtas[stop] = `${minutes} mins`;
            }
          });
          
          setEtas(newEtas);
        } catch (error) {
          console.error("Error calculating ETAs with Routes API (Admin):", error);
        }
      }
    };

    calculateETAs();
  }, [isTripInProgress, googleMapsLoaded, bus?.lat, bus?.lng, currentStopIndex, apiKey]);

  const progress = currentStopIndex >= 0 ? (currentStopIndex / (stops.length - 1)) * 100 : 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-red-100 transition-all">
      <div className="flex justify-between mb-4">
        <div className="flex flex-col">
          <p className="font-bold text-slate-900">{route.name}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Bus: {bus?.busNumber || 'N/A'} • Driver: {bus?.driver || 'N/A'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">
              {isTripInProgress 
                ? (currentStopIndex === stops.length - 1 ? 'Trip Completed' : `Next: ${stops[currentStopIndex + 1] || 'Arrived'}`)
                : 'Trip Not Started'}
            </p>
            {isTripInProgress && (
              <div className="text-[10px] text-green-600 font-bold flex items-center justify-end gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                LIVE TRACKING
              </div>
            )}
          </div>
          {bus && (
            <button 
              onClick={() => onTrack(bus.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold hover:bg-red-600 hover:text-white transition-all"
            >
              <Navigation size={12} />
              LIVE TRACK
            </button>
          )}
        </div>
      </div>
      <div className="relative h-2 bg-slate-100 rounded-full">
        <div className="absolute left-0 top-0 h-full bg-red-600 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        <div className="absolute top-[-4px] w-4 h-4 bg-red-600 rounded-full border-2 border-white transition-all duration-1000" style={{ left: `${progress}%` }}></div>
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>{route.startPoint}</span>
        <span>{route.endPoint}</span>
      </div>
      
      {apiKeyError && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-[10px] text-amber-700 font-medium">
          <Info size={14} />
          Traffic-aware ETAs disabled. Google Maps API key missing.
        </div>
      )}

      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {stops.map((stop, index) => {
          const isReached = reachedStops.includes(stop);
          const isNext = isTripInProgress && !isReached && (index === 0 || reachedStops.includes(stops[index - 1]));
          const eta = etas[stop];

          return (
            <div key={index} className="text-center min-w-[100px] flex flex-col items-center gap-1">
              <div className={`w-2 h-2 rounded-full border-2 ${
                isReached ? 'bg-slate-400 border-slate-400' : isNext ? 'bg-white border-green-600' : 'bg-white border-slate-200'
              }`} />
              <p className={`text-[10px] font-bold ${
                isReached ? 'text-slate-400' : isNext ? 'text-green-600' : 'text-slate-900'
              } uppercase tracking-tight`}>{stop}</p>
              {eta && !isReached && (
                <p className="text-[9px] font-medium text-slate-400 flex items-center gap-0.5">
                  <Clock className="w-2 h-2" /> {eta}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminLiveTracking: React.FC<{ routes: any[] }> = ({ routes }) => {
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error("Geolocation error:", err)
    );

    const q = query(collection(db, 'buses'));
    const handleFirestoreError = (error: any, operation: string, path: string) => {
      const errInfo = {
        error: error.message || String(error),
        operationType: operation,
        path,
        authInfo: {
          userId: null,
          email: null,
          emailVerified: false,
        }
      };
      console.error('Firestore Error:', JSON.stringify(errInfo));
      throw new Error(JSON.stringify(errInfo));
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const busData: BusLocation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lat && data.lng) {
          busData.push({
            id: doc.id,
            busId: data.id || doc.id,
            busNumber: data.busNumber || data.id || 'N/A',
            lat: data.lat,
            lng: data.lng,
            driver: data.driver,
            lastUpdated: data.lastUpdated,
            routeId: data.routeId,
            route: data.route,
            isTripInProgress: data.isTripInProgress,
            tripStartTime: data.tripStartTime,
            reachedStops: data.reachedStops || []
          });
        }
      });
      setBuses(busData);
    }, (error) => {
      handleFirestoreError(error, 'list', 'buses');
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative z-0">
          <MapContainer center={center} zoom={12} style={{ width: '100%', height: '600px', zIndex: 0 }} zoomControl={true}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <MapBoundsUpdater buses={buses} selectedBusId={selectedBusId} />
            
            {buses.map((bus) => (
              <AnimatedBusMarker 
                key={bus.id} 
                bus={bus} 
                onSelect={setSelectedBusId} 
                isSelected={selectedBusId === bus.id} 
              />
            ))}
          </MapContainer>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Active Fleet</h3>
              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold">
                {buses.length} UNITS
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {buses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <BusIcon size={32} className="text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">No active buses found</p>
                </div>
              ) : (
                buses.map(bus => {
                  const status = getBusStatus(bus.lastUpdated);
                  const isSelected = selectedBusId === bus.id;
                  
                  return (
                    <div
                      key={bus.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedBusId(bus.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedBusId(bus.id);
                        }
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-red-50 border-red-200 shadow-sm' 
                          : 'bg-white border-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold text-sm ${isSelected ? 'text-red-600' : 'text-slate-900'}`}>
                          {bus.busNumber}
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(bus.busNumber);
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy Bus Number"
                          >
                            <Info size={12} />
                          </button>
                          <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-slate-300'}`} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Navigation size={10} />
                          <span className="truncate">{bus.route || 'No Route Assigned'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <MapPin size={10} />
                          <span>{bus.driver || 'No Driver'}</span>
                        </div>
                      </div>
                      {bus.isTripInProgress && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-green-600 uppercase">Trip Active</span>
                          <div className="flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-green-600 animate-pulse" />
                            <span className="text-[9px] text-slate-400">Live</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            
            {selectedBusId && (
              <button
                onClick={() => setSelectedBusId(null)}
                className="mt-4 w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all"
              >
                Reset View
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Route Visualizations */}
      <div className="w-full mt-6 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold text-slate-900">Route Progress</h3>
          <p className="text-xs text-slate-400">Detailed status of all active routes</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(routes || []).map(route => {
            const bus = buses.find(b => b.routeId === route.docId || b.route === route.name);
            return <RouteProgressCard key={route.docId} route={route} bus={bus} onTrack={setSelectedBusId} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminLiveTracking;

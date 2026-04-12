import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Bus as BusIcon, MapPin, Clock, Navigation, CheckCircle2, Circle, AlertCircle, ChevronRight } from 'lucide-react';

// Component to handle map centering when bus location changes
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Create a custom SVG icon for the bus with rotation support
const createBusIcon = (rotation: number = 0) => new L.DivIcon({
  html: `<div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out; width: 36px; height: 36px; background-color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.3);">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
    </svg>
  </div>`,
  className: 'bg-transparent border-none',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

// Animated Marker Component for smooth movement
function AnimatedMarker({ position }: { position: [number, number] }) {
  const [currentPos, setCurrentPos] = useState<[number, number]>(position);
  const [rotation, setRotation] = useState(0);
  const lastPosRef = useRef<[number, number]>(position);
  const targetPosRef = useRef<[number, number]>(position);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const duration = 3000; 

  useEffect(() => {
    if (position[0] !== targetPosRef.current[0] || position[1] !== targetPosRef.current[1]) {
      const dy = position[0] - targetPosRef.current[0];
      const dx = position[1] - targetPosRef.current[1];
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      setRotation(90 - angle); 

      lastPosRef.current = currentPos;
      targetPosRef.current = position;
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
  }, [position]);

  return <Marker position={currentPos} icon={createBusIcon(rotation)} />;
}

interface StudentTrackBusProps {
  busId?: string;
  busNumber: string;
  route: any;
  boardingPoint: string;
  isPublicBus?: boolean;
  initialLocation?: [number, number];
}

const StudentTrackBus: React.FC<StudentTrackBusProps> = ({ busId, busNumber, route, boardingPoint, isPublicBus, initialLocation }) => {
  const [busLocation, setBusLocation] = useState<[number, number] | null>(initialLocation || null);
  const [isTripInProgress, setIsTripInProgress] = useState(isPublicBus || false);
  const [reachedStops, setReachedStops] = useState<string[]>([]);
  const [etas, setEtas] = useState<Record<string, string>>({});
  const [totalEta, setTotalEta] = useState<string | null>(null);
  const [boardingPointEta, setBoardingPointEta] = useState<string | null>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [stopTimestamps, setStopTimestamps] = useState<Record<string, any>>({});

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!busId) {
      // If no busId (e.g., mock public bus), simulate movement
      if (isPublicBus && initialLocation && route) {
        let currentLat = initialLocation[0];
        let currentLng = initialLocation[1];
        
        // Simulate moving towards the boarding point
        const simulateMovement = setInterval(() => {
          // Add a small random variation to simulate real movement
          currentLat += (Math.random() - 0.2) * 0.0005;
          currentLng += (Math.random() - 0.2) * 0.0005;
          setBusLocation([currentLat, currentLng]);
        }, 3000);
        
        return () => clearInterval(simulateMovement);
      }
      return;
    }

    const handleFirestoreError = (error: any, operation: string, path: string) => {
      const errInfo = {
        error: error.message || String(error),
        operationType: operation,
        path,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
        }
      };
      console.error('Firestore Error:', JSON.stringify(errInfo));
      throw new Error(JSON.stringify(errInfo));
    };

    const unsubscribe = onSnapshot(doc(db, 'buses', busId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsTripInProgress(!!data.isTripInProgress);
        
        // Deep equality check for reachedStops to prevent re-render loops
        const newReachedStops = data.reachedStops || [];
        setReachedStops(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newReachedStops)) return prev;
          return newReachedStops;
        });
        
        setStopTimestamps(data.stopTimestamps || {});
        
        if (data.lat && data.lng) {
          setBusLocation(prev => {
            if (prev && prev[0] === data.lat && prev[1] === data.lng) return prev;
            return [data.lat, data.lng];
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, 'get', `buses/${busId}`);
    });

    return () => unsubscribe();
  }, [busId, isPublicBus, initialLocation?.[0], initialLocation?.[1], route?.docId, route?.name]);

  // Load Google Maps script for Directions API
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

  const fullRoute = [route?.startPoint, ...(route?.stops || []), route?.endPoint].filter(Boolean);

  const smoothProgress = useMemo(() => {
    if (!fullRoute.length || !route?.stopCoordinates || !busLocation || !isTripInProgress) {
      return Math.max(0, (reachedStops.length - 1) / (fullRoute.length - 1)) || 0;
    }
    
    // Find the index of the last reached stop in the fullRoute
    let lastReachedIndex = -1;
    for (let i = fullRoute.length - 1; i >= 0; i--) {
      if (reachedStops.includes(fullRoute[i])) {
        lastReachedIndex = i;
        break;
      }
    }

    // If no stops reached yet, but trip is in progress, we might be moving towards the first stop
    if (lastReachedIndex === -1) return 0;
    
    // If all stops reached
    if (lastReachedIndex === fullRoute.length - 1) return 1;

    // Current segment: from fullRoute[lastReachedIndex] to fullRoute[lastReachedIndex + 1]
    const startStop = fullRoute[lastReachedIndex];
    const endStop = fullRoute[lastReachedIndex + 1];
    
    const startCoord = route.stopCoordinates[startStop];
    const endCoord = route.stopCoordinates[endStop];
    
    if (!startCoord || !endCoord) return lastReachedIndex / (fullRoute.length - 1);

    // Simple Euclidean distance for interpolation (sufficient for UI progress)
    const getDist = (p1: {lat: number, lng: number}, p2: {lat: number, lng: number}) => {
      return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
    };

    const totalSegmentDist = getDist(startCoord, endCoord);
    const busDistFromStart = getDist(startCoord, { lat: busLocation[0], lng: busLocation[1] });
    
    // Clamp fractional progress between 0 and 1
    // We also check if the bus is actually moving towards the endCoord
    const busDistFromEnd = getDist(endCoord, { lat: busLocation[0], lng: busLocation[1] });
    
    // If bus is closer to end than start, but hasn't reached yet, we interpolate
    // A more robust way is to project the point onto the segment, but this is a good approximation
    let fractionalProgress = busDistFromStart / (busDistFromStart + busDistFromEnd);
    
    // Clamp
    fractionalProgress = Math.min(Math.max(fractionalProgress, 0), 1);
    
    return (lastReachedIndex + fractionalProgress) / (fullRoute.length - 1);
  }, [fullRoute, route?.stopCoordinates, busLocation, reachedStops, isTripInProgress]);

  // Calculate ETAs using Google Maps Distance Matrix API for traffic-aware estimation
  useEffect(() => {
    if (!googleMapsLoaded || !busLocation || typeof busLocation[0] !== 'number' || typeof busLocation[1] !== 'number' || !isTripInProgress || !route) return;

    const calculateETAs = async () => {
      const fullRoute = [route.startPoint, ...(route.stops || []), route.endPoint].filter(Boolean);
      
      // Find the next stop that hasn't been reached
      const nextStopIndex = fullRoute.findIndex(stop => !reachedStops.includes(stop));
      if (nextStopIndex === -1) {
        setTotalEta('Arrived');
        return;
      }

      const upcomingStops = fullRoute.slice(nextStopIndex);
      const destinations = upcomingStops
        .map(stop => route.stopCoordinates?.[stop])
        .filter(Boolean);

      if (destinations.length === 0) return;

      try {
        // Using the new Routes API (v2) as recommended by Google Maps
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
                    latitude: busLocation[0],
                    longitude: busLocation[1]
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
          const errorData = await response.json().catch(() => ({}));
          console.error('Routes API Error Details:', errorData);
          throw new Error(`Routes API error: ${response.statusText}`);
        }

        const data = await response.json();
        const newEtas: Record<string, string> = {};
        
        // Routes API returns an array of elements
        data.forEach((element: any) => {
          const destIndex = element.destinationIndex || 0;
          const stop = upcomingStops[destIndex];
          
          if (element.status?.code === undefined || element.status?.code === 0) {
            // Duration is returned as a string like "123s"
            const durationSeconds = parseInt(element.duration.replace('s', ''));
            const arrivalTime = new Date(Date.now() + durationSeconds * 1000);
            newEtas[stop] = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (destIndex === 0) {
              const mins = Math.round(durationSeconds / 60);
              setTotalEta(`${mins} mins`);
            }
            
            if (stop === boardingPoint) {
              const mins = Math.round(durationSeconds / 60);
              setBoardingPointEta(`${mins} mins`);
            }
          } else {
            newEtas[stop] = '--:--';
          }
        });
        
        setEtas(prev => ({ ...prev, ...newEtas }));
      } catch (error) {
        console.error("Error calculating ETAs with Routes API:", error);
        // If Routes API fails (e.g. not enabled), fallback to simple distance-based estimation
        const newEtas: Record<string, string> = {};
        upcomingStops.forEach(stop => {
          newEtas[stop] = '--:--';
        });
        setEtas(prev => ({ ...prev, ...newEtas }));
      }
    };

    const interval = setInterval(calculateETAs, 60000); // Update every minute to save quota
    calculateETAs();

    return () => clearInterval(interval);
  }, [googleMapsLoaded, busLocation?.[0], busLocation?.[1], isTripInProgress, route?.docId, route?.name, reachedStops, apiKey, boardingPoint]);

  // Split path into segments
  const getSegments = () => {
    if (!route?.stopCoordinates) return [];
    const routePath = fullRoute.map(stop => route.stopCoordinates[stop]).filter(Boolean).map(c => [c.lat, c.lng] as [number, number]);
    if (!routePath.length) return [];
    
    const segments = [];
    
    // This is a simplified approach, assuming stops are in order along the path
    // In a real app, you'd need the actual path coordinates between stops
    // For now, we'll draw lines between stops
    
    for (let i = 0; i < routePath.length - 1; i++) {
      const stop = fullRoute[i];
      
      const isReached = reachedStops.includes(stop);
      const isNext = !isReached && (i === 0 || reachedStops.includes(fullRoute[i - 1]));
      
      let segmentState: 'covered' | 'current' | 'remaining' = 'remaining';
      if (isReached) segmentState = 'covered';
      else if (isNext) segmentState = 'current';
      
      segments.push({
        path: [routePath[i], routePath[i+1]],
        state: segmentState
      });
    }
    return segments;
  };

  const segments = getSegments();
  
  return (
    <div className="w-full space-y-8">
      {/* Map Section */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden relative z-0 group">
        <MapContainer 
          center={busLocation || [12.9716, 77.5946]} 
          zoom={15} 
          style={{ width: '100%', height: '450px', zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {segments.map((seg, i) => (
            <Polyline 
              key={i} 
              positions={seg.path} 
              color={seg.state === 'covered' ? '#94a3b8' : seg.state === 'current' ? '#22c55e' : '#3b82f6'} 
              weight={6}
            />
          ))}

          {busLocation && (
            <>
              <MapUpdater center={busLocation} />
              <AnimatedMarker position={busLocation} />
            </>
          )}
        </MapContainer>
        
        {/* Floating Status Cards */}
        <div className="absolute top-6 left-6 right-6 flex flex-wrap gap-3 pointer-events-none z-[1000]">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl border border-white/50 shadow-2xl flex items-center gap-4 pointer-events-auto"
          >
            <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
              <BusIcon size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Tracking</p>
              <p className="text-xl font-black text-slate-900 leading-none">Bus-{busNumber}</p>
            </div>
          </motion.div>
          
          {!isTripInProgress && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-orange-500 p-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto"
            >
              <AlertCircle size={20} className="text-white" />
              <p className="text-sm font-bold text-white">Trip not started yet</p>
            </motion.div>
          )}
        </div>

        {/* Map Controls Overlay */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[1000] pointer-events-auto">
          <button className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
            <Navigation size={20} />
          </button>
        </div>
      </div>

      {/* Horizontal Route Progress Tracker */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Live Route Progress</h3>
            <p className="text-slate-400 text-sm font-medium mt-1">Real-time stop updates and traffic-aware ETAs</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Live Sync</span>
          </div>
        </div>

        {apiKeyError && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-xs text-amber-700 font-medium">
            <AlertCircle size={18} />
            Traffic-aware ETAs are currently disabled because the Google Maps API key is not configured.
          </div>
        )}

        <div className="relative pt-12 pb-8 px-4">
          {/* Progress Line Background */}
          <div className="absolute top-[60px] left-8 right-8 h-1.5 bg-slate-100 rounded-full" />
          
          {/* Active Progress Line */}
          <motion.div 
            className="absolute top-[60px] left-8 h-1.5 bg-green-500 rounded-full z-10"
            initial={{ width: 0 }}
            animate={{ 
              width: `calc(${smoothProgress * 100}% - ${smoothProgress * 64}px)` 
            }}
            transition={{ duration: 2, ease: "linear" }}
          />

          {/* Bus Indicator on Progress Line */}
          <motion.div
            className="absolute top-[60px] left-8 z-30 -translate-y-1/2 -translate-x-1/2"
            animate={{ 
              left: `calc(32px + ${smoothProgress * 100}% - ${smoothProgress * 64}px)` 
            }}
            transition={{ duration: 2, ease: "linear" }}
          >
             <div className="bg-white p-1.5 rounded-full shadow-lg border-2 border-green-500 flex items-center justify-center">
               <BusIcon size={14} className="text-green-600" />
             </div>
          </motion.div>

          <div className="flex justify-between relative z-20">
            {fullRoute.map((stop: string, index: number) => {
              const isReached = reachedStops.includes(stop);
              const isNext = !isReached && (index === 0 || reachedStops.includes(fullRoute[index - 1]));
              const isFuture = !isReached && !isNext;
              const isYourStop = stop === boardingPoint;

              return (
                <div key={index} className="flex flex-col items-center group relative min-w-[100px]">
                  {/* Stop Marker */}
                  <div className="relative mb-6">
                    <motion.div 
                      className={`w-10 h-10 rounded-full border-4 border-white shadow-xl flex items-center justify-center transition-all duration-500 ${
                        isReached ? 'bg-slate-400' : isNext ? 'bg-green-500 scale-125' : 'bg-white border-slate-200'
                      }`}
                      animate={isNext ? { scale: [1.2, 1.3, 1.2] } : {}}
                      transition={isNext ? { repeat: Infinity, duration: 2 } : {}}
                    >
                      {isReached ? (
                        <CheckCircle2 size={18} className="text-white" />
                      ) : isNext ? (
                        <Navigation size={18} className="text-white fill-white" />
                      ) : (
                        <Circle size={12} className="text-slate-300" />
                      )}
                    </motion.div>

                    {isYourStop && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <div className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-md shadow-lg shadow-red-600/20 flex items-center gap-1">
                          <MapPin size={10} />
                          YOUR STOP
                        </div>
                        <div className="w-2 h-2 bg-red-600 rotate-45 mx-auto -mt-1" />
                      </div>
                    )}
                  </div>

                  {/* Stop Info */}
                  <div className="text-center">
                    <p className={`text-sm font-black mb-1 transition-colors duration-500 ${
                      isReached ? 'text-slate-400' : isNext ? 'text-green-600' : 'text-slate-900'
                    }`}>
                      {stop}
                    </p>
                    <div className="h-6 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {isReached ? (
                          <motion.span 
                            key="reached"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter"
                          >
                            {stopTimestamps[stop] ? new Date(stopTimestamps[stop]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reached'}
                          </motion.span>
                        ) : (
                          <motion.span 
                            key="eta"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-[10px] font-bold uppercase tracking-tighter ${isNext ? 'text-green-600' : 'text-slate-500'}`}
                          >
                            {etas[stop] || '--:--'}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Connector Arrow for Next Stop */}
                  {isNext && index < fullRoute.length - 1 && (
                    <div className="absolute top-1/2 -right-4 translate-y-[-50%] text-green-200">
                      <ChevronRight size={24} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentTrackBus;

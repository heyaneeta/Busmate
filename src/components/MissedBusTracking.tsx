import React, { useState, useEffect } from 'react';
import { MapPin, Bus, Phone, AlertTriangle, ChevronLeft, Loader2, User, Route } from 'lucide-react';
import { motion } from 'motion/react';

const CustomBus = ({ size = 200, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
  </svg>
);

const MissedBusTracking = ({ onBack, boardingPoint, buses, routes, assignedBusId, onTrack }: { onBack: () => void, boardingPoint: string, buses: any[], routes: any[], assignedBusId?: string, onTrack: (bus: any) => void }) => {
  const [alternativeBuses, setAlternativeBuses] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Load Google Maps script for Geometry API
  useEffect(() => {
    if (typeof window.google === 'object' && typeof window.google.maps === 'object' && window.google.maps.geometry) {
      setGoogleMapsLoaded(true);
      return;
    }

    if (!apiKey) return;

    if (document.querySelector('script[src^="https://maps.googleapis.com/maps/api/js"]')) {
      const checkInterval = setInterval(() => {
        if (typeof window.google === 'object' && typeof window.google.maps === 'object' && window.google.maps.geometry) {
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

  useEffect(() => {
    const analyzeRoutes = async () => {
      setIsAnalyzing(true);
      
      try {
        // 1. Find boarding point coordinates from any route that has it
        let boardingCoords: { lat: number, lng: number } | null = null;
        for (const r of routes) {
          if (r.stopCoordinates && r.stopCoordinates[boardingPoint]) {
            boardingCoords = r.stopCoordinates[boardingPoint];
            break;
          }
        }

        // Simulate processing delay for the analysis
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Ensure Google Maps Geometry is available if we have coordinates
        if (boardingCoords && !googleMapsLoaded) {
           // Wait a bit more for script
           await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const availableBuses = buses.filter(bus => {
          // 1. Don't show the already assigned bus
          if (bus.id === assignedBusId) return false;
          
          // 2. Find the route for this bus
          const route = routes.find(r => r.assignedBus === bus.id || r.name === bus.routeName);
          if (!route || !route.stopCoordinates) return false;
          
          // 3. Check if boarding point is in the route (official stop)
          const allStops = [route.startPoint, ...(route.stops || []), route.endPoint].filter(Boolean);
          const boardingIndex = allStops.indexOf(boardingPoint);
          
          let isPassingNear = boardingIndex !== -1;

          // 4. If not an official stop, check geospatial proximity to route path using Google Maps
          if (!isPassingNear && boardingCoords && window.google?.maps?.geometry) {
            const pathCoords = allStops
              .map(stop => route.stopCoordinates[stop])
              .filter(Boolean)
              .map(c => new google.maps.LatLng(c.lat, c.lng));
            
            if (pathCoords.length >= 2) {
              const polyline = new google.maps.Polyline({ path: pathCoords });
              const point = new google.maps.LatLng(boardingCoords.lat, boardingCoords.lng);
              // Tolerance: 0.0015 is roughly 150-200 meters
              isPassingNear = google.maps.geometry.poly.isLocationOnEdge(point, polyline, 0.0015);
            }
          }

          if (!isPassingNear) return false;
          
          // 5. Check if bus has NOT passed the boarding point
          const reachedStops = bus.reachedStops || [];
          if (boardingIndex !== -1) {
            // Official stop: check if already reached
            if (reachedStops.includes(boardingPoint)) return false;
          } else {
            // Geospatial match: if trip is finished, it has passed
            if (reachedStops.length >= allStops.length && !bus.isTripInProgress) return false;
          }
          
          return true;
        }).map(bus => {
          const route = routes.find(r => r.assignedBus === bus.id || r.name === bus.routeName);
          const allStops = [route?.startPoint, ...(route?.stops || []), route?.endPoint].filter(Boolean);
          const boardingIndex = allStops.indexOf(boardingPoint);
          
          let stopsAway = 0;
          let isGeospatialMatch = false;

          if (boardingIndex !== -1) {
            const reachedCount = (bus.reachedStops || []).length;
            stopsAway = Math.max(0, boardingIndex - reachedCount + 1);
          } else {
            isGeospatialMatch = true;
            // Estimate stops away based on current progress
            const reachedCount = (bus.reachedStops || []).length;
            stopsAway = Math.max(1, Math.floor(allStops.length / 2) - reachedCount);
          }

          return {
            ...bus,
            routeDetails: route,
            stopsAway,
            isGeospatialMatch
          };
        });

        // Sort by proximity
        availableBuses.sort((a, b) => a.stopsAway - b.stopsAway);

        setAlternativeBuses(availableBuses);
        
      } catch (error) {
        console.error("Error analyzing routes:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeRoutes();
  }, [boardingPoint, buses, routes, assignedBusId, googleMapsLoaded]);

  return (
    <div className="w-full min-h-screen bg-white p-6 md:p-12 flex flex-col">
      <div className="flex items-center gap-4 mb-12">
        <button 
          onClick={onBack}
          className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl tracking-tight text-slate-900 font-bold">Alternative Buses</h2>
      </div>
      
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <MapPin className="text-red-600" size={20} />
          </div>
          <p className="text-slate-500 font-medium">
            Searching for buses passing through <span className="text-slate-900 font-bold">{boardingPoint}</span>
          </p>
        </div>
      </div>
      
      {isAnalyzing ? (
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
            <Bus className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600" size={32} />
          </div>
          <p className="mt-8 text-slate-600 font-bold tracking-tight animate-pulse">Analyzing real-time fleet positions...</p>
          <p className="text-slate-400 text-sm mt-2">Checking route progress and ETA</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto w-full">
          {alternativeBuses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {alternativeBuses.map(bus => (
                <motion.div 
                  key={bus.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative bg-slate-50 rounded-3xl p-8 border-2 border-transparent hover:border-red-600/20 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform duration-500">
                        <Bus size={32} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Bus-{bus.id}</h3>
                          {bus.isGeospatialMatch ? (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                              <MapPin size={10} />
                              Passes Nearby
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-full">
                              Official Stop
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 font-medium flex items-center gap-2 mb-3">
                          <User size={14} />
                          Driver: {bus.driver || 'Unknown'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <div className="px-3 py-1.5 bg-white rounded-lg text-xs font-bold text-slate-600 border border-slate-100 flex items-center gap-2">
                            <Route size={12} />
                            {bus.routeDetails?.name || 'Unknown Route'}
                          </div>
                          <div className="px-3 py-1.5 bg-red-50 rounded-lg text-xs font-bold text-red-600 border border-red-100 flex items-center gap-2">
                            <AlertTriangle size={12} />
                            {bus.stopsAway} {bus.stopsAway === 1 ? 'stop' : 'stops'} away
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 min-w-[180px]">
                      <button 
                        onClick={() => onTrack(bus)}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-slate-900/10 hover:shadow-red-600/20 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <MapPin size={18} />
                        Live Track
                      </button>
                      <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                        Real-time GPS Active
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} className="text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No Alternatives Found</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                We couldn't find any other school buses currently scheduled to pass through or near {boardingPoint}.
              </p>
              <button 
                onClick={onBack}
                className="mt-8 px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:border-red-600 hover:text-red-600 transition-all"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      )}

      {/* Branding Footer */}
      <div className="mt-auto pt-12 flex justify-center opacity-20">
        <div className="flex items-center gap-2">
          <CustomBus size={40} className="grayscale brightness-0" />
          <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
        </div>
      </div>
    </div>
  );
};

export default MissedBusTracking;

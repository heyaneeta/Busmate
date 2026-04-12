import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Bus as BusIcon, MapPin, Navigation } from 'lucide-react';

// Component to handle map centering on the bus
function MapCenterUpdater({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 16);
    }
  }, [lat, lng, map]);
  return null;
}

// Custom bus icon with rotation
const createBusIcon = (rotation: number = 0) => new L.DivIcon({
  html: `<div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out; width: 40px; height: 40px; background-color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.3);">
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
    </svg>
  </div>`,
  className: 'bg-transparent border-none',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Animated Marker Component for smooth movement
const AnimatedMarker: React.FC<{ lat: number, lng: number }> = ({ lat, lng }) => {
  const [currentPos, setCurrentPos] = useState<[number, number]>([lat, lng]);
  const [rotation, setRotation] = useState(0);
  const lastPosRef = useRef<[number, number]>([lat, lng]);
  const targetPosRef = useRef<[number, number]>([lat, lng]);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const duration = 3000; // 3 seconds interpolation

  useEffect(() => {
    if (lat !== targetPosRef.current[0] || lng !== targetPosRef.current[1]) {
      // Calculate rotation
      const dy = lat - targetPosRef.current[0];
      const dx = lng - targetPosRef.current[1];
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      setRotation(90 - angle);

      lastPosRef.current = currentPos;
      targetPosRef.current = [lat, lng];
      startTimeRef.current = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentLat = lastPosRef.current[0] + (targetPosRef.current[0] - lastPosRef.current[0]) * progress;
        const currentLng = lastPosRef.current[1] + (targetPosRef.current[1] - lastPosRef.current[1]) * progress;
        
        setCurrentPos([currentLat, currentLng]);

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
  }, [lat, lng]);

  return (
    <Marker position={currentPos} icon={createBusIcon(rotation)}>
      <Popup className="rounded-xl">
        <div className="p-1">
          <span className="font-bold text-slate-900">Your Current Location</span>
        </div>
      </Popup>
    </Marker>
  );
};

const DriverLiveTracking = ({ busDocId, busId }: { busDocId: string, busId: string }) => {
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    if (!busDocId) return;

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

    const unsubscribe = onSnapshot(doc(db, 'buses', busDocId), (snapshot) => {
      const data = snapshot.data();
      if (data && data.lat && data.lng) {
        setLocation({ lat: data.lat, lng: data.lng });
      }
    }, (error) => {
      handleFirestoreError(error, 'get', `buses/${busDocId}`);
    });

    return () => unsubscribe();
  }, [busDocId]);

  if (!location) {
    return (
      <div className="w-full h-[400px] bg-slate-50 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
          <Navigation className="text-slate-300 animate-pulse" size={32} />
        </div>
        <p className="text-slate-400 font-medium">Waiting for GPS signal...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden relative z-0">
      <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/20 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/20">
          <BusIcon size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Tracking</span>
          <span className="text-sm font-bold text-slate-900">Bus-{busId}</span>
        </div>
      </div>

      <MapContainer 
        center={[location.lat, location.lng]} 
        zoom={16} 
        style={{ width: '100%', height: '400px', zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapCenterUpdater lat={location.lat} lng={location.lng} />
        
        <AnimatedMarker lat={location.lat} lng={location.lng} />
      </MapContainer>
      
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
          <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
          Live GPS Feed Active
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      </div>
    </div>
  );
};

export default DriverLiveTracking;

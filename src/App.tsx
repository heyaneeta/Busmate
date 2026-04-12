/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, User, Shield, GraduationCap, ArrowRight, Mail, Lock, Eye, EyeOff, ChevronLeft, Bookmark, MapPin, AlertCircle, LogOut, Play, Square, MessageSquare, Wrench, Fuel, MoreHorizontal, Phone, Info, Clock, Navigation, CheckCircle2, Activity, Zap, Map as MapIcon, RefreshCw, Users, Route, UserCheck, AlertTriangle, Bell, FileText, UserPlus, UserMinus, UserX, Ban, ShieldCheck, Search, Filter, MoreVertical, PlusCircle, Hash, Power, Settings, Gauge, Edit, Link, UserCog, ClipboardList, History, Send, Megaphone, CalendarClock, BarChart3, PieChart, TrendingUp, Download, X, Trash2, Database, Share2 } from 'lucide-react';
import { db, auth, secondaryAuth } from './firebase';
import { collection, addDoc, getDocs, getDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import AdminLiveTracking from './components/AdminLiveTracking';
import StudentTrackBus from './components/StudentTrackBus';
import MissedBusTracking from './components/MissedBusTracking';
import DriverLiveTracking from './components/DriverLiveTracking';

type Page = 'welcome' | 'role-selection' | 'login' | 'student-dashboard' | 'driver-dashboard' | 'report-issue' | 'driver-details-view' | 'bus-tracking' | 'admin-dashboard' | 'user-management' | 'bus-management' | 'driver-assignment' | 'live-tracking-admin' | 'issue-management' | 'notification-centre' | 'system-reports' | 'admin-settings' | 'student-settings' | 'driver-settings' | 'route-progress' | 'missed-bus-tracking';
type Role = 'student' | 'driver' | 'admin' | null;

const CustomBus = ({ size = 200, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size * 0.5} 
    viewBox="0 0 240 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Modern Thin-Line Body */}
    <path 
      d="M10 40C10 25 25 20 40 20H200C215 20 230 25 230 40V75C230 80 225 85 220 85H20C15 85 10 80 10 75V40Z" 
      stroke="white" 
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    
    {/* Minimalist Windows (Thin Lines) */}
    <path d="M40 20V50H200V20" stroke="white" strokeWidth="1" opacity="0.6" />
    <line x1="80" y1="20" x2="80" y2="50" stroke="white" strokeWidth="1" opacity="0.4" />
    <line x1="120" y1="20" x2="120" y2="50" stroke="white" strokeWidth="1" opacity="0.4" />
    <line x1="160" y1="20" x2="160" y2="50" stroke="white" strokeWidth="1" opacity="0.4" />

    {/* Classy Wheels (Thin Circles) */}
    <circle cx="50" cy="85" r="10" stroke="white" strokeWidth="1.5" />
    <circle cx="50" cy="85" r="3" fill="white" />
    <circle cx="190" cy="85" r="10" stroke="white" strokeWidth="1.5" />
    <circle cx="190" cy="85" r="3" fill="white" />

    {/* Modern Headlight Accent */}
    <line x1="230" y1="65" x2="220" y2="65" stroke="white" strokeWidth="2" strokeLinecap="round" />

    {/* Integrated Text */}
    <text 
      x="120" 
      y="70" 
      textAnchor="middle" 
      className="tracking-tight" 
      fill="white" 
      fontSize="18" 
      fontWeight="400"
      style={{ letterSpacing: '4px', opacity: 0.9 }}
    >
      BUSMATE
    </text>
  </svg>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const savedPage = localStorage.getItem('currentPage');
    return (savedPage as Page) || 'welcome';
  });
  const currentPageRef = useRef<Page>(currentPage);
  useEffect(() => { 
    currentPageRef.current = currentPage;
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);
  // ... other states ...

  // Firestore Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
        console.log("Firestore connection successful");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore connection failed: The client is offline. Please check your Firebase configuration and ensure the database is provisioned.");
        }
      }
    }
    testConnection();
  }, []);

  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [busSearchQuery, setBusSearchQuery] = useState('');
  const [trackedBus, setTrackedBus] = useState<any>(null);
  const [adminProfile, setAdminProfile] = useState({
    name: 'Administrator',
    phone: '+1 (555) 000-0001',
    email: 'admin@busmate.com'
  });
  const [studentProfile, setStudentProfile] = useState({
    name: 'Raha',
    phone: '+1 (555) 123-4567',
    email: 'aneeta@gmail.com',
    boardingPoint: 'Central Station',
    assignedBus: 'Unassigned',
    assignedRoute: 'Unassigned'
  });
  const [driverProfile, setDriverProfile] = useState({
    name: 'Binu',
    phone: '+1 (555) 111-2222',
    email: 'binu@gmail.com',
    assignedBus: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page) {
      setCurrentPage(page as Page);
    }
  }, []);
  
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showSystemReset, setShowSystemReset] = useState(false);

  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);

  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<Role>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'active' | 'error' | 'denied'>('idle');
  const [locationError, setLocationError] = useState<string>('');

  // Memoize mocked route for public buses to prevent re-render loops
  const mockedRoute = useMemo(() => {
    if (!trackedBus) return null;
    if (trackedBus.routeDetails) return trackedBus.routeDetails;
    if (!trackedBus.isPublicBus) return { name: 'Alternative Route', startPoint: 'Start', endPoint: 'End', stops: [studentProfile.boardingPoint], isMocked: true };
    
    const routeParts = trackedBus.route ? trackedBus.route.split(' - ') : ['Start', 'End'];
    return {
      name: trackedBus.route || 'Public Transit Route',
      startPoint: routeParts[0] || 'Start',
      endPoint: routeParts[1] || 'End',
      stops: [studentProfile.boardingPoint],
      isMocked: true
    };
  }, [trackedBus?.id, trackedBus?.route, trackedBus?.routeDetails, studentProfile.boardingPoint]);

  const trackingData = useMemo(() => {
    if (currentPage !== 'bus-tracking') return null;

    const currentStudent = students.find(s => s.email?.toLowerCase() === studentProfile.email?.toLowerCase()) || studentProfile;
    const assignedRoute = (routes || []).find(r => 
      r.startPoint === currentStudent.boardingPoint || 
      r.endPoint === currentStudent.boardingPoint || 
      (r.stops && r.stops.includes(currentStudent.boardingPoint))
    );
    const assignedBus = assignedRoute ? (buses || []).find(b => b.id === (currentStudent.assignedBus && currentStudent.assignedBus !== 'Unassigned' ? currentStudent.assignedBus : assignedRoute.assignedBus)) : null;

    // If we are tracking a specific bus (e.g. KSRTC or alternative), use that instead
    const busToTrack = trackedBus || assignedBus;
    const busIdToTrack = trackedBus ? (trackedBus.docId || null) : (assignedBus ? assignedBus.docId : null);
    const busNumberToTrack = trackedBus ? trackedBus.id : (assignedBus ? assignedBus.id : 'Not Assigned');
    
    const routeToTrack = trackedBus 
      ? (trackedBus.routeDetails || routes.find(r => r.assignedBus === trackedBus.id || r.name === trackedBus.routeName) || mockedRoute) 
      : assignedRoute;
    
    return {
      currentStudent,
      assignedRoute,
      assignedBus,
      busToTrack,
      busIdToTrack,
      busNumberToTrack,
      routeToTrack
    };
  }, [currentPage, students, studentProfile, routes, buses, trackedBus, mockedRoute]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const email = currentUser.email;
        const uid = currentUser.uid;
        
        try {
          // 1. Determine the "True Role" based on database records first
          let dbRole: Role = null;
          const emailLower = email?.toLowerCase();

          // Check students collection by email
          try {
            const { limit } = await import('firebase/firestore');
            const studentSnap = await getDocs(query(collection(db, 'students'), where('email', '==', email), limit(1)));
            if (!studentSnap.empty) {
              dbRole = 'student';
            }
          } catch (error) {
            console.error("Error checking student assignment in auth state:", error);
          }

          // Check drivers collection by email if not a student
          if (!dbRole) {
            try {
              const { limit } = await import('firebase/firestore');
              const driverSnap = await getDocs(query(collection(db, 'drivers'), where('email', '==', email), limit(1)));
              if (!driverSnap.empty) {
                dbRole = 'driver';
              }
            } catch (error) {
              console.error("Error checking driver assignment in auth state:", error);
            }
          }

          // Check hardcoded admins if not a student or driver
          if (!dbRole && email && ["aneetaprabhanandhan18@gmail.com", "rohith@gmail.com", "rosec@gmail.com", "rani@gmail.com", "kirans@gmail.com", "rohanr@gmail.com", "abinn@gmail.com", "varunm@gmail.com"].includes(emailLower || '')) {
            dbRole = 'admin';
          }

          // 2. Enforce strict access control for persistent sessions
          if (!dbRole) {
            await signOut(auth);
            setUser(null);
            setUserRole(null);
            setSelectedRole(null);
            setCurrentPage('welcome');
            return;
          }
          
          setUserRole(dbRole);
          setSelectedRole(dbRole);

          // 3. Fetch profile based on role
          if (dbRole === 'student' && email) {
            try {
              const studentSnap = await getDocs(query(collection(db, 'students'), where('uid', '==', uid)));
              if (!studentSnap.empty) {
                const student = studentSnap.docs[0].data();
                setStudentProfile({
                  name: student.name,
                  phone: student.phone,
                  email: email,
                  boardingPoint: student.boardingPoint || '',
                  assignedBus: student.assignedBus || 'Unassigned',
                  assignedRoute: student.assignedRoute || 'Unassigned'
                });
                if (currentPageRef.current === 'welcome') setCurrentPage('student-dashboard');
              }
            } catch (error) {
              handleFirestoreError(error, 'get', `students/${uid}`);
            }
          } else if (dbRole === 'driver' && email) {
            try {
              const driverSnap = await getDocs(query(collection(db, 'drivers'), where('uid', '==', uid)));
              if (!driverSnap.empty) {
                const driver = driverSnap.docs[0].data();
                setDriverProfile({
                  name: driver.name,
                  phone: driver.phone,
                  email: email
                });
                if (currentPageRef.current === 'welcome') setCurrentPage('driver-dashboard');
              }
            } catch (error) {
              handleFirestoreError(error, 'get', `drivers/${uid}`);
            }
          } else if (dbRole === 'admin') {
            if (currentPageRef.current === 'welcome') setCurrentPage('admin-dashboard');
          }
        } catch (error) {
          console.error("Error fetching user role/profile:", error);
        }
      } else {
        setUserRole(null);
        setSelectedRole(null);
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page');
        if (page === 'missed-bus-tracking') {
          setCurrentPage('missed-bus-tracking');
        } else {
          setCurrentPage('welcome');
        }
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user || !userRole) {
      setStudents([]);
      setDrivers([]);
      setBuses([]);
      setRoutes([]);
      setAssignments([]);
      setIssues([]);
      return;
    }

    // Listeners for buses and routes (visible to all authenticated users)
    const unsubBuses = onSnapshot(collection(db, 'buses'), (snapshot) => {
      const busesData = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      // Sort by busNumber in ascending order
      busesData.sort((a: any, b: any) => {
        const numA = a.busNumber || '';
        const numB = b.busNumber || '';
        return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setBuses(busesData);
    }, (error) => handleFirestoreError(error, 'list', 'buses'));

    const unsubRoutes = onSnapshot(collection(db, 'routes'), (snapshot) => {
      setRoutes(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
    }, (error) => handleFirestoreError(error, 'list', 'routes'));

    let unsubStudents = () => {};
    let unsubDrivers = () => {};
    let unsubIssues = () => {};
    let unsubAssignments = () => {};

    let unsubNotifications = () => {};

    if (userRole === 'admin') {
      unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
        setStudents(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
      }, (error) => handleFirestoreError(error, 'list', 'students'));

      unsubDrivers = onSnapshot(collection(db, 'drivers'), (snapshot) => {
        setDrivers(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
      }, (error) => handleFirestoreError(error, 'list', 'drivers'));

      unsubIssues = onSnapshot(collection(db, 'issues'), (snapshot) => {
        setIssues(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
      }, (error) => handleFirestoreError(error, 'list', 'issues'));

      unsubAssignments = onSnapshot(collection(db, 'assignments'), (snapshot) => {
        setAssignments(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
      }, (error) => handleFirestoreError(error, 'list', 'assignments'));

      unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
      }, (error) => handleFirestoreError(error, 'list', 'notifications'));
    } else if (userRole === 'driver') {
      // Drivers only see their own issues
      const q = query(collection(db, 'issues'), where('driverEmail', '==', user?.email));
      unsubIssues = onSnapshot(q, (snapshot) => {
        setIssues(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
      }, (error) => handleFirestoreError(error, 'list', 'issues'));

      unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
      }, (error) => handleFirestoreError(error, 'list', 'notifications'));
    } else if (userRole === 'student') {
      unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
      }, (error) => handleFirestoreError(error, 'list', 'notifications'));
    }

    return () => {
      unsubStudents();
      unsubDrivers();
      unsubBuses();
      unsubRoutes();
      unsubAssignments();
      unsubIssues();
      unsubNotifications();
    };
  }, [user, userRole, driverProfile.name]);

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
    showToast(`Database error: ${error.message || 'Unknown error'}`, 'error');
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  const updateStudentBusAssignments = async (routeName: string, assignedBusId: string, stops: string[], startPoint: string, endPoint: string) => {
    const allRouteStops = [startPoint, endPoint, ...stops];
    
    // Find all students whose boarding point is in this route's stops
    const studentsToUpdate = students.filter(s => allRouteStops.includes(s.boardingPoint));
    
    for (const student of studentsToUpdate) {
      if (student.docId) {
        try {
          await updateDoc(doc(db, 'students', student.docId), {
            assignedBus: assignedBusId,
            assignedRoute: routeName
          });
        } catch (error) {
          console.error(`Error updating student ${student.name}:`, error);
        }
      }
    }
  };

  const addStudent = async (student: any) => {
    try {
      // Find if there's a route for this student's boarding point
      const matchingRoute = (routes || []).find(r => 
        [r.startPoint, r.endPoint, ...r.stops].includes(student.boardingPoint)
      );
      
      const studentData = {
        ...student,
        assignedBus: matchingRoute ? matchingRoute.assignedBus : 'Unassigned',
        assignedRoute: matchingRoute ? matchingRoute.name : 'Unassigned'
      };
      
      await addDoc(collection(db, 'students'), studentData);
    } catch (error) {
      handleFirestoreError(error, 'create', 'students');
    }
  };

  const addDriver = async (driver: any) => {
    try {
      await addDoc(collection(db, 'drivers'), driver);
    } catch (error) {
      handleFirestoreError(error, 'create', 'drivers');
    }
  };

  const addBus = async (bus: any) => {
    try {
      await addDoc(collection(db, 'buses'), bus);
    } catch (error) {
      handleFirestoreError(error, 'create', 'buses');
    }
  };

  const addRoute = async (route: any) => {
    try {
      await addDoc(collection(db, 'routes'), route);
    } catch (error) {
      handleFirestoreError(error, 'create', 'routes');
    }
  };

  const addAssignment = async (assignment: any) => {
    try {
      await addDoc(collection(db, 'assignments'), assignment);
    } catch (error) {
      handleFirestoreError(error, 'create', 'assignments');
    }
  };

  const logLogin = async (userId: string, role: string) => {
    try {
      await addDoc(collection(db, 'loginLogs'), {
        userId,
        role,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, 'create', 'loginLogs');
    }
  };

  const addIssue = async (issue: any) => {
    try {
      await addDoc(collection(db, 'issues'), issue);
    } catch (error) {
      handleFirestoreError(error, 'create', 'issues');
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastData.title || !broadcastData.message) {
      showToast("Please fill in both title and message.", "error");
      return;
    }

    try {
      await addDoc(collection(db, 'notifications'), {
        ...broadcastData,
        timestamp: new Date().toISOString(),
        senderId: auth.currentUser?.uid
      });
      setBroadcastData({
        title: '',
        message: '',
        targetType: 'all',
        targetId: ''
      });
      showToast("Broadcast sent successfully!", "success");
    } catch (error) {
      handleFirestoreError(error, 'create', 'notifications');
    }
  };

  const resolveIssue = async (issueId: string) => {
    try {
      await updateDoc(doc(db, 'issues', issueId), { status: 'Resolved' });
      showToast("Issue marked as resolved.", "success");
    } catch (error) {
      handleFirestoreError(error, 'update', 'issues');
    }
  };

  const deleteStudent = async (docId: string) => {
    try {
      const student = students.find(s => s.docId === docId);
      if (student && student.uid) {
        await deleteDoc(doc(db, 'users', student.uid));
      }
      await deleteDoc(doc(db, 'students', docId));
    } catch (error) {
      handleFirestoreError(error, 'delete', 'students');
    }
  };

  const deleteDriver = async (docId: string) => {
    try {
      const driver = drivers.find(d => d.docId === docId);
      if (driver) {
        // Unassign from any bus
        const assignedBus = (buses || []).find(b => b.driverUid === driver.uid || b.driver === driver.name);
        if (assignedBus && assignedBus.docId) {
          await updateDoc(doc(db, 'buses', assignedBus.docId), {
            driver: null,
            driverUid: ''
          });
        }

        if (driver.uid) {
          await deleteDoc(doc(db, 'users', driver.uid));
        }
      }
      await deleteDoc(doc(db, 'drivers', docId));
    } catch (error) {
      handleFirestoreError(error, 'delete', 'drivers');
    }
  };

  const deleteBus = async (docId: string) => {
    try {
      const busToDelete = (buses || []).find(b => b.docId === docId);
      if (busToDelete) {
        // Update routes assigned to this bus
        const routesToUpdate = (routes || []).filter(r => r.assignedBus === busToDelete.id);
        for (const route of routesToUpdate) {
          if (route.docId) {
            await updateDoc(doc(db, 'routes', route.docId), {
              assignedBus: 'Unassigned'
            });
          }
        }

        // Update students assigned to this bus
        const studentsToUpdate = (students || []).filter(s => s.assignedBus === busToDelete.id);
        for (const student of studentsToUpdate) {
          if (student.docId) {
            await updateDoc(doc(db, 'students', student.docId), {
              assignedBus: 'Unassigned'
            });
          }
        }
      }
      await deleteDoc(doc(db, 'buses', docId));
    } catch (error) {
      handleFirestoreError(error, 'delete', 'buses');
    }
  };

  const deleteRoute = async (docId: string) => {
    try {
      const routeToDelete = (routes || []).find(r => r.docId === docId);
      if (routeToDelete) {
        // Unassign bus from this route
        const assignedBus = (buses || []).find(b => b.id === routeToDelete.assignedBus);
        if (assignedBus && assignedBus.docId) {
          await updateDoc(doc(db, 'buses', assignedBus.docId), {
            route: 'Unassigned'
          });
        }

        const allRouteStops = [routeToDelete.startPoint, routeToDelete.endPoint, ...routeToDelete.stops];
        const studentsToUpdate = students.filter(s => allRouteStops.includes(s.boardingPoint));
        
        for (const student of studentsToUpdate) {
          if (student.docId) {
            await updateDoc(doc(db, 'students', student.docId), {
              assignedBus: 'Unassigned',
              assignedRoute: 'Unassigned'
            });
          }
        }
      }
      await deleteDoc(doc(db, 'routes', docId));
    } catch (error) {
      handleFirestoreError(error, 'delete', 'routes');
    }
  };

  const deleteAssignment = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'assignments', docId));
    } catch (error) {
      handleFirestoreError(error, 'delete', 'assignments');
    }
  };

  const [showAddBusForm, setShowAddBusForm] = useState(false);
  const [isResettingSystem, setIsResettingSystem] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetSystem = async () => {
    setIsResettingSystem(true);
    try {
      // 1. Clear Students
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentDeletes = studentsSnap.docs.map(doc => deleteDoc(doc.ref));
      
      // 2. Clear Drivers
      const driversSnap = await getDocs(collection(db, 'drivers'));
      const driverDeletes = driversSnap.docs.map(doc => deleteDoc(doc.ref));

      // 3. Clear Routes
      const routesSnap = await getDocs(collection(db, 'routes'));
      const routeDeletes = routesSnap.docs.map(doc => deleteDoc(doc.ref));

      // 4. Clear Buses
      const busesSnap = await getDocs(collection(db, 'buses'));
      const busDeletes = busesSnap.docs.map(doc => deleteDoc(doc.ref));

      // 5. Clear Assignments
      const assignmentsSnap = await getDocs(collection(db, 'assignments'));
      const assignmentDeletes = assignmentsSnap.docs.map(doc => deleteDoc(doc.ref));

      // 6. Clear Issues
      const issuesSnap = await getDocs(collection(db, 'issues'));
      const issueDeletes = issuesSnap.docs.map(doc => deleteDoc(doc.ref));

      // 7. Clear Users (Students and Drivers)
      const usersSnap = await getDocs(collection(db, 'users'));
      const userDeletes = usersSnap.docs
        .filter(doc => doc.data().role === 'student' || doc.data().role === 'driver')
        .map(doc => deleteDoc(doc.ref));

      await Promise.all([
        ...studentDeletes, 
        ...driverDeletes, 
        ...routeDeletes, 
        ...busDeletes, 
        ...assignmentDeletes, 
        ...issueDeletes, 
        ...userDeletes
      ]);
      
      showToast("System has been fully reset. All data cleared.", "success");
      setShowResetConfirm(false);
    } catch (error) {
      console.error("Error resetting system:", error);
      showToast("Failed to reset system.", "error");
    } finally {
      setIsResettingSystem(false);
    }
  };

  const [showCreateRouteForm, setShowCreateRouteForm] = useState(false);
  const [newBus, setNewBus] = useState({
    busNumber: '',
    modelYear: '',
    seats: ''
  });
  const [newRoute, setNewRoute] = useState({
    startPoint: '',
    endPoint: '',
    stops: [] as string[],
    stopCoordinates: {} as Record<string, { lat: number, lng: number }>,
    newStopName: ''
  });
  const [editingRouteIndex, setEditingRouteIndex] = useState<number | null>(null);
  const [editRouteData, setEditRouteData] = useState({
    name: '',
    startPoint: '',
    endPoint: '',
    stops: [] as string[],
    stopCoordinates: {} as Record<string, { lat: number, lng: number }>,
    newStopName: '',
    assignedBus: ''
  });
  const [insertStopIndex, setInsertStopIndex] = useState<number | null>(null);
  const [insertStopName, setInsertStopName] = useState('');
  const [insertPosition, setInsertPosition] = useState<string>('end');
  const [openMenuBusId, setOpenMenuBusId] = useState<string | null>(null);
  const [openStudentMenuId, setOpenStudentMenuId] = useState<string | null>(null);
  const [openDriverMenuId, setOpenDriverMenuId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: { label: string; value: string }[];
  }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleError = (error: unknown, context: string, userMessage?: string) => {
    console.error(`Error in ${context}:`, error);
    const message = userMessage || (error instanceof Error ? error.message : 'An unexpected error occurred.');
    showToast(message, 'error');
  };

  const [showReassignmentModal, setShowReassignmentModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({
    isOpen: false,
    message: '',
    type: 'success'
  });

  const handleMissedBus = () => {
    setCurrentPage('missed-bus-tracking');
  };

  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    phone: '',
    boardingPoint: '',
    plan: '6 Months'
  });

  const [showAddDriverForm, setShowAddDriverForm] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: ''
  });

  const [showRemoveUserForm, setShowRemoveUserForm] = useState(false);
  const [removeUserType, setRemoveUserType] = useState<'student' | 'driver' | null>(null);
  const [removeStudentData, setRemoveStudentData] = useState({ id: '', name: '' });
  const [removeDriverData, setRemoveDriverData] = useState({ name: '' });

  const [showIssueReportedModal, setShowIssueReportedModal] = useState(false);

  const [assigningBusId, setAssigningBusId] = useState<string | null>(null);
  const [assigningRouteId, setAssigningRouteId] = useState<string | null>(null);

  const [notificationTab, setNotificationTab] = useState<'broadcast' | 'issues'>('broadcast');
  const [broadcastData, setBroadcastData] = useState({
    title: '',
    message: '',
    targetType: 'all' as 'all' | 'route' | 'bus' | 'driver' | 'student' | 'specific-driver',
    targetId: ''
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [clearedNotifications, setClearedNotifications] = useState<string[]>(() => {
    const saved = localStorage.getItem('clearedNotifications');
    return saved ? JSON.parse(saved) : [];
  });

  const handleClearNotification = (id: string) => {
    const updated = [...clearedNotifications, id];
    setClearedNotifications(updated);
    localStorage.setItem('clearedNotifications', JSON.stringify(updated));
  };

  const handleClearAllNotifications = (currentNotifications: any[]) => {
    const idsToClear = currentNotifications.map(n => n.docId);
    const updated = [...new Set([...clearedNotifications, ...idsToClear])];
    setClearedNotifications(updated);
    localStorage.setItem('clearedNotifications', JSON.stringify(updated));
  };
  const [isTripInProgress, setIsTripInProgress] = useState(false);
  const routesRef = useRef(routes);
  const busesRef = useRef(buses);

  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  useEffect(() => {
    busesRef.current = buses;
  }, [buses]);

  // Sync isTripInProgress with database for driver
  useEffect(() => {
    if (userRole === 'driver' && driverProfile.name) {
      const assignedBus = (buses || []).find(b => b.driver === driverProfile.name);
      if (assignedBus) {
        setIsTripInProgress(!!assignedBus.isTripInProgress);
      }
    }
  }, [userRole, driverProfile.name, buses]);

  const assignedBus = useMemo(() => (buses || []).find(b => b.driver === driverProfile.name), [buses, driverProfile.name]);
  const busDocId = assignedBus?.docId;
  const busId = assignedBus?.id;

  // Driver Geolocation Tracking
  useEffect(() => {
    if (userRole !== 'driver' || !user || !isTripInProgress || !busDocId) {
      if (userRole === 'driver') setLocationStatus('idle');
      return;
    }

    let watchId: number;

    if ("geolocation" in navigator) {
      setLocationStatus('loading');
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          setLocationStatus('active');
          setLocationError('');
          const { latitude, longitude } = position.coords;
          try {
            const busRef = doc(db, 'buses', busDocId);
            const busSnap = await getDoc(busRef);
            const busData = busSnap.data();
            const currentReachedStops = busData?.reachedStops || [];
            
            // Find the assigned route to get stop coordinates
            const assignedRoute = (routesRef.current || []).find(r => r.assignedBus === busId);
            let updatedReachedStops = [...currentReachedStops];
            let tripCompleted = false;
            let tripStartedNow = false;
            const stopTimestamps = busData?.stopTimestamps || {};
            const updatedStopTimestamps = { ...stopTimestamps };

            if (assignedRoute) {
              const fullRoute = [assignedRoute.startPoint, ...(assignedRoute.stops || []), assignedRoute.endPoint].filter(Boolean);
              const stopCoordinates = assignedRoute.stopCoordinates || {};

              for (let i = 0; i < fullRoute.length; i++) {
                const stop = fullRoute[i];
                if (!updatedReachedStops.includes(stop)) {
                  const coords = stopCoordinates[stop];
                  if (coords) {
                    const distance = calculateDistance(latitude, longitude, coords.lat, coords.lng);
                    if (distance < 100) { // 100 meters radius
                      // Mark this stop and all previous stops as reached
                      for (let j = 0; j <= i; j++) {
                        const prevStop = fullRoute[j];
                        if (!updatedReachedStops.includes(prevStop)) {
                          updatedReachedStops.push(prevStop);
                          updatedStopTimestamps[prevStop] = new Date().toISOString();
                          
                          // If it's the first stop and tripStartTime isn't set, record it
                          if (j === 0 && !busData?.tripStartTime) {
                            tripStartedNow = true;
                          }
                        }
                      }
                      
                      showToast(`Reached stop: ${stop}`, 'success');

                      // If it's the last stop, mark trip as completed
                      if (i === fullRoute.length - 1) {
                        tripCompleted = true;
                      }
                    }
                  }
                }
              }
            }

            const updates: any = {
              lat: latitude,
              lng: longitude,
              lastUpdated: new Date(),
              reachedStops: updatedReachedStops,
              stopTimestamps: updatedStopTimestamps
            };

            if (tripStartedNow) {
              updates.tripStartTime = new Date();
              showToast("Trip started! Starting point reached.", "success");
            }

            if (tripCompleted) {
              updates.isTripInProgress = false;
              updates.tripEndTime = new Date();
              setIsTripInProgress(false);
              showToast("Trip completed! Final stop reached.", "success");
            }

            await updateDoc(busRef, updates);
          } catch (error) {
            console.error("Error updating driver location:", error);
            setLocationStatus('error');
            setLocationError('Failed to update location in database');
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus('denied');
            setLocationError('Location permission denied. Please enable it in your browser settings.');
          } else if (error.code === error.TIMEOUT) {
            setLocationStatus('error');
            setLocationError('Location acquisition timed out. Please ensure you have a good GPS signal.');
          } else {
            setLocationStatus('error');
            setLocationError(`Location error: ${error.message}`);
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    } else {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported by your browser');
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [userRole, user, isTripInProgress, busDocId, busId]);

  const assignBusToRoute = async (busId: string) => {
    if (!assigningRouteId) return;

    try {
      const routeDoc = routes.find(r => r.docId === assigningRouteId);
      const busDoc = buses.find(b => b.id === busId);

      if (routeDoc && busDoc && busDoc.docId) {
        // Update route with assigned bus
        await updateDoc(doc(db, 'routes', routeDoc.docId), {
          assignedBus: busId
        });

        // Update bus with assigned route
        await updateDoc(doc(db, 'buses', busDoc.docId), {
          route: routeDoc.name
        });

        showToast(`Bus ${busId} assigned to route ${routeDoc.name}`, "success");
      }
    } catch (error) {
      handleFirestoreError(error, 'update', 'routes');
    }

    setAssigningRouteId(null);
  };

  const assignDriverToBus = async (driverName: string) => {
    if (!assigningBusId) return;

    const currentBus = (buses || []).find(b => b.id === assigningBusId);
    const oldDriverName = currentBus?.driver;

    try {
      // Update bus with new driver
      const busDoc = (buses || []).find(b => b.id === assigningBusId);
      const newDriverDoc = drivers.find(d => d.name === driverName);
      if (busDoc && busDoc.docId && newDriverDoc) {
        await updateDoc(doc(db, 'buses', busDoc.docId), { 
          driver: driverName,
          driverUid: newDriverDoc.uid || '',
          driverPhone: newDriverDoc.phone || '',
          driverEmail: newDriverDoc.email || ''
        });
      }

      // Update new driver status
      if (newDriverDoc && newDriverDoc.docId) {
        await updateDoc(doc(db, 'drivers', newDriverDoc.docId), { status: 'Assigned' });
      }

      // Update old driver status if applicable
      if (oldDriverName) {
        const oldDriverDoc = drivers.find(d => d.name === oldDriverName);
        if (oldDriverDoc && oldDriverDoc.docId) {
          await updateDoc(doc(db, 'drivers', oldDriverDoc.docId), { status: 'Available' });
        }
      }
    } catch (error) {
      handleFirestoreError(error, 'update', 'assignments');
    }

    setAssigningBusId(null);
  };

  const clearAllNotifications = async () => {
    if (!window.confirm("Are you sure you want to clear all broadcast history? This action cannot be undone.")) return;
    
    try {
      const deletePromises = notifications.map(notif => deleteDoc(doc(db, 'notifications', notif.docId)));
      await Promise.all(deletePromises);
      showToast("All broadcast history cleared", "success");
    } catch (error) {
      handleFirestoreError(error, 'delete', 'notifications');
    }
  };

  const deleteNotification = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', docId));
      showToast("Broadcast message deleted", "success");
    } catch (error) {
      handleFirestoreError(error, 'delete', 'notifications');
    }
  };

  const handleNext = () => {
    if (currentPage === 'welcome') {
      setCurrentPage('role-selection');
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setCurrentPage('login');
  };

  const handleBack = () => {
    if (currentPage === 'login') {
      setCurrentPage('role-selection');
    } else if (currentPage === 'role-selection') {
      setCurrentPage('welcome');
    } else if (currentPage === 'student-dashboard' || currentPage === 'driver-dashboard' || currentPage === 'admin-dashboard') {
      setCurrentPage('login');
    } else if (currentPage === 'report-issue') {
      setCurrentPage('driver-dashboard');
    } else if (currentPage === 'driver-details-view') {
      setCurrentPage('student-dashboard');
    } else if (currentPage === 'bus-tracking') {
      if (trackedBus) {
        setTrackedBus(null);
        setCurrentPage('missed-bus-tracking');
      } else {
        setCurrentPage('student-dashboard');
      }
    } else if (currentPage === 'missed-bus-tracking') {
      setCurrentPage('student-dashboard');
    } else if (currentPage === 'user-management') {
      if (showAddStudentForm) {
        setShowAddStudentForm(false);
      } else if (showAddDriverForm) {
        setShowAddDriverForm(false);
      } else if (showRemoveUserForm) {
        setShowRemoveUserForm(false);
        setRemoveUserType(null);
      } else {
        setCurrentPage('admin-dashboard');
      }
    } else if (currentPage === 'bus-management') {
      if (showAddBusForm) {
        setShowAddBusForm(false);
      } else if (showCreateRouteForm) {
        setShowCreateRouteForm(false);
      } else if (editingRouteIndex !== null) {
        setEditingRouteIndex(null);
      } else {
        setCurrentPage('admin-dashboard');
      }
    } else if (currentPage === 'driver-assignment') {
      setCurrentPage('admin-dashboard');
    } else if (currentPage === 'live-tracking-admin') {
      setCurrentPage('admin-dashboard');
    } else if (currentPage === 'issue-management') {
      setCurrentPage('admin-dashboard');
    } else if (currentPage === 'notification-centre') {
      setCurrentPage('admin-dashboard');
    } else if (currentPage === 'system-reports') {
      setCurrentPage('admin-dashboard');
    } else if (currentPage === 'admin-settings') {
      setCurrentPage('admin-dashboard');
      setShowPasswordReset(false);
    } else if (currentPage === 'route-progress') {
      setCurrentPage('live-tracking-admin');
    } else if (currentPage === 'student-settings') {
      setCurrentPage('student-dashboard');
      setShowPasswordReset(false);
    } else if (currentPage === 'driver-settings') {
      setCurrentPage('driver-dashboard');
      setShowPasswordReset(false);
    } else if (currentPage === 'missed-bus-tracking') {
      setCurrentPage('student-dashboard');
    }
  };

  const handleLogout = () => {
    console.log("handleLogout called");
    setConfirmModal({
      isOpen: true,
      title: 'Do you want to log out?',
      message: 'Are you sure you want to log out of your account?',
      onConfirm: async () => {
        try {
          await signOut(auth);
          setCurrentPage('login');
        } catch (error) {
          console.error("Logout failed:", error);
          showToast("Logout failed. Please try again.", "error");
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      type: 'danger'
    });
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please enter both email and password.", "error");
      return;
    }
    
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const userCred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const uid = userCred.user.uid;
      
      // 1. Determine the "True Role" based on database records first
      let trueRole: string | null = null;
      const emailLower = trimmedEmail.toLowerCase();

      // Check students collection by email
      try {
        const { limit } = await import('firebase/firestore');
        const studentSnap = await getDocs(query(collection(db, 'students'), where('email', '==', trimmedEmail), limit(1)));
        if (!studentSnap.empty) {
          trueRole = 'student';
          // Link UID if not already linked
          const studentDoc = studentSnap.docs[0];
          if (!studentDoc.data().uid) {
            await updateDoc(doc(db, 'students', studentDoc.id), { uid: uid });
          }
        }
      } catch (error) {
        console.error("Error checking student assignment:", error);
      }

      // Check drivers collection by email if not a student
      if (!trueRole) {
        try {
          const { limit } = await import('firebase/firestore');
          const driverSnap = await getDocs(query(collection(db, 'drivers'), where('email', '==', trimmedEmail), limit(1)));
          if (!driverSnap.empty) {
            trueRole = 'driver';
            // Link UID if not already linked
            const driverDoc = driverSnap.docs[0];
            if (!driverDoc.data().uid) {
              await updateDoc(doc(db, 'drivers', driverDoc.id), { uid: uid });
            }
          }
        } catch (error) {
          console.error("Error checking driver assignment:", error);
        }
      }

      // Check hardcoded admins if not a student or driver
      if (!trueRole) {
        const admins = ["aneetaprabhanandhan18@gmail.com", "rohith@gmail.com", "rosec@gmail.com", "rani@gmail.com", "kirans@gmail.com", "rohanr@gmail.com", "abinn@gmail.com", "varunm@gmail.com"];
        if (admins.includes(emailLower)) {
          trueRole = 'admin';
        }
      }

      // 2. Enforce strict access control
      if (!trueRole) {
        await signOut(auth);
        showToast("Access Denied: You are not registered in the system. Please contact the administrator.", "error");
        return;
      }

      // Ensure the user is logging into the correct role
      // Administrators are allowed to log in as any role for testing purposes
      if (selectedRole && trueRole !== selectedRole && trueRole !== 'admin') {
        await signOut(auth);
        showToast(`Access Denied: You are registered as ${trueRole === 'admin' ? 'an' : 'a'} ${trueRole}, but you are trying to login as a ${selectedRole}.`, "error");
        return;
      }

      // If an admin selects a different role, we'll respect that for the session
      const sessionRole = (trueRole === 'admin' && selectedRole) ? selectedRole : trueRole;
      setUserRole(sessionRole as Role);

      // Update users collection for role persistence
      try {
        await setDoc(doc(db, 'users', uid), { role: trueRole, email: trimmedEmail }, { merge: true });
      } catch (error) {
        console.error("Error updating user role:", error);
      }

      // 3. Navigate to appropriate dashboard
      if (sessionRole === 'student') {
        try {
          const studentSnap = await getDocs(query(collection(db, 'students'), where('uid', '==', uid)));
          if (!studentSnap.empty) {
            const student = studentSnap.docs[0].data();
            setStudentProfile({
              name: student.name,
              phone: student.phone,
              email: trimmedEmail,
              boardingPoint: student.boardingPoint || '',
              assignedBus: student.assignedBus || 'Unassigned',
              assignedRoute: student.assignedRoute || 'Unassigned'
            });
          } else if (trueRole === 'admin') {
            // Admin logging in as student - set a default profile with their email
            setStudentProfile(prev => ({
              ...prev,
              name: 'Admin (Student View)',
              email: trimmedEmail
            }));
          }
        } catch (error) {
          console.error("Error fetching student profile:", error);
        }
        await logLogin(uid, 'student');
        setCurrentPage('student-dashboard');
      } else if (sessionRole === 'driver') {
        try {
          const driverSnap = await getDocs(query(collection(db, 'drivers'), where('uid', '==', uid)));
          if (!driverSnap.empty) {
            const driver = driverSnap.docs[0].data();
            setDriverProfile({
              name: driver.name,
              phone: driver.phone,
              email: trimmedEmail
            });
          } else if (trueRole === 'admin') {
            // Admin logging in as driver
            setDriverProfile(prev => ({
              ...prev,
              name: 'Admin (Driver View)',
              email: trimmedEmail
            }));
          }
        } catch (error) {
          console.error("Error fetching driver profile:", error);
        }
        await logLogin(uid, 'driver');
        setCurrentPage('driver-dashboard');
      } else if (sessionRole === 'admin') {
        await logLogin(uid, 'admin');
        setCurrentPage('admin-dashboard');
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        showToast("Invalid email or password. Please check your credentials.", "error");
      } else {
        console.error("Login failed:", error);
        showToast("Login failed: " + (error.message || "Please check your credentials."), "error");
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-500 ${currentPage === 'welcome' ? 'bg-red-600' : 'bg-white'}`}>
      {/* Global UI Components */}
      <AnimatePresence>
        {successModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-6">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{successModal.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{successModal.message}</p>
                
                {successModal.details && (
                  <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    {successModal.details.map((detail, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{detail.label}</span>
                        <span className="text-sm font-mono text-slate-900 break-all">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {console.log("confirmModal.isOpen:", confirmModal.isOpen)}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                confirmModal.type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {confirmModal.type === 'danger' ? <AlertTriangle size={24} /> : <Info size={24} />}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-5 text-sm font-bold text-slate-400 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-5 text-sm font-bold text-white transition-all ${
                  confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110]"
          >
            <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-white border-green-100 text-green-600' : 'bg-white border-red-100 text-red-600'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {currentPage === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center text-center px-6"
          >
            <motion.div 
              className="relative mb-12 flex items-center justify-center"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute -inset-12 bg-red-400 rounded-full blur-3xl opacity-40" />
              <CustomBus size={300} className="relative z-10" />
            </motion.div>

            <p className="text-red-100 text-lg mb-12 max-w-md">
              Your smart ride partner for every journey.
            </p>

            <button
              onClick={handleNext}
              className="group flex items-center gap-3 bg-white text-red-600 px-8 py-4 rounded-full text-xl font-bold hover:bg-red-50 transition-all shadow-xl hover:shadow-red-900/20 cursor-pointer"
            >
              Get Started
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}

        {currentPage === 'role-selection' && (
          <motion.div
            key="role-selection"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-4xl px-6 flex flex-col items-center"
          >
            <button 
              onClick={handleBack}
              className="self-start mb-8 flex items-center text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              <ChevronLeft size={20} />
              Back
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-8">
              {[
                { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Track your daily commute' },
                { id: 'driver', label: 'Driver', icon: User, desc: 'Manage routes and passengers' },
                { id: 'admin', label: 'Admin', icon: Shield, desc: 'Oversee fleet operations' },
              ].map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id as Role)}
                  className="group relative flex flex-col items-center p-12 rounded-3xl bg-linear-to-br from-red-600 to-black transition-all duration-500 hover:bg-white hover:shadow-[0_30px_60px_rgba(0,0,0,0.2)] cursor-pointer overflow-hidden border border-white/10 active:scale-95"
                >
                  {/* Decorative Gradient Glow */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-red-600/10 transition-colors duration-500" />
                  
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8 group-hover:bg-red-50 transition-all duration-500 shadow-lg shadow-black/20 group-hover:shadow-red-600/10">
                    <role.icon size={32} className="text-white group-hover:text-red-600 transition-colors duration-500" strokeWidth={1.5} />
                  </div>
                  
                  <span className="text-2xl font-light classy-text text-white group-hover:text-red-600 mb-2 tracking-wide transition-colors duration-500">{role.label}</span>
                  <div className="h-[1px] w-8 bg-white/30 mb-4 group-hover:bg-red-600 transition-colors duration-500" />
                  <span className="text-[10px] text-slate-300 group-hover:text-slate-600 modern-text tracking-[0.2em] uppercase transition-colors duration-500 text-center px-4">{role.desc}</span>
                  
                  {/* Corner Accent */}
                  <div className="absolute bottom-0 right-0 w-12 h-12 bg-white/5 group-hover:bg-red-600/5 transition-colors duration-500 rounded-tl-full" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {currentPage === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-md px-6"
          >
            <button 
              onClick={handleBack}
              className="mb-8 flex items-center text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              <ChevronLeft size={20} />
              Back to Roles
            </button>

            <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-red-100 border border-slate-100">
              <div className="flex flex-col items-center mb-8">
                <div className="mb-6 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute -inset-8 bg-red-400 rounded-full blur-2xl opacity-20" />
                    <div className="w-32 h-20 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 relative overflow-hidden">
                      <CustomBus size={100} className="relative z-10" />
                    </div>
                  </div>
                </div>
                <p className="text-slate-500 capitalize font-medium">Logging in as {selectedRole}</p>
              </div>

              <form className="space-y-6" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      required
                      type="email" 
                      placeholder="@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>

                <button className="w-full bg-red-600 text-white py-4 rounded-2xl text-lg font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 hover:shadow-red-200 active:scale-[0.98] cursor-pointer">
                  Sign In
                </button>
              </form>

              <div className="mt-8 text-center">
                <a href="#" className="text-red-600 font-semibold hover:underline">Forgot password?</a>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === 'student-dashboard' && userRole === 'student' && (() => {
          const currentStudent = students.find(s => s.email?.toLowerCase() === studentProfile.email?.toLowerCase()) || studentProfile;
          const assignedRoute = (routes || []).find(r => 
            r.startPoint === currentStudent.boardingPoint || 
            r.endPoint === currentStudent.boardingPoint || 
            (r.stops && r.stops.includes(currentStudent.boardingPoint))
          );
          const assignedBus = assignedRoute ? (buses || []).find(b => b.id === (currentStudent.assignedBus && currentStudent.assignedBus !== 'Unassigned' ? currentStudent.assignedBus : assignedRoute.assignedBus)) : null;
          
          return (
            <motion.div
              key="student-dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full min-h-screen bg-white p-6 md:p-12 flex flex-col"
            >
              {/* Header Section */}
              <div className="flex justify-between items-start mb-12">
                <div className="flex flex-col">
                  <h2 className="text-3xl md:text-4xl tracking-tight font-bold text-red-600 mb-1 hover:scale-105 transition-transform cursor-default origin-left">Hello {currentStudent.name}</h2>
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    Allocated Bus: <span className="text-red-600 font-bold">{assignedBus ? assignedBus.id : 'Not Assigned'}</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <User size={14} />
                      Driver: <span className="text-slate-600 font-semibold">{assignedBus && assignedBus.driver ? assignedBus.driver : 'Not Assigned'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <MapPin size={14} />
                      Boarding Point: <span className="text-slate-600 font-semibold">{currentStudent.boardingPoint || 'Not Set'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Route size={14} />
                      Route: <span className="text-slate-600 font-semibold">{assignedRoute ? assignedRoute.name : 'Not Assigned'}</span>
                    </div>
                    {assignedBus && assignedBus.driver && (
                      <button 
                        onClick={() => {
                          setDriverProfile({
                            name: assignedBus.driver,
                            phone: assignedBus.driverPhone || 'Not Available',
                            email: assignedBus.driverEmail || '',
                            assignedBus: assignedBus.id
                          });
                          setCurrentPage('driver-details-view');
                        }}
                        className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-all cursor-pointer w-fit shadow-sm active:scale-95"
                      >
                        <Info size={16} />
                        Driver Details
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowNotificationsModal(true)}
                    className="relative p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <Bell size={24} />
                    {notifications.filter(n => 
                      (n.targetType === 'all' || n.targetType === 'student' || (n.targetType === 'route' && n.targetId === assignedRoute?.name)) &&
                      !clearedNotifications.includes(n.docId)
                    ).length > 0 && (
                      <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-slate-50" />
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentPage('student-settings');
                      setShowPasswordReset(false);
                    }}
                    className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <Settings size={24} />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <LogOut size={24} />
                  </button>
                </div>
              </div>

              {/* Main Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow max-w-4xl mx-auto w-full">
                <button 
                  onClick={() => setCurrentPage('bus-tracking')}
                  className="group relative flex flex-col items-center justify-center p-12 rounded-3xl bg-linear-to-br from-green-600 to-black transition-all duration-500 hover:shadow-[0_40px_80px_rgba(22,163,74,0.2)] cursor-pointer overflow-hidden border border-white/10 active:scale-95"
                >
                  <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <MapPin size={40} className="text-white" strokeWidth={1.5} />
                  </div>
                  <span className="text-3xl font-light classy-text text-white mb-2">Track the Bus</span>
                  <p className="text-white/60 text-sm text-center max-w-[200px]">Real-time location & ETA for your route</p>
                  
                  {/* Decorative background element */}
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                </button>

                <button 
                  onClick={handleMissedBus}
                  className="group relative flex flex-col items-center justify-center p-12 rounded-3xl bg-linear-to-br from-red-600 to-black transition-all duration-500 hover:shadow-[0_40px_80px_rgba(220,38,38,0.2)] cursor-pointer overflow-hidden border border-white/10 active:scale-95"
                >
                  <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <AlertTriangle size={40} className="text-white" strokeWidth={1.5} />
                  </div>
                  <span className="text-3xl font-light classy-text text-white mb-2">Missed Bus</span>
                  <p className="text-white/60 text-sm text-center max-w-[200px]">Report missed bus and find alternatives</p>
                  
                  {/* Decorative background element */}
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                </button>

                {/* Branding Footer */}
                <div className="mt-auto pt-12 flex justify-center opacity-20">
                  <div className="flex items-center gap-2">
                    <CustomBus size={40} className="grayscale brightness-0" />
                    <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
        {currentPage === 'driver-dashboard' && userRole === 'driver' && (() => {
          const assignedBus = (buses || []).find(b => b.driver === driverProfile.name);
          const assignedRoute = assignedBus ? (routes || []).find(r => r.assignedBus === assignedBus.id) : null;
          
          return (
            <motion.div
              key="driver-dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full min-h-screen bg-white p-6 md:p-12 flex flex-col"
            >
              {/* Header Section */}
              <div className="flex justify-between items-start mb-12">
                <div className="flex flex-col">
                  <h2 className="text-3xl md:text-4xl tracking-tight font-bold text-red-600 mb-1 hover:scale-105 transition-transform cursor-default origin-left">Hello {driverProfile.name}</h2>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      Assigned Bus: <span className="text-red-600 font-bold">{assignedBus ? assignedBus.id : 'Not Assigned'}</span>
                    </div>
                    {assignedRoute && (
                      <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                        <Route size={14} />
                        Route: <span className="text-slate-600 font-semibold">{assignedRoute.name}</span>
                      </div>
                    )}
                    {/* Location Status Indicator */}
                    {assignedBus && (
                      <div className="flex items-center gap-2 text-sm mt-2">
                        {locationStatus === 'loading' && (
                          <><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /><span className="text-blue-600 font-medium">Acquiring GPS signal...</span></>
                        )}
                        {locationStatus === 'active' && (
                          <><MapPin size={14} className="text-green-600" /><span className="text-green-600 font-medium">Live tracking active</span></>
                        )}
                        {(locationStatus === 'error' || locationStatus === 'denied') && (
                          <><AlertTriangle size={14} className="text-orange-600" /><span className="text-orange-600 font-medium">{locationError}</span></>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowNotificationsModal(true)}
                  className="relative p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <Bell size={24} />
                  {notifications.filter(n => 
                    (n.targetType === 'all' || 
                    n.targetType === 'driver' || 
                    (n.targetType === 'route' && n.targetId === assignedRoute?.name) || 
                    (n.targetType === 'bus' && n.targetId === assignedBus?.id) || 
                    (n.targetType === 'specific-driver' && n.targetId === auth.currentUser?.uid)) &&
                    !clearedNotifications.includes(n.docId)
                  ).length > 0 && (
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-slate-50" />
                  )}
                </button>
                <button 
                  onClick={() => {
                    setCurrentPage('driver-settings');
                    setShowPasswordReset(false);
                  }}
                  className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <Settings size={24} />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <LogOut size={24} />
                </button>
              </div>
            </div>

            {/* Main Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow max-w-6xl mx-auto w-full items-center">
              <button 
                onClick={async () => {
                  const assignedBus = (buses || []).find(b => b.driver === driverProfile.name);
                  if (assignedBus && assignedBus.docId) {
                    try {
                      const newStatus = !isTripInProgress;
                      const updates: any = {
                        isTripInProgress: newStatus,
                        reachedStops: [], // Reset reached stops when starting a new trip
                        stopTimestamps: {},
                        tripStartTime: null, // Will be set when reaching the first stop
                        tripEndTime: null
                      };
                      await updateDoc(doc(db, 'buses', assignedBus.docId), updates);
                      setIsTripInProgress(newStatus);
                      if (newStatus) {
                        showToast("Tracking enabled. Trip will start when you reach the first stop.", "success");
                      } else {
                        showToast("Trip stopped.", "success");
                      }
                    } catch (error) {
                      handleFirestoreError(error, 'update', 'buses');
                    }
                  } else {
                    showToast("No bus assigned to you.", "error");
                  }
                }}
                className="group relative flex flex-col items-center justify-center p-10 rounded-2xl bg-linear-to-br from-green-600 to-black transition-all duration-500 hover:shadow-[0_40px_80px_rgba(22,163,74,0.2)] cursor-pointer overflow-hidden border border-white/10 active:scale-95">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Play size={32} className="text-white fill-white" strokeWidth={1.5} />
                </div>
                <span className="text-2xl font-light classy-text text-white mb-2">{isTripInProgress ? "Trip in progress" : "Start Trip"}</span>
                <p className="text-white/60 text-xs text-center">{isTripInProgress ? "GPS active" : "Begin your scheduled route"}</p>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
              </button>

              <button 
                onClick={async () => {
                  const assignedBus = (buses || []).find(b => b.driver === driverProfile.name);
                  if (assignedBus && assignedBus.docId) {
                    try {
                      await updateDoc(doc(db, 'buses', assignedBus.docId), {
                        isTripInProgress: false,
                        tripEndTime: new Date()
                      });
                      setIsTripInProgress(false);
                      showToast("Trip ended successfully.", "success");
                    } catch (error) {
                      console.error("Error ending trip:", error);
                    }
                  }
                }}
                className="group relative flex flex-col items-center justify-center p-10 rounded-2xl bg-linear-to-br from-red-600 to-black transition-all duration-500 hover:shadow-[0_40px_80px_rgba(220,38,38,0.2)] cursor-pointer overflow-hidden border border-white/10 active:scale-95">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Square size={32} className="text-white fill-white" strokeWidth={1.5} />
                </div>
                <span className="text-2xl font-light classy-text text-white mb-2">End Trip</span>
                <p className="text-white/60 text-xs text-center">Complete your current journey</p>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
              </button>

              <button 
                onClick={() => setCurrentPage('report-issue')}
                className="group relative flex flex-col items-center justify-center p-10 rounded-2xl bg-linear-to-br from-amber-600 to-black transition-all duration-500 hover:shadow-[0_40px_80px_rgba(217,119,6,0.2)] cursor-pointer overflow-hidden border border-white/10 active:scale-95">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <AlertCircle size={32} className="text-white fill-white" strokeWidth={1.5} />
                </div>
                <span className="text-2xl font-light classy-text text-white mb-2">Report Issue</span>
                <p className="text-white/60 text-xs text-center">Report a problem</p>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
              </button>

            </div>

            {/* Branding Footer */}
            <div className="mt-auto pt-12 flex justify-center opacity-20">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        );
      })()}
      {currentPage === 'report-issue' && (() => {
          const isDriver = userRole === 'driver';
          const profile = isDriver ? driverProfile : studentProfile;
          
          let assignedBus = null;
          
          if (isDriver) {
            assignedBus = (buses || []).find(b => b.driver === driverProfile.name);
          } else {
            const currentStudent = students.find(s => s.email?.toLowerCase() === studentProfile.email?.toLowerCase()) || studentProfile;
            const assignedRoute = (routes || []).find(r => 
              r.startPoint === currentStudent.boardingPoint || 
              r.endPoint === currentStudent.boardingPoint || 
              (r.stops && r.stops.includes(currentStudent.boardingPoint))
            );
            assignedBus = assignedRoute ? (buses || []).find(b => b.id === (currentStudent.assignedBus && currentStudent.assignedBus !== 'Unassigned' ? currentStudent.assignedBus : assignedRoute.assignedBus)) : null;
          }

          return (
            <motion.div
              key="report-issue"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full min-h-screen bg-white p-6 md:p-12 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center gap-4 mb-12">
                <button 
                  onClick={handleBack}
                  className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-3xl tracking-tight text-slate-900">Report Issue</h2>
              </div>

              {/* Issue Options */}
              <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
                <button 
                  onClick={async () => {
                    await addIssue({
                      type: 'Vehicle Breakdown',
                      description: 'Engine failure, flat tire, or mechanical issues',
                      reporterId: auth.currentUser?.uid,
                      reporterName: profile.name,
                      reporterRole: userRole,
                      busNumber: assignedBus ? assignedBus.id : 'N/A',
                      driverName: isDriver ? driverProfile.name : (assignedBus && assignedBus.driver ? assignedBus.driver : 'N/A'),
                      driverEmail: isDriver ? driverProfile.email : (assignedBus && assignedBus.driverEmail ? assignedBus.driverEmail : ''),
                      timestamp: new Date().toISOString(),
                      status: 'Pending'
                    });
                    setShowIssueReportedModal(true);
                  }}
                  className="group flex items-center gap-6 p-8 rounded-xl bg-slate-50 border-2 border-transparent hover:border-red-600/20 hover:bg-red-50/30 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center group-hover:bg-red-600 transition-colors duration-300">
                    <Wrench size={32} className="text-red-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="text-left">
                    <span className="text-xl font-bold tracking-tight text-slate-900 block mb-1">Vehicle Breakdown</span>
                    <p className="text-slate-400 text-sm">Engine failure, flat tire, or mechanical issues</p>
                  </div>
                </button>

                <button 
                  onClick={async () => {
                    await addIssue({
                      type: 'Fuel Issue',
                      description: 'Low fuel or refueling required immediately',
                      reporterId: auth.currentUser?.uid,
                      reporterName: profile.name,
                      reporterRole: userRole,
                      busNumber: assignedBus ? assignedBus.id : 'N/A',
                      driverName: isDriver ? driverProfile.name : (assignedBus && assignedBus.driver ? assignedBus.driver : 'N/A'),
                      driverEmail: isDriver ? driverProfile.email : (assignedBus && assignedBus.driverEmail ? assignedBus.driverEmail : ''),
                      timestamp: new Date().toISOString(),
                      status: 'Pending'
                    });
                    setShowIssueReportedModal(true);
                  }}
                  className="group flex items-center gap-6 p-8 rounded-xl bg-slate-50 border-2 border-transparent hover:border-red-600/20 hover:bg-red-50/30 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-600 transition-colors duration-300">
                    <Fuel size={32} className="text-orange-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="text-left">
                    <span className="text-xl font-bold tracking-tight text-slate-900 block mb-1">Fuel Issue</span>
                    <p className="text-slate-400 text-sm">Low fuel or refueling required immediately</p>
                  </div>
                </button>

                <button 
                  onClick={async () => {
                    await addIssue({
                      type: 'Others',
                      description: 'Any other issues or emergencies',
                      reporterId: auth.currentUser?.uid,
                      reporterName: profile.name,
                      reporterRole: userRole,
                      busNumber: assignedBus ? assignedBus.id : 'N/A',
                      driverName: isDriver ? driverProfile.name : (assignedBus && assignedBus.driver ? assignedBus.driver : 'N/A'),
                      driverEmail: isDriver ? driverProfile.email : (assignedBus && assignedBus.driverEmail ? assignedBus.driverEmail : ''),
                      timestamp: new Date().toISOString(),
                      status: 'Pending'
                    });
                    setShowIssueReportedModal(true);
                  }}
                  className="group flex items-center gap-6 p-8 rounded-xl bg-slate-50 border-2 border-transparent hover:border-red-600/20 hover:bg-red-50/30 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center group-hover:bg-slate-600 transition-colors duration-300">
                    <MoreHorizontal size={32} className="text-slate-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="text-left">
                    <span className="text-xl font-bold tracking-tight text-slate-900 block mb-1">Others</span>
                    <p className="text-slate-400 text-sm">Any other issues or emergencies</p>
                  </div>
                </button>
              </div>

              {/* Branding Footer */}
              <div className="mt-auto pt-12 flex justify-center opacity-20">
                <div className="flex items-center gap-2">
                  <CustomBus size={40} className="grayscale brightness-0" />
                  <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
                </div>
              </div>

              {/* Issue Reported Modal */}
              {showIssueReportedModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl p-10 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} className="text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Issue Reported</h3>
                    <p className="text-slate-500 mb-8">Your issue has been successfully reported to the administration.</p>
                    <button 
                      onClick={() => {
                        setShowIssueReportedModal(false);
                        setCurrentPage(isDriver ? 'driver-dashboard' : 'student-dashboard');
                      }}
                      className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
                    >
                      OK
                    </button>
                  </motion.div>
                </div>
              )}
            </motion.div>
          );
        })()}
        {currentPage === 'driver-details-view' && (
          <motion.div
            key="driver-details-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full min-h-screen bg-white p-6 md:p-12 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-12">
              <button 
                onClick={handleBack}
                className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-3xl tracking-tight text-slate-900">Driver Information</h2>
            </div>

            {/* Driver Card */}
            <div className="max-w-md mx-auto w-full">
              <div className="bg-slate-50 rounded-2xl p-10 border-2 border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full -mr-16 -mt-16" />
                
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="w-24 h-24 rounded-3xl bg-red-600 flex items-center justify-center mb-6 shadow-lg shadow-red-600/20">
                    <User size={48} className="text-white" />
                  </div>
                  
                  <h3 className="text-3xl tracking-tight font-bold text-slate-900 mb-8">{driverProfile.name}</h3>
                  
                  <div className="w-full space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <Phone size={20} />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Phone Number</span>
                        <span className="text-slate-900 font-bold">+91 98765 43210</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <Bus size={20} />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Assigned Bus</span>
                        <span className="text-slate-900 font-bold">{driverProfile.assignedBus || 'Not Assigned'}</span>
                      </div>
                    </div>
                  </div>

                  <a 
                    href="tel:+919876543210"
                    className="mt-10 w-full py-4 rounded-2xl bg-red-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 active:scale-95"
                  >
                    <Phone size={20} fill="white" />
                    Call Driver
                  </a>
                </div>
              </div>
            </div>

            {/* Branding Footer */}
            <div className="mt-auto pt-12 flex justify-center opacity-20">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === 'missed-bus-tracking' && (() => {
          const currentStudent = students.find(s => s.email?.toLowerCase() === studentProfile.email?.toLowerCase()) || studentProfile;
          const assignedRoute = (routes || []).find(r => 
            r.startPoint === currentStudent.boardingPoint || 
            r.endPoint === currentStudent.boardingPoint || 
            (r.stops && r.stops.includes(currentStudent.boardingPoint))
          );
          const assignedBus = assignedRoute ? (buses || []).find(b => b.id === (currentStudent.assignedBus && currentStudent.assignedBus !== 'Unassigned' ? currentStudent.assignedBus : assignedRoute.assignedBus)) : null;

          return (
            <motion.div
              key="missed-bus-tracking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MissedBusTracking 
                onBack={handleBack} 
                boardingPoint={studentProfile.boardingPoint}
                buses={buses}
                routes={routes}
                assignedBusId={assignedBus?.id}
                onTrack={(bus) => {
                  setTrackedBus(bus);
                  setCurrentPage('bus-tracking');
                }}
              />
            </motion.div>
          );
        })()}
        {currentPage === 'bus-tracking' && trackingData && (
          <motion.div
            key="bus-tracking"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full min-h-screen bg-slate-50 flex flex-col"
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 md:p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setTrackedBus(null);
                    handleBack();
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-xl tracking-tight text-slate-900 leading-tight">Live Tracking</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-red-600 tracking-widest uppercase">
                      {trackingData.busNumberToTrack}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                      {trackingData.routeToTrack ? trackingData.routeToTrack.name : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live</span>
              </div>
            </div>

            <div className="flex-grow p-4 md:p-8">
              {trackingData.busToTrack ? (
                <StudentTrackBus 
                  busId={trackingData.busIdToTrack} 
                  busNumber={trackingData.busNumberToTrack} 
                  route={trackingData.routeToTrack}
                  boardingPoint={trackingData.currentStudent.boardingPoint}
                  isPublicBus={trackedBus?.isPublicBus}
                  initialLocation={trackedBus?.lat && trackedBus?.lng ? [trackedBus.lat, trackedBus.lng] : undefined}
                />
              ) : (
                <div className="w-full h-[500px] bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                    <MapIcon size={40} className="text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">No Bus Assigned</h3>
                  <p className="text-slate-500 max-w-sm">We couldn't find an assigned bus for your boarding point. Please contact administration if this is an error.</p>
                </div>
              )}
            </div>

            {/* Branding Footer */}
            <div className="mt-auto py-8 flex justify-center opacity-10">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}
        {(currentPage === 'student-settings' || currentPage === 'driver-settings') && (
          <motion.div
            key="user-settings-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen bg-[#F8F9FA] flex flex-col"
          >
            {/* Top Navigation Rail */}
            <div className="bg-white border-b border-slate-200 px-6 md:px-12 py-4 flex items-center justify-between sticky top-0 z-50">
              <div className="flex items-center gap-8">
                <button 
                  onClick={handleBack}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-2">
                  <CustomBus size={32} className="grayscale brightness-0" />
                  <span className="tracking-tight text-sm tracking-[2px] font-bold text-slate-900">BUSMATE</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col text-right mr-2">
                  <span className="text-xs font-bold text-slate-900">
                    {currentPage === 'student-settings' ? studentProfile.name : driverProfile.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">
                    {currentPage === 'student-settings' ? 'Student Account' : 'Driver Account'}
                  </span>
                </div>
                <button 
                  onClick={() => setCurrentPage('welcome')}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 md:p-12 max-w-4xl mx-auto w-full flex flex-col gap-10">
              {/* Settings Header */}
              <div className="flex flex-col">
                <h2 className="text-4xl md:text-6xl classy-text text-slate-900 italic">Profile & Security</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Sidebar */}
                <div className="md:col-span-1 flex flex-col gap-6">
                  <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-white shadow-xl flex items-center justify-center text-slate-400 mb-4 overflow-hidden relative group">
                      <User size={48} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Edit size={20} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {currentPage === 'student-settings' ? studentProfile.name : driverProfile.name}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono uppercase tracking-widest mt-1">
                      {currentPage === 'student-settings' ? 'Student' : 'Driver'}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                    <button 
                      onClick={() => setShowPasswordReset(false)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-xs transition-all ${!showPasswordReset ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <UserCog size={18} />
                      Edit Profile
                    </button>
                    <button 
                      onClick={() => setShowPasswordReset(true)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-xs transition-all mt-2 ${showPasswordReset ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <Lock size={18} />
                      Security
                    </button>
                  </div>
                </div>

                {/* Settings Content */}
                <div className="md:col-span-2 flex flex-col gap-6">
                  {showPasswordReset ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold tracking-tight text-slate-900">Reset Password</h3>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="password" 
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="password" 
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="password" 
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                        <button className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-red-600 transition-all shadow-xl active:scale-95 mt-4">
                          Update Password
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
                    >
                      <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-8">Edit Profile</h3>
                      <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="text" 
                              value={currentPage === 'student-settings' ? studentProfile.name : driverProfile.name}
                              onChange={(e) => {
                                if (currentPage === 'student-settings') {
                                  setStudentProfile({...studentProfile, name: e.target.value});
                                } else {
                                  setDriverProfile({...driverProfile, name: e.target.value});
                                }
                              }}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="tel" 
                              value={currentPage === 'student-settings' ? studentProfile.phone : driverProfile.phone}
                              onChange={(e) => {
                                if (currentPage === 'student-settings') {
                                  setStudentProfile({...studentProfile, phone: e.target.value});
                                } else {
                                  setDriverProfile({...driverProfile, phone: e.target.value});
                                }
                              }}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium text-slate-900"
                            />
                          </div>
                        </div>

                        {currentPage === 'student-settings' && (
                          <>
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Boarding Point</label>
                              <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                  type="text" 
                                  value={studentProfile.boardingPoint}
                                  disabled
                                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 border-none transition-all font-medium text-slate-400 cursor-not-allowed"
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 ml-1 italic">* Contact admin to change boarding point</p>
                            </div>
                          </>
                        )}

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="email" 
                              value={currentPage === 'student-settings' ? studentProfile.email : driverProfile.email}
                              disabled
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 border-none transition-all font-medium text-slate-400 cursor-not-allowed"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={async () => {
                            try {
                              if (currentPage === 'student-settings') {
                                const studentSnap = await getDocs(query(collection(db, 'students'), where('uid', '==', auth.currentUser?.uid)));
                                if (!studentSnap.empty) {
                                  await updateDoc(doc(db, 'students', studentSnap.docs[0].id), {
                                    name: studentProfile.name,
                                    phone: studentProfile.phone
                                  });
                                }
                              } else if (currentPage === 'driver-settings') {
                                const driverSnap = await getDocs(query(collection(db, 'drivers'), where('uid', '==', auth.currentUser?.uid)));
                                if (!driverSnap.empty) {
                                  await updateDoc(doc(db, 'drivers', driverSnap.docs[0].id), {
                                    name: driverProfile.name,
                                    phone: driverProfile.phone
                                  });
                                }
                              }
                              showToast('Profile updated successfully!');
                            } catch (error) {
                              handleFirestoreError(error, 'update', currentPage === 'student-settings' ? 'students' : 'drivers');
                            }
                          }}
                          className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 active:scale-95 mt-4"
                        >
                          Save Changes
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {(currentPage === 'admin-dashboard' || currentPage === 'admin-settings') && userRole === 'admin' && (
          <motion.div
            key="admin-dashboard-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen bg-[#F8F9FA] flex flex-col"
          >
            {/* Top Navigation Rail */}
            <div className="bg-white border-b border-slate-200 px-6 md:px-12 py-4 flex items-center justify-between sticky top-0 z-50">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <CustomBus size={32} className="grayscale brightness-0" />
                  <span className="tracking-tight text-sm tracking-[2px] font-bold text-slate-900">BUSMATE</span>
                </div>
                <div className="hidden md:flex items-center gap-6">
                  <span 
                    onClick={() => setCurrentPage('admin-dashboard')}
                    className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer pb-1 transition-all ${currentPage === 'admin-dashboard' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Dashboard
                  </span>
                  <span 
                    onClick={() => setCurrentPage('notification-centre')}
                    className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer pb-1 transition-all ${currentPage === 'notification-centre' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Notifications
                  </span>
                  <span 
                    onClick={() => {
                      setCurrentPage('admin-settings');
                      setShowPasswordReset(false);
                      setShowSystemReset(false);
                    }}
                    className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer pb-1 transition-all ${currentPage === 'admin-settings' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Settings
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col text-right mr-2">
                  <span className="text-xs font-bold text-slate-900">{adminProfile.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">ID: ADM-001</span>
                </div>
                <button 
                  onClick={() => setCurrentPage('welcome')}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>

            {currentPage === 'admin-dashboard' ? (
              <div className="p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col gap-10">
                {/* Hero Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex flex-col">
                    <h2 className="text-4xl md:text-6xl classy-text text-slate-900 italic">Admin Dashboard</h2>
                  </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Students', value: students.length.toString(), trend: 'Registered', icon: Users },
                    { label: 'Active Routes', value: routes.length.toString(), trend: 'Created', icon: Route },
                    { label: 'Pending Issues', value: issues.filter(i => i.status !== 'Resolved').length.toString(), trend: 'Needs Review', icon: AlertTriangle, warning: true, action: 'notification-centre' },
                  ].map((stat, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => stat.action && setCurrentPage(stat.action as Page)}
                      className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all ${stat.action ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                          <stat.icon size={20} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${stat.warning ? 'text-orange-600' : 'text-green-600'}`}>
                          {stat.trend}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-mono font-bold text-slate-900">{stat.value}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'User Management', desc: 'Manage access and profiles', icon: Users },
                    { label: 'Bus Management', desc: 'Fleet, routes, and stops', icon: Bus },
                    { label: 'Driver Assignment', desc: 'Schedule and dispatch', icon: UserCheck },
                    { label: 'Live Tracking', desc: 'Real-time fleet monitor', icon: MapPin },
                  ].map((option, idx) => (
                    <button 
                      key={idx}
                      onClick={() => {
                        if (option.label === 'User Management') setCurrentPage('user-management');
                        if (option.label === 'Bus Management') setCurrentPage('bus-management');
                        if (option.label === 'Driver Assignment') setCurrentPage('driver-assignment');
                        if (option.label === 'Live Tracking') setCurrentPage('live-tracking-admin');
                      }}
                      className="group flex flex-col p-8 rounded-2xl bg-white border border-slate-100 transition-all duration-500 cursor-pointer hover:border-red-600/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] active:scale-[0.98] text-left relative overflow-hidden"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-red-600 group-hover:text-white transition-all duration-500 mb-6">
                        <option.icon size={24} strokeWidth={1.5} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1 modern-text">{option.label}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{option.desc}</p>
                      
                      {/* Subtle Arrow */}
                      <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                        <ArrowRight size={18} className="text-red-600" />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Reset Confirmation Modal */}
                <AnimatePresence>
                  {showResetConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 mb-6">
                          <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Are you absolutely sure?</h3>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                          This will permanently delete all student and driver accounts, all routes, all buses, and all assignments. This action is irreversible.
                        </p>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleResetSystem}
                            disabled={isResettingSystem}
                            className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isResettingSystem ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              'Reset Everything'
                            )}
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>


              </div>
            ) : (
              <div className="p-6 md:p-12 max-w-4xl mx-auto w-full flex flex-col gap-10">
                {/* Settings Header */}
                <div className="flex flex-col">
                  <h2 className="text-4xl md:text-6xl classy-text text-slate-900 italic">Profile & Security</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Profile Sidebar */}
                  <div className="md:col-span-1 flex flex-col gap-6">
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                      <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-white shadow-xl flex items-center justify-center text-slate-400 mb-4 overflow-hidden relative group">
                        <User size={48} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <Edit size={20} className="text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{adminProfile.name}</h3>
                      <span className="text-xs text-slate-400 font-mono uppercase tracking-widest mt-1">Administrator</span>
                    </div>

                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                      <button 
                        onClick={() => {
                          setShowPasswordReset(false);
                          setShowSystemReset(false);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-xs transition-all ${!showPasswordReset && !showSystemReset ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <UserCog size={18} />
                        Edit Profile
                      </button>
                      <button 
                        onClick={() => {
                          setShowPasswordReset(true);
                          setShowSystemReset(false);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-xs transition-all mt-2 ${showPasswordReset ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <Lock size={18} />
                        Security
                      </button>
                      <button 
                        onClick={() => {
                          setShowPasswordReset(false);
                          setShowSystemReset(true);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-xs transition-all mt-2 ${showSystemReset ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <Database size={18} />
                        System Reset
                      </button>
                    </div>
                  </div>

                  {/* Settings Content */}
                  <div className="md:col-span-2 flex flex-col gap-6">
                    {showPasswordReset ? (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-bold tracking-tight text-slate-900">Reset Password</h3>
                          <button 
                            onClick={() => setShowPasswordReset(false)}
                            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                          >
                            Back to Profile
                          </button>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input 
                                type="password" 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input 
                                type="password" 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input 
                                type="password" 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                          <button className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-red-600 transition-all shadow-xl active:scale-95 mt-4">
                            Update Password
                          </button>
                        </div>
                      </motion.div>
                    ) : showSystemReset ? (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-bold tracking-tight text-slate-900">System Reset</h3>
                          <button 
                            onClick={() => setShowSystemReset(false)}
                            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                          >
                            Back to Profile
                          </button>
                        </div>

                        <div className="p-8 rounded-3xl bg-red-50 border border-red-100 flex flex-col items-center text-center gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                            <Database size={40} strokeWidth={1.5} />
                          </div>
                          <div className="max-w-md">
                            <h4 className="text-lg font-bold text-slate-900 mb-2">Factory Reset System</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">
                              This action will permanently delete all students, drivers, routes, buses, and assignments from the database. This is irreversible.
                            </p>
                          </div>
                          <button 
                            onClick={() => setShowResetConfirm(true)}
                            className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-red-200"
                          >
                            <Trash2 size={20} />
                            Reset All Data
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
                      >
                        <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-8">Edit Profile</h3>
                        <div className="space-y-6">
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input 
                                type="text" 
                                value={adminProfile.name}
                                onChange={(e) => setAdminProfile({...adminProfile, name: e.target.value})}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium text-slate-900"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input 
                                type="tel" 
                                value={adminProfile.phone}
                                onChange={(e) => setAdminProfile({...adminProfile, phone: e.target.value})}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all font-medium text-slate-900"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input 
                                type="email" 
                                value={adminProfile.email}
                                disabled
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none opacity-60 font-medium text-slate-900 cursor-not-allowed"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 ml-1 italic">Email cannot be changed by the user.</span>
                          </div>
                          <button className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-red-600 transition-all shadow-xl active:scale-95 mt-4">
                            Save Changes
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Branding Footer */}
            <div className="mt-auto py-12 flex justify-center opacity-10">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === 'user-management' && userRole === 'admin' && (
          <motion.div
            key="user-management"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full min-h-screen bg-[#F8F9FA] p-6 md:p-12 flex flex-col"
          >
            {/* Header */}
            <div className="max-w-7xl mx-auto w-full mb-10">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={handleBack}
                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100 shadow-sm"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-3xl tracking-tight font-bold text-slate-900">User Management</h2>
                  <p className="text-sm text-slate-400 font-medium">Manage students, drivers, and administrative roles</p>
                </div>
              </div>
            </div>

            {/* Management Actions */}
            {!showAddStudentForm && !showAddDriverForm && !editingStudent && !editingDriver && (
              <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {[
                  { label: 'Add Students', desc: 'Register new students to the system', icon: UserPlus, color: 'text-slate-600', bg: 'bg-slate-50', action: () => setShowAddStudentForm(true) },
                  { label: 'Add Drivers', desc: 'Onboard new bus drivers', icon: UserPlus, color: 'text-slate-600', bg: 'bg-slate-50', action: () => setShowAddDriverForm(true) },
                ].map((action, idx) => (
                  <button 
                    key={idx}
                    onClick={action.action}
                    className="group flex items-center gap-6 p-6 rounded-xl bg-white border border-slate-100 hover:border-red-600/20 hover:shadow-xl hover:shadow-red-600/5 transition-all duration-300 cursor-pointer active:scale-95 text-left"
                  >
                    <div className={`w-16 h-16 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon size={32} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-lg font-bold tracking-tight text-slate-900">{action.label}</span>
                      <p className="text-xs text-slate-400">{action.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Add Student Form */}
            {showAddStudentForm && (
              <div className="max-w-3xl mx-auto w-full mb-12">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                      <UserPlus size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">Create New Student Profile</h3>
                      <p className="text-sm text-slate-400">Register a new student and assign a subscription plan</p>
                    </div>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const studentName = newStudent.name.trim();
                      const baseEmail = studentName.toLowerCase().replace(/\s+/g, '');
                      const basePassword = studentName.toLowerCase().replace(/\s+/g, '');
                      const password = `${basePassword}@busmate`;
                      
                      // Create user in Firebase Auth using secondaryAuth
                      let uid = '';
                      let email = `${baseEmail}@gmail.com`;
                      let counter = 1;
                      
                      while (true) {
                        try {
                          const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                          uid = userCred.user.uid;
                          break; // Success
                        } catch (error: any) {
                          if (error.code === 'auth/email-already-in-use') {
                            email = `${baseEmail}${counter}@gmail.com`;
                            counter++;
                            continue; // Try next
                          } else {
                            console.error("Error creating student in Auth:", error);
                            showToast("Failed to create student authentication account: " + (error.message || "Email may already be in use."), "error");
                            return;
                          }
                        }
                      }
                      await secondaryAuth.signOut();
                        
                      // Create user in users collection for login
                      await setDoc(doc(db, 'users', uid), {
                        role: 'student',
                        email: email
                      });

                      const nextId = `STU-${students.length + 1}`;
                      const studentData = { 
                        id: nextId,
                        uid: uid,
                        name: studentName,
                        phone: newStudent.phone,
                        boardingPoint: newStudent.boardingPoint,
                        plan: newStudent.plan,
                        status: 'Active',
                        email: email,
                        password: password
                      };
                      await addStudent(studentData);

                      setNewStudent({ name: '', phone: '', boardingPoint: '', plan: '6 Months' });
                      setShowAddStudentForm(false);
                      setSuccessModal({
                        isOpen: true,
                        title: 'Student Profile Created',
                        message: 'The student account has been successfully registered.',
                        details: [
                          { label: 'Email', value: email },
                          { label: 'Password', value: password }
                        ]
                      });
                    }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
                        <input 
                          required
                          type="text" 
                          value={newStudent.name}
                          onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                          placeholder="Enter full name"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <input 
                          required
                          type="tel" 
                          value={newStudent.phone}
                          onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
                          placeholder="e.g. +1 (555) 000-0000"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Boarding Point</label>
                        <input 
                          required
                          type="text" 
                          value={newStudent.boardingPoint}
                          onChange={(e) => setNewStudent({...newStudent, boardingPoint: e.target.value})}
                          placeholder="e.g. Central Station"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fee Subscription Plan</label>
                      <select 
                        required
                        value={newStudent.plan}
                        onChange={(e) => setNewStudent({...newStudent, plan: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm text-slate-600 cursor-pointer"
                      >
                        <option value="6 Months">6 Months Plan</option>
                        <option value="1 Year">1 Year Plan</option>
                      </select>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setShowAddStudentForm(false)}
                        className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
                      >
                        Create Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Student Profile Form */}
            {editingStudent && (
              <div className="max-w-3xl mx-auto w-full mb-12">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                      <Edit size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">Edit Student Profile</h3>
                      <p className="text-sm text-slate-400">Update student information and subscription plan</p>
                    </div>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (editingStudent.docId) {
                        await updateDoc(doc(db, 'students', editingStudent.docId), {
                          name: editingStudent.name,
                          phone: editingStudent.phone,
                          boardingPoint: editingStudent.boardingPoint,
                          plan: editingStudent.plan
                        });
                        setEditingStudent(null);
                        showToast("Student profile updated successfully!");
                      }
                    }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
                        <input 
                          required
                          type="text" 
                          value={editingStudent.name}
                          onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                          placeholder="Enter full name"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <input 
                          required
                          type="tel" 
                          value={editingStudent.phone}
                          onChange={(e) => setEditingStudent({...editingStudent, phone: e.target.value})}
                          placeholder="e.g. +1 (555) 000-0000"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Boarding Point</label>
                        <input 
                          required
                          type="text" 
                          value={editingStudent.boardingPoint}
                          onChange={(e) => setEditingStudent({...editingStudent, boardingPoint: e.target.value})}
                          placeholder="e.g. Central Station"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fee Subscription Plan</label>
                      <select 
                        required
                        value={editingStudent.plan}
                        onChange={(e) => setEditingStudent({...editingStudent, plan: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm text-slate-600 cursor-pointer"
                      >
                        <option value="6 Months">6 Months Plan</option>
                        <option value="1 Year">1 Year Plan</option>
                      </select>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setEditingStudent(null)}
                        className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
                      >
                        Update Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Students List - Shown below Create/Edit Student Profile */}
            {(showAddStudentForm || editingStudent) && (
              <div className="max-w-7xl mx-auto w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-12">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
                      <GraduationCap size={18} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Registered Students</h3>
                  </div>
                  <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">{students.length} Students</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Student ID</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Name</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Phone</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Boarding Point</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Bus Number</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Subscription Plan</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4 border-b border-slate-50">
                            <span className="text-sm font-bold text-slate-900">{student.id}</span>
                          </td>
                          <td className="p-4 border-b border-slate-50">
                            <span className="text-sm font-medium text-slate-600">{student.name}</span>
                          </td>
                          <td className="p-4 border-b border-slate-50">
                            <span className="text-sm text-slate-500">{student.phone}</span>
                          </td>
                          <td className="p-4 border-b border-slate-50">
                            <span className="text-sm font-medium text-slate-600">{student.boardingPoint || 'Not Set'}</span>
                          </td>
                          <td className="p-4 border-b border-slate-50">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                              (routes || []).find(r => 
                                r.startPoint === student.boardingPoint || 
                                r.endPoint === student.boardingPoint || 
                                (r.stops && r.stops.includes(student.boardingPoint))
                              )?.assignedBus !== 'Unassigned' && (routes || []).find(r => 
                                r.startPoint === student.boardingPoint || 
                                r.endPoint === student.boardingPoint || 
                                (r.stops && r.stops.includes(student.boardingPoint))
                              )?.assignedBus
                                ? 'bg-red-50 text-red-700' 
                                : 'bg-slate-50 text-slate-500'
                            }`}>
                              <Bus size={12} />
                              {(() => {
                                const route = (routes || []).find(r => 
                                  r.startPoint === student.boardingPoint || 
                                  r.endPoint === student.boardingPoint || 
                                  (r.stops && r.stops.includes(student.boardingPoint))
                                );
                                return route ? route.assignedBus : 'Not Assigned';
                              })()}
                            </span>
                          </td>
                          <td className="p-4 border-b border-slate-50">
                            <span className="text-sm font-medium text-slate-600">{student.plan}</span>
                          </td>
                          <td className="p-4 border-b border-slate-50">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold">
                              <CheckCircle2 size={12} />
                              {student.status}
                            </span>
                          </td>
                          <td className="p-4 border-b border-slate-50 text-right relative">
                            <button 
                              onClick={() => setOpenStudentMenuId(openStudentMenuId === student.docId ? null : student.docId)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                            >
                              <MoreVertical size={18} />
                            </button>
                            
                            <AnimatePresence>
                              {openStudentMenuId === student.docId && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                  className="absolute right-4 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50"
                                >
                                  <button 
                                    onClick={() => {
                                      setEditingStudent(student);
                                      setOpenStudentMenuId(null);
                                      setShowAddStudentForm(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                  >
                                    <Edit size={16} />
                                    Edit Profile
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setConfirmModal({
                                        isOpen: true,
                                        title: 'Remove Account',
                                        message: `Are you sure you want to remove ${student.name}'s account? This action cannot be undone.`,
                                        type: 'danger',
                                        onConfirm: () => {
                                          deleteStudent(student.docId);
                                          setOpenStudentMenuId(null);
                                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                        }
                                      });
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
                                  >
                                    <UserMinus size={16} />
                                    Remove Account
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Add Driver Form */}
            {showAddDriverForm && (
              <div className="max-w-3xl mx-auto w-full mb-12">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                      <UserPlus size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">Create Driver Profile</h3>
                      <p className="text-sm text-slate-400">Onboard a new bus driver</p>
                    </div>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const driverName = newDriver.name.trim();
                      const baseEmail = driverName.toLowerCase().replace(/\s+/g, '');
                      const basePassword = driverName.toLowerCase().replace(/\s+/g, '');
                      const password = `${basePassword}@busmate`;

                      // Create user in Firebase Auth using secondaryAuth
                      let uid = '';
                      let email = `${baseEmail}@gmail.com`;
                      let counter = 1;
                      
                      while (true) {
                        try {
                          const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                          uid = userCred.user.uid;
                          break; // Success
                        } catch (error: any) {
                          if (error.code === 'auth/email-already-in-use') {
                            email = `${baseEmail}${counter}@gmail.com`;
                            counter++;
                            continue; // Try next
                          } else {
                            console.error("Error creating driver in Auth:", error);
                            showToast("Failed to create driver authentication account: " + (error.message || "Email may already be in use."), "error");
                            return;
                          }
                        }
                      }
                      await secondaryAuth.signOut();
                        
                      // Create user in users collection for login
                      await setDoc(doc(db, 'users', uid), {
                        role: 'driver',
                        email: email
                      });

                      const nextId = `DRV-${drivers.length + 1}`;
                      await addDriver({ 
                        ...newDriver, 
                        id: nextId,
                        uid: uid,
                        email: email,
                        password: password,
                        status: 'Available'
                      });

                      setNewDriver({ name: '', phone: '' });
                      setShowAddDriverForm(false);
                      setSuccessModal({
                        isOpen: true,
                        title: 'Driver Profile Created',
                        message: 'The driver account has been successfully registered.',
                        details: [
                          { label: 'Email', value: email },
                          { label: 'Password', value: password }
                        ]
                      });
                    }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Driver Name</label>
                        <input 
                          required
                          type="text" 
                          value={newDriver.name}
                          onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                          placeholder="Enter full name"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <input 
                          required
                          type="tel" 
                          value={newDriver.phone}
                          onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                          placeholder="e.g. +1 (555) 000-0000"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setShowAddDriverForm(false)}
                        className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
                      >
                        Create Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Driver Profile Form */}
            {editingDriver && (
              <div className="max-w-3xl mx-auto w-full mb-12">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                      <Edit size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">Edit Driver Profile</h3>
                      <p className="text-sm text-slate-400">Update driver information</p>
                    </div>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (editingDriver.docId) {
                        await updateDoc(doc(db, 'drivers', editingDriver.docId), {
                          name: editingDriver.name,
                          phone: editingDriver.phone,
                          status: editingDriver.status
                        });
                        
                        // Update the bus if this driver is assigned to one
                        const assignedBus = buses.find(b => b.driverUid === editingDriver.uid);
                        if (assignedBus && assignedBus.docId) {
                          await updateDoc(doc(db, 'buses', assignedBus.docId), {
                            driver: editingDriver.name,
                            driverPhone: editingDriver.phone
                          });
                        }

                        setEditingDriver(null);
                        showToast("Driver profile updated successfully!");
                      }
                    }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Driver Name</label>
                        <input 
                          required
                          type="text" 
                          value={editingDriver.name}
                          onChange={(e) => setEditingDriver({...editingDriver, name: e.target.value})}
                          placeholder="Enter full name"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <input 
                          required
                          type="tel" 
                          value={editingDriver.phone}
                          onChange={(e) => setEditingDriver({...editingDriver, phone: e.target.value})}
                          placeholder="e.g. +1 (555) 000-0000"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        required
                        value={editingDriver.status}
                        onChange={(e) => setEditingDriver({...editingDriver, status: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm text-slate-600 cursor-pointer"
                      >
                        <option value="Available">Available</option>
                        <option value="On Duty">On Duty</option>
                        <option value="Off Duty">Off Duty</option>
                      </select>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setEditingDriver(null)}
                        className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
                      >
                        Update Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Drivers List - Shown below Create/Edit Driver Profile */}
            {(showAddDriverForm || editingDriver) && (
              <div className="max-w-7xl mx-auto w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-12">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
                      <Users size={18} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Registered Drivers</h3>
                  </div>
                  <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">{drivers.length} Drivers</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Name</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Phone</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((driver, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4 border-b border-slate-50">
                            <span className="text-sm font-medium text-slate-600">{driver.name}</span>
                          </td>
                          <td className="p-4 border-b border-slate-50">
                            <span className="text-sm text-slate-500">{driver.phone}</span>
                          </td>
                          <td className="p-4 border-b border-slate-50">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                              driver.status === 'Available' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              <CheckCircle2 size={12} />
                              {driver.status}
                            </span>
                          </td>
                          <td className="p-4 border-b border-slate-50 text-right relative">
                            <button 
                              onClick={() => setOpenDriverMenuId(openDriverMenuId === driver.docId ? null : driver.docId)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                            >
                              <MoreVertical size={18} />
                            </button>
                            
                            <AnimatePresence>
                              {openDriverMenuId === driver.docId && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                  className="absolute right-4 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50"
                                >
                                  <button 
                                    onClick={() => {
                                      setEditingDriver(driver);
                                      setOpenDriverMenuId(null);
                                      setShowAddDriverForm(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                  >
                                    <Edit size={16} />
                                    Edit Profile
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setConfirmModal({
                                        isOpen: true,
                                        title: 'Remove Account',
                                        message: `Are you sure you want to remove ${driver.name}'s account? This action cannot be undone.`,
                                        type: 'danger',
                                        onConfirm: () => {
                                          deleteDriver(driver.docId);
                                          setOpenDriverMenuId(null);
                                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                        }
                                      });
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
                                  >
                                    <UserMinus size={16} />
                                    Remove Account
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Remove User Form - REMOVED */}

            {/* Branding Footer */}
            <div className="mt-auto py-12 flex justify-center opacity-10">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === 'bus-management' && userRole === 'admin' && (
          <motion.div
            key="bus-management"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full min-h-screen bg-[#F8F9FA] p-6 md:p-12 flex flex-col"
          >
            {/* Header */}
            <div className="max-w-7xl mx-auto w-full mb-10">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={handleBack}
                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100 shadow-sm"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-3xl tracking-tight font-bold text-slate-900">Bus Management</h2>
                  <p className="text-sm text-slate-400 font-medium">Manage fleet inventory, routes, and stops</p>
                </div>
              </div>
            </div>

            {/* Management Actions */}
            {!showAddBusForm && !showCreateRouteForm && editingRouteIndex === null ? (
              <>
                <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
                  {[
                    { label: 'Add Buses', desc: 'Register new vehicles', icon: PlusCircle, color: 'text-slate-600', bg: 'bg-slate-50', action: () => setShowAddBusForm(true) },
                    { label: 'Create Routes', desc: 'Define new transit paths', icon: Route, color: 'text-slate-600', bg: 'bg-slate-50', action: () => setShowCreateRouteForm(true) },
                  ].map((action, idx) => (
                    <button 
                      key={idx}
                      onClick={action.action}
                      className="group flex flex-col p-6 rounded-xl bg-white border border-slate-100 hover:border-red-600/20 hover:shadow-xl hover:shadow-red-600/5 transition-all duration-300 cursor-pointer active:scale-95 text-left"
                    >
                      <div className={`w-14 h-14 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <action.icon size={28} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold tracking-tight text-slate-900">{action.label}</span>
                        <p className="text-xs text-slate-400 mt-1">{action.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Fleet Overview (Mini List) */}
                <div className="max-w-7xl mx-auto w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-12">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Fleet Inventory</h3>
                    <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">{buses.length} Total</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bus ID</th>
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bus Number</th>
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model/Year</th>
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seats</th>
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {buses.map((bus, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                                  <Bus size={16} />
                                </div>
                                <span className="text-sm font-bold text-slate-900">{bus.id}</span>
                              </div>
                            </td>
                            <td className="p-6 text-xs text-slate-600 font-mono">{bus.busNumber}</td>
                            <td className="p-6 text-xs text-slate-600">{bus.modelYear}</td>
                            <td className="p-6 text-xs text-slate-600">{bus.seats}</td>
                            <td className="p-6 text-right relative">
                              <button 
                                onClick={() => setOpenMenuBusId(openMenuBusId === bus.id ? null : bus.id)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                              >
                                <MoreVertical size={18} />
                              </button>
                              
                              {openMenuBusId === bus.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setOpenMenuBusId(null)}
                                  />
                                  <div className="absolute right-6 top-14 w-32 bg-white rounded-xl border border-slate-100 shadow-xl z-20 overflow-hidden py-1">
                                    <button 
                                      onClick={() => {
                                        if (bus.docId) {
                                          setConfirmModal({
                                            isOpen: true,
                                            title: 'Delete Bus',
                                            message: `Are you sure you want to delete bus ${bus.id}? This will unassign all students and routes from this vehicle.`,
                                            type: 'danger',
                                            onConfirm: async () => {
                                              await deleteBus(bus.docId);
                                              setOpenMenuBusId(null);
                                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            }
                                          });
                                        }
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition-all flex items-center gap-2 cursor-pointer"
                                    >
                                      <AlertTriangle size={14} />
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Routes Overview */}
                <div className="max-w-7xl mx-auto w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-12">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Active Routes</h3>
                    <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">{routes.length} Routes</span>
                  </div>
                  <div className="p-6 space-y-4">
                    {routes.map((route, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-red-600 transition-colors">
                            <Route size={24} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-base font-bold text-slate-900">{route.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{route.startPoint} ➔ {route.endPoint}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{route.stops.length} Stops</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {route.assignedBus !== 'Unassigned' ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-100">
                              <Bus size={14} />
                              <span className="text-xs font-bold">{route.assignedBus}</span>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setAssigningRouteId(route.docId)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg border border-orange-100 hover:bg-orange-100 transition-all cursor-pointer"
                            >
                              <AlertCircle size={14} />
                              <span className="text-xs font-bold">Unassigned</span>
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setEditRouteData({ ...route, newStopName: '' });
                              setEditingRouteIndex(idx);
                            }}
                            className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Delete Route',
                                message: `Are you sure you want to delete route "${route.name}"? This will unassign all students and the bus from this route.`,
                                type: 'danger',
                                onConfirm: async () => {
                                  await deleteRoute(route.docId);
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                            className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bus Selection Modal */}
                  <AnimatePresence>
                    {assigningRouteId && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-900">Select Bus</h3>
                            <button 
                              onClick={() => setAssigningRouteId(null)}
                              className="p-2 rounded-xl hover:bg-white text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                            {buses.filter(b => b.route === 'Unassigned').length > 0 ? (
                              buses.filter(b => b.route === 'Unassigned').map((bus, bIdx) => (
                                <button
                                  key={bIdx}
                                  onClick={() => assignBusToRoute(bus.id)}
                                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-all group border border-transparent hover:border-red-100 cursor-pointer"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-red-600 transition-colors">
                                      <Bus size={20} />
                                    </div>
                                    <div className="flex flex-col text-left">
                                      <span className="text-sm font-bold">{bus.id}</span>
                                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{bus.plate}</span>
                                    </div>
                                  </div>
                                  <ChevronLeft className="rotate-180 opacity-0 group-hover:opacity-100 transition-all" size={16} />
                                </button>
                              ))
                            ) : (
                              <div className="py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-300">
                                  <AlertCircle size={32} />
                                </div>
                                <p className="text-slate-500 font-medium">No unassigned buses available</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : showAddBusForm ? (
              <div className="max-w-3xl mx-auto w-full">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                      <PlusCircle size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">Add New Bus</h3>
                      <p className="text-sm text-slate-400">Register a new vehicle to the fleet</p>
                    </div>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      
                      // Check if bus number already exists
                      const busNumberExists = buses.some(b => b.busNumber === newBus.busNumber);
                      if (busNumberExists) {
                        showToast(`Bus number ${newBus.busNumber} already exists!`, 'error');
                        return;
                      }

                      const nextId = `BUS-${buses.length + 1}`;
                      await addBus({ 
                        ...newBus, 
                        id: nextId, 
                        busNumber: newBus.busNumber,
                        plate: `KL-01-NEW-${buses.length + 1}`, 
                        route: 'Unassigned', 
                        driver: null,
                        seats: parseInt(newBus.seats)
                      });
                      setNewBus({ busNumber: '', modelYear: '', seats: '' });
                      setShowAddBusForm(false);
                    }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bus Number</label>
                        <input 
                          required
                          type="text" 
                          value={newBus.busNumber}
                          onChange={(e) => setNewBus({...newBus, busNumber: e.target.value})}
                          placeholder="e.g. bus-1"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Model / Year</label>
                        <input 
                          required
                          type="text" 
                          value={newBus.modelYear}
                          onChange={(e) => setNewBus({...newBus, modelYear: e.target.value})}
                          placeholder="e.g. Tata Starbus 2024"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Seat Availability</label>
                      <input 
                        required
                        type="number" 
                        value={newBus.seats}
                        onChange={(e) => setNewBus({...newBus, seats: e.target.value})}
                        placeholder="Number of seats"
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setShowAddBusForm(false)}
                        className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
                      >
                        Register Bus
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : showCreateRouteForm ? (
              <div className="max-w-3xl mx-auto w-full">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                      <Route size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">Create New Route</h3>
                      <p className="text-sm text-slate-400">Define start, end, and intermediate stops</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Start and End Points */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Point</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={newRoute.startPoint}
                            onChange={(e) => setNewRoute({...newRoute, startPoint: e.target.value})}
                            placeholder="e.g. Central Station"
                            className="w-full px-5 py-4 pr-12 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                          />
                          <button 
                            onClick={() => {
                              if ("geolocation" in navigator) {
                                navigator.geolocation.getCurrentPosition((position) => {
                                  const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                                  setNewRoute(prev => ({
                                    ...prev,
                                    stopCoordinates: { ...prev.stopCoordinates, [newRoute.startPoint]: coords }
                                  }));
                                  showToast(`Location captured for ${newRoute.startPoint}`, 'success');
                                });
                              }
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition-colors"
                            title="Capture current location"
                          >
                            <Navigation size={18} />
                          </button>
                        </div>
                        {newRoute.stopCoordinates[newRoute.startPoint] && (
                          <p className="text-[10px] text-green-600 font-bold ml-1">Location set: {newRoute.stopCoordinates[newRoute.startPoint].lat.toFixed(4)}, {newRoute.stopCoordinates[newRoute.startPoint].lng.toFixed(4)}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Point</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={newRoute.endPoint}
                            onChange={(e) => setNewRoute({...newRoute, endPoint: e.target.value})}
                            placeholder="e.g. North Campus"
                            className="w-full px-5 py-4 pr-12 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                          />
                          <button 
                            onClick={() => {
                              if ("geolocation" in navigator) {
                                navigator.geolocation.getCurrentPosition((position) => {
                                  const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                                  setNewRoute(prev => ({
                                    ...prev,
                                    stopCoordinates: { ...prev.stopCoordinates, [newRoute.endPoint]: coords }
                                  }));
                                  showToast(`Location captured for ${newRoute.endPoint}`, 'success');
                                });
                              }
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition-colors"
                            title="Capture current location"
                          >
                            <Navigation size={18} />
                          </button>
                        </div>
                        {newRoute.stopCoordinates[newRoute.endPoint] && (
                          <p className="text-[10px] text-green-600 font-bold ml-1">Location set: {newRoute.stopCoordinates[newRoute.endPoint].lat.toFixed(4)}, {newRoute.stopCoordinates[newRoute.endPoint].lng.toFixed(4)}</p>
                        )}
                      </div>
                    </div>

                    {/* Add Stops */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Add Stops</label>
                      <div className="flex flex-col md:flex-row gap-4">
                        <input 
                          type="text" 
                          value={newRoute.newStopName}
                          onChange={(e) => setNewRoute({...newRoute, newStopName: e.target.value})}
                          placeholder="Enter stop name"
                          className="flex-grow px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                        {newRoute.stops.length > 0 && (
                          <select
                            value={insertPosition}
                            onChange={(e) => setInsertPosition(e.target.value)}
                            className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm text-slate-600 cursor-pointer"
                          >
                            <option value="end">Add to end</option>
                            <option value="0">After Start Point</option>
                            {newRoute.stops.map((stop, idx) => (
                              <option key={idx} value={idx + 1}>After {stop}</option>
                            ))}
                          </select>
                        )}
                        <button 
                          type="button"
                          onClick={() => {
                            if (newRoute.newStopName.trim()) {
                              const newStops = [...newRoute.stops];
                              if (insertPosition === 'end') {
                                newStops.push(newRoute.newStopName.trim());
                              } else {
                                const pos = parseInt(insertPosition, 10);
                                newStops.splice(pos, 0, newRoute.newStopName.trim());
                              }
                              setNewRoute({
                                ...newRoute,
                                stops: newStops,
                                newStopName: ''
                              });
                              setInsertPosition('end');
                            }
                          }}
                          className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap"
                        >
                          Add Stop
                        </button>
                      </div>
                    </div>

                    {/* Route Visualization */}
                    {(newRoute.startPoint || newRoute.endPoint || newRoute.stops.length > 0) && (
                      <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                        <h4 className="text-sm font-bold text-slate-900 mb-6">Route Preview</h4>
                        <div className="relative pl-6 space-y-6">
                          {/* Vertical Line */}
                          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 rounded-full" />
                          
                          {/* Start Point */}
                          <div className="relative flex items-center gap-4">
                            <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-white border-4 border-red-600 z-10" />
                            <span className="text-sm font-bold text-slate-900">{newRoute.startPoint || 'Start Point'}</span>
                          </div>

                          {/* Intermediate Stops */}
                          {newRoute.stops.map((stop, idx) => (
                            <div key={idx} className="relative flex items-center justify-between gap-4 py-2 group/stop">
                              <div className="flex items-center gap-4">
                                <div className="absolute -left-[19px] w-3 h-3 rounded-full bg-slate-400 border-2 border-white z-10" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-slate-600">{stop}</span>
                                  {newRoute.stopCoordinates[stop] && (
                                    <span className="text-[10px] text-green-600 font-bold">Location set</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if ("geolocation" in navigator) {
                                      navigator.geolocation.getCurrentPosition((position) => {
                                        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                                        setNewRoute(prev => ({
                                          ...prev,
                                          stopCoordinates: { ...prev.stopCoordinates, [stop]: coords }
                                        }));
                                        showToast(`Location captured for ${stop}`, 'success');
                                      });
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Capture current location"
                                >
                                  <Navigation size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newStops = [...newRoute.stops];
                                    newStops.splice(idx, 1);
                                    const newCoords = { ...newRoute.stopCoordinates };
                                    delete newCoords[stop];
                                    setNewRoute({...newRoute, stops: newStops, stopCoordinates: newCoords});
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Remove stop"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* End Point */}
                          <div className="relative flex items-center gap-4">
                            <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-slate-900 border-4 border-white z-10" />
                            <span className="text-sm font-bold text-slate-900">{newRoute.endPoint || 'End Point'}</span>
                          </div>
                        </div>

                        {newRoute.startPoint && (
                          <div className="mt-8 pt-6 border-t border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Route Name</p>
                            <p className="text-lg font-bold tracking-tight text-slate-900">{newRoute.startPoint}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setShowCreateRouteForm(false)}
                        className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={async () => {
                          const routeName = newRoute.startPoint || `Route ${routes.length + 1}`;
                          
                          // Find an unassigned bus
                          const unassignedBus = (buses || []).find(b => b.route === 'Unassigned' || !b.route);
                          const assignedBusId = unassignedBus ? unassignedBus.id : 'Unassigned';

                          const routeToAdd = {
                            name: routeName,
                            startPoint: newRoute.startPoint,
                            endPoint: newRoute.endPoint,
                            stops: newRoute.stops,
                            stopCoordinates: newRoute.stopCoordinates,
                            assignedBus: assignedBusId
                          };

                          await addRoute(routeToAdd);
                          await updateStudentBusAssignments(routeName, assignedBusId, newRoute.stops, newRoute.startPoint, newRoute.endPoint);

                          if (unassignedBus && unassignedBus.docId) {
                            await updateDoc(doc(db, 'buses', unassignedBus.docId), { route: routeName });
                          }

                          setShowCreateRouteForm(false);
                          setNewRoute({ startPoint: '', endPoint: '', stops: [], stopCoordinates: {}, newStopName: '' });
                        }}
                        className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
                      >
                        Save Route
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : editingRouteIndex !== null ? (
              <div className="max-w-3xl mx-auto w-full">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                      <Edit size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">Edit Route</h3>
                      <p className="text-sm text-slate-400">Modify start, end, and intermediate stops</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Start and End Points */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Point</label>
                        <input 
                          type="text" 
                          value={editRouteData.startPoint}
                          onChange={(e) => setEditRouteData({...editRouteData, startPoint: e.target.value})}
                          placeholder="e.g. Central Station"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Point</label>
                        <input 
                          type="text" 
                          value={editRouteData.endPoint}
                          onChange={(e) => setEditRouteData({...editRouteData, endPoint: e.target.value})}
                          placeholder="e.g. North Campus"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                      </div>
                    </div>

                    {/* Add Stops */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Add Stops</label>
                      <div className="flex flex-col md:flex-row gap-4">
                        <input 
                          type="text" 
                          value={editRouteData.newStopName}
                          onChange={(e) => setEditRouteData({...editRouteData, newStopName: e.target.value})}
                          placeholder="Enter stop name"
                          className="flex-grow px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm"
                        />
                        {editRouteData.stops.length > 0 && (
                          <select
                            value={insertPosition}
                            onChange={(e) => setInsertPosition(e.target.value)}
                            className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600/50 transition-all text-sm text-slate-600 cursor-pointer"
                          >
                            <option value="end">Add to end</option>
                            <option value="0">After Start Point</option>
                            {editRouteData.stops.map((stop, idx) => (
                              <option key={idx} value={idx + 1}>After {stop}</option>
                            ))}
                          </select>
                        )}
                        <button 
                          type="button"
                          onClick={() => {
                            if (editRouteData.newStopName.trim()) {
                              const newStops = [...editRouteData.stops];
                              if (insertPosition === 'end') {
                                newStops.push(editRouteData.newStopName.trim());
                              } else {
                                const pos = parseInt(insertPosition, 10);
                                newStops.splice(pos, 0, editRouteData.newStopName.trim());
                              }
                              setEditRouteData({
                                ...editRouteData,
                                stops: newStops,
                                newStopName: ''
                              });
                              setInsertPosition('end');
                            }
                          }}
                          className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap"
                        >
                          Add Stop
                        </button>
                      </div>
                    </div>

                    {/* Route Visualization */}
                    {(editRouteData.startPoint || editRouteData.endPoint || editRouteData.stops.length > 0) && (
                      <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                        <h4 className="text-sm font-bold text-slate-900 mb-6">Route Preview</h4>
                        <div className="relative pl-6 flex flex-col">
                          {/* Vertical Line */}
                          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 rounded-full" />
                          
                          {/* Start Point */}
                          <div className="relative flex items-center gap-4 py-2">
                            <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-white border-4 border-red-600 z-10" />
                            <span className="text-sm font-bold text-slate-900">{editRouteData.startPoint || 'Start Point'}</span>
                          </div>

                          {/* Gaps and Stops */}
                          {Array.from({ length: editRouteData.stops.length + 1 }).map((_, idx) => (
                            <div key={`gap-stop-${idx}`}>
                              {/* Gap for inserting */}
                              <div className="relative flex items-center h-8 group/gap">
                                {insertStopIndex === idx ? (
                                  <div className="flex items-center gap-2 w-full z-10 ml-2">
                                    <input 
                                      autoFocus
                                      type="text" 
                                      value={insertStopName}
                                      onChange={(e) => setInsertStopName(e.target.value)}
                                      placeholder="Stop name..."
                                      className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-red-500 w-full max-w-[200px]"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && insertStopName.trim()) {
                                          e.preventDefault();
                                          const newStops = [...editRouteData.stops];
                                          newStops.splice(idx, 0, insertStopName.trim());
                                          setEditRouteData({...editRouteData, stops: newStops});
                                          setInsertStopIndex(null);
                                          setInsertStopName('');
                                        } else if (e.key === 'Escape') {
                                          setInsertStopIndex(null);
                                        }
                                      }}
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (insertStopName.trim()) {
                                          const newStops = [...editRouteData.stops];
                                          newStops.splice(idx, 0, insertStopName.trim());
                                          setEditRouteData({...editRouteData, stops: newStops});
                                          setInsertStopIndex(null);
                                          setInsertStopName('');
                                        }
                                      }}
                                      className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setInsertStopIndex(null)}
                                      className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setInsertStopIndex(idx); setInsertStopName(''); }}
                                    className="absolute -left-[20px] w-4 h-4 rounded-full bg-white border-2 border-dashed border-slate-300 z-10 flex items-center justify-center opacity-0 group-hover/gap:opacity-100 hover:border-red-400 hover:text-red-500 transition-all cursor-pointer text-slate-300"
                                    title="Add stop here"
                                  >
                                    <PlusCircle size={10} />
                                  </button>
                                )}
                              </div>

                              {/* Stop */}
                              {idx < editRouteData.stops.length && (
                                <div className="relative flex items-center justify-between gap-4 py-2 group/stop">
                                  <div className="flex items-center gap-4">
                                    <div className="absolute -left-[19px] w-3 h-3 rounded-full bg-slate-400 border-2 border-white z-10" />
                                    <span className="text-sm font-medium text-slate-600">{editRouteData.stops[idx]}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newStops = [...editRouteData.stops];
                                      newStops.splice(idx, 1);
                                      setEditRouteData({...editRouteData, stops: newStops});
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    title="Remove stop"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* End Point */}
                          <div className="relative flex items-center gap-4 py-2">
                            <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-slate-900 border-4 border-white z-10" />
                            <span className="text-sm font-bold text-slate-900">{editRouteData.endPoint || 'End Point'}</span>
                          </div>
                        </div>

                        {editRouteData.startPoint && (
                          <div className="mt-8 pt-6 border-t border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Route Name</p>
                            <p className="text-lg font-bold tracking-tight text-slate-900">{editRouteData.startPoint || editRouteData.name}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setEditingRouteIndex(null)}
                        className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={async () => {
                          const routeToUpdate = routes[editingRouteIndex];
                          if (routeToUpdate && routeToUpdate.docId) {
                            // 1. Check if assigned bus changed
                            const busChanged = routeToUpdate.assignedBus !== editRouteData.assignedBus;
                            
                            // 2. Check if stops changed
                            const oldStops = [routeToUpdate.startPoint, routeToUpdate.endPoint, ...(routeToUpdate.stops || [])].filter(Boolean);
                            const newStops = [editRouteData.startPoint, editRouteData.endPoint, ...(editRouteData.stops || [])].filter(Boolean);
                            
                            const addedStops = newStops.filter(s => !oldStops.includes(s));
                            const removedStops = oldStops.filter(s => !newStops.includes(s));
                            
                            const stopsChanged = addedStops.length > 0 || removedStops.length > 0;
                            
                            if (busChanged || stopsChanged) {
                              let message = `Route ${editRouteData.name || editRouteData.startPoint} has been updated.`;
                              if (busChanged) {
                                const oldBus = buses.find(b => b.id === routeToUpdate.assignedBus);
                                const newBus = buses.find(b => b.id === editRouteData.assignedBus);
                                message += ` Assigned bus changed from ${oldBus ? oldBus.busNumber : 'Unassigned'} to ${newBus ? newBus.busNumber : 'Unassigned'}.`;
                              }
                              if (addedStops.length > 0) {
                                message += ` Added stops: ${addedStops.join(', ')}.`;
                              }
                              if (removedStops.length > 0) {
                                message += ` Removed stops: ${removedStops.join(', ')}.`;
                              }
                              
                              // Create notification
                              try {
                                await addDoc(collection(db, 'notifications'), {
                                  title: 'Route Update',
                                  message: message,
                                  targetType: 'route',
                                  targetId: routeToUpdate.name || routeToUpdate.startPoint,
                                  timestamp: new Date().toISOString(),
                                  senderId: auth.currentUser?.uid
                                });
                              } catch (error) {
                                console.error("Error creating notification:", error);
                              }
                            }

                            await updateDoc(doc(db, 'routes', routeToUpdate.docId), {
                              ...editRouteData,
                              name: editRouteData.startPoint || editRouteData.name
                            });
                            await updateStudentBusAssignments(
                              editRouteData.name, 
                              editRouteData.assignedBus, 
                              editRouteData.stops, 
                              editRouteData.startPoint, 
                              editRouteData.endPoint
                            );
                          }
                          setEditingRouteIndex(null);
                        }}
                        className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Branding Footer */}
            <div className="mt-auto py-12 flex justify-center opacity-10">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'driver-assignment' && userRole === 'admin' && (
          <motion.div
            key="driver-assignment"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full min-h-screen bg-[#F8F9FA] p-6 md:p-12 flex flex-col"
          >
            {/* Header */}
            <div className="max-w-7xl mx-auto w-full mb-10">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={handleBack}
                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100 shadow-sm"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-3xl tracking-tight font-bold text-slate-900">Driver Assignment</h2>
                  <p className="text-sm text-slate-400 font-medium">Manage driver-vehicle pairings and schedules</p>
                </div>
              </div>
            </div>

            {/* Assignment Table */}
            <div className="max-w-7xl mx-auto w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight text-slate-900">Bus-Driver Assignments</h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">{buses.filter(b => b.driver).length} Assigned</span>
                  <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-full uppercase tracking-wider">{buses.filter(b => !b.driver).length} Unassigned</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bus Info</th>
                      <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Route</th>
                      <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Driver</th>
                      <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {buses.map((bus, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-red-600">
                              <Bus size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{bus.id}</span>
                              <span className="text-[10px] text-slate-400 font-mono uppercase">{bus.plate}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="text-xs font-medium text-slate-600">{bus.route}</span>
                        </td>
                        <td className="p-6">
                          {bus.driver ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                <User size={14} />
                              </div>
                              <span className="text-sm font-bold text-slate-900">{bus.driver}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full">Unassigned</span>
                          )}
                        </td>
                        <td className="p-6">
                          <button 
                            onClick={() => setAssigningBusId(bus.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-red-600 transition-all cursor-pointer shadow-lg shadow-slate-900/10 active:scale-95"
                          >
                            <UserPlus size={14} />
                            {bus.driver ? 'Change Driver' : 'Add Driver'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Driver Selection Modal/Overlay */}
              <AnimatePresence>
                {assigningBusId && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 p-8 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col">
                        <h4 className="text-2xl font-bold tracking-tight text-slate-900">Select Driver</h4>
                        <p className="text-sm text-slate-400">Assigning to <span className="text-red-600 font-bold">{assigningBusId}</span></p>
                      </div>
                      <button 
                        onClick={() => setAssigningBusId(null)}
                        className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <ChevronLeft size={24} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-8">
                      {drivers.map((driver, idx) => (
                        <button 
                          key={idx}
                          onClick={() => assignDriverToBus(driver.name)}
                          className={`flex items-center gap-4 p-6 rounded-xl border-2 transition-all duration-300 text-left group ${
                            driver.status === 'Assigned' 
                              ? 'bg-slate-50 border-transparent opacity-60 cursor-not-allowed' 
                              : 'bg-white border-slate-100 hover:border-red-600/20 hover:shadow-xl hover:shadow-red-600/5 cursor-pointer active:scale-95'
                          }`}
                          disabled={driver.status === 'Assigned'}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                            driver.status === 'Assigned' ? 'bg-slate-200 text-slate-400' : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'
                          }`}>
                            <User size={24} />
                          </div>
                          <div className="flex flex-col flex-grow">
                            <span className="font-bold text-slate-900">{driver.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{driver.phone}</span>
                          </div>
                          <div className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest ${
                            driver.status === 'Assigned' ? 'bg-slate-200 text-slate-500' : 'bg-green-50 text-green-600'
                          }`}>
                            {driver.status}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Branding Footer */}
            <div className="mt-auto py-12 flex justify-center opacity-10">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === 'live-tracking-admin' && userRole === 'admin' && (
          <motion.div
            key="live-tracking-admin"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full min-h-screen bg-[#F8F9FA] p-6 md:p-12 flex flex-col"
          >
            {/* Header */}
            <div className="max-w-7xl mx-auto w-full mb-10">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={handleBack}
                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100 shadow-sm"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-3xl tracking-tight font-bold text-slate-900">Live Fleet Tracking</h2>
                  <p className="text-sm text-slate-400 font-medium">Real-time monitoring of all active transit units</p>
                </div>
              </div>
            </div>

            {/* Main Content Area: Map Component */}
            <div className="max-w-7xl mx-auto w-full">
              <AdminLiveTracking routes={routes} />
            </div>

            {/* Branding Footer */}
            <div className="mt-auto py-12 flex justify-center opacity-10">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === 'route-progress' && (
          <motion.div
            key="route-progress"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full min-h-screen bg-[#F8F9FA] p-6 md:p-12 flex flex-col"
          >
            {/* Header */}
            <div className="max-w-7xl mx-auto w-full mb-10">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={handleBack}
                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100 shadow-sm"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-3xl tracking-tight font-bold text-slate-900">Route Progress</h2>
                  <p className="text-sm text-slate-400 font-medium">Live tracking of active routes and bus completion</p>
                </div>
              </div>
            </div>

            {/* Progress List */}
            <div className="max-w-7xl mx-auto w-full space-y-6">
              {(routes || []).map((route, i) => {
                const bus = buses.find(b => b.routeId === route.docId || b.route === route.name);
                const stops = [route.startPoint, ...(route.stops || []), route.endPoint];
                
                let currentStopIndex = -1;
                let delay = 0;
                let isTripInProgress = false;
                let tripStartTime = null;

                if (bus) {
                  isTripInProgress = !!bus.isTripInProgress;
                  tripStartTime = bus.tripStartTime;
                  
                  if (isTripInProgress && tripStartTime) {
                    const start = tripStartTime.toDate ? tripStartTime.toDate() : new Date(tripStartTime);
                    const now = new Date();
                    const elapsedMinutes = (now.getTime() - start.getTime()) / 60000;
                    currentStopIndex = Math.min(stops.length - 1, Math.floor(elapsedMinutes / 15));
                    delay = Math.max(0, Math.floor(elapsedMinutes / 30));
                  }
                }

                const progress = currentStopIndex >= 0 ? (currentStopIndex / (stops.length - 1)) * 100 : 0;
                const status = !isTripInProgress ? 'Idle' : (delay > 0 ? `Delayed (${delay}m)` : 'On Time');
                const currentStopName = currentStopIndex >= 0 ? stops[currentStopIndex] : 'Not Started';
                const nextStopName = currentStopIndex < stops.length - 1 ? stops[currentStopIndex + 1] : 'Arrived';

                return (
                  <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                          <Bus size={28} />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-xl font-bold text-slate-900 tracking-tight">{route.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{bus ? bus.id : 'No Bus'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${status.includes('Delayed') ? 'text-orange-600' : status === 'Idle' ? 'text-slate-400' : 'text-green-600'}`}>
                              {status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Next Stop</span>
                          <span className="text-sm font-bold text-red-600">{nextStopName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Route Line */}
                    <div className="relative mt-4 px-2">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full relative">
                        {/* Progress Line */}
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="absolute h-full bg-red-600 rounded-full transition-all duration-1000"
                        />
                        
                        {/* Current Stop Marker */}
                        <motion.div 
                          initial={{ left: 0 }}
                          animate={{ left: `${progress}%` }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000"
                        >
                          <div className="w-4 h-4 rounded-full bg-red-600 border-4 border-white shadow-lg z-10" />
                          <div className="absolute top-6 whitespace-nowrap">
                            <span className="text-[9px] font-bold text-red-600 uppercase tracking-tighter bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                              {currentStopName}
                            </span>
                          </div>
                        </motion.div>

                        {/* Next Stop Marker */}
                        {isTripInProgress && currentStopIndex < stops.length - 1 && (
                          <motion.div 
                            initial={{ left: 0 }}
                            animate={{ left: `${((currentStopIndex + 1) / (stops.length - 1)) * 100}%` }}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000"
                          >
                            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-md z-10 animate-pulse" />
                            <div className="absolute top-6 whitespace-nowrap">
                              <span className="text-[8px] font-bold text-green-600 uppercase tracking-tighter bg-green-50 px-1.5 py-0.5 rounded-md border border-green-100">
                                Next: {nextStopName}
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Start & End Dots */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300" />
                      </div>
                      <div className="flex justify-between mt-12 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{route.startPoint}</span>
                        <span>{route.endPoint}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Branding Footer */}
            <div className="mt-auto py-12 flex justify-center opacity-10">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === 'notification-centre' && userRole === 'admin' && (
          <motion.div
            key="notification-centre"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full min-h-screen bg-[#F8F9FA] p-6 md:p-12 flex flex-col"
          >
            {/* Header */}
            <div className="max-w-7xl mx-auto w-full mb-10">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={handleBack}
                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100 shadow-sm"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-3xl tracking-tight font-bold text-slate-900">Notification Centre</h2>
                  <p className="text-sm text-slate-400 font-medium">Broadcast alerts and manage reported issues</p>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-4 mb-8 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
                <button 
                  onClick={() => setNotificationTab('broadcast')}
                  className={`px-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${notificationTab === 'broadcast' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Megaphone size={16} />
                  Broadcast
                </button>
                <button 
                  onClick={() => setNotificationTab('issues')}
                  className={`px-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${notificationTab === 'issues' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <AlertTriangle size={16} />
                  Reported Issues
                  {issues.filter(i => i.status !== 'Resolved').length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-white text-red-600 flex items-center justify-center text-[10px]">
                      {issues.filter(i => i.status !== 'Resolved').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {notificationTab === 'broadcast' ? (
              <div className="max-w-7xl mx-auto w-full space-y-12">
                {/* Compose Notification */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Compose Broadcast</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Audience</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { label: 'All Students', type: 'all', id: '' },
                          { label: 'All Drivers', type: 'driver', id: '' },
                          { label: 'Specific Route (Students)', type: 'route', id: 'select' },
                          { label: 'Specific Driver', type: 'specific-driver', id: 'select' },
                        ].map((target, i) => (
                          <button 
                            key={i} 
                            onClick={() => setBroadcastData(prev => ({ ...prev, targetType: target.type as any, targetId: target.id === 'select' ? '' : target.id }))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${broadcastData.targetType === target.type ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          >
                            {target.label}
                          </button>
                        ))}
                      </div>

                      {broadcastData.targetType === 'route' && (
                        <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          {routes.map(r => (
                            <button
                              key={r.docId}
                              onClick={() => setBroadcastData(prev => ({ ...prev, targetId: r.name }))}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${broadcastData.targetId === r.name ? 'bg-red-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-red-200'}`}
                            >
                              {r.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {broadcastData.targetType === 'specific-driver' && (
                        <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          {drivers.map(d => (
                            <button
                              key={d.uid}
                              onClick={() => setBroadcastData(prev => ({ ...prev, targetId: d.uid }))}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${broadcastData.targetId === d.uid ? 'bg-red-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-red-200'}`}
                            >
                              {d.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Message Title</label>
                      <input 
                        type="text" 
                        value={broadcastData.title}
                        onChange={(e) => setBroadcastData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Route A Delay Update" 
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all text-slate-900 font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Broadcast Message</label>
                      <textarea 
                        rows={4}
                        value={broadcastData.message}
                        onChange={(e) => setBroadcastData(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Type your message here..." 
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-red-600/20 transition-all text-slate-900 font-medium resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end pt-4">
                      <button 
                        onClick={sendBroadcast}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-red-600 transition-all cursor-pointer shadow-xl active:scale-95"
                      >
                        <Send size={20} />
                        Send Broadcast
                      </button>
                    </div>
                  </div>
                </div>

                {/* Broadcast History */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Broadcast History</h3>
                    {notifications.length > 0 && (
                      <button 
                        onClick={clearAllNotifications}
                        className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Trash2 size={12} />
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notifications.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-400 text-sm italic">No broadcasts sent yet</div>
                    ) : (
                      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((notif, i) => (
                        <div key={i} className="p-4 rounded-2xl border border-slate-50 hover:border-slate-100 transition-all group relative">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                                <Bell size={20} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 line-clamp-1">{notif.title}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                  {new Date(notif.timestamp).toLocaleString()} • {notif.targetType} {notif.targetId}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => deleteNotification(notif.docId)}
                              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Delete Broadcast"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-2">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto w-full space-y-12">
                {/* Active Issues Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Reported Issues</h3>
                    <div className="flex items-center gap-4">
                      {issues.filter(i => i.status === 'Resolved').length > 0 && (
                        <button 
                          onClick={() => {
                            issues.filter(i => i.status === 'Resolved').forEach(issue => deleteDoc(doc(db, 'issues', issue.docId)));
                          }}
                          className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <X size={12} />
                          Clear Resolved
                        </button>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{issues.filter(i => i.status === 'Critical').length} Critical</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{issues.filter(i => i.status === 'Pending').length} Pending</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{issues.filter(i => i.status === 'Resolved').length} Resolved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Details</th>
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reporter</th>
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Driver</th>
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bus</th>
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {issues.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400 text-sm italic">No issues reported yet</td>
                          </tr>
                        ) : (
                          issues.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((issue, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center ${
                                    issue.status === 'Critical' ? 'text-red-600' : 'text-slate-600'
                                  }`}>
                                    <AlertTriangle size={20} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{issue.type || 'General Issue'}</span>
                                    <p className="text-xs text-slate-500 mt-1 max-w-xs">{issue.description}</p>
                                    <span className="text-[10px] text-slate-400 font-mono mt-1">{new Date(issue.timestamp).toLocaleString()}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-6">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-900">{issue.reporterName}</span>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">{issue.reporterRole}</span>
                                </div>
                              </td>
                              <td className="p-6">
                                <span className="text-xs font-bold text-slate-900">{issue.driverName || issue.driver || 'N/A'}</span>
                              </td>
                              <td className="p-6">
                                <span className="text-xs font-bold text-slate-900">{issue.busNumber || issue.target || 'N/A'}</span>
                              </td>
                              <td className="p-6">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  issue.status === 'Critical' ? 'bg-red-50 text-red-600' : 
                                  issue.status === 'Pending' ? 'bg-orange-50 text-orange-600' : 
                                  issue.status === 'Reviewing' ? 'bg-slate-50 text-slate-400' : 'bg-green-50 text-green-600'
                                }`}>
                                  {issue.status}
                                </span>
                              </td>
                              <td className="p-6">
                                <div className="flex items-center gap-2">
                                  {issue.status !== 'Resolved' && (
                                    <button 
                                      onClick={() => resolveIssue(issue.docId)}
                                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-green-600 transition-all cursor-pointer flex items-center gap-2"
                                    >
                                      <CheckCircle2 size={12} />
                                      Resolve
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Branding Footer */}
            <div className="mt-auto py-12 flex justify-center opacity-10">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === 'system-reports' && userRole === 'admin' && (
          <motion.div
            key="system-reports"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full min-h-screen bg-[#F8F9FA] p-6 md:p-12 flex flex-col"
          >
            {/* Header */}
            <div className="max-w-7xl mx-auto w-full mb-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleBack}
                    className="p-3 rounded-2xl bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-slate-100 shadow-sm"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="flex flex-col">
                    <h2 className="text-3xl tracking-tight font-bold text-slate-900">Reports & Analysis</h2>
                    <p className="text-sm text-slate-400 font-medium">Data-driven insights for fleet optimization</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-red-600 transition-all cursor-pointer shadow-xl active:scale-95">
                  <Download size={20} />
                  Export All
                </button>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                  { label: 'Total Trips', value: '1,284', trend: '+12%', icon: Route, color: 'text-slate-600', bg: 'bg-slate-50' },
                  { label: 'Avg. Delay', value: '4.2m', trend: '-8%', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'Fuel Usage', value: '8,420L', trend: '+2%', icon: Fuel, color: 'text-slate-600', bg: 'bg-slate-50' },
                  { label: 'Active Drivers', value: '42', trend: 'Stable', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                      <stat.icon size={24} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-slate-900">{stat.value}</span>
                        <span className={`text-[10px] font-bold ${stat.trend.startsWith('+') ? 'text-green-500' : stat.trend === 'Stable' ? 'text-slate-400' : 'text-red-500'}`}>
                          {stat.trend}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Categories */}
            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Daily Bus Usage', desc: 'Fleet utilization metrics', icon: BarChart3, color: 'text-slate-600', bg: 'bg-slate-50' },
                { label: 'Route Performance', desc: 'Efficiency and load analysis', icon: TrendingUp, color: 'text-slate-600', bg: 'bg-slate-50' },
                { label: 'Delay Reports', desc: 'Schedule adherence logs', icon: History, color: 'text-slate-600', bg: 'bg-slate-50' },
                { label: 'Driver Activity', desc: 'Shift and performance logs', icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-50' },
              ].map((report, idx) => (
                <button 
                  key={idx}
                  className="group flex flex-col p-6 rounded-xl bg-white border border-slate-100 hover:border-red-600/20 hover:shadow-xl hover:shadow-red-600/5 transition-all duration-300 cursor-pointer active:scale-95 text-left"
                >
                  <div className={`w-14 h-14 rounded-2xl ${report.bg} ${report.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <report.icon size={28} strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold tracking-tight text-slate-900">{report.label}</span>
                    <p className="text-xs text-slate-400 mt-1">{report.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Visual Insights Section */}
            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Usage Chart Placeholder */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">Weekly Utilization</h3>
                  <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-red-600/20 outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-64 flex items-end justify-between gap-2 px-4">
                  {[65, 45, 75, 55, 90, 70, 85].map((height, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 w-full">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="w-full bg-slate-100 rounded-t-xl group-hover:bg-red-600 transition-colors relative"
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded">
                          {height}%
                        </div>
                      </motion.div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Route Performance Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">Top Performing Routes</h3>
                  <button className="text-xs font-bold text-red-600 hover:underline">View All</button>
                </div>
                <div className="space-y-6">
                  {[
                    { route: 'Route A (North)', efficiency: '94%', trips: 142, status: 'Optimal' },
                    { route: 'Route B (South)', efficiency: '88%', trips: 128, status: 'Good' },
                    { route: 'Route C (East)', efficiency: '76%', trips: 94, status: 'Review' },
                    { route: 'Route D (West)', efficiency: '91%', trips: 110, status: 'Optimal' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {i + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{item.route}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest">{item.trips} Trips Completed</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-slate-900">{item.efficiency}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${item.status === 'Optimal' ? 'text-green-500' : item.status === 'Good' ? 'text-blue-500' : 'text-orange-500'}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Branding Footer */}
            <div className="mt-auto py-12 flex justify-center opacity-10">
              <div className="flex items-center gap-2">
                <CustomBus size={40} className="grayscale brightness-0" />
                <span className="tracking-tight text-xs tracking-[4px]">BUSMATE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showReassignmentModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden relative"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${showReassignmentModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                {showReassignmentModal.type === 'success' ? (
                  <CheckCircle2 size={40} className="text-green-600" />
                ) : (
                  <AlertTriangle size={40} className="text-red-600" />
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">
                {showReassignmentModal.type === 'success' ? 'Bus Reassigned' : 'No Buses Available'}
              </h3>
              
              <p className="text-slate-600 text-center mb-8">
                {showReassignmentModal.message}
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowReassignmentModal({ ...showReassignmentModal, isOpen: false });
                    if (showReassignmentModal.type === 'success') {
                      setCurrentPage('bus-tracking');
                    }
                  }}
                  className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 ${
                    showReassignmentModal.type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                  }`}
                >
                  {showReassignmentModal.type === 'success' ? 'Track New Bus' : 'Got it'}
                </button>
                
                {showReassignmentModal.type === 'error' && (
                  <button
                    onClick={() => {
                      setShowReassignmentModal({ ...showReassignmentModal, isOpen: false });
                      setCurrentPage('missed-bus-tracking');
                    }}
                    className="w-full py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                  >
                    View Other Options
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotificationsModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h3>
                <button 
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {(() => {
                  let userNotifications = [];
                  if (userRole === 'student') {
                    const currentStudent = students.find(s => s.email?.toLowerCase() === studentProfile.email?.toLowerCase()) || studentProfile;
                    const assignedRoute = (routes || []).find(r => 
                      r.startPoint === currentStudent.boardingPoint || 
                      r.endPoint === currentStudent.boardingPoint || 
                      (r.stops && r.stops.includes(currentStudent.boardingPoint))
                    );
                    userNotifications = notifications.filter(n => 
                      (n.targetType === 'all' || 
                      n.targetType === 'student' || 
                      (n.targetType === 'route' && n.targetId === assignedRoute?.name)) &&
                      !clearedNotifications.includes(n.docId)
                    );
                  } else if (userRole === 'driver') {
                    const assignedBus = (buses || []).find(b => b.driver === driverProfile.name);
                    const assignedRoute = assignedBus ? (routes || []).find(r => r.assignedBus === assignedBus.id) : null;
                    userNotifications = notifications.filter(n => 
                      (n.targetType === 'all' || 
                      n.targetType === 'driver' || 
                      (n.targetType === 'route' && n.targetId === assignedRoute?.name) || 
                      (n.targetType === 'bus' && n.targetId === assignedBus?.id) ||
                      (n.targetType === 'specific-driver' && n.targetId === auth.currentUser?.uid)) &&
                      !clearedNotifications.includes(n.docId)
                    );
                  }

                  userNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                  if (userNotifications.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400">
                        <Bell size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No new notifications</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="flex justify-end mb-2">
                        <button 
                          onClick={() => handleClearAllNotifications(userNotifications)}
                          className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      {userNotifications.map((notification, index) => (
                        <div key={index} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-4 relative group">
                          <div className="mt-1">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                              <Bell size={16} className="text-red-600" />
                            </div>
                          </div>
                          <div className="flex-1 pr-6">
                            <h4 className="font-bold text-slate-900">{notification.title || 'Notification'}</h4>
                            <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                            <span className="text-xs text-slate-400 mt-2 block">
                              {new Date(notification.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleClearNotification(notification.docId)}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                            title="Clear notification"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

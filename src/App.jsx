import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Navigation, Dumbbell, User, Trophy, Play, Flag,
  ShieldAlert, Shield, Activity, Trees, Zap, VolumeX,
  Wind, StopCircle, X, Copy, Check, Users, MapPin, Flame
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  deleteDoc
} from 'firebase/firestore';

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyA9r01f75w2l-3WC7D6a66XuJDTGGYfjLs",
  authDomain: "runloop-2d876.firebaseapp.com",
  projectId: "runloop-2d876",
  storageBucket: "runloop-2d876.firebasestorage.app",
  messagingSenderId: "293901364051",
  appId: "1:293901364051:web:a56a527f9537815c694fa6",
  measurementId: "G-05DP7CTP9D"
};

// ─── FIREBASE INIT ───────────────────────────────────────────────────────────
let db, auth;
try {
  if (typeof window !== 'undefined') {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn("Firebase Init Error (Offline Mode):", e);
}


// ─── ASSETS ──────────────────────────────────────────────────────────────────
const RUNNER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="44" height="44">
  <defs>
    <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <circle cx="24" cy="24" r="22" fill="rgba(163,230,53,0.15)" stroke="#a3e635" stroke-width="1.5"/>
  <circle cx="24" cy="24" r="18" fill="#0f172a" stroke="#a3e635" stroke-width="2.5" filter="url(#glow)"/>
  <circle cx="24" cy="13" r="4" fill="#a3e635"/>
  <line x1="24" y1="17" x2="24" y2="27" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="24" y1="20" x2="18" y2="25" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
  <line x1="24" y1="20" x2="30" y2="17" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
  <line x1="24" y1="27" x2="19" y2="34" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
  <line x1="24" y1="27" x2="30" y2="33" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const OTHER_RUNNER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="36" height="36">
  <circle cx="24" cy="24" r="18" fill="#0f172a" stroke="#60a5fa" stroke-width="2"/>
  <circle cx="24" cy="13" r="4" fill="#60a5fa"/>
  <line x1="24" y1="17" x2="24" y2="27" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="24" y1="20" x2="18" y2="25" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
  <line x1="24" y1="20" x2="30" y2="17" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
  <line x1="24" y1="27" x2="19" y2="34" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
  <line x1="24" y1="27" x2="30" y2="33" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// ─── UTILITY COMPONENTS ──────────────────────────────────────────────────────

const ToastManager = ({ toasts }) => (
  <div className="fixed top-24 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div key={t.id} className="bg-slate-800/95 backdrop-blur border border-slate-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 pointer-events-auto">
        {t.icon || <Check size={16} className="text-lime-400" />}
        <span className="text-sm font-bold">{t.msg}</span>
      </div>
    ))}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
          <X size={20} />
        </button>
        <h3 className="text-xl font-black italic text-white mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
};

// ─── MAIN APP COMPONENT ──────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState('run');
  const [sliderValue, setSliderValue] = useState(5);
  const [user, setUser] = useState(null);
  // ── Bottom Sheet (direct DOM — zero re-renders during drag) ──
  const sheetRef = useRef(null);
  const sheetStateRef = useRef('peek');   // 'peek' | 'half' | 'full'
  const startYRef = useRef(null);
  const startSheetYRef = useRef(null);     // sheet's translateY at drag start
  const rafRef = useRef(null);
  const currentYRef = useRef(null);     // tracks live finger Y

  // Stats
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [energy, setEnergy] = useState(100);
  const MAX_ENERGY = 100;

  // App State
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routeActive, setRouteActive] = useState(false);
  const [distanceDisplay, setDistanceDisplay] = useState("5.0");
  const [timeDisplay, setTimeDisplay] = useState("30:00");
  const [gymActive, setGymActive] = useState(false);
  const [gymTime, setGymTime] = useState(0);
  const [safetyOn, setSafetyOn] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Modals
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [partnerIdInput, setPartnerIdInput] = useState("");
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [partners, setPartners] = useState([]);
  const loginWithGoogle = async () => {
    if (!auth) return;

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;

      if (db) {
        await setDoc(doc(db, "users", u.uid), {
          name: u.displayName,
          email: u.email,
          photo: u.photoURL,
          xp: 0,
          level: 1,
          coins: 0,
          energy: 100,
          createdAt: Date.now()
        }, { merge: true });
      }

      addToast("Welcome " + u.displayName);

    } catch (e) {
      console.error(e);
      addToast("Login failed");
    }
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
  };

  // Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const otherUsersRef = useRef({});
  const territoriesRef = useRef({});
  const gymTimerRef = useRef(null);
  const userLocationRef = useRef({ lat: 26.7271, lng: 88.3953 });
  const lastSyncTimeRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Fog of War
  const fogCanvasRef = useRef(null);
  const revealedPointsRef = useRef([]);

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  // Toast de-duplication ref to prevent flooding
  const lastToastRef = useRef({ msg: '', time: 0 });

  const addToast = (msg, icon = null) => {
    const now = Date.now();
    // Prevent same toast within 2 seconds
    if (lastToastRef.current.msg === msg && now - lastToastRef.current.time < 2000) return;
    lastToastRef.current = { msg, time: now };
    const id = now;
    setToasts(prev => [...prev, { id, msg, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // ─── LOOP CAPTURE ANIMATION ───────────────────────────────────────────────
  const animateCapture = (circle) => {
    let size = 2;
    const animation = setInterval(() => {
      size += 0.5;
      circle.setStyle({ weight: size, fillOpacity: 0.15 + (size * 0.02) });
      if (size > 8) {
        clearInterval(animation);
        circle.setStyle({ weight: 2, fillOpacity: 0.15 });
      }
    }, 50);
  };

  // ─── LOOP BREAK DETECTION ─────────────────────────────────────────────────
  const checkLoopBreak = async (userLat, userLng) => {
    if (!db || !user) return;

    try {
      // Only search nearby area (~2km range)
      const searchRadius = 0.02;

      const loopsQuery = query(
        collection(db, "loops"),
        where("lat", ">", userLat - searchRadius),
        where("lat", "<", userLat + searchRadius)
      );

      const snapshot = await getDocs(loopsQuery);

      snapshot.forEach(async (docSnap) => {

        const loop = docSnap.data();

        if (loop.ownerId === user.uid) return;

        const dx = userLat - loop.lat;
        const dy = userLng - loop.lng;
        const distanceKm = Math.sqrt(dx * dx + dy * dy) * 111;

        if (distanceKm < loop.radius) {

          await setDoc(doc(db, "loops", docSnap.id), {
            ownerId: user.uid,
            capturedAt: Date.now()
          }, { merge: true });

          addToast("Territory Captured!");

          const circle = territoriesRef.current[docSnap.id];

          if (circle) animateCapture(circle);
        }

      });

    } catch (e) {
      console.error("checkLoopBreak error:", e);
    }
  };

  // ─── BOTTOM SHEET (RAF direct-DOM, zero re-renders during drag) ──────────
  // Heights: how many px of sheet are visible above screen bottom
  const PEEK_H = 200;
  const getHalfH = () => Math.round(window.innerHeight * 0.52);
  const getFullH = () => Math.round(window.innerHeight * 0.92);
  const SHEET_H = () => Math.round(window.innerHeight * 0.95); // total sheet div height

  // Convert visible-height → translateY (sheet is position:fixed bottom:0)
  const visibleToY = (visH) => SHEET_H() - visH;

  const applyY = (y, animated = false) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animated ? 'transform 320ms cubic-bezier(0.32,0.72,0,1)' : 'none';
    el.style.transform = `translateY(${y}px)`;
  };

  const snapToState = (state) => {
    sheetStateRef.current = state;
    const y = state === 'peek' ? visibleToY(PEEK_H)
      : state === 'half' ? visibleToY(getHalfH())
        : visibleToY(getFullH());
    applyY(y, true);
  };

  // initialise sheet to peek on first render
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    // Set height, then place at peek immediately (no transition)
    el.style.height = `${SHEET_H()}px`;
    applyY(visibleToY(PEEK_H), false);
  }, []);

  const getClientY = (e) =>
    e.touches ? e.touches[0].clientY : e.clientY;

  const handleDragStart = (e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Record start position
    startYRef.current = getClientY(e);
    currentYRef.current = getClientY(e);
    // Record current sheet translateY
    const el = sheetRef.current;
    const mat = new DOMMatrix(getComputedStyle(el).transform);
    startSheetYRef.current = mat.m42; // current Y
    isDraggingRef.current = true;
    el.style.transition = 'none';
    if (e.type === 'touchstart') e.preventDefault();
  };

  const handleDragMove = (e) => {
    if (!isDraggingRef.current) return;
    currentYRef.current = getClientY(e);
    if (e.type === 'touchmove') e.preventDefault();

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const delta = currentYRef.current - startYRef.current;
      let next = startSheetYRef.current + delta;
      // Hard clamp: can't drag above full or below PEEK
      const minY = visibleToY(getFullH());
      const maxY = visibleToY(PEEK_H);
      // Add rubber-band resistance beyond limits
      if (next < minY) next = minY - (minY - next) * 0.25;
      if (next > maxY) next = maxY + (next - maxY) * 0.25;
      applyY(next, false);
    });
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Determine which state to snap to
    const el = sheetRef.current;
    const mat = new DOMMatrix(getComputedStyle(el).transform);
    const y = mat.m42;
    const vis = SHEET_H() - y;   // how many px are currently visible

    const toPeek = Math.abs(vis - PEEK_H);
    const toHalf = Math.abs(vis - getHalfH());
    const toFull = Math.abs(vis - getFullH());
    const minDist = Math.min(toPeek, toHalf, toFull);

    if (minDist === toPeek) snapToState('peek');
    else if (minDist === toHalf) snapToState('half');
    else snapToState('full');
  };

  // ─── AUTH & SETUP ─────────────────────────────────────────────────────────
  useEffect(() => {

    if (!auth) return;

    const unsub = onAuthStateChanged(auth, (u) => {

      if (u) {
        setUser(u);
      } else {
        setUser(null);
      }

    });

    return () => unsub();

  }, []);

  // Sync User Stats
  useEffect(() => {
    if (!db || !user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setXp(d.xp || 0);
        setLevel(d.level || 1);
        setCoins(d.coins || 0);
        setEnergy(d.energy ?? MAX_ENERGY);
      }
    });
    return () => unsub();
  }, [user]);

  // Energy Refill
  useEffect(() => {
    if (!db || !user) return;
    const refillInterval = setInterval(() => {
      setEnergy(prev => {
        if (prev >= MAX_ENERGY) return prev;
        const newEnergy = prev + 1;
        setDoc(doc(db, "users", user.uid), { energy: newEnergy }, { merge: true });
        return newEnergy;
      });
    }, 60000);
    return () => clearInterval(refillInterval);
  }, [user]);

  // Incoming Partner Requests
  useEffect(() => {
    if (!db || !user) return;
    const unsub = onSnapshot(collection(db, "requests"), snapshot => {
      const list = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.to === user.uid && data.status === "pending") {
          list.push({ id: docSnap.id, from: data.from });
        }
      });
      setIncomingRequests(list);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!db || !user) return;

    const presenceRef = doc(db, "presence", user.uid);

    const handleClose = async () => {
      try {
        await deleteDoc(presenceRef);
      } catch (e) {
        console.error("Presence cleanup failed", e);
      }
    };

    // Runs when tab closes, refreshes, or app exits
    window.addEventListener("beforeunload", handleClose);

    // Runs when component unmounts
    return () => {
      handleClose();
      window.removeEventListener("beforeunload", handleClose);
    };

  }, [user]);
  // Load Leaflet
  useEffect(() => {
    const loadScripts = async () => {
      try {
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        if (!window.L) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => (window.L ? resolve() : reject(new Error("L not loaded")));
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }
        setLibsLoaded(true);
      } catch (err) {
        console.error("Script Load Error", err);
      }
    };
    loadScripts();
  }, []);

  // ─── FOG OF WAR ───────────────────────────────────────────────────────────
  const initFogCanvas = (map) => {
    const container = map.getContainer();
    let canvas = fogCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:450;pointer-events:none;`;
      container.appendChild(canvas);
      fogCanvasRef.current = canvas;
    }
    const resize = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      drawFog(map);
    };
    map.on('moveend zoomend resize move', () => drawFog(map));
    window.addEventListener('resize', resize);
    resize();
  };

  const drawFog = (map) => {
    const canvas = fogCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width: W, height: H } = canvas;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    revealedPointsRef.current.forEach(({ lat, lng, meters }) => {
      const pt = map.latLngToContainerPoint([lat, lng]);
      const zoomScale = Math.pow(2, map.getZoom() - 14);
      const pxR = (meters / 10) * zoomScale;
      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pxR);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.5, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pxR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  };

  const revealArea = (lat, lng, meters = 250) => {
    const DEDUP = 0.001;
    const exists = revealedPointsRef.current.some(p =>
      Math.abs(p.lat - lat) < DEDUP && Math.abs(p.lng - lng) < DEDUP
    );
    if (!exists) {
      revealedPointsRef.current.push({ lat, lng, meters });
      if (mapInstanceRef.current) drawFog(mapInstanceRef.current);
    }
  };

  // ─── MAP INITIALIZATION ───────────────────────────────────────────────────
  useEffect(() => {
    if (!libsLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, attributionControl: false, maxZoom: 18, minZoom: 13
    }).setView([26.7271, 88.3953], 15);

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    initFogCanvas(map);

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(async pos => {
        const { latitude, longitude } = pos.coords;
        userLocationRef.current = { lat: latitude, lng: longitude };

        revealArea(latitude, longitude, 300);

        const avatarIcon = L.divIcon({
          html: RUNNER_SVG, className: '', iconSize: [44, 44], iconAnchor: [22, 22]
        });

        if (!userMarkerRef.current) {
          userMarkerRef.current = L.marker([latitude, longitude], { icon: avatarIcon, zIndexOffset: 1000 }).addTo(map);
          window.radarCircle = L.circle([latitude, longitude], {
            radius: 1000, color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 0.05, weight: 1
          }).addTo(map);
          map.setView([latitude, longitude], 15);
        } else {
          userMarkerRef.current.setLatLng([latitude, longitude]);
          if (window.radarCircle) window.radarCircle.setLatLng([latitude, longitude]);
        }

        const now = Date.now();
        if (db && auth?.currentUser && (now - lastSyncTimeRef.current > 5000)) {
          lastSyncTimeRef.current = now;
          setDoc(doc(db, "presence", auth.currentUser.uid), {
            lat: latitude, lng: longitude, updatedAt: now
          }).catch(console.error);

          // Check loop breaks only in the throttled block to save Firestore reads
          checkLoopBreak(latitude, longitude);
        }

      }, err => console.warn(err), { enableHighAccuracy: true, maximumAge: 10000 });
    }
  }, [libsLoaded]);

  // ─── FIRESTORE LISTENERS ──────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !mapInstanceRef.current || !user) return;

    // BUG FIX: Removed orphaned snapshot.forEach block that was outside any listener

    const unsubExp = onSnapshot(collection(db, "explored"), snapshot => {
      snapshot.forEach(d => {
        const data = d.data();
        if (data.uid === user.uid) revealArea(data.lat, data.lng, 250);
      });
    });

    const unsubPres = onSnapshot(collection(db, "presence"), snapshot => {
      const L = window.L;
      if (!L) return;
      snapshot.forEach(d => {
        const data = d.data();

        // ⛔ Ignore inactive users (older than 15 seconds)
        if (!data.updatedAt || Date.now() - data.updatedAt > 15000) {
          return;
        }
        // Remove markers that are no longer in snapshot
        Object.keys(otherUsersRef.current).forEach(uid => {
          const exists = snapshot.docs.some(doc => doc.id === uid);
          if (!exists) {
            mapInstanceRef.current.removeLayer(otherUsersRef.current[uid]);
            delete otherUsersRef.current[uid];
          }
        });
        if (!data.lat || !data.lng) return;
        const uid = d.id;
        if (uid === user.uid) return;

        const dist = Math.sqrt(
          Math.pow(data.lat - userLocationRef.current.lat, 2) +
          Math.pow(data.lng - userLocationRef.current.lng, 2)
        );
        if (dist > 0.05) return;

        const isPartner = partners.includes(uid);
        if (!otherUsersRef.current[uid]) {
          const icon = L.divIcon({
            html: isPartner ? RUNNER_SVG : OTHER_RUNNER_SVG,
            className: '',
            iconSize: isPartner ? [44, 44] : [36, 36],
            iconAnchor: isPartner ? [22, 22] : [18, 18]
          });
          otherUsersRef.current[uid] = L.marker([data.lat, data.lng], { icon })
            .addTo(mapInstanceRef.current)
            .bindPopup("Runner");
        } else {
          otherUsersRef.current[uid].setLatLng([data.lat, data.lng]);
        }
      });
    });

    // BUG FIX: Removed the orphaned snapshot.forEach after unsubLoops.
    // The loop rendering is now fully self-contained inside the listener callback.
    const loopsQuery = query(
      collection(db, "loops"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubLoops = onSnapshot(loopsQuery, snapshot => {
      // Remove old circles
      Object.values(territoriesRef.current).forEach(circle => {
        if (mapInstanceRef.current) mapInstanceRef.current.removeLayer(circle);
      });
      territoriesRef.current = {};

      // Add current loops
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!window.L || !mapInstanceRef.current) return;
        const circle = window.L.circle([data.lat, data.lng], {
          radius: data.radius * 1000,
          color: "#a3e635",
          fillColor: "#a3e635",
          fillOpacity: 0.15,
          weight: 2
        }).addTo(mapInstanceRef.current);
        territoriesRef.current[docSnap.id] = circle;
      });
    });

    return () => { unsubExp(); unsubPres(); unsubLoops(); };
  }, [user, libsLoaded, partners]);

  // ─── GAME LOGIC ───────────────────────────────────────────────────────────
  // BUG FIX: ENERGY_COST is now a computed value used only inside functions,
  // not as a side-effect at component render level.
  const getEnergyCost = () => Math.floor(sliderValue * 5);

  const generateLoop = async () => {
    if (!libsLoaded || !window.L) return;

    // BUG FIX: Energy check is now correctly inside the function
    const cost = getEnergyCost();
    if (energy < cost) {
      addToast("Not enough energy!", <Zap size={16} className="text-yellow-400" />);
      return;
    }

    setIsRouting(true);
    await new Promise(r => setTimeout(r, 600));

    try {
      const R = 6371;
      const dist = parseFloat(sliderValue) * 0.8;
      const radiusKm = dist / (2 * Math.PI);
      const angle = Math.random() * 2 * Math.PI;
      const cur = userLocationRef.current;
      const centerLat = cur.lat + (radiusKm / R) * (180 / Math.PI) * Math.cos(angle);
      const centerLng = cur.lng + (radiusKm / R) * (180 / Math.PI) * Math.sin(angle) / Math.cos(cur.lat * Math.PI / 180);

      const url = `https://router.project-osrm.org/route/v1/foot/${cur.lng},${cur.lat};${centerLng},${centerLat};${cur.lng},${cur.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes?.[0]) {
        const route = data.routes[0];
        const L = window.L;
        if (routeLayerRef.current) mapInstanceRef.current.removeLayer(routeLayerRef.current);

        routeLayerRef.current = L.geoJSON(route.geometry, {
          style: { color: '#a3e635', weight: 6, opacity: 0.85, lineCap: 'round' }
        }).addTo(mapInstanceRef.current);

        mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });

        if (db && user) {
          addDoc(collection(db, "loops"), {
            lat: centerLat, lng: centerLng, radius: radiusKm,
            ownerId: user.uid, createdAt: Date.now()
          });
        }

        const km = route.distance / 1000;
        setDistanceDisplay(km.toFixed(1));
        setTimeDisplay(`${Math.floor(km * 6)}:00`);
        setRouteActive(true);

        // Deduct energy
        const newEnergy = energy - cost;
        setEnergy(newEnergy);
        if (db && user) {
          setDoc(doc(db, "users", user.uid), { energy: newEnergy }, { merge: true });
        }

        addToast("Route Generated. Let's run!", <MapPin size={16} className="text-lime-400" />);
      } else {
        addToast("No route found. Try again.", <ShieldAlert size={16} className="text-red-500" />);
      }
    } catch (e) {
      console.error(e);
      addToast("Failed to route. Try again.", <ShieldAlert size={16} className="text-red-500" />);
    } finally {
      setIsRouting(false);
    }
  };

  const finishRun = async () => {
    const earned = Math.floor(parseFloat(distanceDisplay) * 100);
    const earnedCoins = Math.floor(earned / 10);

    const newXp = xp + earned;
    const newLevel = Math.floor(newXp / 500) + 1;
    const newCoins = coins + earnedCoins;

    setCoins(newCoins);
    setXp(newXp);
    setLevel(newLevel);
    setRouteActive(false);

    if (routeLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (db && user) {
      setDoc(doc(db, "users", user.uid), {
        xp: newXp, level: newLevel, coins: newCoins
      }, { merge: true });
    }

    addToast(`Run Complete! +${earned} XP`, <Trophy size={16} className="text-yellow-400" />);
  };

  const toggleGym = () => {
    if (gymActive) {
      clearInterval(gymTimerRef.current);
      setGymActive(false);
      addToast("Workout Saved!", <Flame size={16} className="text-pink-400" />);
      setGymTime(0);
    } else {
      setGymActive(true);
      gymTimerRef.current = setInterval(() => setGymTime(t => t + 1), 1000);
    }
  };

  const handleSendPartnerRequest = async () => {
    if (!partnerIdInput.trim()) return;
    if (!db || !user) {
      addToast("Offline Mode", <Zap size={16} />);
      return;
    }
    try {
      await addDoc(collection(db, "requests"), {
        from: user.uid,
        to: partnerIdInput.trim(),
        status: "pending",
        createdAt: Date.now()
      });
      addToast("Request Sent!", <Check size={16} className="text-blue-400" />);
      setPartnerIdInput("");
      setShowPartnerModal(false);
    } catch (e) {
      console.error(e);
      addToast("Error sending request", <ShieldAlert size={16} className="text-red-500" />);
    }
  };

  const acceptPartnerRequest = async (reqId, fromUid) => {
    if (!db) return;
    try {
      await setDoc(doc(db, "requests", reqId), { status: "accepted" }, { merge: true });
      setPartners(prev => [...new Set([...prev, fromUid])]);
      addToast("Partner Accepted!", <Users size={16} className="text-blue-400" />);
    } catch (e) {
      console.error(e);
      addToast("Error accepting request", <ShieldAlert size={16} className="text-red-500" />);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-slate-950 text-white font-sans flex flex-col overflow-hidden relative selection:bg-lime-400/30">

      <ToastManager toasts={toasts} />

      {/* Map Background */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Top gradient for readability */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-900/90 to-transparent z-10 pointer-events-none" />

      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-4 z-50 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-4xl font-black italic tracking-tighter drop-shadow-xl flex items-center gap-1">
            <span className={mode === 'run' ? "text-lime-400" : "text-pink-500"}>{mode === 'run' ? 'LOOP' : 'GYM'}</span>
            <span className="text-white">RUN</span>
          </h1>
          <div className="flex bg-slate-900/80 backdrop-blur-md rounded-2xl p-1 mt-3 w-fit border border-slate-700 shadow-2xl">
            <button onClick={() => setMode('run')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex gap-2 transition-all ${mode === 'run' ? 'bg-lime-500 text-slate-900 shadow-lg shadow-lime-500/20' : 'text-slate-400 hover:text-white'}`}>
              <Navigation size={14} /> RUN
            </button>
            <button onClick={() => setMode('gym')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex gap-2 transition-all ${mode === 'gym' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-slate-400 hover:text-white'}`}>
              <Dumbbell size={14} /> GYM
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 pointer-events-auto">

          {!user && (
            <button
              onClick={loginWithGoogle}
              className="bg-white text-black px-4 py-2 rounded-xl font-bold shadow-lg hover:scale-105 transition"
            >
              Login with Google
            </button>
          )}

          {user && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="bg-slate-800/90 backdrop-blur-md border border-slate-600 pl-3 pr-1 py-1 rounded-full flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-xl group"
            >
              <div className="flex flex-col items-end leading-none mr-1">
                <span className="text-[10px] font-bold text-slate-400">
                  LVL {level}
                </span>
                <span className="text-xs font-black text-white">
                  {user.displayName || "RUNNER"}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-500 group-hover:border-lime-400 transition-colors">
                <User size={16} className="text-slate-300" />
              </div>
            </button>
          )}

        </div>
      </div>

      {/* BUG FIX: Floating HUD - All 3 stat widgets now correctly inside the same positioned container */}
      <div className="absolute top-24 right-4 z-40 flex flex-col gap-3 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur p-3 rounded-2xl border border-slate-700 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-slate-300">BALANCE</span>
          </div>
          <div className="text-xl font-black text-white">{coins.toLocaleString()} <span className="text-[10px] text-yellow-400">COINS</span></div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur p-3 rounded-2xl border border-slate-700 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs font-bold text-slate-300">XP</span>
          </div>
          <div className="text-xl font-black text-white">{xp.toLocaleString()} <span className="text-[10px] text-orange-400">PTS</span></div>
        </div>
        {/* BUG FIX: Energy widget was floating outside this container — now correctly placed here */}
        <div className="bg-slate-900/80 backdrop-blur p-3 rounded-2xl border border-slate-700 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-slate-300">ENERGY</span>
          </div>
          <div className="text-xl font-black text-white">
            {energy}<span className="text-[10px] text-blue-400">/{MAX_ENERGY}</span>
          </div>
          {/* Energy bar */}
          <div className="w-full h-1 bg-slate-700 rounded-full mt-2">
            <div
              className="h-1 bg-blue-400 rounded-full transition-all"
              style={{ width: `${(energy / MAX_ENERGY) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Safety & Social - Left Side */}
      <div className="absolute top-40 left-4 z-40 flex flex-col gap-4 pointer-events-auto">
        <button onClick={() => setShowPartnerModal(true)}
          className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform hover:bg-blue-500">
          <Users size={18} />
        </button>
        <button
          onClick={() => {
            setSafetyOn(prev => {
              const next = !prev;
              addToast(next ? "Safety Mode ARMED" : "Safety Mode OFF", <Shield size={16} className="text-white" />);
              return next;
            });
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${safetyOn ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30' : 'bg-slate-800 text-slate-400 border border-slate-600'}`}>
          {safetyOn ? <ShieldAlert size={18} /> : <Shield size={18} />}
        </button>
      </div>

      {/* BUG FIX: Incoming request banners now stack properly using flex column layout */}
      {incomingRequests.length > 0 && (
        <div className="absolute left-16 top-40 z-50 flex flex-col gap-2">
          {incomingRequests.map(req => (
            <div key={req.id} className="bg-blue-900/90 backdrop-blur border border-blue-700 px-4 py-3 rounded-xl shadow-xl max-w-[200px]">
              <div className="text-xs text-blue-200 mb-1 font-bold">Partner Request</div>
              <div className="text-[10px] text-slate-400 break-all mb-2 font-mono">{req.from.slice(0, 16)}...</div>
              <button
                onClick={() => acceptPartnerRequest(req.id, req.from)}
                className="bg-green-500 hover:bg-green-400 px-3 py-1 rounded text-white text-xs font-bold w-full transition-colors"
              >
                ACCEPT
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Gym Overlay */}
      {mode === 'gym' && (
        <div className="absolute inset-0 z-0 flex items-center justify-center pb-32 pointer-events-none">
          <div className="relative text-center">
            {gymActive && <div className="absolute inset-0 -m-8 rounded-full border-2 border-pink-500/20 animate-ping"></div>}
            <div className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase mb-2">Workout Duration</div>
            <div className="text-8xl font-black text-white tabular-nums tracking-tighter drop-shadow-2xl">
              {new Date(gymTime * 1000).toISOString().substr(14, 5)}
            </div>
            <div className="inline-block bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-sm font-bold mt-4 border border-pink-500/30">
              ~{Math.floor(gymTime / 60 * 8)} KCAL BURNED
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET (fixed-position, ref-driven, zero re-renders during drag) ── */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 w-full z-50 bg-slate-950/96 backdrop-blur-2xl rounded-t-[2rem] border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
        style={{ willChange: 'transform', touchAction: 'none' }}
      >
        {/* ── DRAG ZONE — only this strip initiates drag ── */}
        <div
          className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {/* Pill handle */}
          <div className="w-10 h-1 rounded-full bg-white/20 mb-1" />
          {/* Compact peek row — always visible even at peek height */}
          <div className="w-full px-5 py-2 flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white tracking-tighter leading-none">
                {mode === 'run' ? (routeActive ? distanceDisplay : sliderValue) : sliderValue}
              </span>
              <span className={`text-sm font-black ${mode === 'run' ? 'text-lime-400' : 'text-pink-500'}`}>
                {mode === 'run' ? 'KM' : 'MIN'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-bold">
                {mode === 'run' ? timeDisplay : `~${Math.floor(sliderValue * 8)} kcal`}
              </span>
              {/* Quick action button in peek row */}
              {mode === 'run' && !routeActive && (
                <button
                  onClick={generateLoop}
                  disabled={isRouting || !libsLoaded || energy < getEnergyCost()}
                  className={`bg-lime-400 text-slate-900 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-lime-900/30 transition-all active:scale-95 ${(isRouting || energy < getEnergyCost()) ? 'opacity-40' : 'hover:bg-lime-300'}`}
                >
                  {isRouting ? <Activity size={14} className="animate-spin" /> : <Navigation size={14} fill="currentColor" />}
                  {isRouting ? 'ROUTING…' : 'GO'}
                </button>
              )}
              {mode === 'run' && routeActive && (
                <button onClick={finishRun}
                  className="bg-blue-600 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 hover:bg-blue-500">
                  <Flag size={14} fill="currentColor" /> DONE
                </button>
              )}
              {mode === 'gym' && (
                <button onClick={toggleGym}
                  className={`font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all ${gymActive ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-pink-500 text-white hover:bg-pink-400'}`}>
                  {gymActive ? <><StopCircle size={14} /> STOP</> : <><Play size={14} fill="currentColor" /> START</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE CONTENT (shows when sheet is half/full) ── */}
        <div className="overflow-y-auto px-5 pb-10" style={{ maxHeight: 'calc(92vh - 100px)' }}>

          {/* Labels */}
          <div className="flex justify-between items-center mb-4 mt-1">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              {mode === 'run' ? 'DISTANCE GOAL' : 'TIME GOAL'}
            </p>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">ESTIMATED</p>
          </div>

          {/* Energy cost preview */}
          {mode === 'run' && !routeActive && (
            <div className="flex items-center gap-1.5 mb-4 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
              <Zap size={12} className="text-blue-400" />
              <span className="text-xs text-slate-400">
                Cost: <span className={`font-bold ${energy < getEnergyCost() ? 'text-red-400' : 'text-blue-300'}`}>
                  {getEnergyCost()} energy
                </span>
                {energy < getEnergyCost() && <span className="text-red-400 ml-1 font-bold">— not enough!</span>}
              </span>
              <span className="ml-auto text-xs text-slate-500">{energy}/{MAX_ENERGY} remaining</span>
            </div>
          )}

          {/* Slider */}
          {!routeActive && !gymActive && (
            <div className="mb-6 relative">
              <div className={`absolute top-1/2 left-0 w-full h-1 -mt-0.5 rounded-full ${mode === 'run' ? 'bg-lime-900/60' : 'bg-pink-900/60'}`} />
              <input
                type="range"
                min={mode === 'run' ? 1 : 10}
                max={mode === 'run' ? 20 : 120}
                step={mode === 'run' ? 0.5 : 5}
                value={sliderValue}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setSliderValue(val);
                  if (mode === 'run') setTimeDisplay(`${Math.floor(val * 6)}:00`);
                }}
                className="relative w-full h-8 opacity-0 z-20 cursor-pointer"
              />
              <div className="absolute top-1/2 -mt-3.5 h-7 w-7 rounded-full bg-white shadow-xl pointer-events-none z-10 flex items-center justify-center"
                style={{ left: `calc(${((sliderValue - (mode === 'run' ? 1 : 10)) / ((mode === 'run' ? 20 : 120) - (mode === 'run' ? 1 : 10))) * 100}% - 14px)` }}>
                <div className={`w-2.5 h-2.5 rounded-full ${mode === 'run' ? 'bg-lime-500' : 'bg-pink-500'}`} />
              </div>
              <div className={`absolute top-1/2 left-0 h-1 -mt-0.5 rounded-full pointer-events-none z-0 ${mode === 'run' ? 'bg-lime-500' : 'bg-pink-500'}`}
                style={{ width: `${((sliderValue - (mode === 'run' ? 1 : 10)) / ((mode === 'run' ? 20 : 120) - (mode === 'run' ? 1 : 10))) * 100}%` }} />
            </div>
          )}

          {/* Preferences (Run Mode Only) */}
          {mode === 'run' && !routeActive && (
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { icon: Trees, label: "Shade" }, { icon: Zap, label: "Lit" },
                { icon: Wind, label: "Air" }, { icon: VolumeX, label: "Quiet" }
              ].map((item, i) => (
                <button key={i}
                  className="flex flex-col items-center justify-center gap-1.5 bg-slate-900/80 p-3 rounded-2xl text-[10px] font-bold text-slate-500 border border-white/5 hover:border-white/20 hover:text-white transition-all active:scale-95">
                  <item.icon size={18} /> {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Full-size action button (visible when sheet is half/full) */}
          <div className="mb-2">
            {mode === 'run' ? (
              routeActive ? (
                <button onClick={finishRun}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-blue-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                  <Flag size={22} fill="currentColor" /> COMPLETE RUN
                </button>
              ) : (
                <button
                  onClick={generateLoop}
                  disabled={isRouting || !libsLoaded || energy < getEnergyCost()}
                  className={`w-full bg-gradient-to-r from-lime-400 to-lime-500 text-slate-900 font-black text-lg py-5 rounded-2xl shadow-xl shadow-lime-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${(isRouting || energy < getEnergyCost()) ? 'opacity-40' : 'hover:from-lime-300 hover:to-lime-400'}`}
                >
                  {isRouting
                    ? <><Activity className="animate-spin" size={22} /> CALCULATING…</>
                    : !libsLoaded ? 'LOADING MAP…'
                      : <><Navigation size={22} fill="currentColor" /> GENERATE LOOP</>
                  }
                </button>
              )
            ) : (
              gymActive ? (
                <button onClick={toggleGym}
                  className="w-full bg-transparent border-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white font-black text-lg py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                  <StopCircle size={22} /> STOP TIMER
                </button>
              ) : (
                <button onClick={toggleGym}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-pink-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                  <Play size={22} fill="currentColor" /> START SESSION
                </button>
              )
            )}
          </div>

          {/* Snap state indicator dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {['peek', 'half', 'full'].map(s => (
              <button key={s} onClick={() => snapToState(s)}
                className={`rounded-full transition-all ${sheetStateRef.current === s ? 'w-4 h-1.5 bg-white/60' : 'w-1.5 h-1.5 bg-white/20'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Partner Modal */}
      <Modal isOpen={showPartnerModal} onClose={() => setShowPartnerModal(false)} title="Add Running Partner">
        <p className="text-slate-400 text-sm mb-4">Enter your friend's Unique ID to see them on the map.</p>
        <input
          type="text"
          placeholder="Paste ID here..."
          value={partnerIdInput}
          onChange={e => setPartnerIdInput(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 text-white p-4 rounded-xl font-mono text-sm focus:outline-none focus:border-blue-500 mb-4"
        />
        <button onClick={handleSendPartnerRequest}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors">
          Send Request
        </button>

        {incomingRequests.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-slate-400 mb-2">Incoming Requests:</p>
            {incomingRequests.map(req => (
              <div key={req.id} className="bg-slate-800 p-3 rounded-lg mb-2">
                <p className="text-xs text-white break-all font-mono">{req.from}</p>
                <button
                  onClick={() => acceptPartnerRequest(req.id, req.from)}
                  className="bg-green-500 hover:bg-green-400 text-white px-3 py-1 rounded mt-2 text-xs font-bold transition-colors">
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Profile Modal */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Runner Profile">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-lime-400 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(163,230,53,0.3)]">
            <User size={40} className="text-lime-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Level {level}</h2>
          <p className="text-slate-400 text-sm">Runner</p>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Your Unique ID</span>
            <button
              onClick={() => {
                if (user) navigator.clipboard.writeText(user.uid);
                addToast("ID Copied!", <Copy size={16} />);
              }}
              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
              <Copy size={12} /> Copy
            </button>
          </div>
          <code className="block bg-slate-950 p-2 rounded text-xs font-mono text-slate-300 break-all select-all">
            {user ? user.uid : "Loading..."}
          </code>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
            <div className="text-lg font-black text-yellow-400">{coins.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 font-bold">COINS</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
            <div className="text-lg font-black text-orange-400">{xp.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 font-bold">XP</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
            <div className="text-lg font-black text-blue-400">{energy}</div>
            <div className="text-[10px] text-slate-400 font-bold">ENERGY</div>
          </div>
        </div>
      </Modal>

    </div>
  );
}
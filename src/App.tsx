/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getSupabase, testSupabaseConnection, resetSupabaseClient } from './supabase';
import { 
  MapPin, 
  LogIn, 
  LogOut, 
  Plus, 
  X, 
  ExternalLink, 
  Navigation, 
  ShieldCheck, 
  User as UserIcon, 
  Loader2,
  Map as MapIcon,
  List as ListIcon,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Trash2,
  Utensils,
  ShoppingBag,
  MoreHorizontal,
  Heart,
  Sparkles,
  Globe,
  MapPinned,
  Send,
  TrendingUp,
  AlertCircle,
  Hash,
  Languages,
  Coffee,
  Gift,
  Ticket,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  Trees,
  Palette,
  Train,
  ParkingCircle,
  School,
  Store,
  Pencil,
  FileText,
  Video,
  Play,
  ArrowLeft,
  ArrowUpRight,
  Star,
  Clock,
  Share2,
  Edit,
  Bookmark,
  MessageSquare,
  Award,
  Save,
  Upload,
} from 'lucide-react';

// DropZone component for drag & drop uploads
const DropZone = ({ onFilesDrop, label, className, icon: Icon = Upload, isLoading = false, accept = "*/*" }: { 
  onFilesDrop: (files: File[]) => void, 
  label: string, 
  className?: string,
  icon?: any,
  isLoading?: boolean,
  accept?: string
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files) as File[];
        if (files.length > 0) onFilesDrop(files);
      }}
      className={cn(
        "border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer relative min-h-[200px]",
        isDragging ? "border-black bg-stone-50 scale-[0.98]" : "border-stone-200 hover:border-stone-400",
        isLoading && "opacity-50 pointer-events-none",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="w-8 h-8 text-black animate-spin" />
      ) : (
        <Icon className={cn("w-8 h-8", isDragging ? "text-black" : "text-stone-300")} />
      )}
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black">{label}</p>
        <p className="text-[9px] text-stone-400 uppercase tracking-widest">Drag & Drop or Click to Upload</p>
      </div>
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        multiple 
        accept={accept}
        onChange={(e) => {
          const files = Array.from(e.target.files || []) as File[];
          if (files.length > 0) onFilesDrop(files);
          // Reset input so the same file can be selected again
          e.target.value = '';
        }}
      />
    </div>
  );
};

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { Country, State, City } from 'country-state-city';
import { MAP_THEMES, TOKYO_ILLUSTRATION_THEME, isIllustrationTheme, type MapThemeKey } from './illustrationMaps';
import TokyoIllustrationLayer from './TokyoIllustrationLayer';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type UserRole = 'admin' | 'user';
type Tab = 'map' | 'list' | 'ai' | 'profile';

interface Review {
  id: string;
  author_name: string;
  author_role?: string;
  author_photo?: string;
  rating: number;
  text: string;
  date: string;
  images?: string[];
}

interface Place {
  id: string;
  name: string;
  description?: string;
  detailed_description?: string;
  category: 'restaurant' | 'shop' | 'other';
  lat: number;
  lng: number;
  country?: string;
  prefecture?: string;
  municipality?: string;
  address?: string;
  website_url?: string;
  image_url?: string;
  images?: string[];
  videos?: string[];
  pdfs?: { name: string; url: string }[];
  milz_experience?: string;
  milz_experience_label?: string;
  milz_experience_heading?: string;
  reporter_name?: string;
  photos_heading?: string;
  shorts_heading?: string;
  menu_heading?: string;
  menu_description?: string;
  visual_archive_label?: string;
  visual_archive_description?: string;
  back_to_map_label?: string;
  location_label?: string;
  hours_label?: string;
  contact_label?: string;
  created_by: string;
  created_at: string;
  rating?: number;
  review_count?: number;
  hours?: string;
  reviews?: Review[];
}

interface Favorite {
  id: string;
  user_id: string;
  place_id: string;
  created_at: string;
}

interface AIResults {
  recommendations?: {
    name: string;
    reason: string;
    category: string;
    lat: number;
    lng: number;
  }[];
}

interface TempAiPin {
  lat: number;
  lng: number;
  name: string;
}

// Custom Map Events Component
const TOKYO_CENTER: [number, number] = [35.6812, 139.7671];
const DEFAULT_ZOOM = 13;

function MapEvents({ 
  user, 
  role, 
  activeTab, 
  setNewPlacePos, 
  setIsAdding, 
  setMapBounds, 
  mapRef 
}: { 
  user: any, 
  role: UserRole | null, 
  activeTab: Tab, 
  setNewPlacePos: (pos: { lat: number; lng: number } | null) => void, 
  setIsAdding: (val: boolean) => void, 
  setMapBounds: (bounds: L.LatLngBounds | null) => void, 
  mapRef: React.MutableRefObject<L.Map | null>
}) {
  const map = useMap();
  
  const isFirstLoad = useRef(true);
  
  useEffect(() => {
    if (map) {
      mapRef.current = map;
      setMapBounds(map.getBounds());
    }
    return () => {
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, [map, mapRef, setMapBounds]);

  useMapEvents({
    click(e) {
      if (user && role === 'admin' && activeTab === 'map') {
        setNewPlacePos(e.latlng);
        setIsAdding(true);
      }
    },
    load() {
      setMapBounds(map.getBounds());
    },
    moveend() {
      setMapBounds(map.getBounds());
    }
  });
  return null;
}

const CATEGORY_CONFIG: Record<string, { icon: any, color: string, bg: string }> = {
  'レストラン': { icon: Utensils, color: '#000000', bg: '#FFFFFF' },
  'カフェ': { icon: Coffee, color: '#000000', bg: '#FFFFFF' },
  '駅・交通': { icon: Train, color: '#000000', bg: '#FFFFFF' },
  '駐車場': { icon: ParkingCircle, color: '#000000', bg: '#FFFFFF' },
  '公園・自然': { icon: Trees, color: '#000000', bg: '#FFFFFF' },
  'ショッピング': { icon: ShoppingBag, color: '#000000', bg: '#FFFFFF' },
  '学校': { icon: School, color: '#000000', bg: '#FFFFFF' },
  'コンビニ': { icon: Store, color: '#000000', bg: '#FFFFFF' },
  'その他': { icon: MoreHorizontal, color: '#000000', bg: '#FFFFFF' },
};

const CATEGORY_ICONS_SVG: Record<string, string> = {
  'カフェ・レストラン': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>',
  '観光スポット': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
  '公園・自然': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"></path><path d="M18 12v.2A3 3 0 0 1 16.9 18H13a3 3 0 0 1-1-5.8V12a3 3 0 0 1 6 0Z"></path><path d="M12 22v-3"></path><path d="M8 22v-2"></path><path d="M16 22v-2"></path></svg>',
  'ショッピング': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>',
  '学校': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 8-4 8 4"></path><path d="m18 10 2 1v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l2-1"></path><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"></path></svg>',
  'コンビニ': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path><path d="M2 7h20"></path><path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"></path><path d="M2 7v3a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V7"></path></svg>',
  'その他': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>',
};

// Cache for icons to prevent re-creating them on every render
const iconCache: Record<string, L.DivIcon> = {};

const getCustomIcon = (category: string, mapStyle: string) => {
  const cacheKey = `${category}-${mapStyle}`;
  if (iconCache[cacheKey]) return iconCache[cacheKey];

  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['その他'];
  const iconSvg = CATEGORY_ICONS_SVG[category] || CATEGORY_ICONS_SVG['その他'];
  
  const isIllustrative = isIllustrationTheme(mapStyle as MapThemeKey);
  const bgColor = isIllustrative ? '#000000' : config.bg;
  const iconColor = isIllustrative ? '#FFFFFF' : config.color;
  const borderColor = isIllustrative ? '#000000' : 'white';
  const borderWidth = isIllustrative ? '2px' : '3px';
  const shadow = isIllustrative ? 'none' : '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
  
  const html = `
    <div style="
      background-color: ${bgColor};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: ${borderWidth} solid ${borderColor};
      box-shadow: ${shadow};
      transition: all 0.3s ease;
      color: ${iconColor};
    ">
      ${iconSvg}
    </div>
  `;

  const icon = L.divIcon({
    html,
    className: 'custom-div-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
  
  iconCache[cacheKey] = icon;
  return icon;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<Place[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [isAdding, setIsAdding] = useState(false);
  const [newPlacePos, setNewPlacePos] = useState<{ lat: number; lng: number } | null>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selectedPlaceForDetail, setSelectedPlaceForDetail] = useState<Place | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editDetailForm, setEditDetailForm] = useState<Partial<Place>>({});
  const [isUpdatingDetail, setIsUpdatingDetail] = useState(false);
  const [isMapBoundsFilterEnabled, setIsMapBoundsFilterEnabled] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [listFilter, setListFilter] = useState<'all' | 'favorites'>('all');
  const [isFetching, setIsFetching] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapThemeKey>(() => {
    const saved = localStorage.getItem('milz_map_style');
    if (saved && saved in MAP_THEMES) {
      return saved as MapThemeKey;
    }
    return 'original';
  });

  const newPlacePosition = useMemo(() => newPlacePos ? [newPlacePos.lat, newPlacePos.lng] as L.LatLngExpression : null, [newPlacePos]);
  
  const newPlaceIcon = useMemo(() => {
    if (!newPlacePos) return null;
    return L.divIcon({
      html: `
        <div class="${cn(
          "w-10 h-10 flex items-center justify-center border-4 shadow-xl animate-bounce",
          isIllustrationTheme(mapStyle)
            ? "bg-black border-black"
            : "bg-emerald-500 border-white"
        )}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }, [mapStyle, newPlacePos]);

  useEffect(() => {
    localStorage.setItem('milz_map_style', mapStyle);
  }, [mapStyle]);

  const activeMapTheme = MAP_THEMES[mapStyle];
  const activeIllustrationTheme = mapStyle === 'tokyo' ? TOKYO_ILLUSTRATION_THEME : null;

  useEffect(() => {
    if (!mapRef.current || !activeIllustrationTheme) return;
    mapRef.current.flyTo(activeIllustrationTheme.center, activeIllustrationTheme.zoom, {
      animate: true,
      duration: 1.2,
    });
  }, [activeIllustrationTheme]);
  
  const [locationFilter, setLocationFilter] = useState({
    countryCode: 'JP',
    countryName: 'Japan',
    stateCode: '',
    stateName: '',
    cityCode: '',
    cityName: '',
    address: ''
  });

  // Get lists for dropdowns
  const countries = useMemo(() => 
    Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name)), 
    []
  );
  const states = useMemo(() => 
    locationFilter.countryCode 
      ? State.getStatesOfCountry(locationFilter.countryCode).sort((a, b) => a.name.localeCompare(b.name)) 
      : [], 
    [locationFilter.countryCode]
  );
  const cities = useMemo(() => 
    (locationFilter.countryCode && locationFilter.stateCode) 
      ? City.getCitiesOfState(locationFilter.countryCode, locationFilter.stateCode).sort((a, b) => a.name.localeCompare(b.name)) 
      : [], 
    [locationFilter.countryCode, locationFilter.stateCode]
  );

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<AIResults | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    onCancel?: () => void;
  } | null>(null);

  const showToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Add to debug logs
  const addLog = React.useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  // Listen for Supabase diagnostic logs
  useEffect(() => {
    const handleDiagLog = (e: any) => {
      addLog(`Supabase: ${e.detail}`);
    };
    window.addEventListener('supabase-debug-log', handleDiagLog);
    return () => window.removeEventListener('supabase-debug-log', handleDiagLog);
  }, [addLog]);
  const [tempAiPin, setTempAiPin] = useState<TempAiPin | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'signin'>('signin');
  const [selectedAuthRole, setSelectedAuthRole] = useState<UserRole>('admin');
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('masashi@milz.tech');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isFetchingProfileRef = useRef(false);

  const mapRef = useRef<L.Map | null>(null);

  const isPlaceholder = (val: string) => {
    if (!val) return false;
    const placeholders = ['YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY', 'TODO_KEYHERE', 'ENTER_YOUR_'];
    return placeholders.some(p => val.toUpperCase().includes(p));
  };

  const [isConfigMissing, setIsConfigMissing] = useState(
    !import.meta.env.VITE_SUPABASE_URL || 
    !import.meta.env.VITE_SUPABASE_ANON_KEY ||
    isPlaceholder(import.meta.env.VITE_SUPABASE_URL) ||
    isPlaceholder(import.meta.env.VITE_SUPABASE_ANON_KEY)
  );

  // Auth and Role listener
  useEffect(() => {
    console.log('App: Initializing auth...', { isConfigMissing });
    
    if (isConfigMissing) {
      console.log('App: Config missing, stopping loading');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log('App: initAuth starting');
        const client = getSupabase();
        if (!client) {
          console.log('App: Supabase client not available');
          if (isMounted) setLoading(false);
          return;
        }
        
        const sessionPromise = client.auth.getSession();
        const sessionTimeout = new Promise((resolve) => 
          setTimeout(() => {
            console.warn('App: getSession timed out, proceeding with null session');
            resolve({ data: { session: null }, error: null });
          }, 10000)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, sessionTimeout]) as any;
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          console.log('App: Session found', session.user.email);
          setUser(session.user);
          // Immediate role override for admin
          if (session.user.email === 'masashi@milz.tech') {
            setRole('admin');
          }
          await fetchProfile(session.user.id, session.user.email);
        } else {
          console.log('App: No session found');
        }
      } catch (error) {
        console.error('App: Auth init error:', error);
      } finally {
        console.log('App: initAuth finished');
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const client = getSupabase();
    let subscription: any = null;
    
    if (client) {
      const { data } = client.auth.onAuthStateChange(async (event, session) => {
        console.log('App: Auth state change', event, session?.user?.email);
        if (isMounted) {
          if (session?.user) {
            setUser(session.user);
            // Immediate role override for admin
            if (session.user.email === 'masashi@milz.tech') {
              setRole('admin');
            }
            await fetchProfile(session.user.id, session.user.email);
          } else {
            setUser(null);
            setRole(null);
          }
          setLoading(false);
        }
      });
      subscription = data.subscription;
    }

    // Fallback: Ensure loading is disabled after a timeout
    const timer = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('App: Initialization timeout, forcing loading off');
        setLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [isConfigMissing]);

  const fetchProfile = async (userId: string, userEmail?: string) => {
    if (isFetchingProfileRef.current) return;
    isFetchingProfileRef.current = true;

    const tryRawProfileFetch = async () => {
      addLog('fetchProfile: Attempting Raw API fallback...');
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!url || !key) {
          addLog('fetchProfile: Raw API skipped (Config missing)');
          return;
        }

        const res = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}&select=role`, {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          const profile = data[0];
          if (profile) {
            addLog('fetchProfile: Raw API Success (Profile found)');
            let currentRole = profile.role as UserRole;
            const adminEmail = 'masashi@milz.tech';
            if (userEmail?.toLowerCase().trim() === adminEmail) {
              currentRole = 'admin';
            }
            setRole(currentRole);
            return true;
          }
          addLog('fetchProfile: Raw API Success (No profile found)');
          return false;
        }
        addLog(`fetchProfile: Raw API Failed (${res.status})`);
        return false;
      } catch (e: any) {
        let msg = e.message;
        if (msg === 'Failed to fetch') {
          msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
        }
        addLog(`fetchProfile: Raw API Exception: ${msg}`);
        return false;
      }
    };

    try {
      const email = userEmail?.toLowerCase().trim();
      console.log('App: fetchProfile', { userId, email });
      const client = getSupabase();
      if (!client) {
        addLog('fetchProfile: Client missing, trying raw fetch');
        await tryRawProfileFetch();
        isFetchingProfileRef.current = false;
        return;
      }
      
      const adminEmail = 'masashi@milz.tech';
      
      // Force state if email matches
      if (email === adminEmail) {
        console.log('App: Email matches admin, forcing state');
        setRole('admin');
      }

      const fetchPromise = client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timed out (10s)')), 10000)
      );

      addLog('fetchProfile: Awaiting response from Supabase library...');
      try {
        const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
        const { data: profile, error } = result;

        if (error) {
          addLog(`fetchProfile: Library Error: ${error.message}`);
          await tryRawProfileFetch();
        } else if (profile) {
          let currentRole = profile.role as UserRole;
          console.log('App: Profile found in DB', { currentRole });
          
          // Force admin role if email matches adminEmail
          if (email === adminEmail && currentRole !== 'admin') {
            console.log('App: Forcing admin role update in DB for', email);
            currentRole = 'admin';
            await client.from('profiles').update({ role: 'admin' }).eq('id', userId);
          }
          setRole(currentRole);
        } else {
          // Create or update profile using upsert to avoid race conditions
          const roleToSet = (email === adminEmail) ? 'admin' : (pendingRole || 'user');
          console.log('App: Upserting profile with role', roleToSet);
          
          const { error: upsertError } = await client
            .from('profiles')
            .upsert({
              id: userId,
              email: email,
              display_name: email?.split('@')[0] || 'User',
              role: roleToSet,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          
          if (!upsertError) {
            setRole(roleToSet);
          } else {
            console.error('App: Profile upsert error:', upsertError);
            addLog(`fetchProfile: Error upserting profile: ${upsertError.message}`);
            await tryRawProfileFetch();
          }
          setPendingRole(null);
        }
      } catch (err: any) {
        let msg = err.message;
        if (msg === 'Failed to fetch') {
          msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
        }
        addLog(`fetchProfile: Library Exception/Timeout: ${msg}`);
        await tryRawProfileFetch();
      }
    } catch (error: any) {
      console.error('App: Profile fetch error:', error);
      let msg = error.message;
      if (msg === 'Failed to fetch') {
        msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
      }
      addLog(`fetchProfile: Exception: ${msg}`);
    } finally {
      isFetchingProfileRef.current = false;
    }
  };

  const isFetchingRef = useRef(false);

  // Fetch places
  const fetchPlaces = React.useCallback(async () => {
    if (isFetchingRef.current) {
      addLog('fetchPlaces: Already in progress, skipping');
      return;
    }
    
    isFetchingRef.current = true;
    setIsFetching(true);
    addLog('fetchPlaces: Starting...');
    
    const tryRawFetch = async () => {
      addLog('fetchPlaces: Attempting Raw API fallback...');
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!url || !key) {
          addLog('fetchPlaces: Raw API skipped (Config missing)');
          return false;
        }

        const res = await fetch(`${url}/rest/v1/admin_places?select=*&order=created_at.desc`, {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          addLog(`fetchPlaces: Raw API Success (${data.length} items)`);
          setPlaces(data as Place[]);
          return true;
        }
        addLog(`fetchPlaces: Raw API Failed (${res.status})`);
        return false;
      } catch (e: any) {
        let msg = e.message;
        if (msg === 'Failed to fetch') {
          msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
        }
        addLog(`fetchPlaces: Raw API Exception: ${msg}`);
        return false;
      }
    };

    try {
      const client = getSupabase();
      if (!client) {
        addLog('fetchPlaces: Client missing, trying raw fetch');
        await tryRawFetch();
        isFetchingRef.current = false;
        setIsFetching(false);
        return;
      }

      // 5s timeout for the library call, then fallback to raw fetch
      const fetchPromise = client
        .from('admin_places')
        .select('*')
        .order('created_at', { ascending: false });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Library call timed out (5s)')), 5000)
      );

      addLog('fetchPlaces: Awaiting response from Supabase library...');
      try {
        const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
        const { data, error } = result;
        
        if (error) {
          addLog(`fetchPlaces: Library Error ${error.code}: ${error.message}`);
          await tryRawFetch();
        } else if (data) {
          const processedData = (data as Place[]).map(p => ({
            ...p,
            detailed_description: p.detailed_description || '',
            milz_experience: p.milz_experience || '',
            images: p.images || [],
            videos: p.videos || [],
            pdfs: p.pdfs || [],
            rating: p.rating || 4.5,
            review_count: p.review_count || 0,
            hours: p.hours || "",
            reviews: p.reviews || []
          }));
          addLog(`fetchPlaces: Library Success (${data.length} items)`);
          setPlaces(processedData);
        }
      } catch (err: any) {
        let msg = err.message;
        if (msg === 'Failed to fetch') {
          msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
        }
        addLog(`fetchPlaces: Library Exception/Timeout: ${msg}`);
        await tryRawFetch();
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg === 'Failed to fetch') {
        msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
      }
      addLog(`fetchPlaces: Global Exception: ${msg}`);
      await tryRawFetch();
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
    }
  }, [addLog]);

  useEffect(() => {
    if (isConfigMissing) return;

    if (!isFetchingRef.current) {
      fetchPlaces();
    }

    const client = getSupabase();
    if (!client) return;
    // Realtime subscription
    const channel = client
      .channel('admin_places_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_places' }, fetchPlaces)
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isConfigMissing, fetchPlaces]);

  const fetchFavorites = React.useCallback(async () => {
    if (!user || isConfigMissing) {
      setFavorites([]);
      return;
    }
    try {
      const client = getSupabase();
      if (!client) return;
      const { data, error } = await client
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setFavorites(data as Favorite[]);
    } catch (error) {
      console.error('Fetch favorites error:', error);
    }
  }, [user, isConfigMissing]);

  // Fetch favorites
  useEffect(() => {
    fetchFavorites();

    const client = getSupabase();
    if (!client || !user) return;
    const channel = client
      .channel('favorites_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites', filter: `user_id=eq.${user.id}` }, fetchFavorites)
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, isConfigMissing, fetchFavorites]);

  const handleLogin = async () => {
    setAuthError('');
    setPendingRole(selectedAuthRole);
    try {
      const client = getSupabase();
      if (!client) return;
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        setAuthError(error.message);
        setPendingRole(null);
      }
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const client = getSupabase();
      if (!client) return;
      if (authMode === 'signup') {
        setPendingRole(selectedAuthRole);
        const { error } = await client.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      showToast("Check your email for confirmation!", "info");
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg === 'Failed to fetch') {
        msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
      }
      setAuthError(msg);
      setPendingRole(null);
    }
  };

  const [modalAddress, setModalAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleModalAddressSearch = async () => {
    if (!modalAddress.trim()) return;
    setIsGeocoding(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        showToast("Gemini APIキーが設定されていません。", "error");
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find the latitude and longitude for: "${modalAddress}". Return ONLY a JSON object with "lat" and "lng" keys.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["lat", "lng"]
          }
        }
      });

      const coords = JSON.parse(response.text);
      if (coords.lat && coords.lng) {
        setNewPlacePos({ lat: coords.lat, lng: coords.lng });
        mapRef.current?.flyTo([coords.lat, coords.lng], 16);
      }
    } catch (error) {
      console.error('Modal geocoding error:', error);
      showToast("Could not find location for this address.", "error");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleLogout = async () => {
    console.log('App: handleLogout starting');
    // Force local state clear immediately to ensure UI responsiveness
    const clearLocalState = () => {
      setUser(null);
      setRole(null);
      setActiveTab('map');
      console.log('App: Local state cleared');
    };

    try {
      const client = getSupabase();
      if (client) {
        console.log('App: Calling Supabase signOut');
        // Use a timeout for signOut to prevent hanging
        const signOutPromise = client.auth.signOut();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timed out')), 10000)
        );
        
        await Promise.race([signOutPromise, timeoutPromise]);
      }
    } catch (error: any) {
      console.error('App: Logout error (ignoring for local state):', error);
      // We don't alert here to avoid blocking the user if the network is flaky
    } finally {
      clearLocalState();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToR2 = async (file: File): Promise<string | null> => {
    try {
      addLog(`uploadToR2: Uploading ${file.name} (${file.size} bytes)...`);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const text = await response.text();

      if (!response.ok) {
        console.error("Upload failed with response:", text);
        let errorMsg = 'Unknown server error';
        try {
          const errData = JSON.parse(text);
          errorMsg = errData.error || response.statusText;
        } catch (e) {
          if (text.includes('<title>Cookie check</title>')) {
            errorMsg = 'AI Studio authentication required. Please click "Authenticate in new window" in the preview or refresh the page.';
          } else {
            errorMsg = `Server returned non-JSON response: ${text.substring(0, 100)}...`;
          }
        }
        throw new Error(errorMsg);
      }

      try {
        const { publicUrl } = JSON.parse(text);
        if (!publicUrl) throw new Error("Server response missing publicUrl");
        return publicUrl;
      } catch (e: any) {
        console.error("Failed to parse success response:", text);
        throw new Error(`Server returned invalid JSON: ${e.message}`);
      }
    } catch (error: any) {
      console.error("R2 Upload Error:", error);
      addLog(`R2 Upload Error: ${error.message}`);
      throw error;
    }
  };

  const closeAddModal = () => {
    setIsAdding(false);
    setNewPlacePos(null);
    setSelectedFile(null);
    setPreviewImage(null);
    setModalAddress('');
    setEditingPlace(null);
  };

  const handleEditPlace = (place: Place) => {
    setEditingPlace(place);
    setNewPlacePos({ lat: place.lat, lng: place.lng });
    setPreviewImage(place.image_url || null);
    setIsAdding(true);
  };

  const handleDeletePlace = async (placeId: string) => {
    setConfirmModal({
      title: "スポットの削除",
      message: "このスポットを削除しますか？この操作は取り消せません。",
      onConfirm: async () => {
        setConfirmModal(null);
        const client = getSupabase();
        if (!client) return;

        try {
          const { error } = await client
            .from('admin_places')
            .delete()
            .eq('id', placeId);

          if (error) throw error;
          showToast("スポットを削除しました。", "success");
          fetchPlaces();
        } catch (error: any) {
          showToast("削除に失敗しました: " + error.message, "error");
        }
      }
    });
  };

  const handleUpdatePlaceInline = async () => {
    if (!selectedPlaceForDetail || isUpdatingDetail) return;
    setIsUpdatingDetail(true);
    
    const client = getSupabase();
    if (!client) {
      showToast("データベースに接続できません。", "error");
      setIsUpdatingDetail(false);
      return;
    }

    try {
      const { error } = await client
        .from('admin_places')
        .update(editDetailForm)
        .eq('id', selectedPlaceForDetail.id);

      if (error) throw error;

      showToast("スポットを更新しました！", "success");
      setIsEditingDetail(false);
      fetchPlaces();
      // Update local state for the detail view
      setSelectedPlaceForDetail({ ...selectedPlaceForDetail, ...editDetailForm } as Place);
    } catch (err: any) {
      showToast("更新に失敗しました: " + err.message, "error");
    } finally {
      setIsUpdatingDetail(false);
    }
  };

  const handleFilesDrop = async (files: File[], field: 'image_url' | 'images' | 'videos' | 'pdfs') => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      addLog(`handleFilesDrop: Starting upload for ${files.length} files to ${field}`);
      
      const results = await Promise.allSettled(files.map(file => uploadToR2(file)));
      
      const validUrls: string[] = [];
      const errors: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validUrls.push(result.value);
        } else {
          const errorMsg = result.status === 'rejected' ? result.reason.message : 'Unknown error';
          errors.push(`${files[index].name}: ${errorMsg}`);
        }
      });

      if (validUrls.length === 0) {
        showToast(`アップロードに失敗しました。\n${errors.join('\n')}`, "error");
        return;
      }

      if (errors.length > 0) {
        showToast(`${validUrls.length}個成功、${errors.length}個失敗しました。`, "info");
      } else {
        showToast(`${validUrls.length}個のファイルをアップロードしました。`, "success");
      }

      if (field === 'image_url') {
        setEditDetailForm(prev => ({ ...prev, image_url: validUrls[0] }));
      } else if (field === 'pdfs') {
        const newPdfs = results
          .map((result, i) => {
            if (result.status === 'fulfilled' && result.value) {
              return { name: files[i].name, url: result.value };
            }
            return null;
          })
          .filter((p): p is { name: string; url: string } => !!p);

        setEditDetailForm(prev => ({
          ...prev,
          pdfs: [...(prev.pdfs || []), ...newPdfs] as any
        }));
      } else {
        setEditDetailForm(prev => ({
          ...prev,
          [field]: [...(prev[field] as string[] || []), ...validUrls]
        }));
      }
    } catch (err: any) {
      console.error("handleFilesDrop Error:", err);
      showToast(`アップロード中にエラーが発生しました: ${err.message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleAddPlace = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || uploading) {
      addLog('handleAddPlace: Already submitting/uploading, ignoring');
      return;
    }

    addLog('handleAddPlace: Triggered');
    
    if (!user) {
      showToast("ログインが必要です。", "error");
      return;
    }
    if (!newPlacePos) {
      showToast("地図上で場所を選択してください。", "error");
      return;
    }
    if (role !== 'admin') {
      showToast(`権限がありません。現在のロール: ${role}。管理者のみスポットを追加できます。`, "error");
      return;
    }

    setIsSubmitting(true);
    addLog('handleAddPlace: Starting process...');

    const formData = e ? new FormData(e.currentTarget as HTMLFormElement) : new FormData();
    const name = formData.get('name') as string || (document.querySelector('input[name="name"]') as HTMLInputElement)?.value;
    const description = formData.get('description') as string || (document.querySelector('textarea[name="description"]') as HTMLTextAreaElement)?.value;
    const category = (formData.get('category') as any) || (document.querySelector('select[name="category"]') as HTMLSelectElement)?.value || 'その他';
    const website_url = formData.get('website_url') as string || (document.querySelector('input[name="website_url"]') as HTMLInputElement)?.value;

    if (!name) {
      showToast("スポット名を入力してください。", "error");
      setIsSubmitting(false);
      return;
    }

    let image_url = editingPlace?.image_url || '';
    try {
      if (selectedFile) {
        addLog('handleAddPlace: Uploading image...');
        const uploadedUrl = await uploadToR2(selectedFile);
        if (uploadedUrl) {
          image_url = uploadedUrl;
          addLog('handleAddPlace: Image uploaded');
        }
      }
    } catch (err: any) {
      console.error('App: Upload process error', err);
      addLog(`handleAddPlace: Upload failed: ${err.message}`);
      showToast(`画像のアップロードに失敗しました: ${err.message}。画像なしで保存を試みます。`, "info");
    }

    const client = getSupabase();
    if (!client) {
      addLog('handleAddPlace: Client missing');
      showToast("データベースに接続できません。設定を確認してください。", "error");
      setIsSubmitting(false);
      return;
    }

    addLog('handleAddPlace: Processing spot...');
    
    const tryRawUpsert = async (data: any) => {
      addLog('handleAddPlace: Attempting Raw API fallback...');
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const method = editingPlace ? 'PATCH' : 'POST';
        const endpoint = editingPlace ? `${url}/rest/v1/admin_places?id=eq.${editingPlace.id}` : `${url}/rest/v1/admin_places`;
        
        const res = await fetch(endpoint, {
          method,
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          addLog('handleAddPlace: Raw API Success');
          return true;
        }
        addLog(`handleAddPlace: Raw API Failed (${res.status})`);
        return false;
      } catch (e: any) {
        addLog(`handleAddPlace: Raw API Exception: ${e.message}`);
        return false;
      }
    };

    try {
      const detailed_description = formData.get('detailed_description') as string || (document.querySelector('textarea[name="detailed_description"]') as HTMLTextAreaElement)?.value;
      const milz_experience = formData.get('milz_experience') as string || (document.querySelector('textarea[name="milz_experience"]') as HTMLTextAreaElement)?.value;
      const images_raw = formData.get('images') as string || (document.querySelector('textarea[name="images"]') as HTMLTextAreaElement)?.value;
      const videos_raw = formData.get('videos') as string || (document.querySelector('textarea[name="videos"]') as HTMLTextAreaElement)?.value;
      const pdfs_raw = formData.get('pdfs') as string || (document.querySelector('textarea[name="pdfs"]') as HTMLTextAreaElement)?.value;

      const images = images_raw ? images_raw.split(',').map(s => s.trim()).filter(Boolean) : [];
      const videos = videos_raw ? videos_raw.split(',').map(s => s.trim()).filter(Boolean) : [];
      
      let pdfs = [];
      try {
        if (pdfs_raw) {
          // Try to parse as JSON if it looks like JSON
          if (pdfs_raw.trim().startsWith('[')) {
            pdfs = JSON.parse(pdfs_raw);
          } else {
            // Otherwise assume comma separated name|url pairs
            pdfs = pdfs_raw.split(',').map(s => {
              const [name, url] = s.split('|').map(p => p.trim());
              return name && url ? { name, url } : null;
            }).filter(Boolean);
          }
        }
      } catch (e) {
        console.error('PDF parse error', e);
      }

      const upsertData: any = {
        name,
        description,
        detailed_description,
        milz_experience,
        category,
        lat: newPlacePos.lat,
        lng: newPlacePos.lng,
        website_url: website_url || null,
        image_url: image_url || null,
        images,
        videos,
        pdfs,
      };

      if (!editingPlace) {
        upsertData.created_by = user.id;
      }

      addLog(`handleAddPlace: Data: ${name}`);
      
      const clientToUse = getSupabase();
      if (!clientToUse) {
        addLog('handleAddPlace: Client missing, trying raw upsert');
        const success = await tryRawUpsert(upsertData);
        if (success) {
          showToast("スポットを保存しました！(Raw API)", "success");
          closeAddModal();
          fetchPlaces();
        } else {
          showToast("保存に失敗しました。", "error");
        }
        setIsSubmitting(false);
        return;
      }

      const query = editingPlace 
        ? clientToUse.from('admin_places').update(upsertData).eq('id', editingPlace.id)
        : clientToUse.from('admin_places').insert([upsertData]);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Library upsert timed out (5s)')), 5000)
      );

      addLog('handleAddPlace: Awaiting response from Supabase library...');
      try {
        const result = await Promise.race([query, timeoutPromise]) as any;
        const { error } = result;
        
        if (!error) {
          addLog('handleAddPlace: Library Success');
          showToast("スポットを保存しました！", "success");
          closeAddModal();
          fetchPlaces();
        } else {
          addLog(`handleAddPlace: Library Error ${error.code}: ${error.message}`);
          const success = await tryRawUpsert(upsertData);
          if (success) {
            showToast("スポットを保存しました！(Raw API Fallback)", "success");
            closeAddModal();
            fetchPlaces();
          } else {
            showToast(`保存エラー: ${error.message}`, "error");
          }
        }
      } catch (err: any) {
        addLog(`handleAddPlace: Library Exception/Timeout: ${err.message}`);
        const success = await tryRawUpsert(upsertData);
        if (success) {
          showToast("スポットを保存しました！(Raw API Fallback)", "success");
          closeAddModal();
          fetchPlaces();
        } else {
          showToast(`保存エラー: ${err.message}`, "error");
        }
      }
    } catch (err: any) {
      addLog(`handleAddPlace: Global Exception: ${err.message}`);
      console.error('handleAddPlace exception:', err);
      showToast("予期せぬエラーが発生しました: " + (err.message || JSON.stringify(err)), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFavorite = async (placeId: string) => {
    if (!user) return;

    const client = getSupabase();
    if (!client) return;
    const existing = favorites.find(f => f.place_id === placeId);
    if (existing) {
      await client
        .from('favorites')
        .delete()
        .eq('id', existing.id);
    } else {
      await client
        .from('favorites')
        .insert({
          user_id: user.id,
          place_id: placeId
        });
    }
  };

  const handleSaveAiRecommendation = async (rec: { name: string; reason: string; category: string; lat: number; lng: number }) => {
    if (!user) {
      showToast("ログインが必要です。", "error");
      return;
    }

    const client = getSupabase();
    if (!client) return;

    try {
      // 1. Check if already exists
      const { data: existingPlaces } = await client
        .from('admin_places')
        .select('id')
        .eq('name', rec.name)
        .eq('lat', rec.lat)
        .eq('lng', rec.lng)
        .maybeSingle();

      let placeId = existingPlaces?.id;

      if (!placeId) {
        // 2. Create in admin_places
        const { data: newPlace, error: createError } = await client
          .from('admin_places')
          .insert({
            name: rec.name,
            description: rec.reason,
            category: rec.category,
            lat: rec.lat,
            lng: rec.lng,
            created_by: user.id
          })
          .select()
          .single();

        if (createError) throw createError;
        placeId = newPlace.id;
        fetchPlaces(); // Refresh places to show on map
      }

      // 3. Add to favorites
      const { error: favError } = await client
        .from('favorites')
        .upsert({
          user_id: user.id,
          place_id: placeId
        }, { onConflict: 'user_id,place_id' });

      if (favError) throw favError;
      showToast("お気に入りに保存しました！", "success");
      fetchFavorites();
    } catch (err: any) {
      showToast("保存に失敗しました: " + err.message, "error");
    }
  };

  const handleViewOnMap = (rec: { name: string; lat: number; lng: number }) => {
    setTempAiPin({ lat: rec.lat, lng: rec.lng, name: rec.name });
    setActiveTab('map');
    setTimeout(() => {
      mapRef.current?.flyTo([rec.lat, rec.lng], 16);
    }, 100);
  };
  const handleSearchLocation = async () => {
    // If we have a specific city selected, we can use its lat/lng directly from the library!
    const selectedCity = cities.find(c => c.name === locationFilter.cityName);
    
    if (selectedCity && !locationFilter.address) {
      const lat = parseFloat(selectedCity.latitude || '');
      const lng = parseFloat(selectedCity.longitude || '');
      if (!isNaN(lat) && !isNaN(lng)) {
        mapRef.current?.flyTo([lat, lng], 14);
        setIsFiltering(false);
        return;
      }
    }

    const { countryName, stateName, cityName, address } = locationFilter;
    const fullAddress = `${countryName} ${stateName} ${cityName} ${address}`.trim();
    if (!fullAddress) return;

    setAiLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        showToast("Gemini APIキーが設定されていません。", "error");
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find the latitude and longitude for: "${fullAddress}". Return ONLY a JSON object with "lat" and "lng" keys.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["lat", "lng"]
          }
        }
      });

      const coords = JSON.parse(response.text);
      if (coords.lat && coords.lng) {
        mapRef.current?.flyTo([coords.lat, coords.lng], 14);
        setIsFiltering(false);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiRecommend = async () => {
    setAiLoading(true);
    
    try {
      const client = getSupabase();
      const { countryName, stateName, cityName } = locationFilter;
      const locationStr = `${countryName} ${stateName} ${cityName}`.trim() || "Worldwide";
      const type = 'recommend';
      const category = 'all';

      // 1. キャッシュの確認
      if (client) {
        const { data: cacheData, error: cacheError } = await client
          .from('ai_cache')
          .select('*')
          .eq('type', type)
          .eq('location_key', locationStr)
          .eq('category', category)
          .maybeSingle();

        if (!cacheError && cacheData) {
          const updatedAt = new Date(cacheData.updated_at).getTime();
          const now = new Date().getTime();
          const diffHours = (now - updatedAt) / (1000 * 60 * 60);
          
          // Recommendは14日間(336時間)のキャッシュ
          const cacheLimit = 336;

          if (diffHours < cacheLimit) {
            console.log(`Using cached ${type} for ${locationStr}`);
            setAiResults(cacheData.data);
            setAiLoading(false);
            return;
          }
        }
      }

      // 2. キャッシュがない、または期限切れの場合はAIを呼び出す
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        showToast("Gemini APIキーが設定されていません。", "error");
        return;
      }
      const ai = new GoogleGenAI({ apiKey });

      let prompt = `Based on the location "${locationStr}", 
      recommend 10 interesting spots (restaurants, shops, landmarks) in this area. 
      Return in JSON format.`;

      let responseSchema = {
        type: Type.OBJECT,
        properties: {
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
                category: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER }
              },
              required: ["name", "reason", "category", "lat", "lng"]
            }
          }
        },
        required: ["recommendations"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          tools: [{ googleSearch: {} }]
        }
      });

      const results = JSON.parse(response.text);
      setAiResults(results);

      // 3. 結果をキャッシュに保存（upsert）
      if (client) {
        await client
          .from('ai_cache')
          .upsert({
            type,
            location_key: locationStr,
            category,
            data: results,
            updated_at: new Date().toISOString()
          }, { onConflict: 'type,location_key,category' });
      }

    } catch (error) {
      console.error('AI error:', error);
      showToast("AI生成中にエラーが発生しました。", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredPlaces = useMemo(() => {
    return places.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      
      const isInBounds = (activeTab === 'list' && listFilter === 'all' && isMapBoundsFilterEnabled && mapBounds) 
        ? mapBounds.contains([p.lat, p.lng]) 
        : true;
      
      return matchesSearch && matchesCategory && isInBounds;
    });
  }, [places, searchQuery, selectedCategory, activeTab, listFilter, isMapBoundsFilterEnabled, mapBounds]);

  const favoritePlaces = useMemo(() => {
    return places.filter(p => favorites.some(f => f.place_id === p.id));
  }, [places, favorites]);

  if (isConfigMissing) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-12 shadow-2xl space-y-10 text-center border border-stone-200">
          <div className="w-24 h-24 bg-stone-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-12 h-12 text-black" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-black tracking-tighter uppercase">Configuration Required</h1>
            <p className="text-stone-500 font-medium leading-relaxed">
              Supabaseの接続設定が見つからないか、プレースホルダー（YOUR_SUPABASE_URLなど）のままになっています。AI Studioの左側にある「Settings」メニューから、正しい環境変数を設定してください。
            </p>
          </div>
          <div className="p-8 bg-stone-50 text-left space-y-4 border border-stone-200">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">必要な環境変数:</p>
            <div className="space-y-3">
              <code className="block text-xs font-mono text-stone-600 bg-white p-4 border border-stone-100">VITE_SUPABASE_URL</code>
              <code className="block text-xs font-mono text-stone-600 bg-white p-4 border border-stone-100">VITE_SUPABASE_ANON_KEY</code>
            </div>
          </div>
          <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">
            設定後、アプリが自動的に再読み込みされます。
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-emerald-600" />
        </motion.div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-stone-50 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-12 text-center space-y-10 border border-stone-200 shadow-2xl"
        >
          <div className="flex flex-col items-center gap-8">
            <div className={cn(
              "w-24 h-24 flex items-center justify-center shadow-2xl transition-all duration-500",
              selectedAuthRole === 'admin' ? "bg-black" : "bg-stone-400"
            )}>
              {selectedAuthRole === 'admin' ? <ShieldCheck className="w-12 h-12 text-white" /> : <MapPin className="w-12 h-12 text-white" />}
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-black uppercase">milz</h1>
              <p className="text-stone-400 mt-4 font-black uppercase tracking-[0.3em] text-[10px]">
                {selectedAuthRole === 'admin' ? 'Admin Portal' : 'Personal Map Bookmark'}
              </p>
            </div>
          </div>

          {/* Role Selector */}
          <div className="flex p-0 bg-stone-100 border border-stone-200">
            <button 
              onClick={() => setSelectedAuthRole('user')}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-4 font-black uppercase tracking-widest text-[10px] transition-all",
                selectedAuthRole === 'user' ? "bg-black text-white" : "text-stone-400 hover:text-black"
              )}
            >
              <UserIcon className="w-4 h-4" />
              User
            </button>
            <button 
              onClick={() => setSelectedAuthRole('admin')}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-4 font-black uppercase tracking-widest text-[10px] transition-all",
                selectedAuthRole === 'admin' ? "bg-black text-white" : "text-stone-400 hover:text-black"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 text-left"
            >
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 focus:border-black focus:bg-white outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-4 bg-stone-50 border border-stone-200 focus:border-black focus:bg-white outline-none transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <p className="text-xs text-red-500 font-bold px-1">{authError}</p>
                )}

                <button 
                  type="submit"
                  className={cn(
                    "w-full py-6 text-white font-black uppercase tracking-[0.4em] text-xs active:scale-95 transition-all shadow-2xl",
                    selectedAuthRole === 'admin' ? "bg-black hover:bg-stone-800" : "bg-stone-900 hover:bg-black"
                  )}
                >
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="p-6 bg-stone-50 border border-stone-200 space-y-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Test Credentials:</p>
                <div className="space-y-2">
                  <p className="text-[11px] text-stone-600 font-medium">
                    <span className="font-black uppercase mr-2">Admin:</span> masashi@milz.tech / password123
                  </p>
                  <p className="text-[11px] text-stone-600 font-medium">
                    <span className="font-black uppercase mr-2">User:</span> user@example.com / password123
                  </p>
                </div>
                <p className="text-[9px] text-stone-400 leading-tight">
                  ※SupabaseのAuthenticationでユーザーを作成する際、上記のパスワードを設定してください。
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
                >
                  {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="pt-4">
            <p className="text-[10px] text-stone-300 font-bold">
              Powered by milztech
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-stone-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl z-[1001] border-b border-stone-100 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase">milz</h1>
              {role === 'admin' && (
                <div className="px-2 py-0.5 bg-stone-100 text-[7px] font-bold text-stone-500 flex items-center gap-1 uppercase tracking-[0.2em] rounded-full border border-stone-200">
                  <ShieldCheck className="w-2 h-2" />
                  Admin
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => fetchPlaces()}
                className="p-2.5 hover:bg-stone-50 rounded-full transition-all active:scale-95"
                title="Refresh Map"
                disabled={isFetching}
              >
                <Loader2 className={cn("w-4 h-4 text-stone-400", isFetching && "animate-spin text-black")} />
              </button>
              <div className="h-4 w-px bg-stone-100" />
              <div className="relative">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="w-9 h-9 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center hover:bg-stone-100 transition-all active:scale-95 overflow-hidden"
                >
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-stone-400" />
                  )}
                </button>
                {role === 'admin' && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-black rounded-full border border-white flex items-center justify-center">
                    <ShieldCheck className="w-1.5 h-1.5 text-white" />
                  </div>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className="p-2.5 hover:bg-stone-50 rounded-full transition-all"
              >
                <LogOut className="w-4 h-4 text-stone-300 hover:text-stone-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full relative"
            >
              {/* Map Controls */}
              <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col gap-4 max-w-2xl mx-auto">
                <div className="flex gap-2">
                  <div className="flex-1 glass rounded-2xl shadow-xl flex items-center px-6 py-4">
                    <Search className="w-4 h-4 text-stone-400 mr-4" />
                    <input
                      type="text"
                      placeholder="Search spots..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-stone-300"
                    />
                  </div>
                  <button
                    onClick={() => setIsFiltering(!isFiltering)}
                    title="Filter & Settings"
                    className={cn(
                      "p-4 shadow-xl rounded-2xl glass transition-all active:scale-95",
                      isFiltering 
                        ? "bg-black text-white border-black" 
                        : "text-stone-400 hover:text-black"
                    )}
                  >
                    {isFiltering 
                      ? <X className="w-5 h-5" /> 
                      : (
                        <div className="relative">
                          <SlidersHorizontal className="w-5 h-5" />
                          {(locationFilter.countryCode !== 'JP' || locationFilter.stateCode !== '' || locationFilter.cityName !== '' || locationFilter.address !== '' || selectedCategory !== 'all') && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black rounded-full border-2 border-white" />
                          )}
                        </div>
                      )
                    }
                  </button>
                </div>

                <AnimatePresence>
                  {isFiltering && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white/90 backdrop-blur-md shadow-2xl border border-stone-200 p-8 space-y-8 rounded-[2.5rem]"
                    >
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                          <SlidersHorizontal className="w-4 h-4 text-black" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Filter & Settings</span>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Categories</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setSelectedCategory('all')}
                              className={cn(
                                "px-6 py-3 text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-all rounded-full border",
                                selectedCategory === 'all' 
                                  ? "bg-black text-white border-black" 
                                  : "text-stone-400 border-stone-100 hover:border-stone-200"
                              )}
                            >
                              All
                            </button>
                            {Object.keys(CATEGORY_CONFIG).map(cat => (
                              <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                  "px-6 py-3 text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-all rounded-full border",
                                  selectedCategory === cat 
                                    ? "bg-black text-white border-black" 
                                    : "text-stone-400 border-stone-100 hover:border-stone-200"
                                )}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Location</p>
                          <div className="grid grid-cols-1 gap-4">
                        {/* Country Select */}
                        <select
                          value={locationFilter.countryCode}
                          onChange={(e) => {
                            const country = countries.find(c => c.isoCode === e.target.value);
                            setLocationFilter(prev => ({ 
                              ...prev, 
                              countryCode: e.target.value, 
                              countryName: country?.name || '',
                              stateCode: '',
                              stateName: '',
                              cityCode: '',
                              cityName: ''
                            }));
                          }}
                          className="w-full px-4 py-4 bg-stone-50 border border-stone-200 text-sm focus:outline-none appearance-none font-medium"
                        >
                          <option value="">Select Country</option>
                          {countries.map(c => (
                            <option key={c.isoCode} value={c.isoCode}>{c.name} {c.flag}</option>
                          ))}
                        </select>

                        <div className="grid grid-cols-2 gap-4">
                          {/* State Select */}
                          <select
                            value={locationFilter.stateCode}
                            disabled={!locationFilter.countryCode}
                            onChange={(e) => {
                              const state = states.find(s => s.isoCode === e.target.value);
                              setLocationFilter(prev => ({ 
                                ...prev, 
                                stateCode: e.target.value, 
                                stateName: state?.name || '',
                                cityCode: '',
                                cityName: ''
                              }));
                            }}
                            className="w-full px-4 py-4 bg-stone-50 border border-stone-200 text-sm focus:outline-none appearance-none disabled:opacity-50 font-medium"
                          >
                            <option value="">Select State/Prefecture</option>
                            {states.map(s => (
                              <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                            ))}
                          </select>

                          {/* City Select */}
                          <select
                            value={locationFilter.cityName}
                            disabled={!locationFilter.stateCode}
                            onChange={(e) => {
                              setLocationFilter(prev => ({ 
                                ...prev, 
                                cityCode: e.target.value, 
                                cityName: e.target.value 
                              }));
                            }}
                            className="w-full px-4 py-4 bg-stone-50 border border-stone-200 text-sm focus:outline-none appearance-none disabled:opacity-50 font-medium"
                          >
                            <option value="">Select City</option>
                            {cities.map(c => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <input
                          type="text"
                          placeholder="Detailed Address (Optional)"
                          value={locationFilter.address}
                          onChange={(e) => setLocationFilter(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full px-4 py-4 bg-stone-50 border border-stone-200 text-sm focus:outline-none font-medium"
                        />
                        <button
                          onClick={() => {
                            setLocationFilter({ 
                              countryCode: '', 
                              countryName: '', 
                              stateCode: '', 
                              stateName: '', 
                              cityCode: '', 
                              cityName: '', 
                              address: '' 
                            });
                            setIsFiltering(false);
                          }}
                          className="w-full py-3 text-[10px] font-black text-stone-400 hover:text-stone-900 transition-colors"
                        >
                          CLEAR ALL FILTERS
                        </button>
                        <button
                          onClick={handleSearchLocation}
                          disabled={loading}
                          className="w-full py-5 bg-black text-white font-black text-[10px] uppercase tracking-[0.3em] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          GO TO LOCATION
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

              <MapContainer 
                center={TOKYO_CENTER} 
                zoom={DEFAULT_ZOOM} 
                className={cn("h-full w-full transition-all duration-700", activeIllustrationTheme && "map-mode-tokyo")}
                zoomControl={false}
              >
                <TileLayer
                  attribution={activeMapTheme.attribution}
                  url={activeMapTheme.url}
                  opacity={activeIllustrationTheme ? 0.96 : 1}
                />
                {activeIllustrationTheme && <TokyoIllustrationLayer />}
                <MapEvents 
                  user={user}
                  role={role}
                  activeTab={activeTab}
                  setNewPlacePos={setNewPlacePos}
                  setIsAdding={setIsAdding}
                  setMapBounds={setMapBounds}
                  mapRef={mapRef}
                />
                
                {filteredPlaces.map((place) => (
                  <Marker 
                    key={place.id} 
                    position={[place.lat, place.lng]}
                    icon={getCustomIcon(place.category, mapStyle)}
                  >
                    <Popup className="custom-popup">
                      <div className="p-0 min-w-[260px] overflow-hidden">
                        {place.image_url && (
                          <div className="aspect-[16/10] w-full overflow-hidden relative group">
                            <img src={place.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          </div>
                        )}
                        <div className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5">
                              <h3 className="font-serif italic text-xl text-black leading-tight m-0">{place.name}</h3>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-[0.1em]">
                                  {place.category}
                                </span>
                                {place.rating && (
                                  <div className="flex items-center gap-0.5 text-amber-500">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    <span className="text-[9px] font-bold">{place.rating}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleToggleFavorite(place.id)}
                              className={cn(
                                "p-2.5 rounded-full transition-all active:scale-90 glass",
                                favorites.some(f => f.place_id === place.id) ? "text-rose-500 border-rose-100 bg-rose-50/50" : "text-stone-300 hover:text-stone-600"
                              )}
                            >
                              <Heart className={cn("w-4 h-4", favorites.some(f => f.place_id === place.id) && "fill-current")} />
                            </button>
                          </div>
                          
                          <p className="text-[11px] text-stone-500 leading-relaxed font-normal line-clamp-2 m-0">{place.description}</p>
                          
                          <div className="pt-1">
                            <button 
                              onClick={() => setSelectedPlaceForDetail(place)}
                              className="w-full py-3 bg-black text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl flex items-center justify-center gap-2 hover:bg-stone-800 transition-all active:scale-[0.98]"
                            >
                              Details
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {tempAiPin && (
                  <Marker 
                    position={[tempAiPin.lat, tempAiPin.lng]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div style="background-color: black; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-center; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transform: rotate(45deg);"><div style="transform: rotate(-45deg); color: white; font-size: 14px;">✨</div></div>`,
                      iconSize: [32, 32],
                      iconAnchor: [16, 32]
                    })}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">AI Recommendation</div>
                        <div className="font-black text-black uppercase tracking-tight">{tempAiPin.name}</div>
                        <button 
                          onClick={() => setTempAiPin(null)}
                          className="mt-2 text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                        >
                          Remove Pin
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {newPlacePos && newPlacePosition && newPlaceIcon && (
                  <Marker 
                    position={newPlacePosition} 
                    icon={newPlaceIcon}
                  />
                )}
              </MapContainer>

              {activeIllustrationTheme && (
                <div className="absolute left-6 bottom-[8.5rem] z-[500] pointer-events-none">
                  <div className="max-w-[280px] rounded-3xl border border-white/70 bg-white/88 px-5 py-4 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="w-4 h-4 text-black" />
                      <div className="text-[9px] font-black uppercase tracking-[0.3em] text-stone-500">Illustration Mode</div>
                    </div>
                    <div className="text-sm font-black text-black tracking-wide">{activeIllustrationTheme.name}</div>
                    <div className="mt-1 text-[10px] leading-relaxed text-stone-500">{activeIllustrationTheme.description}</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full overflow-y-auto p-6 space-y-6 bg-stone-50"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="Search spots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-lg text-sm font-medium focus:border-black outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2 p-1 bg-white border border-stone-200 rounded-xl shadow-sm">
                <button 
                  onClick={() => setListFilter('all')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black transition-all uppercase tracking-widest rounded-lg",
                    listFilter === 'all' ? "bg-black text-white" : "text-stone-400"
                  )}
                >
                  ALL SPOTS
                </button>
                <button 
                  onClick={() => setListFilter('favorites')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black transition-all uppercase tracking-widest rounded-lg",
                    listFilter === 'favorites' ? "bg-black text-white" : "text-stone-400"
                  )}
                >
                  FAVORITES
                </button>
              </div>

              {listFilter === 'all' && (
                <div className="flex items-center justify-between px-6 py-4 bg-white border border-stone-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <MapIcon className="w-5 h-5 text-stone-400" />
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Filter by map area</span>
                  </div>
                  <button 
                    onClick={() => setIsMapBoundsFilterEnabled(!isMapBoundsFilterEnabled)}
                    className={cn(
                      "w-12 h-6 transition-all relative rounded-full",
                      isMapBoundsFilterEnabled ? "bg-black" : "bg-stone-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white transition-all rounded-full",
                      isMapBoundsFilterEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(listFilter === 'all' ? filteredPlaces : favoritePlaces).map((place) => {
                  const isFav = favorites.some(f => f.place_id === place.id);
                  return (
                    <motion.div 
                      layout
                      key={place.id}
                      className="bg-white p-6 border border-stone-100 group shadow-sm hover:shadow-xl transition-all duration-500"
                    >
                      <div className="flex gap-6">
                        <div className="w-24 h-24 flex items-center justify-center shrink-0 bg-stone-50 border border-stone-100 overflow-hidden rounded-2xl">
                          {place.image_url ? (
                            <img src={place.image_url} className="w-full h-full object-cover transition-all duration-500" referrerPolicy="no-referrer" />
                          ) : (
                            <MapPin className="w-8 h-8 text-stone-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0">
                              <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">{place.category}</p>
                              <h3 className="text-lg font-black text-black leading-tight truncate">{place.name}</h3>
                            </div>
                            <button
                              onClick={() => handleToggleFavorite(place.id)}
                              className={cn(
                                "p-2.5 rounded-full transition-all active:scale-90 border",
                                isFav
                                  ? "text-rose-500 border-rose-100 bg-rose-50/50"
                                  : "text-stone-300 border-stone-100 hover:text-stone-600 hover:border-stone-200"
                              )}
                            >
                              <Heart className={cn("w-4 h-4", isFav && "fill-current")} />
                            </button>
                          </div>

                          <p className="text-sm text-stone-500 leading-relaxed font-medium line-clamp-3">
                            {place.description || 'No description available.'}
                          </p>

                          <div className="flex items-center justify-between gap-3 pt-2">
                            {place.website_url ? (
                              <a
                                href={place.website_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-[10px] font-black text-stone-400 hover:text-black uppercase tracking-widest"
                              >
                                Visit Site
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">No Link</span>
                            )}

                            <button
                              onClick={() => setSelectedPlaceForDetail(place)}
                              className="px-4 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 hover:bg-stone-800 transition-all"
                            >
                              Details
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
                                      {activeTab === 'ai' && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full overflow-y-auto bg-[#F8F8F7] relative z-10 pb-40"
            >
              <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
                {/* AI Discovery Header */}
                <div className="bg-white p-16 rounded-[3rem] border border-stone-100 shadow-sm space-y-6 relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">MILZ AI DISCOVERY</p>
                    <h2 className="text-5xl font-black text-black leading-[1.1] tracking-tight max-w-2xl">
                      Curated recommendations and real-time trends for your selected region.
                    </h2>
                    <p className="text-sm text-stone-400 font-medium max-w-xl">
                      Keep discovery practical, premium, and easy to trust without decorative noise.
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-stone-50/50 to-transparent pointer-events-none" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Filter & Action */}
                  <div className="lg:col-span-8 space-y-8">
                    {/* Location Filter Card */}
                    <div className="bg-white p-12 rounded-[3rem] border border-stone-100 shadow-sm space-y-10">
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">ロケーションフィルター</p>
                          <h3 className="text-2xl font-black text-black tracking-tight">Active region</h3>
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          Regionを切り替えると、MapとAIの対象地域も切り替わります。
                        </p>
                      </div>

                      {/* Quick Select Buttons */}
                      <div className="flex flex-wrap gap-3">
                        {[
                          { name: 'New York', country: 'US', state: 'NY', city: 'New York' },
                          { name: 'Tokyo', country: 'JP', state: '13', city: 'Tokyo' },
                          { name: 'Kyoto', country: 'JP', state: '26', city: 'Kyoto' },
                          { name: 'Seoul', country: 'KR', state: '11', city: 'Seoul' }
                        ].map((region) => (
                          <button
                            key={region.name}
                            onClick={() => {
                              const c = Country.getCountryByCode(region.country);
                              const s = State.getStateByCodeAndCountry(region.state, region.country);
                              setLocationFilter({
                                countryCode: region.country,
                                countryName: c?.name || '',
                                stateCode: region.state,
                                stateName: s?.name || '',
                                cityCode: region.city,
                                cityName: region.city,
                                address: ''
                              });
                            }}
                            className={cn(
                              "px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
                              locationFilter.cityName === region.name
                                ? "bg-black text-white border-black shadow-lg"
                                : "bg-stone-50 text-stone-400 border-stone-100 hover:border-stone-300 hover:text-black"
                            )}
                          >
                            <MapPin className="w-3 h-3" />
                            {region.name}
                          </button>
                        ))}
                      </div>

                      {/* Manual Inputs Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-4">国</label>
                          <select
                            value={locationFilter.countryCode}
                            onChange={(e) => {
                              const country = countries.find(c => c.isoCode === e.target.value);
                              setLocationFilter(prev => ({ 
                                ...prev, 
                                countryCode: e.target.value, 
                                countryName: country?.name || '',
                                stateCode: '',
                                stateName: '',
                                cityCode: '',
                                cityName: ''
                              }));
                            }}
                            className="w-full px-8 py-5 bg-stone-50 border border-stone-100 rounded-[1.5rem] outline-none focus:border-black appearance-none font-bold text-sm"
                          >
                            <option value="">Select Country</option>
                            {countries.map(c => (
                              <option key={c.isoCode} value={c.isoCode}>{c.name} {c.flag}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-4">都道府県 / 州</label>
                          <select
                            value={locationFilter.stateCode}
                            disabled={!locationFilter.countryCode}
                            onChange={(e) => {
                              const state = states.find(s => s.isoCode === e.target.value);
                              setLocationFilter(prev => ({ 
                                ...prev, 
                                stateCode: e.target.value, 
                                stateName: state?.name || '',
                                cityCode: '',
                                cityName: ''
                              }));
                            }}
                            className="w-full px-8 py-5 bg-stone-50 border border-stone-100 rounded-[1.5rem] outline-none focus:border-black appearance-none disabled:opacity-50 font-bold text-sm"
                          >
                            <option value="">Select State</option>
                            {states.map(s => (
                              <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-4">市区町村 / エリア</label>
                          <select
                            value={locationFilter.cityName}
                            disabled={!locationFilter.stateCode}
                            onChange={(e) => {
                              setLocationFilter(prev => ({ 
                                ...prev, 
                                cityCode: e.target.value, 
                                cityName: e.target.value 
                              }));
                            }}
                            className="w-full px-8 py-5 bg-stone-50 border border-stone-100 rounded-[1.5rem] outline-none focus:border-black appearance-none disabled:opacity-50 font-bold text-sm"
                          >
                            <option value="">Select City</option>
                            {cities.map(c => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-4">住所・ランドマーク（任意）</label>
                          <input
                            type="text"
                            placeholder="住所・ランドマーク（任意）"
                            value={locationFilter.address}
                            onChange={(e) => setLocationFilter(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full px-8 py-5 bg-stone-50 border border-stone-100 rounded-[1.5rem] outline-none focus:border-black font-bold text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="space-y-6">
                      <button 
                        onClick={handleAiRecommend}
                        disabled={aiLoading}
                        className="w-full p-10 bg-[#1A1A1A] text-white font-black rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all disabled:opacity-50 tracking-[0.5em] text-xs hover:bg-black group"
                      >
                        {aiLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                        おすすめを取得 (WORLDWIDE)
                      </button>
                    </div>

                    {/* Results Area */}
                    {aiResults && (
                      <div className="space-y-8 pt-8">
                        {aiResults.recommendations && (
                          <section className="space-y-6">
                            <div className="flex items-center justify-between px-4">
                              <h3 className="text-xs font-black text-stone-400 uppercase tracking-[0.4em]">Recommended Spots</h3>
                              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">{aiResults.recommendations.length} items found</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {aiResults.recommendations.map((rec, i) => (
                                <motion.div 
                                  key={i}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="bg-white p-10 border border-stone-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full group"
                                >
                                  <div className="flex items-start justify-between mb-6">
                                    <h4 className="text-xl font-black text-black leading-tight tracking-tight group-hover:text-stone-600 transition-colors">{rec.name}</h4>
                                    <span className="text-[9px] font-black border border-stone-200 px-4 py-2 uppercase tracking-widest rounded-full bg-stone-50">
                                      {rec.category}
                                    </span>
                                  </div>
                                  <p className="text-sm text-stone-500 leading-relaxed font-medium flex-grow mb-8">{rec.reason}</p>
                                  
                                  <div className="flex gap-3 mt-auto">
                                    <button
                                      onClick={() => handleViewOnMap(rec)}
                                      className="flex-1 py-4 bg-stone-50 hover:bg-black hover:text-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all border border-stone-100"
                                    >
                                      <MapPin className="w-3 h-3" />
                                      View on Map
                                    </button>
                                    <button
                                      onClick={() => handleSaveAiRecommendation(rec)}
                                      className="px-6 py-4 border border-stone-100 hover:border-black hover:bg-rose-50 hover:text-rose-500 text-stone-400 rounded-2xl transition-all flex items-center justify-center"
                                      title="Save to Favorites"
                                    >
                                      <Heart className="w-4 h-4" />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </section>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Summary */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-10 sticky top-24">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">REGION SUMMARY</p>
                        <h3 className="text-xl font-black text-black tracking-tight">Current Scope</h3>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1 h-1 bg-stone-400 rounded-full" />
                            国
                          </label>
                          <p className="text-sm font-bold text-black bg-stone-50 p-5 rounded-2xl border border-stone-100">
                            {locationFilter.countryName || 'Worldwide'}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1 h-1 bg-stone-400 rounded-full" />
                            SCOPE
                          </label>
                          <p className="text-sm font-bold text-black bg-stone-50 p-5 rounded-2xl border border-stone-100 leading-relaxed">
                            {[locationFilter.countryName, locationFilter.stateName, locationFilter.cityName]
                              .filter(Boolean)
                              .join(' ') || 'Worldwide'}
                            {locationFilter.address && ` - ${locationFilter.address}`}
                          </p>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-stone-50">
                        <p className="text-[9px] font-medium text-stone-300 leading-relaxed">
                          AI recommendations are generated based on the selected scope. 
                          Accuracy may vary by region.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full overflow-y-auto p-6 pb-40 space-y-8 bg-stone-50 relative z-10"
            >
              <div className="bg-white p-12 border border-stone-200 rounded-3xl shadow-2xl text-center space-y-8 max-w-2xl mx-auto">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-black rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                    <UserIcon className="w-12 h-12 text-white" />
                  </div>
                  {role === 'admin' && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-black rounded-full flex items-center justify-center shadow-lg">
                      <ShieldCheck className="w-6 h-6 text-black" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-serif font-bold text-black tracking-tight">{user.email?.split('@')[0]}</h2>
                  <p className="text-stone-400 font-medium tracking-widest text-xs uppercase">{user.email}</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className={cn(
                    "px-6 py-2 border border-black rounded-full text-[10px] font-black uppercase tracking-[0.3em]",
                    role === 'admin' ? "bg-black text-white" : "bg-white text-black"
                  )}>
                    {role === 'admin' ? 'ADMINISTRATOR' : 'MEMBER'}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-stone-400 bg-stone-50 p-4 border border-stone-100 rounded-lg break-all">
                  UID: {user.id}<br/>
                  ACCESS: {role || 'none'}
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 px-1">
                    <MapIcon className="w-4 h-4 text-stone-400" />
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Map Theme Settings</span>
                  </div>
                  <div className="space-y-4">
                    <div className="text-[9px] font-black text-stone-400 uppercase tracking-[0.25em]">Original + Tokyo Hybrid View</div>
                    <div className="grid grid-cols-2 gap-4">
                      {(Object.keys(MAP_THEMES) as MapThemeKey[]).map((styleKey) => (
                        <button
                          key={styleKey}
                          onClick={() => setMapStyle(styleKey)}
                          className={cn(
                            "p-6 border rounded-xl transition-all text-left space-y-2",
                            mapStyle === styleKey 
                              ? "border-black bg-black text-white shadow-xl" 
                              : "border-stone-200 bg-white text-black hover:border-black"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-black text-xs uppercase tracking-widest">{MAP_THEMES[styleKey].name}</div>
                            {isIllustrationTheme(styleKey) && (
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.25em]",
                                mapStyle === styleKey ? "bg-white/15 text-white" : "bg-stone-100 text-stone-500"
                              )}>
                                tokyo
                              </span>
                            )}
                          </div>
                          <div className={cn(
                            "text-[9px] font-medium leading-tight uppercase tracking-tighter",
                            mapStyle === styleKey ? "text-stone-300" : "text-stone-400"
                          )}>
                            {MAP_THEMES[styleKey].description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    onClick={handleLogout}
                    className="w-full py-4 text-[10px] font-black text-black hover:bg-stone-50 transition-all uppercase tracking-[0.3em] border border-black rounded-xl"
                  >
                    Sign Out
                  </button>
                  <button
                    onClick={async () => {
                      addLog('Manual Connection Test: Starting...');
                      const diag = await testSupabaseConnection();
                      if (diag.success) {
                        addLog(`Manual Connection Test: Success (${diag.message})`);
                        showToast(`接続成功! (${diag.message})`, "success");
                      } else {
                        addLog(`Manual Connection Test: Failed (${diag.message})`);
                        console.error('Connection Test Failed:', diag);
                        let msg = `接続失敗: ${diag.message}`;
                        if (diag.details) msg += `\n詳細: ${diag.details}`;
                        
                        if (diag.isTimeout) {
                          msg += `\n\n【考えられる原因】\n1. Supabaseプロジェクトが「Paused (停止中)」になっている（ダッシュボードでRestoreしてください）\n2. ネットワーク環境（VPNや社内LAN）で通信が遮断されている\n3. URLが間違っている（https://[ID].supabase.co である必要があります）`;
                        }
                        
                        // Check for common URL errors
                        const url = import.meta.env.VITE_SUPABASE_URL || '';
                        if (url.includes('supabase.com/dashboard')) {
                          msg += `\n\n⚠️ 注意: URLにダッシュボードのURLが設定されています。API URLを設定してください。`;
                        } else if (!url.startsWith('https://')) {
                          msg += `\n\n⚠️ 注意: URLは https:// で始まる必要があります。`;
                        }
                        
                        showToast(msg, "error");
                      }
                    }}
                    className="w-full py-4 text-[10px] font-black text-stone-400 hover:text-black transition-colors uppercase tracking-[0.3em] border border-stone-200 rounded-xl"
                  >
                    Test DB Connection
                  </button>
                  <button
                    onClick={async () => {
                      addLog('Raw Fetch Test: Starting...');
                      try {
                        const url = import.meta.env.VITE_SUPABASE_URL;
                        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
                        
                        if (!url || !key) {
                          addLog('Raw Fetch Test: Skipped (Config missing)');
                          showToast('設定が不足しています', "error");
                          return;
                        }

                        const res = await fetch(`${url}/rest/v1/admin_places?select=*`, {
                          headers: {
                            'apikey': key,
                            'Authorization': `Bearer ${key}`
                          }
                        });
                        if (res.ok) {
                          const data = await res.json();
                          addLog(`Raw Fetch Test: Success (${data.length} items)`);
                          setPlaces(data);
                          showToast(`Raw Fetch成功: ${data.length}件`, "success");
                        } else {
                          const err = await res.text();
                          addLog(`Raw Fetch Test: Failed (${res.status})`);
                          showToast(`Raw Fetch失敗: ${res.status}`, "error");
                        }
                      } catch (e: any) {
                        addLog(`Raw Fetch Test: Exception: ${e.message}`);
                        let msg = e.message;
                        if (msg === 'Failed to fetch') {
                          msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URLが正しいか、プロジェクトが一時停止されていないか確認してください)';
                        }
                        showToast(`Raw Fetchエラー: ${msg}`, "error");
                      }
                    }}
                    className="w-full py-3 text-[10px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest bg-blue-50 rounded-xl"
                  >
                    Debug: Fetch with Raw API
                  </button>
                  <button
                    onClick={async () => {
                      addLog('Manual Reset: Resetting client...');
                      resetSupabaseClient();
                      addLog('Manual Reset: Client recreated. Retrying fetch...');
                      fetchPlaces();
                      showToast("再初期化しました。", "info");
                    }}
                    className="w-full py-3 text-[10px] font-black text-amber-600 hover:text-amber-700 transition-colors uppercase tracking-widest bg-amber-50 rounded-xl"
                  >
                    Reset & Reconnect
                  </button>
                  <button
                    onClick={() => {
                      localStorage.clear();
                      sessionStorage.clear();
                      addLog('Manual Reset: Storage cleared. Reloading...');
                      showToast("キャッシュをクリアしました。", "info");
                      window.location.reload();
                    }}
                    className="w-full py-3 text-[10px] font-black text-rose-600 hover:text-rose-700 transition-colors uppercase tracking-widest bg-rose-50 rounded-xl"
                  >
                    Clear Cache & Session
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 text-[10px] font-black text-stone-600 hover:text-stone-700 transition-colors uppercase tracking-widest bg-stone-100 rounded-xl"
                  >
                    Refresh Application
                  </button>
                  <button
                    onClick={() => setShowSqlModal(true)}
                    className="w-full py-3 text-[10px] font-black text-stone-600 hover:text-stone-700 transition-colors uppercase tracking-widest bg-stone-100 rounded-xl"
                  >
                    View SQL Setup Script
                  </button>
                  <button
                    onClick={() => setShowConfigModal(true)}
                    className="w-full py-3 text-[10px] font-black text-stone-600 hover:text-stone-700 transition-colors uppercase tracking-widest bg-stone-100 rounded-xl"
                  >
                    Check Config URL & Key
                  </button>

                  {/* Debug Logs Section */}
                  <div className="pt-6 border-t border-stone-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Debug Logs</h3>
                      <button 
                        onClick={() => setDebugLogs([])}
                        className="text-[10px] font-black text-stone-400 hover:text-stone-600 uppercase"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="bg-stone-900 p-4 h-40 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1 text-left rounded-xl">
                      {debugLogs.length === 0 ? (
                        <div className="text-stone-600 italic">No logs yet...</div>
                      ) : (
                        debugLogs.map((log, i) => (
                          <div key={i} className="border-b border-stone-800 pb-1 last:border-0">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      console.log('App: Manual Role Refresh');
                      fetchProfile(user.id, user.email);
                    }}
                    className="w-full py-3 text-[10px] font-black text-stone-400 hover:text-stone-600 transition-colors uppercase tracking-widest rounded-xl"
                  >
                    Refresh Permissions
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 border border-stone-100 shadow-sm rounded-2xl">
                    <p className="text-2xl font-serif font-bold text-stone-900">{favorites.length}</p>
                    <p className="text-[10px] font-black text-stone-400 uppercase">Favorites</p>
                  </div>
                  <div className="bg-white p-6 border border-stone-100 shadow-sm rounded-2xl">
                    <p className="text-2xl font-serif font-bold text-stone-900">{places.length}</p>
                    <p className="text-[10px] font-black text-stone-400 uppercase">Global Spots</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 text-center">
                <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest">
                  Powered by milztech
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Button (Admin Only) */}
        {role === 'admin' && activeTab === 'map' && (
          <button 
            onClick={() => isAdding ? closeAddModal() : setIsAdding(true)}
            className="absolute bottom-8 right-8 w-16 h-16 bg-stone-900 text-white shadow-2xl rounded-full flex items-center justify-center z-[1001] active:scale-95 transition-all hover:scale-110"
          >
            {isAdding ? <X className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
          </button>
        )}
      </main>

      {/* Navigation */}
      <div className="fixed bottom-8 left-6 right-6 z-[1001] pointer-events-none">
        <nav className="max-w-2xl mx-auto bg-white/90 backdrop-blur-xl border border-stone-100 shadow-2xl rounded-[2rem] pointer-events-auto overflow-hidden">
          <div className="px-8 py-4 flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('map')}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all group",
                activeTab === 'map' ? "text-black" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                activeTab === 'map' ? "bg-stone-50" : "group-hover:bg-stone-50/50"
              )}>
                <MapIcon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider">Map</span>
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all group",
                activeTab === 'list' ? "text-black" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                activeTab === 'list' ? "bg-stone-50" : "group-hover:bg-stone-50/50"
              )}>
                <ListIcon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider">List</span>
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all group",
                activeTab === 'ai' ? "text-black" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                activeTab === 'ai' ? "bg-stone-50" : "group-hover:bg-stone-50/50"
              )}>
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider">AI</span>
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all group",
                activeTab === 'profile' ? "text-black" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                activeTab === 'profile' ? "bg-stone-50" : "group-hover:bg-stone-50/50"
              )}>
                <UserIcon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider">Me</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Add Spot Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[2000] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-lg p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-black uppercase tracking-tighter">
                  {editingPlace ? 'Edit Spot' : 'Add New Spot'}
                </h2>
                <button onClick={closeAddModal} className="p-2 hover:bg-stone-100 transition-colors">
                  <X className="w-6 h-6 text-black" />
                </button>
              </div>

              {!newPlacePos ? (
                <div className="space-y-6">
                  <div className="p-12 border border-stone-200 text-center space-y-4">
                    <div className="w-16 h-16 bg-stone-50 flex items-center justify-center mx-auto">
                      <MapPinned className="w-8 h-8 text-stone-300" />
                    </div>
                    <p className="text-stone-500 font-medium text-sm">Tap anywhere on the map to set the location.</p>
                  </div>

                  <div className="relative flex items-center">
                    <div className="flex-1 h-px bg-stone-100"></div>
                    <span className="px-4 text-[10px] font-black text-stone-300 uppercase tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-stone-100"></div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Enter Address</label>
                      <div className="flex gap-0">
                        <input 
                          type="text"
                          value={modalAddress}
                          onChange={(e) => setModalAddress(e.target.value)}
                          placeholder="e.g. 1-1-1 Shiba-koen, Minato-ku, Tokyo"
                          className="flex-1 px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium"
                          onKeyDown={(e) => e.key === 'Enter' && handleModalAddressSearch()}
                        />
                        <button
                          onClick={handleModalAddressSearch}
                          disabled={isGeocoding}
                          className="px-8 bg-black text-white font-black text-xs active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={closeAddModal}
                    className="w-full py-4 text-[10px] font-black text-stone-400 hover:text-black transition-colors uppercase tracking-widest"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddPlace} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Spot Name</label>
                      <input 
                        name="name"
                        required
                        defaultValue={editingPlace?.name}
                        placeholder="e.g. Blue Bottle Coffee"
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Main Photo</label>
                      <div className="flex items-center gap-6">
                        <div className="relative w-32 h-32 bg-stone-50 border border-stone-200 flex items-center justify-center group overflow-hidden">
                          {previewImage ? (
                            <img src={previewImage} className="w-full h-full object-cover transition-all" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-stone-200" />
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 text-[11px] text-stone-400 font-medium leading-relaxed">
                          Upload the primary image for this spot. <br/>
                          <span className="text-black">Editorial Tip:</span> High quality color photos work best for the Milz aesthetic.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Category</label>
                        <select 
                          name="category"
                          defaultValue={editingPlace?.category || 'その他'}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium appearance-none"
                        >
                          {Object.keys(CATEGORY_CONFIG).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Website</label>
                        <input 
                          name="website_url"
                          defaultValue={editingPlace?.website_url || ''}
                          placeholder="https://..."
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Short Description</label>
                      <textarea 
                        name="description"
                        rows={2}
                        defaultValue={editingPlace?.description || ''}
                        placeholder="A one-sentence summary..."
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                      />
                    </div>

                    <div className="space-y-8 pt-8 border-t border-stone-100">
                      <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] px-1">Editorial Content</h3>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Milz Experience (The Story)</label>
                        <textarea 
                          name="milz_experience"
                          rows={6}
                          defaultValue={editingPlace?.milz_experience || ''}
                          placeholder="Write the reporter's curated impression here. This will be the main feature of the detail view."
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none leading-relaxed"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Detailed Description (Fallback)</label>
                        <textarea 
                          name="detailed_description"
                          rows={4}
                          defaultValue={editingPlace?.detailed_description || ''}
                          placeholder="Additional background info..."
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Gallery Photos (Comma separated URLs)</label>
                        <textarea 
                          name="images"
                          rows={2}
                          defaultValue={editingPlace?.images?.join(', ') || ''}
                          placeholder="https://url1.com, https://url2.com..."
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Short Videos (Comma separated URLs)</label>
                        <textarea 
                          name="videos"
                          rows={2}
                          defaultValue={editingPlace?.videos?.join(', ') || ''}
                          placeholder="https://video1.mp4, https://video2.mp4..."
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Menu Items (Name|URL, comma separated - PDF or Jpeg)</label>
                        <textarea 
                          name="pdfs"
                          rows={2}
                          defaultValue={editingPlace?.pdfs?.map(p => `${p.name}|${p.url}`).join(', ') || ''}
                          placeholder="Lunch Menu|https://url.com/menu.pdf, Dinner Menu|https://url.com/menu.jpg..."
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting || uploading}
                      className="w-full py-6 bg-black text-white font-black text-xs tracking-[0.3em] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {(isSubmitting || uploading) ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          PROCESSING...
                        </>
                      ) : (editingPlace ? 'UPDATE SPOT' : 'PUBLISH SPOT')}
                    </button>
                    {!editingPlace && (
                      <button 
                        type="button"
                        onClick={() => setNewPlacePos(null)}
                        className="w-full py-4 text-[10px] font-black text-stone-400 hover:text-black transition-all"
                      >
                        CANCEL
                      </button>
                    )}
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Place Detail Modal */}
        <AnimatePresence>
          {selectedPlaceForDetail && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/90 backdrop-blur-xl z-[3000] overflow-y-auto no-scrollbar"
            >
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="min-h-screen bg-[#fcfcfb] text-[#1c1917]"
              >
                {/* Hero Section */}
                <div className="relative h-[80vh] w-full bg-stone-900 overflow-hidden">
                  <img 
                    src={(isEditingDetail ? editDetailForm.image_url : selectedPlaceForDetail.image_url) || selectedPlaceForDetail.images?.[0] || 'https://picsum.photos/seed/luxury/1920/1080'} 
                    className="w-full h-full object-cover opacity-60 scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                  
                  {/* Close Button */}
                  <button 
                    onClick={() => setSelectedPlaceForDetail(null)}
                    className="absolute top-8 right-8 w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center z-10 hover:bg-white/20 transition-all active:scale-95"
                  >
                    <X className="w-8 h-8" />
                  </button>

                  {/* Actions Overlay */}
                  <div className="absolute top-8 left-8 flex gap-4 z-10">
                    <button 
                      onClick={() => {
                        const isFav = favorites.some(f => f.place_id === selectedPlaceForDetail.id);
                        handleToggleFavorite(selectedPlaceForDetail.id);
                      }}
                      className={cn(
                        "w-16 h-16 backdrop-blur-md border rounded-full flex items-center justify-center transition-all active:scale-95",
                        favorites.some(f => f.place_id === selectedPlaceForDetail.id)
                          ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20"
                          : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                      )}
                    >
                      <Heart className={cn("w-8 h-8", favorites.some(f => f.place_id === selectedPlaceForDetail.id) && "fill-current")} />
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        showToast("Link copied to clipboard", "success");
                      }}
                      className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
                    >
                      <Share2 className="w-8 h-8" />
                    </button>
                    {role === 'admin' && (
                      <>
                        <button 
                          onClick={() => {
                            if (isEditingDetail) {
                              handleUpdatePlaceInline();
                            } else {
                              setEditDetailForm(selectedPlaceForDetail);
                              setIsEditingDetail(true);
                            }
                          }}
                          className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xl z-20",
                            isEditingDetail ? "bg-emerald-500 text-white" : "bg-black text-white hover:bg-stone-800"
                          )}
                          disabled={isUpdatingDetail}
                        >
                          {isUpdatingDetail ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                          ) : isEditingDetail ? (
                            <Save className="w-8 h-8" />
                          ) : (
                            <Pencil className="w-8 h-8" />
                          )}
                        </button>
                        {isEditingDetail && (
                          <button 
                            onClick={() => setIsEditingDetail(false)}
                            className="w-16 h-16 bg-white text-black border border-stone-200 rounded-full flex items-center justify-center hover:bg-stone-50 transition-all active:scale-95 shadow-2xl z-20"
                          >
                            <X className="w-8 h-8" />
                          </button>
                        )}
                        {!isEditingDetail && (
                          <button 
                            onClick={() => {
                              handleDeletePlace(selectedPlaceForDetail.id);
                              setSelectedPlaceForDetail(null);
                            }}
                            className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-all active:scale-95 shadow-2xl z-20"
                          >
                            <Trash2 className="w-8 h-8" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Hero Content - Centered & Bold */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-6">
                    {isEditingDetail ? (
                      <div className="space-y-4 w-full max-w-2xl z-10">
                        <input 
                          type="text"
                          value={editDetailForm.category || ''}
                          onChange={(e) => setEditDetailForm({ ...editDetailForm, category: e.target.value })}
                          className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.5em] text-center w-full py-2 outline-none focus:border-white/40"
                          placeholder="CATEGORY"
                        />
                        <input 
                          type="text"
                          value={editDetailForm.name || ''}
                          onChange={(e) => setEditDetailForm({ ...editDetailForm, name: e.target.value })}
                          className="bg-transparent text-6xl md:text-8xl font-serif font-light text-white leading-none tracking-tight text-center w-full outline-none border-b border-white/20 focus:border-white/60"
                          placeholder="SPOT NAME"
                        />
                        <div className="flex justify-center pt-4">
                          <DropZone 
                            label="Hero Background" 
                            onFilesDrop={(files) => handleFilesDrop(files, 'image_url')}
                            isLoading={uploading}
                            className="bg-white/5 border-white/10 text-white w-64 min-h-[100px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-[10px] font-black text-white uppercase tracking-[0.5em] opacity-80">
                          {selectedPlaceForDetail.category} • {selectedPlaceForDetail.address?.split(',')[0]}
                        </div>
                        <h1 className="text-6xl md:text-8xl font-serif font-light text-white leading-none tracking-tight">
                          {selectedPlaceForDetail.name}
                        </h1>
                      </>
                    )}
                    <div className="w-24 h-[1px] bg-white/50" />
                  </div>
                </div>

                {/* Content Grid */}
                <div className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 lg:grid-cols-12 gap-20">
                  
                  {/* Left Column: Story & Experience */}
                  <div className="lg:col-span-8 space-y-32">
                    
                    {/* Milz Experience Section */}
                    <section className="space-y-12">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400">01</span>
                        {isEditingDetail ? (
                          <input 
                            type="text"
                            value={editDetailForm.milz_experience_heading || 'Milz Experience'}
                            onChange={(e) => setEditDetailForm({ ...editDetailForm, milz_experience_heading: e.target.value })}
                            className="bg-transparent text-4xl font-serif font-light tracking-tight text-black outline-none border-b border-stone-200 focus:border-black"
                          />
                        ) : (
                          <h2 className="text-4xl font-serif font-light tracking-tight text-black">
                            {selectedPlaceForDetail.milz_experience_heading || 'Milz Experience'}
                          </h2>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
                        <div className="md:col-span-2 space-y-6">
                          {isEditingDetail ? (
                            <textarea 
                              value={editDetailForm.milz_experience_label || 'A curated impression by our lead reporter on the ground.'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, milz_experience_label: e.target.value })}
                              className="w-full bg-stone-50 border border-stone-200 p-4 text-sm font-bold text-black uppercase tracking-widest leading-relaxed outline-none focus:border-black transition-all resize-none"
                              rows={3}
                            />
                          ) : (
                            <p className="text-sm font-bold text-black uppercase tracking-widest leading-relaxed">
                              {selectedPlaceForDetail.milz_experience_label || 'A curated impression by our lead reporter on the ground.'}
                            </p>
                          )}
                          <div className="pt-6 border-t border-stone-100">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Reporter</p>
                            {isEditingDetail ? (
                              <input 
                                type="text"
                                value={editDetailForm.reporter_name || 'MILZ Editorial Team'}
                                onChange={(e) => setEditDetailForm({ ...editDetailForm, reporter_name: e.target.value })}
                                className="w-full bg-stone-50 border border-stone-200 p-2 text-sm font-bold text-black outline-none focus:border-black transition-all"
                              />
                            ) : (
                              <p className="text-sm font-bold text-black">{selectedPlaceForDetail.reporter_name || 'MILZ Editorial Team'}</p>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-3">
                          {isEditingDetail ? (
                            <textarea 
                              value={editDetailForm.milz_experience || ''}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, milz_experience: e.target.value })}
                              className="w-full h-64 bg-stone-50 border border-stone-200 p-6 text-xl font-serif text-stone-800 leading-[1.6] italic outline-none focus:border-black transition-all resize-none"
                              placeholder="Describe the MILZ experience..."
                            />
                          ) : (
                            <p className="text-2xl font-serif text-stone-800 leading-[1.6] italic">
                              {selectedPlaceForDetail.milz_experience || selectedPlaceForDetail.detailed_description || selectedPlaceForDetail.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Photos Section */}
                    <section className="space-y-12">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400">02</span>
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.photos_heading || 'Photos'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, photos_heading: e.target.value })}
                              className="bg-transparent text-4xl font-serif font-light tracking-tight text-black outline-none border-b border-stone-200 focus:border-black"
                            />
                          ) : (
                            <h2 className="text-4xl font-serif font-light tracking-tight text-black">
                              {selectedPlaceForDetail.photos_heading || 'Photos'}
                            </h2>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                          {selectedPlaceForDetail.images?.length || 0} Captures
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {isEditingDetail && (
                          <div className="col-span-2 md:col-span-1">
                            <DropZone 
                              label="Add Gallery Photos" 
                              onFilesDrop={(files) => handleFilesDrop(files, 'images')}
                              isLoading={uploading}
                              className="h-full min-h-[200px]"
                              accept="image/*"
                            />
                          </div>
                        )}
                        {(isEditingDetail ? editDetailForm.images : selectedPlaceForDetail.images)?.map((img, i) => (
                          <div key={i} className={cn(
                            "relative overflow-hidden bg-stone-100 group cursor-zoom-in",
                            i % 3 === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"
                          )}>
                            <img 
                              src={img} 
                              className="w-full h-full object-cover transition-all duration-1000 scale-105 group-hover:scale-100" 
                              referrerPolicy="no-referrer" 
                            />
                            {isEditingDetail && (
                              <button 
                                onClick={() => {
                                  const newImages = (editDetailForm.images || []).filter((_, idx) => idx !== i);
                                  setEditDetailForm({ ...editDetailForm, images: newImages });
                                }}
                                className="absolute top-4 right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Short Videos Section */}
                    {selectedPlaceForDetail.videos && selectedPlaceForDetail.videos.length > 0 && (
                      <section className="space-y-12">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400">03</span>
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.shorts_heading || 'Shorts'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, shorts_heading: e.target.value })}
                              className="bg-transparent text-4xl font-serif font-light tracking-tight text-black outline-none border-b border-stone-200 focus:border-black"
                            />
                          ) : (
                            <h2 className="text-4xl font-serif font-light tracking-tight text-black">
                              {selectedPlaceForDetail.shorts_heading || 'Shorts'}
                            </h2>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {isEditingDetail && (
                            <div className="col-span-1">
                              <DropZone 
                                label="Add Short Videos" 
                                onFilesDrop={(files) => handleFilesDrop(files, 'videos')}
                                isLoading={uploading}
                                className="h-full min-h-[300px]"
                                accept="video/*"
                              />
                            </div>
                          )}
                          {(isEditingDetail ? editDetailForm.videos : selectedPlaceForDetail.videos)?.map((video, i) => (
                            <div key={i} className="aspect-[9/16] bg-black relative group overflow-hidden">
                              <video 
                                src={video} 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                controls
                                muted
                                loop
                              />
                              <div className="absolute inset-0 pointer-events-none border-[20px] border-white/10 group-hover:border-white/0 transition-all duration-500" />
                              {isEditingDetail && (
                                <button 
                                  onClick={() => {
                                    const newVideos = (editDetailForm.videos || []).filter((_, idx) => idx !== i);
                                    setEditDetailForm({ ...editDetailForm, videos: newVideos });
                                  }}
                                  className="absolute top-8 right-8 w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all z-10"
                                >
                                  <X className="w-6 h-6" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Menu Section */}
                    <section className="space-y-12">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400">04</span>
                        {isEditingDetail ? (
                          <input 
                            type="text"
                            value={editDetailForm.menu_heading || 'Menu & Offerings'}
                            onChange={(e) => setEditDetailForm({ ...editDetailForm, menu_heading: e.target.value })}
                            className="bg-transparent text-4xl font-serif font-light tracking-tight text-black outline-none border-b border-stone-200 focus:border-black"
                          />
                        ) : (
                          <h2 className="text-4xl font-serif font-light tracking-tight text-black">
                            {selectedPlaceForDetail.menu_heading || 'Menu & Offerings'}
                          </h2>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div className="space-y-10">
                          <div className="space-y-4">
                            {isEditingDetail ? (
                              <textarea 
                                value={editDetailForm.menu_description || 'Explore the seasonal offerings and signature selections curated for the MILZ experience. Our reporters have verified the current menu availability.'}
                                onChange={(e) => setEditDetailForm({ ...editDetailForm, menu_description: e.target.value })}
                                className="w-full bg-stone-50 border border-stone-200 p-4 text-sm text-stone-500 leading-relaxed font-medium outline-none focus:border-black transition-all resize-none"
                                rows={4}
                              />
                            ) : (
                              <p className="text-sm text-stone-500 leading-relaxed font-medium">
                                {selectedPlaceForDetail.menu_description || 'Explore the seasonal offerings and signature selections curated for the MILZ experience. Our reporters have verified the current menu availability.'}
                              </p>
                            )}
                            <div className="w-12 h-[1px] bg-stone-200" />
                          </div>
                          <div className="space-y-4">
                            {isEditingDetail ? (
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Digital Assets (Name|URL, comma separated)</p>
                                  <textarea 
                                    value={editDetailForm.pdfs?.map(p => `${p.name}|${p.url}`).join(', ') || ''}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const parsed = raw.split(',').map(s => {
                                        const [name, url] = s.split('|').map(p => p.trim());
                                        return name && url ? { name, url } : null;
                                      }).filter(Boolean);
                                      setEditDetailForm({ ...editDetailForm, pdfs: parsed as any });
                                    }}
                                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none text-xs"
                                    placeholder="Lunch Menu|https://url.com/menu.pdf, Dinner Menu|https://url.com/menu.jpg..."
                                    rows={4}
                                  />
                                </div>
                                
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Upload Menu (PDF/Image)</p>
                                  <DropZone 
                                    label="Upload Menu Files" 
                                    onFilesDrop={(files) => handleFilesDrop(files, 'pdfs')}
                                    isLoading={uploading}
                                    className="min-h-[150px]"
                                    accept="application/pdf,image/*"
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  {editDetailForm.pdfs?.map((pdf, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl">
                                      <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                                          {pdf.url.toLowerCase().endsWith('.pdf') ? <FileText className="w-4 h-4 text-stone-400" /> : <ImageIcon className="w-4 h-4 text-stone-400" />}
                                        </div>
                                        <span className="text-xs font-bold truncate">{pdf.name}</span>
                                      </div>
                                      <button 
                                        onClick={() => {
                                          const newPdfs = (editDetailForm.pdfs || []).filter((_, idx) => idx !== i);
                                          setEditDetailForm({ ...editDetailForm, pdfs: newPdfs });
                                        }}
                                        className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <div className="p-6 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                                  <p className="text-[9px] text-stone-400 uppercase tracking-widest leading-relaxed">
                                    Tip: You can upload files directly or paste links in the text area above using the Name|URL format.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <>
                                {selectedPlaceForDetail.pdfs?.map((pdf, i) => {
                                  const isPdf = pdf.url.toLowerCase().endsWith('.pdf');
                                  return (
                                    <a 
                                      key={i}
                                      href={pdf.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between p-8 border border-stone-200 hover:border-black transition-all group relative overflow-hidden"
                                    >
                                      <div className="flex items-center gap-6 z-10">
                                        <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center group-hover:bg-black transition-colors">
                                          {isPdf ? (
                                            <FileText className="w-5 h-5 text-stone-400 group-hover:text-white" />
                                          ) : (
                                            <ImageIcon className="w-5 h-5 text-stone-400 group-hover:text-white" />
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-xs font-black uppercase tracking-[0.2em] block">{pdf.name}</span>
                                          <span className="text-[9px] text-stone-400 uppercase tracking-widest block">{isPdf ? 'PDF Document' : 'Image File'}</span>
                                        </div>
                                      </div>
                                      <ArrowUpRight className="w-5 h-5 text-stone-300 group-hover:text-black transition-all z-10" />
                                      <div className="absolute inset-0 bg-stone-50 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                    </a>
                                  );
                                })}
                                {(!selectedPlaceForDetail.pdfs || selectedPlaceForDetail.pdfs.length === 0) && (
                                  <div className="p-12 border border-dashed border-stone-200 rounded-2xl text-center space-y-4">
                                    <Utensils className="w-8 h-8 text-stone-200 mx-auto" />
                                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">No digital menu available</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="aspect-[4/5] bg-stone-50 border border-stone-200 rounded-3xl relative overflow-hidden group">
                          <img 
                            src={selectedPlaceForDetail.image_url} 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-1000 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-6 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
                              <Search className="w-8 h-8 text-white" />
                            </div>
                            <div className="space-y-2">
                              {isEditingDetail ? (
                                <>
                                  <input 
                                    type="text"
                                    value={editDetailForm.visual_archive_label || 'Visual Archive'}
                                    onChange={(e) => setEditDetailForm({ ...editDetailForm, visual_archive_label: e.target.value })}
                                    className="bg-transparent text-[10px] font-black uppercase tracking-[0.4em] text-black text-center w-full outline-none border-b border-black/20 focus:border-black"
                                  />
                                  <input 
                                    type="text"
                                    value={editDetailForm.visual_archive_description || 'Explore the visual identity of this establishment.'}
                                    onChange={(e) => setEditDetailForm({ ...editDetailForm, visual_archive_description: e.target.value })}
                                    className="bg-transparent text-xs font-medium text-black/60 italic text-center w-full outline-none border-b border-black/20 focus:border-black"
                                  />
                                </>
                              ) : (
                                <>
                                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black">
                                    {selectedPlaceForDetail.visual_archive_label || 'Visual Archive'}
                                  </p>
                                  <p className="text-xs font-medium text-black/60 italic">
                                    {selectedPlaceForDetail.visual_archive_description || 'Explore the visual identity of this establishment.'}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Footer Action */}
                    <div className="pt-32 pb-20 text-center space-y-8">
                      <div className="w-px h-24 bg-stone-200 mx-auto" />
                      <button 
                        onClick={() => setSelectedPlaceForDetail(null)}
                        className="group inline-flex flex-col items-center gap-6"
                      >
                        <div className="w-20 h-20 bg-stone-50 border border-stone-200 rounded-full flex items-center justify-center group-hover:bg-black group-hover:border-black transition-all duration-500">
                          <ArrowLeft className="w-8 h-8 text-stone-400 group-hover:text-white transition-colors" />
                        </div>
                        {isEditingDetail ? (
                          <input 
                            type="text"
                            value={editDetailForm.back_to_map_label || 'Back to Map'}
                            onChange={(e) => setEditDetailForm({ ...editDetailForm, back_to_map_label: e.target.value })}
                            className="bg-transparent text-[10px] font-black uppercase tracking-[0.5em] text-stone-400 text-center w-full outline-none border-b border-stone-200 focus:border-black"
                          />
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-stone-400 group-hover:text-black transition-colors">
                            {selectedPlaceForDetail.back_to_map_label || 'Back to Map'}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Info & Actions */}
                  <div className="lg:col-span-4 space-y-12">
                    <div className="sticky top-10 space-y-12">
                      
                      {/* Quick Info */}
                      <div className="space-y-8 p-10 border border-stone-200 rounded-3xl bg-white">
                        <div className="space-y-2">
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.location_label || 'Location'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, location_label: e.target.value })}
                              className="bg-transparent text-[10px] font-black text-stone-400 uppercase tracking-widest w-full outline-none border-b border-stone-100 focus:border-black"
                            />
                          ) : (
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              {selectedPlaceForDetail.location_label || 'Location'}
                            </p>
                          )}
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.address || ''}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, address: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 text-sm font-bold text-black outline-none focus:border-black transition-all"
                              placeholder="Full Address"
                            />
                          ) : (
                            <p className="text-sm font-bold text-black leading-relaxed">
                              {selectedPlaceForDetail.address || 'Address not provided'}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.hours_label || 'Hours'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, hours_label: e.target.value })}
                              className="bg-transparent text-[10px] font-black text-stone-400 uppercase tracking-widest w-full outline-none border-b border-stone-100 focus:border-black"
                            />
                          ) : (
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              {selectedPlaceForDetail.hours_label || 'Hours'}
                            </p>
                          )}
                          {isEditingDetail ? (
                            <textarea 
                              value={editDetailForm.hours || ''}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, hours: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 text-sm font-bold text-black outline-none focus:border-black transition-all resize-none"
                              rows={3}
                              placeholder="Mon-Sun: 10:00 - 22:00"
                            />
                          ) : (
                            <p className="text-sm font-bold text-black whitespace-pre-line leading-relaxed">
                              {selectedPlaceForDetail.hours || 'Mon-Sun: 10:00 - 22:00'}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.contact_label || 'Contact'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, contact_label: e.target.value })}
                              className="bg-transparent text-[10px] font-black text-stone-400 uppercase tracking-widest w-full outline-none border-b border-stone-100 focus:border-black"
                            />
                          ) : (
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              {selectedPlaceForDetail.contact_label || 'Contact'}
                            </p>
                          )}
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.website_url || ''}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, website_url: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 text-sm font-bold text-black outline-none focus:border-black transition-all"
                              placeholder="https://website.com"
                            />
                          ) : (
                            <a href={selectedPlaceForDetail.website_url} target="_blank" className="text-sm font-bold text-black hover:underline block truncate">
                              {selectedPlaceForDetail.website_url?.replace('https://', '') || 'Official Website'}
                            </a>
                          )}
                        </div>
                        
                        {!isEditingDetail && (
                          <div className="pt-8 border-t border-stone-100 space-y-4">
                            <button className="w-full py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-stone-800 transition-colors rounded-xl">
                              Book Experience
                            </button>
                            <button 
                              onClick={() => {
                                const lat = selectedPlaceForDetail.lat;
                                const lng = selectedPlaceForDetail.lng;
                                setSelectedPlaceForDetail(null);
                                setActiveTab('map');
                                setTimeout(() => mapRef.current?.flyTo([lat, lng], 16), 100);
                              }}
                              className="w-full py-5 bg-white border border-black text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 rounded-xl"
                            >
                              <Navigation className="w-4 h-4" />
                              Directions
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Map Preview */}
                      <div className="aspect-square border border-stone-200 relative overflow-hidden">
                        <div className="absolute inset-0 bg-stone-100 flex items-center justify-center">
                           <MapPin className="w-12 h-12 text-black" />
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 p-4 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-black">Coordinates</p>
                          <p className="text-[10px] font-mono text-stone-500">{selectedPlaceForDetail.lat.toFixed(4)}, {selectedPlaceForDetail.lng.toFixed(4)}</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Config Check Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-stone-100 rounded-[2.5rem]"
            >
              <div className="p-10 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-2xl font-serif font-light text-stone-900 tracking-tight">Supabase Config</h2>
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="p-3 hover:bg-stone-50 rounded-full transition-all"
                >
                  <X className="w-6 h-6 text-stone-900" />
                </button>
              </div>
              
              <div className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] px-1">Supabase URL</label>
                    <div className="flex gap-2">
                      <div className="flex-1 p-5 bg-stone-50 border border-stone-100 font-mono text-xs break-all text-stone-600 rounded-2xl">
                        {import.meta.env.VITE_SUPABASE_URL || 'MISSING'}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(import.meta.env.VITE_SUPABASE_URL || '');
                          showToast('URLをコピーしました', "success");
                        }}
                        className="p-5 bg-stone-900 text-white hover:bg-black transition-all rounded-2xl active:scale-95"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] px-1">Anon Key (Publishable)</label>
                    <div className="p-5 bg-stone-50 border border-stone-100 font-mono text-xs break-all text-stone-600 rounded-2xl">
                      {import.meta.env.VITE_SUPABASE_ANON_KEY ? 
                        (import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 10) + '...' + import.meta.env.VITE_SUPABASE_ANON_KEY.substring(import.meta.env.VITE_SUPABASE_ANON_KEY.length - 10)) : 
                        'MISSING'}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-stone-50 border border-stone-100 flex gap-4 rounded-2xl">
                  <Info className="w-5 h-5 text-stone-900 shrink-0" />
                  <div className="text-[10px] text-stone-600 leading-relaxed font-medium uppercase tracking-widest">
                    URLは "https://[PROJECT_ID].supabase.co"、<br/>
                    Keyは "eyJ..." で始まる長い文字列である必要があります。
                  </div>
                </div>
              </div>
              
              <div className="p-10 bg-white border-t border-stone-100">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="w-full py-6 bg-stone-900 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black transition-all rounded-2xl active:scale-95 shadow-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SQL Setup Modal */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-stone-100 rounded-[2.5rem]"
            >
              <div className="p-10 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif font-light text-stone-900 tracking-tight">Supabase SQL Setup</h2>
                  <p className="text-[10px] text-stone-400 mt-2 uppercase tracking-[0.3em] font-black">Paste this into Supabase SQL Editor</p>
                </div>
                <button 
                  onClick={() => setShowSqlModal(false)}
                  className="p-3 hover:bg-stone-50 rounded-full transition-all"
                >
                  <X className="w-6 h-6 text-stone-900" />
                </button>
              </div>
              
              <div className="p-10 overflow-y-auto bg-stone-50 no-scrollbar">
                <div className="bg-stone-900 p-10 relative group rounded-3xl overflow-hidden">
                  <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`-- 1. 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. プロフィールテーブルの作成
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. スポットテーブルの作成
CREATE TABLE IF NOT EXISTS admin_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  detailed_description TEXT,
  milz_experience TEXT,
  category TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  country TEXT,
  prefecture TEXT,
  municipality TEXT,
  address TEXT,
  website_url TEXT,
  image_url TEXT,
  images TEXT[],
  videos TEXT[],
  pdfs JSONB,
  rating DOUBLE PRECISION DEFAULT 4.5,
  review_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. お気に入りテーブルの作成
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  place_id UUID REFERENCES admin_places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- 5. RLSの有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 6. ポリシーの作成 (profiles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. ポリシーの作成 (admin_places)
DROP POLICY IF EXISTS "Allow public read access" ON admin_places;
CREATE POLICY "Allow public read access" ON admin_places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON admin_places;
CREATE POLICY "Allow authenticated insert" ON admin_places FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "Allow admins to update" ON admin_places;
CREATE POLICY "Allow admins to update" ON admin_places FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "Allow admins to delete" ON admin_places;
CREATE POLICY "Allow admins to delete" ON admin_places FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

-- 8. ポリシーの作成 (favorites)
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);`}
                  </pre>
                  <button
                    onClick={() => {
                      const text = `-- 1. 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. プロフィールテーブルの作成
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. スポットテーブルの作成
CREATE TABLE IF NOT EXISTS admin_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  detailed_description TEXT,
  milz_experience TEXT,
  category TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  country TEXT,
  prefecture TEXT,
  municipality TEXT,
  address TEXT,
  website_url TEXT,
  image_url TEXT,
  images TEXT[],
  videos TEXT[],
  pdfs JSONB,
  rating DOUBLE PRECISION DEFAULT 4.5,
  review_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. お気に入りテーブルの作成
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  place_id UUID REFERENCES admin_places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- 5. RLSの有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 6. ポリシーの作成 (profiles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. ポリシーの作成 (admin_places)
DROP POLICY IF EXISTS "Allow public read access" ON admin_places;
CREATE POLICY "Allow public read access" ON admin_places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON admin_places;
CREATE POLICY "Allow authenticated insert" ON admin_places FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "Allow admins to update" ON admin_places;
CREATE POLICY "Allow admins to update" ON admin_places FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "Allow admins to delete" ON admin_places;
CREATE POLICY "Allow admins to delete" ON admin_places FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

-- 8. ポリシーの作成 (favorites)
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);`;
                      navigator.clipboard.writeText(text).then(() => {
                        showToast('コピーしました！', "success");
                      }).catch(() => {
                        showToast('コピーに失敗しました。', "error");
                      });
                    }}
                    className="absolute top-4 right-4 p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100 rounded-lg"
                  >
                    Copy
                  </button>
                </div>

                <div className="mt-4 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <div className="flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-xs text-emerald-800 leading-relaxed">
                      <p className="font-black uppercase tracking-tight mb-1">Recommended Test Accounts</p>
                      <p>SupabaseのAuthenticationメニューから、以下のユーザーを作成しておくとスムーズです：</p>
                      <ul className="list-disc list-inside mt-1 font-mono">
                        <li>Admin: masashi@milz.tech (PW: password123)</li>
                        <li>User: user@example.com (PW: password123)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="text-xs text-amber-800 leading-relaxed">
                      <p className="font-black uppercase tracking-tight mb-1">Important Note</p>
                      <p>もし既にテーブルを作成済みの場合は、一度テーブルを削除（DROP TABLE admin_places;）してから再実行するか、不足しているカラムを追加してください。</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-white border-t border-stone-200">
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="w-full py-6 bg-stone-900 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black transition-all rounded-2xl active:scale-95 shadow-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Custom Toast */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[3000] px-10 py-5 shadow-2xl flex items-center gap-4 min-w-[320px] border border-stone-800 rounded-full"
            style={{
              backgroundColor: '#1c1917',
              color: 'white'
            }}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-stone-400" />}
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">{toast.message}</span>
          </motion.div>
        )}

        {/* Custom Confirm Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 backdrop-blur-sm bg-black/60">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white w-full max-w-sm shadow-2xl overflow-hidden border border-stone-100 rounded-[2.5rem]"
            >
              <div className="p-12 text-center space-y-8">
                <div className="w-24 h-24 bg-stone-50 border border-stone-100 flex items-center justify-center mx-auto rounded-full">
                  <AlertCircle className="w-12 h-12 text-stone-900" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-serif font-light text-stone-900 tracking-tight">{confirmModal.title}</h3>
                  <p className="text-[10px] text-stone-400 leading-relaxed font-black uppercase tracking-widest">{confirmModal.message}</p>
                </div>
              </div>
              <div className="p-10 bg-white flex gap-4 border-t border-stone-100">
                <button
                  onClick={() => {
                    if (confirmModal.onCancel) confirmModal.onCancel();
                    setConfirmModal(null);
                  }}
                  className="flex-1 py-6 bg-stone-50 text-stone-900 font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl hover:bg-stone-100 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-6 bg-stone-900 text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl hover:bg-black transition-all active:scale-95 shadow-xl"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
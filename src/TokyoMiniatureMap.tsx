import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import L from 'leaflet';

export type TokyoAnglePreset = 'top' | 'soft' | 'miniature';

export const TOKYO_ANGLE_PRESETS: Record<TokyoAnglePreset, { label: string; pitch: number; bearing: number; zoom: number }> = {
  top: { label: 'Top', pitch: 0, bearing: 0, zoom: 12.6 },
  soft: { label: 'Soft Tilt', pitch: 38, bearing: 16, zoom: 13.2 },
  miniature: { label: 'Miniature', pitch: 56, bearing: 22, zoom: 13.8 },
};

export interface MapNavigator {
  flyTo: (coords: [number, number], zoom: number, options?: { animate?: boolean; duration?: number }) => void;
}

interface PlaceLike {
  id: string;
  name: string;
  category: 'restaurant' | 'shop' | 'other';
  lat: number;
  lng: number;
}

interface TempAiPinLike {
  lat: number;
  lng: number;
  name: string;
}

interface TokyoMiniatureMapProps {
  apiKey?: string;
  anglePreset: TokyoAnglePreset;
  places: PlaceLike[];
  tempAiPin: TempAiPinLike | null;
  newPlacePos: { lat: number; lng: number } | null;
  role: 'admin' | 'user' | null;
  activeTab: 'map' | 'list' | 'ai' | 'profile';
  isAdding: boolean;
  setTempAiPin: (value: TempAiPinLike | null) => void;
  setNewPlacePos: (value: { lat: number; lng: number } | null) => void;
  setIsAdding: (value: boolean) => void;
  setMapBounds: (bounds: L.LatLngBounds | null) => void;
  mapRef: MutableRefObject<MapNavigator | null>;
  onSelectPlace: (place: any) => void;
}

declare global {
  interface Window {
    maptilersdk?: any;
  }
}

const TOKYO_CENTER: [number, number] = [139.7671, 35.6812];
const MAPTILER_JS = 'https://cdn.maptiler.com/maptiler-sdk-js/v3.10.2/maptiler-sdk.umd.min.js';
const MAPTILER_CSS = 'https://cdn.maptiler.com/maptiler-sdk-js/v3.10.2/maptiler-sdk.css';

let sdkLoader: Promise<any> | null = null;

function ensureMapTilerAssets() {
  if (typeof window === 'undefined') return Promise.reject(new Error('window unavailable'));
  if (window.maptilersdk) return Promise.resolve(window.maptilersdk);
  if (sdkLoader) return sdkLoader;

  sdkLoader = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-maptiler-sdk="true"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPTILER_CSS;
      link.setAttribute('data-maptiler-sdk', 'true');
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-maptiler-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.maptilersdk), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load MapTiler SDK script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MAPTILER_JS;
    script.async = true;
    script.setAttribute('data-maptiler-sdk', 'true');
    script.onload = () => resolve(window.maptilersdk);
    script.onerror = () => reject(new Error('Failed to load MapTiler SDK script'));
    document.head.appendChild(script);
  });

  return sdkLoader;
}

function createMarkerNode(kind: 'place' | 'ai' | 'new', label?: string) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'milz-maptiler-marker';

  const inner = document.createElement('span');
  inner.className = `milz-maptiler-marker__inner milz-maptiler-marker__inner--${kind}`;
  inner.textContent = kind === 'ai' ? 'AI' : kind === 'new' ? '+' : '';
  el.appendChild(inner);

  if (label && kind === 'place') {
    const tag = document.createElement('span');
    tag.className = 'milz-maptiler-marker__label';
    tag.textContent = label;
    el.appendChild(tag);
  }

  return el;
}

function buildMapNavigator(map: any): MapNavigator {
  return {
    flyTo(coords, zoom, options) {
      map.flyTo({
        center: [coords[1], coords[0]],
        zoom,
        duration: options?.duration ?? 1000,
        essential: true,
      });
    },
  };
}

function add3dBuildings(map: any) {
  const style = map.getStyle?.();
  if (!style?.layers || !style?.sources) return;
  if (map.getLayer?.('milz-3d-buildings')) return;

  const sourceEntries = Object.entries(style.sources).filter(([, source]: any) => source?.type === 'vector');
  const referenceLayer = style.layers.find((layer: any) => layer['source-layer'] === 'building' && layer.source);
  const sourceId = referenceLayer?.source || sourceEntries[0]?.[0];
  if (!sourceId) return;

  const beforeId = style.layers.find((layer: any) => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;

  try {
    map.addLayer(
      {
        id: 'milz-3d-buildings',
        type: 'fill-extrusion',
        source: sourceId,
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'render_height'], ['get', 'height'], 0],
            0,
            '#d6d0c6',
            60,
            '#c8c0b6',
            140,
            '#b8b0a7',
          ],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 0],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.78,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      beforeId,
    );
  } catch {
    // keep stable preview even if a style/source does not support building extrusion
  }
}

export default function TokyoMiniatureMap({
  apiKey,
  anglePreset,
  places,
  tempAiPin,
  newPlacePos,
  role,
  activeTab,
  isAdding,
  setTempAiPin,
  setNewPlacePos,
  setIsAdding,
  setMapBounds,
  mapRef,
  onSelectPlace,
}: TokyoMiniatureMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const tempMarkerRef = useRef<any | null>(null);
  const addMarkerRef = useRef<any | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const preset = TOKYO_ANGLE_PRESETS[anglePreset];
  const hasKey = Boolean(apiKey && apiKey.trim());

  useEffect(() => {
    if (!hasKey || !containerRef.current) return;
    let cancelled = false;

    ensureMapTilerAssets()
      .then((sdk) => {
        if (cancelled || !containerRef.current) return;
        sdk.config.apiKey = apiKey;

        const map = new sdk.Map({
          container: containerRef.current,
          style: 'streets-v2',
          center: TOKYO_CENTER,
          zoom: preset.zoom,
          bearing: preset.bearing,
          pitch: preset.pitch,
          antialias: true,
          attributionControl: false,
        });
        mapInstanceRef.current = map;
        mapRef.current = buildMapNavigator(map);

        map.on('load', () => {
          add3dBuildings(map);
          map.easeTo({ pitch: preset.pitch, bearing: preset.bearing, zoom: preset.zoom, duration: 0 });
          const bounds = map.getBounds?.();
          if (bounds) {
            setMapBounds(L.latLngBounds([bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]));
          }
        });

        map.on('moveend', () => {
          const bounds = map.getBounds?.();
          if (bounds) {
            setMapBounds(L.latLngBounds([bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]));
          }
        });

        map.on('click', (event: any) => {
          if (role === 'admin' && activeTab === 'map' && isAdding) {
            setNewPlacePos({ lat: event.lngLat.lat, lng: event.lngLat.lng });
            setIsAdding(false);
          }
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setRuntimeError(error instanceof Error ? error.message : 'MapTiler SDK failed to load');
        }
      });

    return () => {
      cancelled = true;
      markerRefs.current.forEach((marker) => marker.remove?.());
      markerRefs.current = [];
      tempMarkerRef.current?.remove?.();
      addMarkerRef.current?.remove?.();
      mapInstanceRef.current?.remove?.();
      mapInstanceRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey, hasKey]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.easeTo({
      pitch: preset.pitch,
      bearing: preset.bearing,
      zoom: preset.zoom,
      duration: 900,
      essential: true,
    });
  }, [preset]);

  useEffect(() => {
    const sdk = window.maptilersdk;
    const map = mapInstanceRef.current;
    if (!sdk || !map) return;

    markerRefs.current.forEach((marker) => marker.remove?.());
    markerRefs.current = [];

    places.forEach((place) => {
      const el = createMarkerNode('place', place.name);
      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectPlace(place);
      });

      const marker = new sdk.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      markerRefs.current.push(marker);
    });
  }, [places, onSelectPlace]);

  useEffect(() => {
    const sdk = window.maptilersdk;
    const map = mapInstanceRef.current;
    if (!sdk || !map) return;

    tempMarkerRef.current?.remove?.();
    tempMarkerRef.current = null;
    if (tempAiPin) {
      const el = createMarkerNode('ai');
      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setTempAiPin(null);
      });
      tempMarkerRef.current = new sdk.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([tempAiPin.lng, tempAiPin.lat])
        .addTo(map);
    }
  }, [tempAiPin, setTempAiPin]);

  useEffect(() => {
    const sdk = window.maptilersdk;
    const map = mapInstanceRef.current;
    if (!sdk || !map) return;

    addMarkerRef.current?.remove?.();
    addMarkerRef.current = null;
    if (newPlacePos) {
      const el = createMarkerNode('new');
      addMarkerRef.current = new sdk.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([newPlacePos.lng, newPlacePos.lat])
        .addTo(map);
    }
  }, [newPlacePos]);

  if (!hasKey) {
    return (
      <div className="h-full w-full bg-stone-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-[2rem] border border-stone-200 bg-white/92 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="text-[11px] font-black uppercase tracking-[0.35em] text-stone-400">Tokyo Miniature Preview</div>
          <h3 className="mt-4 text-2xl font-serif text-black">MapTiler key is required</h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            Cloudflare の Variables and Secrets に <code className="rounded bg-stone-100 px-2 py-1 text-[12px]">VITE_MAPTILER_KEY</code> を設定すると、
            東京の MapTiler プレビューが表示されます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#ebe7df]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_45%,rgba(233,229,220,0.65)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/60 to-transparent" />
      {runtimeError && (
        <div className="absolute inset-x-6 bottom-28 rounded-2xl border border-rose-200 bg-white/95 px-4 py-3 text-[11px] font-semibold text-rose-600 shadow-lg backdrop-blur">
          {runtimeError}
        </div>
      )}
    </div>
  );
}

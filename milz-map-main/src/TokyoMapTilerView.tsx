import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { TOKYO_ANGLE_PRESETS, TOKYO_ILLUSTRATION_THEME, type TokyoAnglePresetKey } from './illustrationMaps';

interface PlaceLike {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

interface TempAiPinLike {
  lat: number;
  lng: number;
  name: string;
}

interface TokyoMapTilerViewProps {
  maptilerKey?: string;
  anglePreset: TokyoAnglePresetKey;
  places: PlaceLike[];
  tempAiPin: TempAiPinLike | null;
  newPlacePos: { lat: number; lng: number } | null;
  user: any;
  role: 'admin' | 'user' | null;
  activeTab: 'map' | 'list' | 'ai' | 'profile';
  onSelectPlace: (place: PlaceLike) => void;
  setNewPlacePos: (pos: { lat: number; lng: number } | null) => void;
  setIsAdding: (value: boolean) => void;
  setMapBounds: (bounds: L.LatLngBounds | null) => void;
  onMapReady: (map: MapLibreMap | null) => void;
}

const TOKYO_CENTER: [number, number] = [TOKYO_ILLUSTRATION_THEME.center[1], TOKYO_ILLUSTRATION_THEME.center[0]];

function setIfLayerExists(map: MapLibreMap, layerId: string, property: string, value: any) {
  if (!map.getLayer(layerId)) return;
  map.setPaintProperty(layerId, property as any, value);
}

function layoutIfLayerExists(map: MapLibreMap, layerId: string, property: string, value: any) {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, property as any, value);
}

function applyTokyoMiniatureStyle(map: MapLibreMap) {
  const style = map.getStyle() as StyleSpecification | undefined;
  if (!style?.layers) return;

  for (const layer of style.layers) {
    if (layer.type === 'symbol') {
      layoutIfLayerExists(map, layer.id, 'visibility', 'none');
      continue;
    }

    if (layer.type === 'background') {
      setIfLayerExists(map, layer.id, 'background-color', '#e8e3d8');
      continue;
    }

    const id = layer.id.toLowerCase();

    if (layer.type === 'fill') {
      if (id.includes('water')) {
        setIfLayerExists(map, layer.id, 'fill-color', '#afc4cf');
        setIfLayerExists(map, layer.id, 'fill-opacity', 0.95);
      } else if (id.includes('park') || id.includes('green') || id.includes('landcover') || id.includes('wood')) {
        setIfLayerExists(map, layer.id, 'fill-color', '#a4b79f');
        setIfLayerExists(map, layer.id, 'fill-opacity', 0.9);
      } else if (id.includes('building')) {
        setIfLayerExists(map, layer.id, 'fill-color', '#d9d2c6');
        setIfLayerExists(map, layer.id, 'fill-opacity', 0.8);
      } else {
        setIfLayerExists(map, layer.id, 'fill-color', '#ece7de');
      }
      continue;
    }

    if (layer.type === 'line') {
      if (id.includes('road') || id.includes('street') || id.includes('bridge') || id.includes('transport')) {
        setIfLayerExists(map, layer.id, 'line-color', '#f8f3e8');
        setIfLayerExists(map, layer.id, 'line-opacity', 0.95);
      }
      if (id.includes('rail')) {
        setIfLayerExists(map, layer.id, 'line-color', '#b6b3ac');
        setIfLayerExists(map, layer.id, 'line-opacity', 0.6);
      }
      if (id.includes('water')) {
        setIfLayerExists(map, layer.id, 'line-color', '#afc4cf');
      }
    }
  }

  const vectorSourceId = Object.entries(map.getStyle().sources).find(([, source]: any) => source?.type === 'vector')?.[0];

  if (vectorSourceId && !map.getLayer('milz-3d-buildings')) {
    map.addLayer({
      id: 'milz-3d-buildings',
      type: 'fill-extrusion',
      source: vectorSourceId,
      'source-layer': 'building',
      minzoom: 13,
      filter: ['all', ['>=', ['coalesce', ['get', 'render_height'], ['get', 'height'], 0], 1]],
      paint: {
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
          1, '#d8d1c6',
          40, '#cbc4b9',
          120, '#bcb6ac'
        ],
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 0.72,
        'fill-extrusion-vertical-gradient': true,
      },
    });
  }
}

function createMarkerElement(label: string, variant: 'place' | 'ai' | 'new') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `milz-maptiler-marker milz-maptiler-marker--${variant}`;

  if (variant === 'place') {
    el.innerHTML = `<span>${label.slice(0, 1).toUpperCase()}</span>`;
  } else if (variant === 'ai') {
    el.innerHTML = '<span>AI</span>';
  } else {
    el.innerHTML = '<span>+</span>';
  }

  return el;
}

export default function TokyoMapTilerView({
  maptilerKey,
  anglePreset,
  places,
  tempAiPin,
  newPlacePos,
  user,
  role,
  activeTab,
  onSelectPlace,
  setNewPlacePos,
  setIsAdding,
  setMapBounds,
  onMapReady,
}: TokyoMapTilerViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const preset = TOKYO_ANGLE_PRESETS[anglePreset];

  const styleUrl = useMemo(() => {
    if (!maptilerKey) return '';
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`;
  }, [maptilerKey]);

  useEffect(() => {
    if (!containerRef.current || !styleUrl || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: TOKYO_CENTER,
      zoom: preset.zoom,
      pitch: preset.pitch,
      bearing: preset.bearing,
      attributionControl: false,
      antialias: true,
      maxPitch: 70,
      minZoom: 10,
      maxZoom: 18.5,
      renderWorldCopies: false,
    });

    mapRef.current = map;
    onMapReady(map);

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    const updateBounds = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      setMapBounds(L.latLngBounds([
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()],
      ]));
    };

    map.on('load', () => {
      applyTokyoMiniatureStyle(map);
      updateBounds();
    });

    map.on('styledata', () => {
      if (map.isStyleLoaded()) {
        try {
          applyTokyoMiniatureStyle(map);
        } catch {
          // ignore style race during refresh
        }
      }
    });

    map.on('moveend', updateBounds);

    map.on('click', (event) => {
      if (user && role === 'admin' && activeTab === 'map') {
        setNewPlacePos({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        setIsAdding(true);
      }
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      onMapReady(null);
      map.remove();
      mapRef.current = null;
    };
  }, [activeTab, onMapReady, preset.bearing, preset.pitch, preset.zoom, role, setIsAdding, setMapBounds, setNewPlacePos, styleUrl, user]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      center: TOKYO_CENTER,
      zoom: preset.zoom,
      pitch: preset.pitch,
      bearing: preset.bearing,
      duration: 900,
      essential: true,
    });
  }, [preset]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    places.forEach((place) => {
      const el = createMarkerElement(place.category || place.name, 'place');
      el.setAttribute('aria-label', place.name);
      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectPlace(place);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (tempAiPin) {
      const aiEl = createMarkerElement(tempAiPin.name, 'ai');
      const marker = new maplibregl.Marker({ element: aiEl, anchor: 'bottom' })
        .setLngLat([tempAiPin.lng, tempAiPin.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (newPlacePos) {
      const newEl = createMarkerElement('', 'new');
      const marker = new maplibregl.Marker({ element: newEl, anchor: 'bottom' })
        .setLngLat([newPlacePos.lng, newPlacePos.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [newPlacePos, onSelectPlace, places, tempAiPin]);

  if (!maptilerKey) {
    return (
      <div className="h-full w-full bg-[#f4efe7] flex items-center justify-center px-6 text-center">
        <div className="max-w-md bg-white/85 border border-stone-200 rounded-[2rem] shadow-xl p-8 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-500">Tokyo Miniature Preview</p>
          <h3 className="text-2xl font-serif text-black">MapTiler key is required</h3>
          <p className="text-sm text-stone-500 leading-relaxed">
            Set <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">VITE_MAPTILER_KEY</code> to enable the Tokyo miniature test map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#efe8dd] overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/45 via-white/12 to-transparent" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        style={{
          backdropFilter: `blur(${preset.blurOpacity > 0 ? 6 : 0}px)`,
          WebkitBackdropFilter: `blur(${preset.blurOpacity > 0 ? 6 : 0}px)`,
          opacity: preset.blurOpacity,
          maskImage: 'linear-gradient(to bottom, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
          background: '#fff',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36"
        style={{
          backdropFilter: `blur(${preset.blurOpacity > 0 ? 10 : 0}px)`,
          WebkitBackdropFilter: `blur(${preset.blurOpacity > 0 ? 10 : 0}px)`,
          opacity: preset.blurOpacity + 0.02,
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
          background: '#fff',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(37,31,22,0.06)_100%)]" />
    </div>
  );
}

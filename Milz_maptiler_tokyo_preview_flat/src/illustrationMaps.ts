export type IllustrationThemeKey = 'tokyo';
export type MapThemeKey = 'original' | IllustrationThemeKey;
export type TokyoAnglePresetKey = 'top' | 'softTilt' | 'miniature';

export type LatLngTuple = [number, number];
export type BoundsTuple = [LatLngTuple, LatLngTuple];

interface StandardTheme {
  type: 'standard';
  name: string;
  description: string;
  url: string;
  attribution: string;
}

export interface TokyoIllustrationTheme {
  type: 'illustration';
  name: string;
  description: string;
  url: string;
  attribution: string;
  center: LatLngTuple;
  zoom: number;
  bounds: BoundsTuple;
  palette: {
    wash: string;
    ink: string;
    routePrimary: string;
    routeSecondary: string;
    park: string;
    water: string;
    card: string;
  };
}

export type MapTheme = StandardTheme | TokyoIllustrationTheme;

export interface TokyoAnglePreset {
  key: TokyoAnglePresetKey;
  name: string;
  description: string;
  zoom: number;
  pitch: number;
  bearing: number;
  blurOpacity: number;
}

const baseTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const baseAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const TOKYO_ILLUSTRATION_THEME: TokyoIllustrationTheme = {
  type: 'illustration',
  name: 'Tokyo Miniature',
  description: 'MapTiler preview for a miniature-photo Tokyo mode',
  url: baseTileUrl,
  attribution: baseAttribution,
  center: [35.6812, 139.7671],
  zoom: 14,
  bounds: [[35.60, 139.64], [35.78, 139.88]],
  palette: {
    wash: '#ebe6dc',
    ink: '#202628',
    routePrimary: '#d7c29c',
    routeSecondary: '#9bb4bf',
    park: '#9eb79b',
    water: '#aec9d4',
    card: '#faf6ef',
  },
};

export const TOKYO_ANGLE_PRESETS: Record<TokyoAnglePresetKey, TokyoAnglePreset> = {
  top: {
    key: 'top',
    name: 'Top',
    description: 'Almost top-down for planning and reading the city clearly.',
    zoom: 14.15,
    pitch: 8,
    bearing: -8,
    blurOpacity: 0.04,
  },
  softTilt: {
    key: 'softTilt',
    name: 'Soft Tilt',
    description: 'A gentle bird’s-eye view with depth but still practical.',
    zoom: 14.4,
    pitch: 44,
    bearing: -18,
    blurOpacity: 0.1,
  },
  miniature: {
    key: 'miniature',
    name: 'Miniature',
    description: 'The strongest diorama feel for visual preview mode.',
    zoom: 14.8,
    pitch: 58,
    bearing: -24,
    blurOpacity: 0.17,
  },
};

export const MAP_THEMES: Record<MapThemeKey, MapTheme> = {
  original: {
    type: 'standard',
    name: 'Original',
    description: 'Current practical map view',
    url: baseTileUrl,
    attribution: baseAttribution,
  },
  tokyo: TOKYO_ILLUSTRATION_THEME,
};

export const isIllustrationTheme = (theme: MapThemeKey): theme is IllustrationThemeKey => theme === 'tokyo';

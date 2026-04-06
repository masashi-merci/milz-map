export type IllustrationThemeKey = 'tokyo';
export type MapThemeKey = 'original' | IllustrationThemeKey;

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

const baseTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const baseAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const TOKYO_ILLUSTRATION_THEME: TokyoIllustrationTheme = {
  type: 'illustration',
  name: '東京イラスト',
  description: '東京だけ、実地図を保ったままイラスト調にするハイブリッド表示',
  url: baseTileUrl,
  attribution: baseAttribution,
  center: [35.6812, 139.7671],
  zoom: 12,
  bounds: [[35.60, 139.64], [35.78, 139.88]],
  palette: {
    wash: '#f4f1e6',
    ink: '#24312c',
    routePrimary: '#dd9d37',
    routeSecondary: '#86a9b6',
    park: '#91b57d',
    water: '#d9ebe7',
    card: '#fbf7ed',
  },
};

export const MAP_THEMES: Record<MapThemeKey, MapTheme> = {
  original: {
    type: 'standard',
    name: 'オリジナル',
    description: '通常の実用マップ',
    url: baseTileUrl,
    attribution: baseAttribution,
  },
  tokyo: TOKYO_ILLUSTRATION_THEME,
};

export const isIllustrationTheme = (theme: MapThemeKey): theme is IllustrationThemeKey => theme === 'tokyo';

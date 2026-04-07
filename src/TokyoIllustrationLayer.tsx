import { useMemo, useState } from 'react';
import { Circle, ImageOverlay, Marker, Pane, Polyline, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { TOKYO_ILLUSTRATION_THEME } from './illustrationMaps';

type LatLng = [number, number];

type BlockStyle = 'downtown' | 'civic' | 'garden' | 'waterfront' | 'compact';

interface BlockSpec {
  id: string;
  position: LatLng;
  width: number;
  height: number;
  anchor?: [number, number];
  style: BlockStyle;
  scale?: number;
}

const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;

const TOKYO_WASH_URL = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1400" viewBox="0 0 1800 1400">
  <defs>
    <filter id="blur1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="32" /></filter>
    <filter id="blur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18" /></filter>
    <pattern id="paper" width="160" height="160" patternUnits="userSpaceOnUse">
      <circle cx="18" cy="30" r="2.4" fill="#ffffff" fill-opacity="0.32"/>
      <circle cx="118" cy="74" r="1.6" fill="#1c2622" fill-opacity="0.05"/>
      <circle cx="65" cy="124" r="1.5" fill="#ffffff" fill-opacity="0.18"/>
      <circle cx="136" cy="142" r="1.1" fill="#1c2622" fill-opacity="0.04"/>
    </pattern>
  </defs>
  <rect width="1800" height="1400" fill="#f8f5ed"/>
  <rect width="1800" height="1400" fill="url(#paper)" opacity="0.88"/>
  <g filter="url(#blur1)" opacity="0.36">
    <ellipse cx="370" cy="260" rx="290" ry="180" fill="#d5e5e1"/>
    <ellipse cx="1320" cy="300" rx="290" ry="210" fill="#d7e0c8"/>
    <ellipse cx="560" cy="960" rx="380" ry="210" fill="#f0d5a4"/>
    <ellipse cx="1290" cy="930" rx="360" ry="250" fill="#cfe1e5"/>
  </g>
  <g filter="url(#blur2)" opacity="0.32">
    <path d="M190 390 C 420 300, 620 320, 830 415 S 1210 560, 1580 510" fill="none" stroke="#d8a45a" stroke-width="76" stroke-linecap="round"/>
    <path d="M180 860 C 450 710, 640 725, 860 800 S 1220 910, 1600 800" fill="none" stroke="#9cb9c4" stroke-width="84" stroke-linecap="round"/>
  </g>
</svg>`);

const TOKYO_BAY_PATCH = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" /></filter>
  </defs>
  <g opacity="0.9">
    <path d="M1030 250 C 1200 210, 1400 260, 1510 410 C 1570 490, 1570 620, 1510 720 C 1385 900, 1120 910, 950 760 C 820 650, 780 500, 820 380 C 860 300, 930 260, 1030 250 Z" fill="#cae3e8"/>
    <path d="M1060 300 C 1200 270, 1360 310, 1450 430 C 1500 500, 1500 600, 1455 675 C 1360 835, 1125 845, 990 720 C 885 620, 855 515, 885 425 C 915 350, 975 315, 1060 300 Z" fill="#e3f0f3" opacity="0.85"/>
    <path d="M1080 355 C 1210 330, 1340 360, 1410 455" fill="none" stroke="#ffffff" stroke-opacity="0.68" stroke-width="14" stroke-linecap="round" filter="url(#blur)"/>
    <path d="M1010 620 C 1130 660, 1260 660, 1370 620" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="12" stroke-linecap="round" filter="url(#blur)"/>
  </g>
</svg>`);

const PRIMARY_ROADS: LatLng[][] = [
  [
    [35.6948, 139.7000],
    [35.6922, 139.7182],
    [35.6899, 139.7366],
    [35.6842, 139.7548],
    [35.6775, 139.7708],
    [35.6670, 139.7878],
    [35.6543, 139.7985],
  ],
  [
    [35.6592, 139.6988],
    [35.6642, 139.7132],
    [35.6698, 139.7302],
    [35.6755, 139.7470],
    [35.6812, 139.7671],
    [35.6880, 139.7870],
    [35.6982, 139.8120],
  ],
  [
    [35.7148, 139.7738],
    [35.7055, 139.7718],
    [35.6932, 139.7699],
    [35.6812, 139.7671],
    [35.6717, 139.7646],
    [35.6635, 139.7668],
  ],
];

const SECONDARY_ROADS: LatLng[][] = [
  [
    [35.6925, 139.7065],
    [35.6878, 139.7250],
    [35.6830, 139.7420],
    [35.6788, 139.7588],
  ],
  [
    [35.6685, 139.7002],
    [35.6712, 139.7200],
    [35.6718, 139.7400],
    [35.6702, 139.7605],
    [35.6662, 139.7800],
  ],
  [
    [35.6760, 139.7590],
    [35.6675, 139.7725],
    [35.6598, 139.7860],
    [35.6508, 139.7990],
  ],
  [
    [35.7125, 139.7780],
    [35.7078, 139.7920],
    [35.7062, 139.8060],
  ],
];

const PARK_PATCHES = [
  { center: [35.6852, 139.7528] as LatLng, radius: 1350 },
  { center: [35.6727, 139.6949] as LatLng, radius: 1080 },
  { center: [35.7192, 139.7720] as LatLng, radius: 960 },
  { center: [35.6290, 139.7760] as LatLng, radius: 780 },
  { center: [35.6618, 139.7310] as LatLng, radius: 720 },
];

const LOW_BLOCKS: BlockSpec[] = [
  { id: 'shinjuku-low', position: [35.6928, 139.7055], width: 210, height: 156, style: 'downtown' },
  { id: 'marunouchi-low', position: [35.6812, 139.7671], width: 228, height: 166, style: 'civic' },
  { id: 'shibuya-low', position: [35.6595, 139.7015], width: 196, height: 148, style: 'compact' },
  { id: 'ueno-low', position: [35.7138, 139.7770], width: 192, height: 144, style: 'garden' },
  { id: 'bay-low', position: [35.6400, 139.7865], width: 218, height: 154, style: 'waterfront' },
];

const MID_BLOCKS: BlockSpec[] = [
  { id: 'shinjuku-mid-1', position: [35.6945, 139.7025], width: 142, height: 110, style: 'downtown' },
  { id: 'shinjuku-mid-2', position: [35.6908, 139.7115], width: 138, height: 108, style: 'compact' },
  { id: 'marunouchi-mid-1', position: [35.6818, 139.7645], width: 150, height: 114, style: 'civic' },
  { id: 'marunouchi-mid-2', position: [35.6767, 139.7728], width: 136, height: 106, style: 'downtown' },
  { id: 'ueno-mid', position: [35.7138, 139.7805], width: 136, height: 106, style: 'garden' },
  { id: 'asakusa-mid', position: [35.7115, 139.7960], width: 128, height: 102, style: 'compact' },
  { id: 'shibuya-mid', position: [35.6593, 139.7038], width: 134, height: 104, style: 'compact' },
  { id: 'bay-mid', position: [35.6516, 139.7940], width: 146, height: 112, style: 'waterfront' },
];

const HIGH_BLOCKS: BlockSpec[] = [
  { id: 'tokyo-high-1', position: [35.6819, 139.7648], width: 96, height: 76, style: 'civic' },
  { id: 'tokyo-high-2', position: [35.6797, 139.7700], width: 92, height: 72, style: 'compact' },
  { id: 'tokyo-high-3', position: [35.6748, 139.7652], width: 96, height: 74, style: 'downtown' },
  { id: 'tokyo-high-4', position: [35.6718, 139.7715], width: 88, height: 70, style: 'compact' },
  { id: 'tokyo-high-5', position: [35.6875, 139.7535], width: 90, height: 72, style: 'garden' },
  { id: 'tokyo-high-6', position: [35.6650, 139.7580], width: 92, height: 72, style: 'compact' },
  { id: 'tokyo-high-7', position: [35.6610, 139.7865], width: 96, height: 74, style: 'waterfront' },
  { id: 'tokyo-high-8', position: [35.7062, 139.7942], width: 92, height: 70, style: 'compact' },
];

const createRoadSvg = (width: number, height: number, palette: { road: string; roadEdge: string; lane: string }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000" flood-opacity="0.16"/></filter>
  </defs>
  <g filter="url(#shadow)">
    <path d="M10 ${height - 48} C ${width * 0.18} ${height - 92}, ${width * 0.32} ${height - 18}, ${width * 0.48} ${height - 62} S ${width * 0.8} ${height - 116}, ${width - 12} ${height - 50}" fill="none" stroke="${palette.roadEdge}" stroke-width="30" stroke-linecap="round"/>
    <path d="M10 ${height - 48} C ${width * 0.18} ${height - 92}, ${width * 0.32} ${height - 18}, ${width * 0.48} ${height - 62} S ${width * 0.8} ${height - 116}, ${width - 12} ${height - 50}" fill="none" stroke="${palette.road}" stroke-width="22" stroke-linecap="round"/>
    <path d="M12 ${height - 48} C ${width * 0.18} ${height - 92}, ${width * 0.32} ${height - 18}, ${width * 0.48} ${height - 62} S ${width * 0.8} ${height - 116}, ${width - 14} ${height - 50}" fill="none" stroke="${palette.lane}" stroke-width="4" stroke-linecap="round" stroke-dasharray="12 12"/>
  </g>
</svg>`;

const buildingSvg = (x: number, y: number, w: number, h: number, depth: number, colors: { top: string; left: string; right: string; window: string; stroke?: string }) => {
  const top = `${x},${y + depth} ${x + depth},${y} ${x + w + depth},${y} ${x + w},${y + depth}`;
  const left = `${x},${y + depth} ${x},${y + h + depth} ${x + w},${y + h + depth} ${x + w},${y + depth}`;
  const right = `${x + w},${y + depth} ${x + w},${y + h + depth} ${x + w + depth},${y + h} ${x + w + depth},${y}`;
  const windows = [] as string[];
  const cols = Math.max(2, Math.floor(w / 16));
  const rows = Math.max(2, Math.floor(h / 18));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const wx = x + 8 + col * ((w - 16) / cols);
      const wy = y + depth + 10 + row * ((h - 18) / rows);
      windows.push(`<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="5.8" height="7" rx="1.6" fill="${colors.window}" fill-opacity="0.84"/>`);
    }
  }
  return `
    <polygon points="${top}" fill="${colors.top}" stroke="${colors.stroke ?? 'rgba(20,20,20,0.12)'}" stroke-width="1"/>
    <polygon points="${left}" fill="${colors.left}" stroke="${colors.stroke ?? 'rgba(20,20,20,0.12)'}" stroke-width="1"/>
    <polygon points="${right}" fill="${colors.right}" stroke="${colors.stroke ?? 'rgba(20,20,20,0.12)'}" stroke-width="1"/>
    ${windows.join('')}
  `;
};

const treeSvg = (cx: number, cy: number, color: string) => `
  <circle cx="${cx}" cy="${cy}" r="8" fill="${color}" opacity="0.95"/>
  <circle cx="${cx - 8}" cy="${cy + 4}" r="6" fill="${color}" opacity="0.88"/>
  <circle cx="${cx + 7}" cy="${cy + 4}" r="6" fill="${color}" opacity="0.88"/>
  <rect x="${cx - 1.6}" y="${cy + 8}" width="3.2" height="8" rx="1.2" fill="#81604a"/>
`;

const createBlockSvg = (style: BlockStyle, width: number, height: number) => {
  const palettes = {
    downtown: {
      topA: '#5fc3ff', leftA: '#66a4f2', rightA: '#2f7fd6',
      topB: '#ff765d', leftB: '#e85f48', rightB: '#d65138',
      topC: '#ffd85f', leftC: '#e8c54e', rightC: '#d9b43d',
      road: '#3f444a', roadEdge: '#2c3136', lane: '#f8d55a', window: '#f6fbff', tree: '#86c65b',
    },
    civic: {
      topA: '#f6ba63', leftA: '#d99a4d', rightA: '#c5833a',
      topB: '#7ec1ea', leftB: '#5c9bd5', rightB: '#467fb9',
      topC: '#f37b63', leftC: '#d75f4e', rightC: '#bd4d40',
      road: '#45484e', roadEdge: '#2d3136', lane: '#f8e08a', window: '#f7f2de', tree: '#77b658',
    },
    garden: {
      topA: '#8fdab0', leftA: '#6bbd90', rightA: '#58a57c',
      topB: '#ffd36b', leftB: '#e8be53', rightB: '#d2aa48',
      topC: '#f79072', leftC: '#e27459', rightC: '#ca644c',
      road: '#44494d', roadEdge: '#2c3236', lane: '#f3d784', window: '#fcfbf0', tree: '#68b05a',
    },
    waterfront: {
      topA: '#8ad6ef', leftA: '#63b5d4', rightA: '#4f9bbc',
      topB: '#ff9e70', leftB: '#ea7d5c', rightB: '#d86b4e',
      topC: '#fff1b6', leftC: '#eadc93', rightC: '#d2c27a',
      road: '#44484d', roadEdge: '#2a2f34', lane: '#f8df8a', window: '#fffef6', tree: '#73bc65',
    },
    compact: {
      topA: '#ff8470', leftA: '#e36a57', rightA: '#c85845',
      topB: '#5fc0f5', leftB: '#49a6d8', rightB: '#3b8fbe',
      topC: '#ffe367', leftC: '#e8c94f', rightC: '#d3b445',
      road: '#464b50', roadEdge: '#2d3137', lane: '#f7d969', window: '#fffef8', tree: '#79bf59',
    },
  } as const;
  const p = palettes[style];
  const road = createRoadSvg(width, height, { road: p.road, roadEdge: p.roadEdge, lane: p.lane });
  const scene = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000" flood-opacity="0.18"/></filter>
    </defs>
    <rect width="${width}" height="${height}" fill="transparent"/>
    <polygon points="26,${height - 48} ${width - 26},${height - 68} ${width - 54},${height - 18} 14,${height - 2}" fill="#f5f0df" opacity="0.96"/>
    <image href="${svgToDataUri(road)}" x="0" y="0" width="${width}" height="${height}"/>
    <g filter="url(#shadow)">
      ${buildingSvg(30, 28, 32, 48, 10, { top: p.topA, left: p.leftA, right: p.rightA, window: p.window })}
      ${buildingSvg(74, 18, 40, 62, 12, { top: p.topB, left: p.leftB, right: p.rightB, window: p.window })}
      ${buildingSvg(126, 36, 34, 44, 10, { top: p.topC, left: p.leftC, right: p.rightC, window: p.window })}
      ${buildingSvg(162, 50, 28, 30, 8, { top: p.topA, left: p.leftA, right: p.rightA, window: p.window })}
      ${style !== 'compact' ? buildingSvg(112, 78, 48, 34, 9, { top: p.topB, left: p.leftB, right: p.rightB, window: p.window }) : ''}
      ${style === 'civic' ? `<rect x="92" y="82" width="52" height="28" rx="4" fill="#d89d5b"/><circle cx="118" cy="78" r="12" fill="#7ec1ea" stroke="#4d88af" stroke-width="4"/><rect x="114" y="60" width="8" height="10" rx="2" fill="#f7f2de"/>` : ''}
      ${style === 'waterfront' ? `<path d="M150 118 C 170 108, 192 108, 210 118 L 210 ${height - 12} L 132 ${height - 8} Z" fill="#84d9f0" opacity="0.82"/>` : ''}
    </g>
    ${treeSvg(52, height - 44, p.tree)}
    ${treeSvg(96, height - 38, p.tree)}
    ${treeSvg(145, height - 30, p.tree)}
    ${style !== 'downtown' ? treeSvg(180, height - 40, p.tree) : ''}
  </svg>`;
  return scene;
};

const createBlockIcon = (block: BlockSpec, zoom: number) => {
  const scale = block.scale ?? 1;
  const zoomFactor = zoom <= 11.8 ? 1 : zoom <= 13.5 ? 0.88 : 0.72;
  const width = Math.round(block.width * scale * zoomFactor);
  const height = Math.round(block.height * scale * zoomFactor);
  const anchor: [number, number] = block.anchor ?? [Math.round(width / 2), Math.round(height * 0.82)];
  const svg = createBlockSvg(block.style, width, height);
  return L.divIcon({
    className: 'tokyo-mini-block-icon',
    html: `<div class="tokyo-mini-block" style="width:${width}px;height:${height}px"><img src="${svgToDataUri(svg)}" width="${width}" height="${height}" alt="" /></div>`,
    iconSize: [width, height],
    iconAnchor: anchor,
  });
};

export default function TokyoIllustrationLayer() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
    moveend() {
      setZoom(map.getZoom());
    },
  });

  const lowIcons = useMemo(() => LOW_BLOCKS.map((block) => ({ ...block, icon: createBlockIcon(block, zoom) })), [zoom]);
  const midIcons = useMemo(() => MID_BLOCKS.map((block) => ({ ...block, icon: createBlockIcon(block, zoom) })), [zoom]);
  const highIcons = useMemo(() => HIGH_BLOCKS.map((block) => ({ ...block, icon: createBlockIcon(block, zoom) })), [zoom]);

  const showLow = zoom <= 11.9;
  const showMid = zoom > 11.4 && zoom <= 13.6;
  const showHigh = zoom >= 13.0;

  const roadBase = zoom >= 14.5 ? 16 : zoom >= 13 ? 18 : zoom >= 11.5 ? 20 : 24;
  const roadAccent = Math.max(8, roadBase - 6);
  const washOpacity = zoom >= 14.5 ? 0.1 : zoom >= 13 ? 0.14 : 0.18;

  return (
    <>
      <Pane name="tokyo-wash-pane" style={{ zIndex: 210, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
        <Rectangle
          bounds={TOKYO_ILLUSTRATION_THEME.bounds}
          pathOptions={{
            stroke: false,
            fillColor: '#f7f2e8',
            fillOpacity: zoom >= 14 ? 0.09 : 0.12,
          }}
        />
        <ImageOverlay url={TOKYO_WASH_URL} bounds={TOKYO_ILLUSTRATION_THEME.bounds} opacity={washOpacity} />
        <ImageOverlay url={TOKYO_BAY_PATCH} bounds={[[35.58, 139.73], [35.72, 139.92]]} opacity={zoom >= 14 ? 0.18 : 0.24} />
      </Pane>

      <Pane name="tokyo-park-pane" style={{ zIndex: 220, pointerEvents: 'none' }}>
        {PARK_PATCHES.map((park, index) => (
          <Circle
            key={index}
            center={park.center}
            radius={park.radius}
            pathOptions={{
              color: TOKYO_ILLUSTRATION_THEME.palette.park,
              weight: 0,
              fillColor: TOKYO_ILLUSTRATION_THEME.palette.park,
              fillOpacity: zoom >= 14 ? 0.12 : 0.16,
            }}
          />
        ))}
      </Pane>

      <Pane name="tokyo-road-shadow-pane" style={{ zIndex: 230, pointerEvents: 'none' }}>
        {PRIMARY_ROADS.map((path, index) => (
          <Polyline
            key={`p-shadow-${index}`}
            positions={path}
            pathOptions={{ color: '#31363b', weight: roadBase + 8, opacity: 0.46, lineCap: 'round', lineJoin: 'round' }}
          />
        ))}
        {SECONDARY_ROADS.map((path, index) => (
          <Polyline
            key={`s-shadow-${index}`}
            positions={path}
            pathOptions={{ color: '#3a4045', weight: roadBase + 4, opacity: 0.28, lineCap: 'round', lineJoin: 'round' }}
          />
        ))}
      </Pane>

      <Pane name="tokyo-road-pane" style={{ zIndex: 232, pointerEvents: 'none' }}>
        {PRIMARY_ROADS.map((path, index) => (
          <Polyline
            key={`p-road-${index}`}
            positions={path}
            pathOptions={{ color: '#50565b', weight: roadBase, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
          />
        ))}
        {SECONDARY_ROADS.map((path, index) => (
          <Polyline
            key={`s-road-${index}`}
            positions={path}
            pathOptions={{ color: '#5d6368', weight: roadBase - 5, opacity: 0.76, lineCap: 'round', lineJoin: 'round' }}
          />
        ))}
      </Pane>

      <Pane name="tokyo-road-line-pane" style={{ zIndex: 234, pointerEvents: 'none' }}>
        {PRIMARY_ROADS.map((path, index) => (
          <Polyline
            key={`p-line-${index}`}
            positions={path}
            pathOptions={{ color: '#f6dc7a', weight: roadAccent, opacity: 0.96, lineCap: 'round', lineJoin: 'round', dashArray: zoom >= 14 ? '1 16' : '1 18' }}
          />
        ))}
        {SECONDARY_ROADS.map((path, index) => (
          <Polyline
            key={`s-line-${index}`}
            positions={path}
            pathOptions={{ color: '#dfe8eb', weight: Math.max(4, roadAccent - 4), opacity: 0.72, lineCap: 'round', lineJoin: 'round', dashArray: zoom >= 14 ? '1 18' : '1 20' }}
          />
        ))}
      </Pane>

      <Pane name="tokyo-block-pane" style={{ zIndex: 245, pointerEvents: 'none' }}>
        {showLow && lowIcons.map((block) => <Marker key={block.id} position={block.position} icon={block.icon} interactive={false} />)}
        {showMid && midIcons.map((block) => <Marker key={block.id} position={block.position} icon={block.icon} interactive={false} />)}
        {showHigh && highIcons.map((block) => <Marker key={block.id} position={block.position} icon={block.icon} interactive={false} />)}
      </Pane>
    </>
  );
}

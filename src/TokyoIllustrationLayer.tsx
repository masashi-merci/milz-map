import { useState } from 'react';
import { Circle, ImageOverlay, Pane, Polyline, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import { TOKYO_ILLUSTRATION_THEME } from './illustrationMaps';

const TOKYO_PRIMARY_ROUTE: [number, number][] = [
  [35.6938, 139.7034],
  [35.6896, 139.7304],
  [35.6907, 139.7495],
  [35.6812, 139.7671],
  [35.6762, 139.7603],
  [35.6717, 139.7650],
  [35.6660, 139.7708],
  [35.6550, 139.7953],
];

const TOKYO_SECONDARY_ROUTE: [number, number][] = [
  [35.6595, 139.7005],
  [35.6655, 139.7293],
  [35.6680, 139.7414],
  [35.6639, 139.7580],
  [35.6580, 139.7782],
  [35.6274, 139.7768],
];

const TOKYO_WATERFRONT_ROUTE: [number, number][] = [
  [35.7138, 139.7770],
  [35.7061, 139.7745],
  [35.6812, 139.7671],
  [35.6735, 139.7638],
  [35.6678, 139.7941],
  [35.6274, 139.7768],
];

const TOKYO_PARKS = [
  { center: [35.6852, 139.7528] as [number, number], radius: 1200 },
  { center: [35.6727, 139.6949] as [number, number], radius: 980 },
  { center: [35.7156, 139.7745] as [number, number], radius: 820 },
  { center: [35.6254, 139.7757] as [number, number], radius: 720 },
];

const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/
\s+/g, ' ').trim())}`;

const TOKYO_WASH_URL = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <defs>
    <filter id="blur1" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="44" />
    </filter>
    <filter id="blur2" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="24" />
    </filter>
    <pattern id="paper" width="160" height="160" patternUnits="userSpaceOnUse">
      <circle cx="22" cy="30" r="2" fill="#ffffff" fill-opacity="0.28"/>
      <circle cx="116" cy="78" r="1.6" fill="#20312c" fill-opacity="0.05"/>
      <circle cx="62" cy="126" r="1.5" fill="#ffffff" fill-opacity="0.16"/>
      <circle cx="136" cy="140" r="1.1" fill="#20312c" fill-opacity="0.04"/>
    </pattern>
  </defs>
  <rect width="1600" height="1200" fill="#f6f3ea" fill-opacity="0.18"/>
  <rect width="1600" height="1200" fill="url(#paper)" opacity="0.95"/>
  <g filter="url(#blur1)" opacity="0.34">
    <ellipse cx="340" cy="260" rx="240" ry="160" fill="#bfd6d8"/>
    <ellipse cx="1180" cy="300" rx="260" ry="180" fill="#c2d7b0"/>
    <ellipse cx="520" cy="830" rx="280" ry="180" fill="#ead19d"/>
    <ellipse cx="1220" cy="860" rx="320" ry="220" fill="#bfd6d8"/>
  </g>
  <g filter="url(#blur2)" opacity="0.42">
    <path d="M260 370 C 420 280, 610 300, 790 390 S 1110 520, 1350 470" fill="none" stroke="#dd9d37" stroke-width="54" stroke-linecap="round"/>
    <path d="M240 720 C 430 610, 580 610, 790 670 S 1140 790, 1360 710" fill="none" stroke="#84a7b4" stroke-width="60" stroke-linecap="round"/>
  </g>
</svg>`);

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

  const primaryWeight = zoom >= 14 ? 8 : zoom >= 12 ? 10 : 12;
  const secondaryWeight = zoom >= 14 ? 6 : zoom >= 12 ? 8 : 10;
  const washOpacity = zoom >= 14 ? 0.12 : zoom >= 12 ? 0.18 : 0.24;

  return (
    <>
      <Pane name="tokyo-wash-pane" style={{ zIndex: 210, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
        <Rectangle
          bounds={TOKYO_ILLUSTRATION_THEME.bounds}
          pathOptions={{ stroke: false, fillColor: TOKYO_ILLUSTRATION_THEME.palette.wash, fillOpacity: zoom >= 14 ? 0.06 : 0.09 }}
        />
        <ImageOverlay
          url={TOKYO_WASH_URL}
          bounds={TOKYO_ILLUSTRATION_THEME.bounds}
          opacity={washOpacity}
        />
      </Pane>

      <Pane name="tokyo-park-pane" style={{ zIndex: 230, pointerEvents: 'none' }}>
        {TOKYO_PARKS.map((park, index) => (
          <Circle
            key={`park-${index}`}
            center={park.center}
            radius={park.radius}
            pathOptions={{
              color: TOKYO_ILLUSTRATION_THEME.palette.park,
              weight: 0,
              fillColor: TOKYO_ILLUSTRATION_THEME.palette.park,
              fillOpacity: zoom >= 14 ? 0.10 : 0.15,
            }}
          />
        ))}
      </Pane>

      <Pane name="tokyo-route-pane" style={{ zIndex: 260, pointerEvents: 'none' }}>
        <Polyline
          positions={TOKYO_PRIMARY_ROUTE}
          pathOptions={{
            color: TOKYO_ILLUSTRATION_THEME.palette.routePrimary,
            weight: primaryWeight,
            opacity: 0.86,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <Polyline
          positions={TOKYO_SECONDARY_ROUTE}
          pathOptions={{
            color: TOKYO_ILLUSTRATION_THEME.palette.routeSecondary,
            weight: secondaryWeight,
            opacity: 0.74,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <Polyline
          positions={TOKYO_WATERFRONT_ROUTE}
          pathOptions={{
            color: '#a8c9d3',
            weight: secondaryWeight - 1,
            opacity: 0.62,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: zoom >= 14 ? '2 10' : '3 14',
          }}
        />
      </Pane>
    </>
  );
}

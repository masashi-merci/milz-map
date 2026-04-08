import { useEffect, useMemo, useState } from 'react';
import { Circle, ImageOverlay, Pane, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import { TOKYO_ILLUSTRATION_THEME, type TokyoViewMode } from './illustrationMaps';

const TOKYO_PARKS = [
  { center: [35.6852, 139.7528] as [number, number], radius: 1200 },
  { center: [35.6727, 139.6949] as [number, number], radius: 980 },
  { center: [35.7156, 139.7745] as [number, number], radius: 820 },
  { center: [35.6254, 139.7757] as [number, number], radius: 720 },
];

const TOKYO_WATER = [
  { center: [35.659, 139.779] as [number, number], radius: 1600 },
  { center: [35.628, 139.788] as [number, number], radius: 1800 },
];

const TOKYO_DISTRICT_MASS_URL = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#25313a" flood-opacity="0.12"/>
    </filter>
    <filter id="blur1" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>

  <g opacity="0.5" filter="url(#blur1)">
    <ellipse cx="280" cy="200" rx="160" ry="120" fill="#d7e6ee"/>
    <ellipse cx="1280" cy="230" rx="180" ry="140" fill="#dce7d5"/>
    <ellipse cx="540" cy="920" rx="260" ry="180" fill="#e5d8bd"/>
    <ellipse cx="1200" cy="890" rx="240" ry="180" fill="#d1e4ed"/>
  </g>

  <g filter="url(#shadow)" opacity="0.54">
    <g transform="translate(250 395)">${renderCluster('#edf2ec', '#c9d0c5', '#aab2a7')}</g>
    <g transform="translate(520 500) scale(1.06)">${renderCluster('#eff3ef', '#d2d7d0', '#adb5ad')}</g>
    <g transform="translate(810 438) scale(1.08)">${renderCluster('#e7eef1', '#c6d2d7', '#9eaab0')}</g>
    <g transform="translate(1065 628) scale(0.96)">${renderCluster('#f1eadf', '#d9ccbb', '#b8ab9b')}</g>
    <g transform="translate(1040 315) scale(0.92)">${renderCluster('#dfe8da', '#c2cfba', '#9ead96')}</g>
    <g transform="translate(350 760) scale(0.88)">${renderCluster('#ebeff0', '#ced6d8', '#a8b1b4')}</g>
  </g>
</svg>`);

const TOKYO_WASH_URL = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <defs>
    <filter id="blur1" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="44" />
    </filter>
    <pattern id="paper" width="160" height="160" patternUnits="userSpaceOnUse">
      <circle cx="22" cy="30" r="2" fill="#ffffff" fill-opacity="0.18"/>
      <circle cx="116" cy="78" r="1.6" fill="#20312c" fill-opacity="0.03"/>
      <circle cx="62" cy="126" r="1.5" fill="#ffffff" fill-opacity="0.12"/>
      <circle cx="136" cy="140" r="1.1" fill="#20312c" fill-opacity="0.02"/>
    </pattern>
  </defs>
  <rect width="1600" height="1200" fill="#f6f5f1" fill-opacity="0.16"/>
  <rect width="1600" height="1200" fill="url(#paper)" opacity="0.92"/>
  <g filter="url(#blur1)" opacity="0.28">
    <ellipse cx="320" cy="225" rx="240" ry="160" fill="#bdd6e3"/>
    <ellipse cx="1180" cy="270" rx="260" ry="180" fill="#d7e3d0"/>
    <ellipse cx="520" cy="860" rx="300" ry="190" fill="#e9d5b6"/>
    <ellipse cx="1230" cy="860" rx="330" ry="220" fill="#bfd4e2"/>
  </g>
</svg>`);

function renderCluster(top: string, side: string, shadow: string) {
  const blocks = [
    { x: 0, y: 42, w: 86, h: 42, d: 20 },
    { x: 92, y: 14, w: 74, h: 36, d: 18 },
    { x: 170, y: 60, w: 66, h: 32, d: 16 },
    { x: 60, y: 86, w: 108, h: 50, d: 22 },
    { x: 190, y: 102, w: 58, h: 28, d: 14 },
    { x: 145, y: -18, w: 42, h: 70, d: 18 },
  ];

  return blocks
    .map(({ x, y, w, h, d }) => {
      const topPoly = `${x},${y} ${x + w},${y} ${x + w + d},${y + d} ${x + d},${y + d}`;
      const rightPoly = `${x + w},${y} ${x + w + d},${y + d} ${x + w + d},${y + h + d} ${x + w},${y + h}`;
      const frontPoly = `${x},${y} ${x + d},${y + d} ${x + d},${y + h + d} ${x},${y + h}`;
      return `
        <polygon points="${frontPoly}" fill="${side}" opacity="0.88"/>
        <polygon points="${rightPoly}" fill="${shadow}" opacity="0.88"/>
        <polygon points="${topPoly}" fill="${top}" opacity="0.92"/>
      `;
    })
    .join('');
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

function cleanMilzPerspectiveTransform(value: string) {
  return value
    .replace(/\s*perspective\([^)]*\)\s*rotateX\([^)]*\)\s*scale\([^)]*\)\s*translateY\([^)]*\)\s*$/, '')
    .trim();
}

const perspectiveByView: Record<TokyoViewMode, string> = {
  top: '',
  softTilt: ' perspective(1600px) rotateX(10deg) scale(1.06) translateY(12px)',
  miniature: ' perspective(1400px) rotateX(17deg) scale(1.11) translateY(22px)',
};

export default function TokyoIllustrationLayer({ viewMode }: { viewMode: TokyoViewMode }) {
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

  useEffect(() => {
    const pane = map.getPanes().mapPane;
    if (!pane) return;

    let raf = 0;
    const applyPerspective = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const currentTransform = pane.style.transform || '';
        const baseTransform = cleanMilzPerspectiveTransform(currentTransform);
        pane.style.transformOrigin = '50% 58%';
        pane.style.transformStyle = 'preserve-3d';
        pane.style.willChange = 'transform';
        pane.style.transform = `${baseTransform}${perspectiveByView[viewMode]}`.trim();
      });
    };

    applyPerspective();

    const observer = new MutationObserver(applyPerspective);
    observer.observe(pane, { attributes: true, attributeFilter: ['style'] });

    map.on('move', applyPerspective);
    map.on('moveend', applyPerspective);
    map.on('zoom', applyPerspective);
    map.on('zoomend', applyPerspective);
    map.on('resize', applyPerspective);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      map.off('move', applyPerspective);
      map.off('moveend', applyPerspective);
      map.off('zoom', applyPerspective);
      map.off('zoomend', applyPerspective);
      map.off('resize', applyPerspective);
      pane.style.transform = cleanMilzPerspectiveTransform(pane.style.transform || '');
      pane.style.transformOrigin = '';
      pane.style.transformStyle = '';
      pane.style.willChange = '';
    };
  }, [map, viewMode]);

  const overlayConfig = useMemo(() => {
    const baseByView: Record<TokyoViewMode, { wash: number; mass: number; park: number; water: number }> = {
      top: { wash: 0.04, mass: 0.04, park: 0.06, water: 0.08 },
      softTilt: { wash: 0.08, mass: 0.08, park: 0.09, water: 0.1 },
      miniature: { wash: 0.12, mass: 0.12, park: 0.11, water: 0.12 },
    };

    const selected = baseByView[viewMode];

    if (zoom >= 14.8) {
      return {
        washOpacity: selected.wash * 0.65,
        parkOpacity: selected.park * 0.75,
        waterOpacity: selected.water * 0.72,
        massOpacity: 0,
        showMasses: false,
      };
    }

    if (zoom >= 13.2) {
      return {
        washOpacity: selected.wash,
        parkOpacity: selected.park,
        waterOpacity: selected.water,
        massOpacity: selected.mass * 0.7,
        showMasses: true,
      };
    }

    return {
      washOpacity: selected.wash * 1.1,
      parkOpacity: selected.park * 1.1,
      waterOpacity: selected.water * 1.1,
      massOpacity: selected.mass,
      showMasses: true,
    };
  }, [viewMode, zoom]);

  return (
    <>
      <Pane name="tokyo-base-wash-pane" style={{ zIndex: 205, pointerEvents: 'none', mixBlendMode: 'screen' }}>
        <Rectangle
          bounds={TOKYO_ILLUSTRATION_THEME.bounds}
          pathOptions={{
            stroke: false,
            fillColor: TOKYO_ILLUSTRATION_THEME.palette.wash,
            fillOpacity: zoom >= 14.8 ? 0.03 : 0.05,
          }}
        />
        <ImageOverlay url={TOKYO_WASH_URL} bounds={TOKYO_ILLUSTRATION_THEME.bounds} opacity={overlayConfig.washOpacity} />
      </Pane>

      <Pane name="tokyo-water-pane" style={{ zIndex: 214, pointerEvents: 'none' }}>
        {TOKYO_WATER.map((water, index) => (
          <Circle
            key={`water-${index}`}
            center={water.center}
            radius={water.radius}
            pathOptions={{
              color: TOKYO_ILLUSTRATION_THEME.palette.water,
              weight: 0,
              fillColor: TOKYO_ILLUSTRATION_THEME.palette.water,
              fillOpacity: overlayConfig.waterOpacity,
            }}
          />
        ))}
      </Pane>

      <Pane name="tokyo-park-pane" style={{ zIndex: 220, pointerEvents: 'none' }}>
        {TOKYO_PARKS.map((park, index) => (
          <Circle
            key={`park-${index}`}
            center={park.center}
            radius={park.radius}
            pathOptions={{
              color: TOKYO_ILLUSTRATION_THEME.palette.park,
              weight: 0,
              fillColor: TOKYO_ILLUSTRATION_THEME.palette.park,
              fillOpacity: overlayConfig.parkOpacity,
            }}
          />
        ))}
      </Pane>

      {overlayConfig.showMasses && (
        <Pane name="tokyo-mass-pane" style={{ zIndex: 238, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
          <ImageOverlay url={TOKYO_DISTRICT_MASS_URL} bounds={TOKYO_ILLUSTRATION_THEME.bounds} opacity={overlayConfig.massOpacity} />
        </Pane>
      )}
    </>
  );
}

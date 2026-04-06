export type IllustrationThemeKey = 'tokyo' | 'new_york' | 'hawaii' | 'kyoto' | 'seoul';
export type MapThemeKey = 'original' | IllustrationThemeKey;

type LatLngTuple = [number, number];
type BoundsTuple = [LatLngTuple, LatLngTuple];

interface StandardTheme {
  type: 'standard';
  name: string;
  description: string;
  url: string;
  attribution: string;
}

interface IllustrationTheme {
  type: 'illustration';
  name: string;
  description: string;
  url: string;
  attribution: string;
  center: LatLngTuple;
  zoom: number;
  bounds: BoundsTuple;
  imageUrl: string;
}

export type MapTheme = StandardTheme | IllustrationTheme;

const baseTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const baseAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n\s+/g, ' ').trim())}`;

const withShell = ({
  title,
  subtitle,
  palette,
  content,
}: {
  title: string;
  subtitle: string;
  palette: { background: string; panel: string; route: string; accent: string; accent2: string; text: string; water?: string };
  content: string;
}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="980" viewBox="0 0 1400 980">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.background}"/>
      <stop offset="100%" stop-color="${palette.panel}"/>
    </linearGradient>
    <filter id="paperShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#000000" flood-opacity="0.10"/>
    </filter>
    <pattern id="paperNoise" width="120" height="120" patternUnits="userSpaceOnUse">
      <circle cx="18" cy="24" r="1.1" fill="#ffffff" fill-opacity="0.25"/>
      <circle cx="88" cy="46" r="1.4" fill="#000000" fill-opacity="0.04"/>
      <circle cx="62" cy="86" r="1.2" fill="#ffffff" fill-opacity="0.18"/>
      <circle cx="102" cy="102" r="1" fill="#000000" fill-opacity="0.05"/>
    </pattern>
  </defs>

  <rect width="1400" height="980" fill="url(#bg)" />
  <rect width="1400" height="980" fill="url(#paperNoise)" opacity="0.9" />
  <rect x="44" y="44" width="1312" height="892" rx="42" fill="#ffffff" fill-opacity="0.42" stroke="#ffffff" stroke-opacity="0.55" />
  <rect x="92" y="92" width="1216" height="796" rx="48" fill="${palette.panel}" filter="url(#paperShadow)" />
  <rect x="118" y="118" width="1164" height="744" rx="40" fill="#ffffff" fill-opacity="0.25" stroke="#ffffff" stroke-opacity="0.42" />

  <g opacity="0.22">
    <circle cx="260" cy="198" r="90" fill="${palette.accent2}" />
    <circle cx="1140" cy="170" r="110" fill="${palette.accent}" />
    <circle cx="1180" cy="768" r="126" fill="${palette.accent2}" />
    <circle cx="214" cy="744" r="104" fill="${palette.accent}" />
  </g>

  ${content}

  <g transform="translate(146 786)">
    <text x="0" y="0" font-family="Inter, Arial, sans-serif" font-size="78" font-weight="900" letter-spacing="8" fill="${palette.text}">${title}</text>
    <text x="0" y="44" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="6" fill="${palette.text}" fill-opacity="0.58">${subtitle}</text>
  </g>
</svg>`;

const tokyoSvg = withShell({
  title: 'TOKYO',
  subtitle: 'Illustration Map / Marunouchi · Ginza · Shibuya',
  palette: {
    background: '#eef2ea',
    panel: '#dce7d8',
    route: '#efae47',
    accent: '#7aa0a0',
    accent2: '#8db37b',
    text: '#21322a',
  },
  content: `
    <path d="M248 248 C 356 164, 548 164, 666 244 S 1012 352, 1154 286" fill="none" stroke="#7f9f8f" stroke-width="82" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/>
    <path d="M288 576 C 444 468, 626 486, 768 566 S 1010 698, 1156 616" fill="none" stroke="#87a7b4" stroke-width="96" stroke-linecap="round" stroke-linejoin="round" opacity="0.62"/>
    <path d="M324 218 C 438 162, 582 178, 674 254 S 924 350, 1088 300" fill="none" stroke="#efae47" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M312 552 C 440 468, 594 476, 736 556 S 1000 706, 1132 624" fill="none" stroke="#f2be62" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M720 168 L 720 718" fill="none" stroke="#efae47" stroke-width="18" stroke-linecap="round"/>
    <path d="M442 282 L 972 282" fill="none" stroke="#efae47" stroke-width="14" stroke-linecap="round" opacity="0.92"/>
    <path d="M394 462 L 1042 462" fill="none" stroke="#efae47" stroke-width="14" stroke-linecap="round" opacity="0.88"/>
    <path d="M454 648 L 986 648" fill="none" stroke="#efae47" stroke-width="14" stroke-linecap="round" opacity="0.86"/>
    <circle cx="720" cy="462" r="86" fill="#314739" opacity="0.14"/>
    <circle cx="720" cy="462" r="52" fill="#8db37b" stroke="#21322a" stroke-width="6"/>
    <rect x="684" y="350" width="72" height="130" rx="16" fill="#314739" opacity="0.18"/>
    <rect x="668" y="364" width="104" height="106" rx="22" fill="#f6f4ea" stroke="#21322a" stroke-width="8"/>
    <path d="M646 522 h148" stroke="#21322a" stroke-width="8" stroke-linecap="round" opacity="0.42"/>
    <rect x="894" y="314" width="48" height="182" rx="18" fill="#f6f4ea" stroke="#21322a" stroke-width="8"/>
    <rect x="284" y="610" width="164" height="92" rx="22" fill="#f6f4ea" stroke="#21322a" stroke-width="8"/>
    <rect x="960" y="592" width="148" height="84" rx="22" fill="#f6f4ea" stroke="#21322a" stroke-width="8"/>
    <g font-family="Inter, Arial, sans-serif" font-size="26" font-weight="800" fill="#21322a" opacity="0.82">
      <text x="500" y="248">SHINJUKU</text>
      <text x="824" y="248">UENO</text>
      <text x="532" y="430">IMPERIAL GARDENS</text>
      <text x="826" y="430">GINZA</text>
      <text x="420" y="624">SHIBUYA</text>
      <text x="868" y="618">TOYOSU</text>
      <text x="690" y="336">TOKYO STATION</text>
    </g>
    <g fill="#21322a">
      <circle cx="450" cy="282" r="10"/><circle cx="562" cy="282" r="10"/><circle cx="720" cy="282" r="10"/><circle cx="878" cy="282" r="10"/>
      <circle cx="466" cy="462" r="10"/><circle cx="612" cy="462" r="10"/><circle cx="830" cy="462" r="10"/><circle cx="964" cy="462" r="10"/>
      <circle cx="534" cy="648" r="10"/><circle cx="720" cy="648" r="10"/><circle cx="900" cy="648" r="10"/>
    </g>
  `,
});

const newYorkSvg = withShell({
  title: 'NEW YORK',
  subtitle: 'Illustration Map / Manhattan · Brooklyn · Queens',
  palette: {
    background: '#eef1e8',
    panel: '#dee5d4',
    route: '#f1b24d',
    accent: '#85b9c3',
    accent2: '#9cbc7d',
    text: '#25312f',
  },
  content: `
    <path d="M312 188 C 382 230, 456 324, 532 492 S 640 722, 710 784" fill="none" stroke="#85b9c3" stroke-width="176" stroke-linecap="round" opacity="0.58"/>
    <path d="M880 196 C 824 292, 798 384, 814 514 S 856 712, 900 790" fill="none" stroke="#85b9c3" stroke-width="148" stroke-linecap="round" opacity="0.44"/>
    <path d="M1028 284 C 1044 366, 1046 432, 1020 540 S 1004 706, 1048 784" fill="none" stroke="#9cbc7d" stroke-width="168" stroke-linecap="round" opacity="0.46"/>
    <path d="M530 182 C 584 278, 636 358, 716 490 S 830 688, 898 814" fill="none" stroke="#f1b24d" stroke-width="24" stroke-linecap="round"/>
    <path d="M678 248 L 968 536" fill="none" stroke="#f1b24d" stroke-width="18" stroke-linecap="round"/>
    <path d="M566 340 L 856 628" fill="none" stroke="#f1b24d" stroke-width="14" stroke-linecap="round" opacity="0.78"/>
    <path d="M486 520 L 742 748" fill="none" stroke="#f1b24d" stroke-width="14" stroke-linecap="round" opacity="0.76"/>
    <rect x="560" y="284" width="64" height="152" rx="18" fill="#f6f4ea" stroke="#25312f" stroke-width="8"/>
    <rect x="632" y="214" width="62" height="222" rx="18" fill="#f6f4ea" stroke="#25312f" stroke-width="8"/>
    <rect x="1002" y="582" width="68" height="126" rx="18" fill="#f6f4ea" stroke="#25312f" stroke-width="8"/>
    <ellipse cx="758" cy="446" rx="56" ry="112" fill="#9cbc7d" stroke="#25312f" stroke-width="8"/>
    <ellipse cx="756" cy="446" rx="20" ry="58" fill="#25312f" opacity="0.18"/>
    <g font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" fill="#25312f" opacity="0.82">
      <text x="460" y="240">UPPER WEST</text>
      <text x="730" y="240">UPPER EAST</text>
      <text x="628" y="468">CENTRAL PARK</text>
      <text x="882" y="414">LONG ISLAND CITY</text>
      <text x="930" y="632">BROOKLYN</text>
      <text x="470" y="660">WEST VILLAGE</text>
      <text x="632" y="776">DOWNTOWN</text>
    </g>
    <g fill="#25312f">
      <circle cx="580" cy="286" r="10"/><circle cx="654" cy="362" r="10"/><circle cx="710" cy="454" r="10"/><circle cx="776" cy="546" r="10"/><circle cx="850" cy="658" r="10"/>
    </g>
  `,
});

const hawaiiSvg = withShell({
  title: 'HAWAII',
  subtitle: 'Illustration Map / Honolulu · Waikiki · Oahu',
  palette: {
    background: '#eaf3ef',
    panel: '#d8eee8',
    route: '#efb55e',
    accent: '#6fb8c4',
    accent2: '#89b47e',
    text: '#21403e',
  },
  content: `
    <path d="M238 624 C 330 520, 448 458, 592 438 S 832 432, 1032 374" fill="none" stroke="#6fb8c4" stroke-width="252" stroke-linecap="round" opacity="0.55"/>
    <path d="M300 612 C 392 524, 488 472, 598 452 S 812 454, 978 404" fill="none" stroke="#89b47e" stroke-width="126" stroke-linecap="round" opacity="0.78"/>
    <path d="M332 596 C 426 530, 528 494, 632 476 S 804 462, 944 420" fill="none" stroke="#efb55e" stroke-width="24" stroke-linecap="round"/>
    <path d="M528 334 L 674 486" fill="none" stroke="#efb55e" stroke-width="14" stroke-linecap="round" opacity="0.74"/>
    <path d="M794 344 L 670 480" fill="none" stroke="#efb55e" stroke-width="14" stroke-linecap="round" opacity="0.74"/>
    <path d="M424 298 C 496 242, 578 236, 646 296" fill="none" stroke="#89b47e" stroke-width="84" stroke-linecap="round" opacity="0.72"/>
    <path d="M704 286 C 764 238, 846 240, 910 292" fill="none" stroke="#89b47e" stroke-width="72" stroke-linecap="round" opacity="0.72"/>
    <circle cx="606" cy="310" r="44" fill="#f6f4ea" stroke="#21403e" stroke-width="8"/>
    <circle cx="826" cy="304" r="36" fill="#f6f4ea" stroke="#21403e" stroke-width="8"/>
    <rect x="770" y="486" width="146" height="84" rx="28" fill="#f6f4ea" stroke="#21403e" stroke-width="8"/>
    <rect x="448" y="510" width="168" height="86" rx="28" fill="#f6f4ea" stroke="#21403e" stroke-width="8"/>
    <g font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" fill="#21403e" opacity="0.82">
      <text x="466" y="292">NORTH SHORE</text>
      <text x="760" y="280">KAILUA</text>
      <text x="502" y="530">HONOLULU</text>
      <text x="782" y="538">WAIKIKI</text>
      <text x="622" y="676">DIAMOND HEAD</text>
    </g>
    <g fill="#21403e">
      <circle cx="474" cy="530" r="10"/><circle cx="594" cy="506" r="10"/><circle cx="812" cy="526" r="10"/><circle cx="884" cy="514" r="10"/>
    </g>
    <g opacity="0.56" fill="#f6f4ea">
      <circle cx="364" cy="398" r="12"/><circle cx="374" cy="420" r="6"/><circle cx="986" cy="278" r="10"/><circle cx="1004" cy="300" r="6"/>
    </g>
  `,
});

const kyotoSvg = withShell({
  title: 'KYOTO',
  subtitle: 'Illustration Map / Gion · Arashiyama · Higashiyama',
  palette: {
    background: '#f0eee7',
    panel: '#e5ded0',
    route: '#d6a35a',
    accent: '#89a7a8',
    accent2: '#9eb485',
    text: '#342b25',
  },
  content: `
    <path d="M252 244 C 398 198, 598 206, 764 252 S 1020 314, 1146 272" fill="none" stroke="#9eb485" stroke-width="110" stroke-linecap="round" opacity="0.68"/>
    <path d="M268 634 C 414 544, 602 530, 784 596 S 1044 662, 1140 622" fill="none" stroke="#89a7a8" stroke-width="128" stroke-linecap="round" opacity="0.56"/>
    <path d="M348 218 C 510 182, 676 198, 834 252 S 1038 314, 1092 298" fill="none" stroke="#d6a35a" stroke-width="24" stroke-linecap="round"/>
    <path d="M356 608 C 496 544, 650 544, 796 594 S 1008 650, 1090 632" fill="none" stroke="#d6a35a" stroke-width="22" stroke-linecap="round"/>
    <path d="M684 216 L 684 704" fill="none" stroke="#d6a35a" stroke-width="18" stroke-linecap="round"/>
    <path d="M462 382 L 962 382" fill="none" stroke="#d6a35a" stroke-width="14" stroke-linecap="round" opacity="0.82"/>
    <path d="M442 520 L 976 520" fill="none" stroke="#d6a35a" stroke-width="14" stroke-linecap="round" opacity="0.82"/>
    <rect x="648" y="264" width="74" height="134" rx="18" fill="#f6f1e6" stroke="#342b25" stroke-width="8"/>
    <path d="M590 452 h188" stroke="#342b25" stroke-width="8" stroke-linecap="round" opacity="0.38"/>
    <rect x="954" y="312" width="132" height="76" rx="22" fill="#f6f1e6" stroke="#342b25" stroke-width="8"/>
    <rect x="352" y="578" width="154" height="84" rx="22" fill="#f6f1e6" stroke="#342b25" stroke-width="8"/>
    <rect x="926" y="566" width="136" height="82" rx="22" fill="#f6f1e6" stroke="#342b25" stroke-width="8"/>
    <g font-family="Inter, Arial, sans-serif" font-size="27" font-weight="800" fill="#342b25" opacity="0.84">
      <text x="420" y="240">ARASHIYAMA</text>
      <text x="752" y="250">KYOTO IMPERIAL</text>
      <text x="564" y="372">NIJO</text>
      <text x="912" y="372">GION</text>
      <text x="444" y="612">KAMOGAWA</text>
      <text x="890" y="612">HIGASHIYAMA</text>
    </g>
    <g fill="#342b25">
      <circle cx="486" cy="382" r="10"/><circle cx="636" cy="382" r="10"/><circle cx="812" cy="382" r="10"/><circle cx="956" cy="382" r="10"/>
      <circle cx="498" cy="520" r="10"/><circle cx="684" cy="520" r="10"/><circle cx="862" cy="520" r="10"/>
    </g>
  `,
});

const seoulSvg = withShell({
  title: 'SEOUL',
  subtitle: 'Illustration Map / Jongno · Yongsan · Gangnam',
  palette: {
    background: '#eef0e9',
    panel: '#dce2d9',
    route: '#e9aa4b',
    accent: '#8db6c4',
    accent2: '#92b085',
    text: '#223230',
  },
  content: `
    <path d="M238 418 C 392 330, 566 312, 730 344 S 1002 420, 1140 392" fill="none" stroke="#8db6c4" stroke-width="140" stroke-linecap="round" opacity="0.58"/>
    <path d="M294 636 C 430 558, 604 544, 782 590 S 1022 664, 1142 634" fill="none" stroke="#92b085" stroke-width="116" stroke-linecap="round" opacity="0.64"/>
    <path d="M322 398 C 466 334, 618 332, 782 364 S 1018 430, 1088 416" fill="none" stroke="#e9aa4b" stroke-width="24" stroke-linecap="round"/>
    <path d="M354 622 C 484 562, 620 562, 770 598 S 988 664, 1086 646" fill="none" stroke="#e9aa4b" stroke-width="22" stroke-linecap="round"/>
    <path d="M690 228 L 690 740" fill="none" stroke="#e9aa4b" stroke-width="16" stroke-linecap="round"/>
    <path d="M500 486 L 950 486" fill="none" stroke="#e9aa4b" stroke-width="14" stroke-linecap="round" opacity="0.84"/>
    <rect x="644" y="278" width="92" height="104" rx="20" fill="#f6f4ea" stroke="#223230" stroke-width="8"/>
    <rect x="540" y="444" width="150" height="86" rx="22" fill="#f6f4ea" stroke="#223230" stroke-width="8"/>
    <rect x="806" y="434" width="152" height="86" rx="22" fill="#f6f4ea" stroke="#223230" stroke-width="8"/>
    <rect x="840" y="586" width="168" height="84" rx="24" fill="#f6f4ea" stroke="#223230" stroke-width="8"/>
    <circle cx="466" cy="314" r="54" fill="#92b085" stroke="#223230" stroke-width="8"/>
    <g font-family="Inter, Arial, sans-serif" font-size="27" font-weight="800" fill="#223230" opacity="0.84">
      <text x="398" y="320">BUKHAN</text>
      <text x="648" y="270">GYEONGBOKGUNG</text>
      <text x="528" y="438">JONGNO</text>
      <text x="824" y="428">YONGSAN</text>
      <text x="852" y="578">GANGNAM</text>
      <text x="560" y="730">HAN RIVER AXIS</text>
    </g>
    <g fill="#223230">
      <circle cx="522" cy="486" r="10"/><circle cx="690" cy="486" r="10"/><circle cx="860" cy="486" r="10"/>
      <circle cx="528" cy="620" r="10"/><circle cx="704" cy="620" r="10"/><circle cx="882" cy="620" r="10"/>
    </g>
  `,
});

export const MAP_THEMES: Record<MapThemeKey, MapTheme> = {
  original: {
    type: 'standard',
    name: 'オリジナル',
    description: '通常の実用マップ',
    url: baseTileUrl,
    attribution: baseAttribution,
  },
  tokyo: {
    type: 'illustration',
    name: '東京イラスト',
    description: '東京限定のポスター風マップ',
    url: baseTileUrl,
    attribution: baseAttribution,
    center: [35.6812, 139.7671],
    zoom: 12,
    bounds: [[35.52, 139.53], [35.84, 139.97]],
    imageUrl: svgToDataUri(tokyoSvg),
  },
  new_york: {
    type: 'illustration',
    name: 'NYイラスト',
    description: 'NYC限定のエディトリアル風マップ',
    url: baseTileUrl,
    attribution: baseAttribution,
    center: [40.758, -73.9855],
    zoom: 11,
    bounds: [[40.62, -74.12], [40.86, -73.84]],
    imageUrl: svgToDataUri(newYorkSvg),
  },
  hawaii: {
    type: 'illustration',
    name: 'Hawaiiイラスト',
    description: 'ホノルル・オアフ限定のリゾート風マップ',
    url: baseTileUrl,
    attribution: baseAttribution,
    center: [21.3069, -157.8583],
    zoom: 10,
    bounds: [[21.20, -158.33], [21.76, -157.55]],
    imageUrl: svgToDataUri(hawaiiSvg),
  },
  kyoto: {
    type: 'illustration',
    name: '京都イラスト',
    description: '京都限定のガイドブック風マップ',
    url: baseTileUrl,
    attribution: baseAttribution,
    center: [35.0116, 135.7681],
    zoom: 12,
    bounds: [[34.94, 135.62], [35.12, 135.86]],
    imageUrl: svgToDataUri(kyotoSvg),
  },
  seoul: {
    type: 'illustration',
    name: 'ソウルイラスト',
    description: 'ソウル限定の洗練された案内図',
    url: baseTileUrl,
    attribution: baseAttribution,
    center: [37.5665, 126.9780],
    zoom: 11,
    bounds: [[37.45, 126.82], [37.70, 127.18]],
    imageUrl: svgToDataUri(seoulSvg),
  },
};

export const isIllustrationTheme = (theme: MapThemeKey): theme is IllustrationThemeKey => theme !== 'original';

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
} from "react";

const TILE_SIZE = 256;
const MAX_POINTS = 4200;
const MIN_MAP_ZOOM = 2;
const MAX_MAP_ZOOM = 17;
const SPEEDS = [
  { label: "1×", step: 8 },
  { label: "2×", step: 20 },
  { label: "4×", step: 48 },
] as const;

const LANGUAGES = {
  pt: { short: "PT", label: "Português", locale: "pt-BR", htmlLang: "pt-BR" },
  en: { short: "EN", label: "English", locale: "en-US", htmlLang: "en" },
  es: { short: "ES", label: "Español", locale: "es-ES", htmlLang: "es" },
} as const;

const COPY = {
  pt: {
    brand: "Linha do tempo", language: "Idioma", uploadEyebrow: "Sua história, em movimento",
    uploadTitle: <>Veja seus <em>caminhos</em><br />ganharem vida.</>,
    uploadDescription: "Envie a exportação da sua Linha do Tempo e transforme anos de lugares, rotas e momentos em uma viagem visual.",
    dropTitle: "Solte seu arquivo aqui", dropDescription: "ou escolha o JSON exportado pelo Google Maps", selectFile: "Selecionar arquivo",
    privacy: <><strong>O arquivo fica com você.</strong> A leitura acontece no navegador e o histórico não é salvo no site.</>,
    howToEyebrow: "Antes de começar", howToTitle: "Como exportar sua Linha do Tempo",
    howToDescription: "Use o celular em que seu histórico está salvo. Quando terminar, volte aqui e escolha o arquivo JSON.",
    android: "Android",
    androidSteps: ["Abra as Configurações do aparelho.", "Vá em Local › Serviços de localização › Linha do Tempo.", "Toque em Exportar dados da Linha do Tempo e depois em Continuar.", "Escolha onde salvar o arquivo e toque em Salvar."],
    ios: "iPhone e iPad",
    iosSteps: ["Abra o Google Maps e toque na sua foto de perfil.", "Acesse Configurações › Conteúdo pessoal.", "Em Configurações de localização, toque em Exportar dados da Linha do Tempo.", "No menu do iPhone, escolha Salvar em Arquivos e confirme Salvar."],
    helpNote: "Dica: mantenha o Google Maps atualizado. O arquivo costuma ser salvo como location-history.json.",
    fileError: "Escolha um arquivo .json exportado pelo Google Maps.",
    parseError: "Não foi possível ler esse arquivo. Confirme se ele é uma exportação da Linha do Tempo do Google Maps.",
    noPoints: "Não encontramos pontos suficientes neste arquivo. Escolha uma exportação da Linha do Tempo do Google Maps.",
    changeFile: "Trocar arquivo", fileTitle: "Trocar o arquivo atual", timelineEyebrow: "Sua jornada",
    timelineTitle: "Todo caminho conta uma história.", mapLabel: "Mapa dos deslocamentos registrados",
    zoomIn: "Aproximar mapa", zoomOut: "Afastar mapa", resetZoom: "Ajustar mapa ao histórico",
    watchTimelapse: "Ver timelapse", play: "Iniciar timelapse", pause: "Pausar timelapse", restart: "Voltar ao início",
    moment: "Registro", of: "de", exploring: "Explorando sua rota", ready: "Pronto para começar", complete: "concluído",
    browse: "Navegar pela linha do tempo", speed: "Velocidade", lightNote: "O desenho da rota é resumido para manter o replay leve e fluido.",
    insightsEyebrow: "Em perspectiva", insightsTitle: <>Seus caminhos,<br />do seu jeito.</>,
    insightsDescription: (segments: string) => `O Google reuniu ${segments} momentos no seu histórico. Estes foram os deslocamentos mais recorrentes.`,
    routes: "trechos", footerStart: "Criado a partir da sua exportação do Google Maps.", footerEnd: "Seu caminho, sua história.",
    modes: { IN_PASSENGER_VEHICLE: "Carro", WALKING: "Caminhada", IN_BUS: "Ônibus", IN_TRAM: "Transporte público", MOTORCYCLING: "Moto", CYCLING: "Bicicleta" },
  },
  en: {
    brand: "Timeline", language: "Language", uploadEyebrow: "Your story, in motion",
    uploadTitle: <>Watch your <em>paths</em><br />come to life.</>,
    uploadDescription: "Upload your Timeline export and turn years of places, routes and moments into a visual journey.",
    dropTitle: "Drop your file here", dropDescription: "or choose the JSON exported by Google Maps", selectFile: "Choose file",
    privacy: <><strong>Your file stays with you.</strong> It is read in the browser and your history is never stored on this site.</>,
    howToEyebrow: "Before you begin", howToTitle: "Export your Timeline",
    howToDescription: "Use the phone where your history is stored. When you are done, come back here and choose the JSON file.",
    android: "Android",
    androidSteps: ["Open your device Settings.", "Go to Location › Location services › Timeline.", "Tap Export Timeline data, then Continue.", "Choose where to save the file and tap Save."],
    ios: "iPhone & iPad",
    iosSteps: ["Open Google Maps and tap your profile picture.", "Open Settings › Personal content.", "Under Location settings, tap Export Timeline data.", "In the iPhone share sheet, choose Save to Files and tap Save."],
    helpNote: "Tip: keep Google Maps up to date. The file is often named location-history.json.",
    fileError: "Choose a .json file exported by Google Maps.", parseError: "We could not read this file. Make sure it is a Google Maps Timeline export.",
    noPoints: "We could not find enough points in this file. Choose a Google Maps Timeline export.",
    changeFile: "Change file", fileTitle: "Change current file", timelineEyebrow: "Your journey",
    timelineTitle: "Every path tells a story.", mapLabel: "Map of recorded journeys", zoomIn: "Zoom in", zoomOut: "Zoom out", resetZoom: "Fit map to history",
    watchTimelapse: "Watch timelapse", play: "Play timelapse", pause: "Pause timelapse", restart: "Back to start",
    moment: "Record", of: "of", exploring: "Exploring your route", ready: "Ready to begin", complete: "complete",
    browse: "Browse the timeline", speed: "Speed", lightNote: "The route is condensed to keep the replay light and smooth.",
    insightsEyebrow: "In perspective", insightsTitle: <>Your paths,<br />your way.</>,
    insightsDescription: (segments: string) => `Google collected ${segments} moments in your history. These were the most frequent ways you moved.`,
    routes: "routes", footerStart: "Built from your Google Maps export.", footerEnd: "Your path, your story.",
    modes: { IN_PASSENGER_VEHICLE: "Car", WALKING: "Walking", IN_BUS: "Bus", IN_TRAM: "Public transit", MOTORCYCLING: "Motorcycle", CYCLING: "Cycling" },
  },
  es: {
    brand: "Línea del tiempo", language: "Idioma", uploadEyebrow: "Tu historia, en movimiento",
    uploadTitle: <>Mira cómo tus <em>caminos</em><br />cobran vida.</>,
    uploadDescription: "Sube la exportación de tu Línea del tiempo y transforma años de lugares, rutas y momentos en un viaje visual.",
    dropTitle: "Suelta tu archivo aquí", dropDescription: "o elige el JSON exportado por Google Maps", selectFile: "Elegir archivo",
    privacy: <><strong>Tu archivo se queda contigo.</strong> Se lee en el navegador y tu historial no se guarda en este sitio.</>,
    howToEyebrow: "Antes de empezar", howToTitle: "Exporta tu Línea del tiempo",
    howToDescription: "Usa el teléfono donde está guardado tu historial. Al terminar, vuelve aquí y selecciona el archivo JSON.",
    android: "Android",
    androidSteps: ["Abre los Ajustes del dispositivo.", "Ve a Ubicación › Servicios de ubicación › Línea del tiempo.", "Toca Exportar datos de la Línea del tiempo y luego Continuar.", "Elige dónde guardar el archivo y toca Guardar."],
    ios: "iPhone y iPad",
    iosSteps: ["Abre Google Maps y toca tu foto de perfil.", "Entra en Configuración › Contenido personal.", "En Configuración de ubicación, toca Exportar datos de la Línea del tiempo.", "En el menú del iPhone, elige Guardar en Archivos y confirma Guardar."],
    helpNote: "Consejo: mantén Google Maps actualizado. El archivo suele llamarse location-history.json.",
    fileError: "Elige un archivo .json exportado por Google Maps.", parseError: "No pudimos leer este archivo. Confirma que sea una exportación de la Línea del tiempo de Google Maps.",
    noPoints: "No encontramos suficientes puntos en este archivo. Elige una exportación de la Línea del tiempo de Google Maps.",
    changeFile: "Cambiar archivo", fileTitle: "Cambiar archivo actual", timelineEyebrow: "Tu viaje",
    timelineTitle: "Cada camino cuenta una historia.", mapLabel: "Mapa de los desplazamientos registrados", zoomIn: "Acercar mapa", zoomOut: "Alejar mapa", resetZoom: "Ajustar mapa al historial",
    watchTimelapse: "Ver timelapse", play: "Iniciar timelapse", pause: "Pausar timelapse", restart: "Volver al inicio",
    moment: "Registro", of: "de", exploring: "Explorando tu ruta", ready: "Listo para empezar", complete: "completado",
    browse: "Navegar por la línea del tiempo", speed: "Velocidad", lightNote: "La ruta se resume para que el replay sea ligero y fluido.",
    insightsEyebrow: "En perspectiva", insightsTitle: <>Tus caminos,<br />a tu manera.</>,
    insightsDescription: (segments: string) => `Google reunió ${segments} momentos en tu historial. Estas fueron las formas de desplazamiento más frecuentes.`,
    routes: "tramos", footerStart: "Creado a partir de tu exportación de Google Maps.", footerEnd: "Tu camino, tu historia.",
    modes: { IN_PASSENGER_VEHICLE: "Coche", WALKING: "A pie", IN_BUS: "Autobús", IN_TRAM: "Transporte público", MOTORCYCLING: "Moto", CYCLING: "Bicicleta" },
  },
} as const;

type LanguageCode = keyof typeof LANGUAGES;
type Copy = (typeof COPY)[LanguageCode];
type TimelinePoint = { t: number; lat: number; lon: number };
type TimelineData = { start: number; end: number; originalPointCount: number; sampledPointCount: number; segmentCount: number; visits: number; days: number; distanceKm: number; transport: Array<{ type: string; count: number }>; points: TimelinePoint[] };
type MapSize = { width: number; height: number };
type WorldPoint = { x: number; y: number };

function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max); }
function parseLatLng(value: unknown) { const match = String(value ?? "").match(/(-?\d+(?:\.\d+)?)°\s*,\s*(-?\d+(?:\.\d+)?)°/); return match ? { lat: Number(match[1]), lon: Number(match[2]) } : null; }
function getRecord(value: unknown): Record<string, any> | null { return typeof value === "object" && value !== null ? value as Record<string, any> : null; }

function buildTimelineData(source: unknown, noPointsMessage: string): TimelineData {
  const root = getRecord(source);
  const segments = Array.isArray(root?.semanticSegments) ? root.semanticSegments : [];
  const points: TimelinePoint[] = [];
  const transport: Record<string, number> = {};
  let distanceMeters = 0;
  let visits = 0;
  const addPoint = (location: unknown, time: unknown) => {
    const coordinate = parseLatLng(location);
    const timestamp = Date.parse(String(time ?? ""));
    if (!coordinate || Number.isNaN(timestamp)) return;
    points.push({ t: timestamp, lat: Number(coordinate.lat.toFixed(5)), lon: Number(coordinate.lon.toFixed(5)) });
  };
  for (const rawSegment of segments) {
    const segment = getRecord(rawSegment);
    if (!segment) continue;
    for (const rawPoint of Array.isArray(segment.timelinePath) ? segment.timelinePath : []) {
      const point = getRecord(rawPoint);
      addPoint(point?.point, point?.time ?? segment.startTime);
    }
    const activity = getRecord(segment.activity);
    if (activity) {
      distanceMeters += Number(activity.distanceMeters ?? 0) || 0;
      const mode = getRecord(activity.topCandidate)?.type;
      if (typeof mode === "string") transport[mode] = (transport[mode] ?? 0) + 1;
      addPoint(getRecord(activity.start)?.latLng, segment.startTime);
      addPoint(getRecord(activity.end)?.latLng, segment.endTime);
    }
    const place = getRecord(getRecord(getRecord(segment.visit)?.topCandidate)?.placeLocation);
    if (place?.latLng) { visits += 1; addPoint(place.latLng, segment.startTime); }
  }
  points.sort((a, b) => a.t - b.t);
  const unique = points.filter((point, index, all) => {
    const previous = all[index - 1];
    return !previous || previous.t !== point.t || previous.lat !== point.lat || previous.lon !== point.lon;
  });
  if (unique.length < 2) throw new Error(noPointsMessage);
  const step = Math.max(1, Math.ceil(unique.length / MAX_POINTS));
  const sampled = unique.filter((_, index) => index % step === 0);
  if (sampled.at(-1)?.t !== unique.at(-1)?.t) sampled.push(unique.at(-1)!);
  const days = new Set(unique.map((point) => new Date(point.t).toISOString().slice(0, 10))).size;
  const transportSummary = Object.entries(transport).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  return { start: unique[0].t, end: unique.at(-1)!.t, originalPointCount: unique.length, sampledPointCount: sampled.length, segmentCount: segments.length, visits, days, distanceKm: Math.round(distanceMeters / 1000), transport: transportSummary, points: sampled };
}

function worldPoint(lat: number, lon: number, zoom: number): WorldPoint {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const latitude = (lat * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * worldSize, y: ((1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2) * worldSize };
}

function getFitZoom(data: TimelineData, size: MapSize) {
  const coordinates = data.points.map((point) => worldPoint(point.lat, point.lon, 0));
  const minX = Math.min(...coordinates.map((point) => point.x)); const maxX = Math.max(...coordinates.map((point) => point.x));
  const minY = Math.min(...coordinates.map((point) => point.y)); const maxY = Math.max(...coordinates.map((point) => point.y));
  const spanX = Math.max(maxX - minX, 0.00003); const spanY = Math.max(maxY - minY, 0.00003);
  const padding = Math.min(80, Math.max(34, Math.min(size.width, size.height) * 0.12));
  const targetZoom = Math.log2(Math.min(Math.max(size.width - padding * 2, 1) / spanX, Math.max(size.height - padding * 2, 1) / spanY));
  return clamp(targetZoom, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
}

function formatDate(value: number, language: LanguageCode, withYear = true) {
  return new Intl.DateTimeFormat(LANGUAGES[language].locale, { day: "2-digit", month: "short", ...(withYear ? { year: "numeric" } : { hour: "2-digit", minute: "2-digit" }), timeZone: "America/Sao_Paulo" }).format(value);
}
function formatNumber(value: number, language: LanguageCode) { return value.toLocaleString(LANGUAGES[language].locale); }

function LanguageSwitcher({ language, onChange, t }: { language: LanguageCode; onChange: (language: LanguageCode) => void; t: Copy }) {
  return <div className="language-switcher" role="group" aria-label={t.language}>{(Object.keys(LANGUAGES) as LanguageCode[]).map((code) => <button key={code} type="button" onClick={() => onChange(code)} aria-pressed={language === code} title={LANGUAGES[code].label} className={language === code ? "active" : ""}>{LANGUAGES[code].short}</button>)}</div>;
}

function TimelineMap({ data, activeIndex, t }: { data: TimelineData; activeIndex: number; t: Copy }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<MapSize>({ width: 920, height: 600 });
  const [zoomOffset, setZoomOffset] = useState(0);
  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const updateSize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fitZoom = useMemo(() => getFitZoom(data, size), [data, size]);
  const scene = useMemo(() => {
    const zoom = clamp(fitZoom + zoomOffset, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
    const tileZoom = Math.floor(zoom);
    const renderScale = 2 ** (zoom - tileZoom);
    const rawPoints = data.points.map((point) => worldPoint(point.lat, point.lon, tileZoom));
    const minX = Math.min(...rawPoints.map((point) => point.x)); const maxX = Math.max(...rawPoints.map((point) => point.x));
    const minY = Math.min(...rawPoints.map((point) => point.y)); const maxY = Math.max(...rawPoints.map((point) => point.y));
    const offsetX = size.width / 2 - ((minX + maxX) / 2) * renderScale;
    const offsetY = size.height / 2 - ((minY + maxY) / 2) * renderScale;
    const project = (point: WorldPoint) => ({ x: point.x * renderScale + offsetX, y: point.y * renderScale + offsetY });
    const points = rawPoints.map(project);
    const tileWidth = TILE_SIZE * renderScale;
    const tileMinX = Math.floor(-offsetX / tileWidth) - 1; const tileMaxX = Math.floor((size.width - offsetX) / tileWidth) + 1;
    const tileMinY = Math.floor(-offsetY / tileWidth) - 1; const tileMaxY = Math.floor((size.height - offsetY) / tileWidth) + 1;
    const tileLimit = 2 ** tileZoom;
    const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];
    for (let x = tileMinX; x <= tileMaxX; x += 1) for (let y = tileMinY; y <= tileMaxY; y += 1) if (y >= 0 && y < tileLimit) tiles.push({ x: ((x % tileLimit) + tileLimit) % tileLimit, y, left: x * tileWidth + offsetX, top: y * tileWidth + offsetY });
    const path = (slice: number) => points.slice(0, slice).map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    return { points, tiles, tileZoom, tileWidth, allPath: path(points.length), travelledPath: path(activeIndex + 1) };
  }, [activeIndex, data, fitZoom, size, zoomOffset]);
  const changeZoom = (amount: number) => setZoomOffset((current) => clamp(current + amount, MIN_MAP_ZOOM - fitZoom, MAX_MAP_ZOOM - fitZoom));
  const current = scene.points[activeIndex] ?? scene.points[0];
  return <div ref={mapRef} className="map-canvas" aria-label={t.mapLabel}>
    <div className="map-tiles" aria-hidden="true">{scene.tiles.map((tile) => <img key={`${scene.tileZoom}-${tile.x}-${tile.y}`} alt="" draggable={false} src={`https://tile.openstreetmap.org/${scene.tileZoom}/${tile.x}/${tile.y}.png`} style={{ left: `${tile.left}px`, top: `${tile.top}px`, width: `${scene.tileWidth}px`, height: `${scene.tileWidth}px` }} />)}</div>
    <svg className="route-layer" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true"><path className="route-shadow" d={scene.allPath} /><path className="route-past" d={scene.travelledPath} />{current && <path className="point-current" d={`M${current.x},${current.y - 8} L${current.x + 8},${current.y} L${current.x},${current.y + 8} L${current.x - 8},${current.y} Z`} />}</svg>
    <div className="map-controls" aria-label={t.mapLabel}><button type="button" onClick={() => changeZoom(1)} aria-label={t.zoomIn}>+</button><button type="button" onClick={() => changeZoom(-1)} aria-label={t.zoomOut}>−</button><button type="button" className="zoom-reset" onClick={() => setZoomOffset(0)} aria-label={t.resetZoom}>⌖</button></div>
    <div className="map-credit">© OpenStreetMap</div>
  </div>;
}

export default function Home() {
  const [language, setLanguage] = useState<LanguageCode>("pt");
  const [data, setData] = useState<TimelineData | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(SPEEDS[1]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = COPY[language];
  useEffect(() => { document.documentElement.lang = LANGUAGES[language].htmlLang; setError(""); }, [language]);
  useEffect(() => {
    if (!isPlaying || !data) return;
    const timer = window.setInterval(() => setActiveIndex((current) => {
      const next = current + speed.step;
      if (next >= data.points.length - 1) { setIsPlaying(false); return data.points.length - 1; }
      return next;
    }), 95);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed, data]);
  const openFilePicker = () => inputRef.current?.click();
  const loadFile = async (file?: File) => {
    if (!file) return;
    setError(""); setIsPlaying(false);
    try {
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error(t.fileError);
      const parsed = buildTimelineData(JSON.parse(await file.text()), t.noPoints);
      setData(parsed); setFileName(file.name); setActiveIndex(0);
      window.setTimeout(() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (reason) { setError(reason instanceof SyntaxError ? t.parseError : reason instanceof Error ? reason.message : t.parseError); }
  };
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => { void loadFile(event.target.files?.[0]); event.target.value = ""; };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); void loadFile(event.dataTransfer.files[0]); };
  const resetTimeline = () => { setData(null); setFileName(""); setActiveIndex(0); setError(""); setIsPlaying(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  if (!data) return <main className="upload-shell">
    <div className="orb orb-one" /><div className="orb orb-two" />
    <nav className="topbar" aria-label={t.brand}><a className="brand" href="#inicio"><span>↗</span>{t.brand}</a><LanguageSwitcher language={language} onChange={setLanguage} t={t} /></nav>
    <section id="inicio" className="upload-content">
      <div className="upload-copy"><p className="eyebrow">{t.uploadEyebrow}</p><h1>{t.uploadTitle}</h1><p>{t.uploadDescription}</p></div>
      <div className={`upload-card ${isDragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={onDrop}>
        <div className="upload-icon">↑</div><h2>{t.dropTitle}</h2><p>{t.dropDescription}</p><button type="button" className="primary-button" onClick={openFilePicker}>{t.selectFile} <span>→</span></button><input ref={inputRef} className="file-input" type="file" accept="application/json,.json" onChange={onFileChange} />{error && <p className="upload-error" role="alert">{error}</p>}
      </div>
    </section>
    <p className="privacy-strip">{t.privacy}</p>
    <section className="how-to-section" aria-labelledby="how-to-title"><div className="how-to-heading"><p className="eyebrow">{t.howToEyebrow}</p><h2 id="how-to-title">{t.howToTitle}</h2><p>{t.howToDescription}</p></div><div className="how-to-grid"><article className="how-to-card"><span className="device-label">{t.android}</span><ol>{t.androidSteps.map((step, index) => <li key={step}><b>0{index + 1}</b><span>{step}</span></li>)}</ol></article><article className="how-to-card"><span className="device-label">{t.ios}</span><ol>{t.iosSteps.map((step, index) => <li key={step}><b>0{index + 1}</b><span>{step}</span></li>)}</ol></article></div><p className="help-note">{t.helpNote}</p></section>
  </main>;
  const activePoint = data.points[activeIndex];
  const progress = (activeIndex / (data.points.length - 1)) * 100;
  const jumpToStart = () => { setActiveIndex(0); setIsPlaying(true); };
  const handlePlay = () => { if (activeIndex >= data.points.length - 1) setActiveIndex(0); setIsPlaying((value) => !value); };
  return <main>
    <section className="hero-shell compact-hero"><div className="orb orb-one" /><div className="orb orb-two" />
      <nav className="topbar" aria-label={t.brand}><a className="brand" href="#timeline"><span>↗</span>{t.brand}</a><div className="nav-actions"><LanguageSwitcher language={language} onChange={setLanguage} t={t} /><button className="file-chip" type="button" onClick={resetTimeline} title={t.fileTitle}>↥ <span>{fileName}</span></button></div></nav>
      <div className="hero-content"><p className="eyebrow">Google Maps Timeline</p><h1>{t.timelineTitle}</h1><p className="hero-copy">{t.uploadDescription}</p><div className="hero-actions"><button type="button" className="primary-button" onClick={jumpToStart}><span>▶</span>{t.watchTimelapse}</button><button type="button" className="text-link button-link" onClick={resetTimeline}>{t.changeFile} <span>↥</span></button></div></div>
    </section>
    <section id="timeline" className="timeline-section"><div className="section-heading"><div><p className="eyebrow dark">{t.timelineEyebrow}</p><h2>{t.timelineTitle}</h2></div><p>{formatDate(data.start, language)} — {formatDate(data.end, language)}</p></div><div className="experience-grid"><article className="map-card"><TimelineMap data={data} activeIndex={activeIndex} t={t} /></article><aside className="control-card"><div className="moment-card"><strong>{formatDate(activePoint.t, language, false)}</strong><p>{t.moment} <b>{formatNumber(activeIndex + 1, language)}</b> {t.of} {formatNumber(data.sampledPointCount, language)}</p></div><div className="playback-row"><button type="button" className="play-button" onClick={handlePlay} aria-label={isPlaying ? t.pause : t.play}>{isPlaying ? "Ⅱ" : "▶"}</button><div><p>{isPlaying ? t.exploring : t.ready}</p><strong>{Math.round(progress)}% {t.complete}</strong></div><button type="button" className="restart-button" onClick={() => { setActiveIndex(0); setIsPlaying(false); }} aria-label={t.restart}>↺</button></div><label className="range-label" htmlFor="timeline-range"><span>{formatDate(data.start, language)}</span><span>{formatDate(data.end, language)}</span></label><input id="timeline-range" className="timeline-range" type="range" min="0" max={data.points.length - 1} value={activeIndex} onChange={(event) => { setActiveIndex(Number(event.target.value)); setIsPlaying(false); }} style={{ "--progress": `${progress}%` } as CSSProperties} aria-label={t.browse} /><div className="speed-control"><span>{t.speed}</span><div>{SPEEDS.map((option) => <button type="button" key={option.label} onClick={() => setSpeed(option)} className={speed.label === option.label ? "selected" : ""} aria-pressed={speed.label === option.label}>{option.label}</button>)}</div></div><p className="data-note">{t.lightNote}</p></aside></div></section>
    <section className="insights-section"><div className="insight-intro"><p className="eyebrow dark">{t.insightsEyebrow}</p><h2>{t.insightsTitle}</h2><p>{t.insightsDescription(formatNumber(data.segmentCount, language))}</p></div><div className="transport-list">{data.transport.slice(0, 4).map((item, index) => { const max = data.transport[0]?.count ?? 1; const mode = t.modes[item.type as keyof typeof t.modes] ?? item.type; return <div className="transport-item" key={item.type}><div className="transport-top"><span>0{index + 1}</span><strong>{mode}</strong><b>{formatNumber(item.count, language)} {t.routes}</b></div><div className="transport-bar"><i style={{ width: `${(item.count / max) * 100}%` }} /></div></div>; })}</div></section>
    <footer><span>{t.footerStart}</span><button type="button" onClick={resetTimeline}>{t.changeFile}</button><span>{t.footerEnd}</span></footer>
  </main>;
}

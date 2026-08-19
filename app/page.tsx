"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";

const TILE_SIZE = 256;
const MAX_POINTS = 4200;
const MIN_MAP_ZOOM = 2;
const MAX_MAP_ZOOM = 17;
const PREFERENCES_KEY = "minha-linha-do-tempo-preferences-v1";
const MIN_TIMELAPSE_SECONDS = 8;
const MAX_TIMELAPSE_SECONDS = 240;

const ROUTE_COLORS = [
  { key: "violet", value: "#7251c2" },
  { key: "teal", value: "#16806f" },
  { key: "coral", value: "#dc6954" },
  { key: "blue", value: "#3478c9" },
  { key: "gold", value: "#c98a28" },
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
    zoomIn: "Aproximar mapa", zoomOut: "Afastar mapa", resetZoom: "Ajustar mapa ao histórico", followMap: "Acompanhar timelapse",
    watchTimelapse: "Ver timelapse", play: "Iniciar timelapse", pause: "Pausar timelapse", restart: "Voltar ao início",
    moment: "Registro", of: "de", exploring: "Explorando sua rota", ready: "Pronto para começar", complete: "concluído",
    browse: "Navegar pela linha do tempo", speed: "Velocidade", speedSlow: "Muito lento", speedFast: "Muito rápido", speedValue: (seconds: number) => `Viagem em cerca de ${formatDuration(seconds, "pt")}`,
    smoothing: "Suavização", smoothingLow: "Direta", smoothingHigh: "Máxima", smoothingValue: (value: number) => `${value}% suave`, lightNote: "O rastro se apaga aos poucos para a rota continuar legível e privada.",
    lineColor: "Cor da rota", colorNames: { violet: "Violeta", teal: "Verde água", coral: "Coral", blue: "Azul", gold: "Dourado" },
    videoFormat: "Formato do vídeo", videoWebm: "WebM", videoMp4: "MP4", exportVideo: "Exportar vídeo", creatingVideo: "Criando vídeo…", videoHint: (seconds: number) => `O vídeo seguirá a duração atual: ${formatDuration(seconds, "pt")}.`, videoUnsupported: "Seu navegador ainda não oferece exportação de vídeo.", videoFormatUnavailable: "Esse formato não é suportado por este navegador. Escolha outro formato.", videoError: "Não foi possível gerar o vídeo. Tente novamente.",
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
    timelineTitle: "Every path tells a story.", mapLabel: "Map of recorded journeys", zoomIn: "Zoom in", zoomOut: "Zoom out", resetZoom: "Fit map to history", followMap: "Follow timelapse",
    watchTimelapse: "Watch timelapse", play: "Play timelapse", pause: "Pause timelapse", restart: "Back to start",
    moment: "Record", of: "of", exploring: "Exploring your route", ready: "Ready to begin", complete: "complete",
    browse: "Browse the timeline", speed: "Speed", speedSlow: "Very slow", speedFast: "Very fast", speedValue: (seconds: number) => `Journey in about ${formatDuration(seconds, "en")}`,
    smoothing: "Smoothing", smoothingLow: "Direct", smoothingHigh: "Maximum", smoothingValue: (value: number) => `${value}% smooth`, lightNote: "The trail fades as you travel, keeping the route readable and private.",
    lineColor: "Route colour", colorNames: { violet: "Violet", teal: "Teal", coral: "Coral", blue: "Blue", gold: "Gold" },
    videoFormat: "Video format", videoWebm: "WebM", videoMp4: "MP4", exportVideo: "Export video", creatingVideo: "Creating video…", videoHint: (seconds: number) => `The video will follow the current duration: ${formatDuration(seconds, "en")}.`, videoUnsupported: "Your browser does not yet support video export.", videoFormatUnavailable: "This format is not supported by this browser. Choose another format.", videoError: "We could not create the video. Please try again.",
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
    timelineTitle: "Cada camino cuenta una historia.", mapLabel: "Mapa de los desplazamientos registrados", zoomIn: "Acercar mapa", zoomOut: "Alejar mapa", resetZoom: "Ajustar mapa al historial", followMap: "Seguir timelapse",
    watchTimelapse: "Ver timelapse", play: "Iniciar timelapse", pause: "Pausar timelapse", restart: "Volver al inicio",
    moment: "Registro", of: "de", exploring: "Explorando tu ruta", ready: "Listo para empezar", complete: "completado",
    browse: "Navegar por la línea del tiempo", speed: "Velocidad", speedSlow: "Muy lento", speedFast: "Muy rápido", speedValue: (seconds: number) => `Viaje en unos ${formatDuration(seconds, "es")}`,
    smoothing: "Suavizado", smoothingLow: "Directo", smoothingHigh: "Máximo", smoothingValue: (value: number) => `${value}% suave`, lightNote: "El rastro se borra poco a poco para que la ruta siga siendo legible y privada.",
    lineColor: "Color de la ruta", colorNames: { violet: "Violeta", teal: "Verde agua", coral: "Coral", blue: "Azul", gold: "Dorado" },
    videoFormat: "Formato del vídeo", videoWebm: "WebM", videoMp4: "MP4", exportVideo: "Exportar vídeo", creatingVideo: "Creando vídeo…", videoHint: (seconds: number) => `El vídeo seguirá la duración actual: ${formatDuration(seconds, "es")}.`, videoUnsupported: "Tu navegador todavía no permite exportar vídeo.", videoFormatUnavailable: "Este formato no es compatible con este navegador. Elige otro formato.", videoError: "No pudimos crear el vídeo. Inténtalo de nuevo.",
    insightsEyebrow: "En perspectiva", insightsTitle: <>Tus caminos,<br />a tu manera.</>,
    insightsDescription: (segments: string) => `Google reunió ${segments} momentos en tu historial. Estas fueron las formas de desplazamiento más frecuentes.`,
    routes: "tramos", footerStart: "Creado a partir de tu exportación de Google Maps.", footerEnd: "Tu camino, tu historia.",
    modes: { IN_PASSENGER_VEHICLE: "Coche", WALKING: "A pie", IN_BUS: "Autobús", IN_TRAM: "Transporte público", MOTORCYCLING: "Moto", CYCLING: "Bicicleta" },
  },
} as const;

type LanguageCode = keyof typeof LANGUAGES;
type Copy = (typeof COPY)[LanguageCode];
type RouteColorKey = (typeof ROUTE_COLORS)[number]["key"];
type VideoFormat = "webm" | "mp4";
type TimelinePoint = { t: number; lat: number; lon: number };
type TimelineData = { start: number; end: number; originalPointCount: number; sampledPointCount: number; segmentCount: number; visits: number; days: number; distanceKm: number; transport: Array<{ type: string; count: number }>; points: TimelinePoint[] };
type MapSize = { width: number; height: number };
type WorldPoint = { x: number; y: number };
type Camera = { center: WorldPoint; zoom: number };

function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max); }
function lerp(from: number, to: number, amount: number) { return from + (to - from) * amount; }
function wrapX(value: number) { return ((value % TILE_SIZE) + TILE_SIZE) % TILE_SIZE; }
function shortestXDelta(from: number, to: number) { let delta = to - from; if (delta > TILE_SIZE / 2) delta -= TILE_SIZE; if (delta < -TILE_SIZE / 2) delta += TILE_SIZE; return delta; }
function getTimelapseSeconds(speed: number) { return Math.round(MAX_TIMELAPSE_SECONDS - (MAX_TIMELAPSE_SECONDS - MIN_TIMELAPSE_SECONDS) * clamp(speed, 0, 100) / 100); }
function formatDuration(seconds: number, language: "pt" | "en" | "es") {
  const minutes = Math.floor(seconds / 60); const remainder = seconds % 60;
  if (language === "en") return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  return minutes ? `${minutes} min ${remainder} s` : `${remainder} s`;
}
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
  const latitude = (clamp(lat, -85.0511, 85.0511) * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * worldSize, y: ((1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2) * worldSize };
}

function interpolatePoint(points: TimelinePoint[], position: number, smoothing = 0): TimelinePoint {
  const fromIndex = clamp(Math.floor(position), 0, points.length - 1);
  const toIndex = clamp(fromIndex + 1, 0, points.length - 1);
  const amount = clamp(position - fromIndex, 0, 1);
  const from = points[fromIndex]; const to = points[toIndex];
  const linear = { t: lerp(from.t, to.t, amount), lat: lerp(from.lat, to.lat, amount), lon: lerp(from.lon, to.lon, amount) };
  if (!smoothing || fromIndex === toIndex) return linear;
  const previous = points[Math.max(0, fromIndex - 1)]; const next = points[Math.min(points.length - 1, toIndex + 1)];
  const curve = (p0: number, p1: number, p2: number, p3: number) => {
    const t = amount; const t2 = t * t; const t3 = t2 * t;
    return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
  const strength = clamp(smoothing / 100, 0, 1);
  return { t: lerp(linear.t, curve(previous.t, from.t, to.t, next.t), strength), lat: lerp(linear.lat, curve(previous.lat, from.lat, to.lat, next.lat), strength), lon: lerp(linear.lon, curve(previous.lon, from.lon, to.lon, next.lon), strength) };
}

function getCenter(points: readonly WorldPoint[]): WorldPoint {
  const minX = Math.min(...points.map((point) => point.x)); const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y)); const maxY = Math.max(...points.map((point) => point.y));
  return { x: wrapX((minX + maxX) / 2), y: (minY + maxY) / 2 };
}

function getFitZoomForWorld(coordinates: readonly WorldPoint[], size: MapSize, padding = 52) {
  const minX = Math.min(...coordinates.map((point) => point.x)); const maxX = Math.max(...coordinates.map((point) => point.x));
  const minY = Math.min(...coordinates.map((point) => point.y)); const maxY = Math.max(...coordinates.map((point) => point.y));
  const spanX = Math.max(maxX - minX, 0.00003); const spanY = Math.max(maxY - minY, 0.00003);
  return clamp(Math.log2(Math.min(Math.max(size.width - padding * 2, 1) / spanX, Math.max(size.height - padding * 2, 1) / spanY)), MIN_MAP_ZOOM, MAX_MAP_ZOOM);
}

function getHistoryCamera(data: TimelineData, size: MapSize): Camera {
  const points = data.points.map((point) => worldPoint(point.lat, point.lon, 0));
  const padding = Math.min(86, Math.max(42, Math.min(size.width, size.height) * 0.13));
  return { center: getCenter(points), zoom: getFitZoomForWorld(points, size, padding) };
}

function getSmartCamera(points: TimelinePoint[], position: number, size: MapSize, smoothing = 0): Camera {
  const currentPoint = interpolatePoint(points, position, smoothing);
  const current = worldPoint(currentPoint.lat, currentPoint.lon, 0);
  const centerIndex = clamp(Math.round(position), 0, points.length - 1);
  const radius = clamp(Math.round(points.length * 0.012), 18, 84);
  const local = points.slice(Math.max(0, centerIndex - radius), Math.min(points.length, centerIndex + radius + 1)).map((point) => worldPoint(point.lat, point.lon, 0));
  const futurePoint = interpolatePoint(points, Math.min(points.length - 1, position + radius * 0.4), smoothing);
  const future = worldPoint(futurePoint.lat, futurePoint.lon, 0);
  return {
    center: { x: wrapX(current.x + shortestXDelta(current.x, future.x) * 0.18), y: clamp(lerp(current.y, future.y, 0.18), 1, TILE_SIZE - 1) },
    zoom: clamp(getFitZoomForWorld(local, size, Math.min(size.width, size.height) * 0.22), 5.2, 16.2),
  };
}

function project(point: WorldPoint, camera: Camera, size: MapSize) {
  const scale = 2 ** camera.zoom;
  return { x: size.width / 2 + shortestXDelta(camera.center.x, point.x) * scale, y: size.height / 2 + (point.y - camera.center.y) * scale };
}

function getTrailLength(pointCount: number) { return clamp(Math.round(pointCount * .035), 48, 180); }

function getTrailChunks(points: Array<{ x: number; y: number }>, position: number, current: { x: number; y: number }, trailLength: number) {
  const end = clamp(Math.floor(position), 0, points.length - 1);
  const start = Math.max(0, end - trailLength);
  const tail = [...points.slice(start, end + 1), current];
  const chunkCount = Math.min(24, Math.max(1, Math.ceil(tail.length / 7)));
  const chunkSize = Math.max(2, Math.ceil((tail.length - 1) / chunkCount));
  return Array.from({ length: chunkCount }, (_, index) => {
    const from = Math.max(0, index * chunkSize - 1);
    const to = Math.min(tail.length, (index + 1) * chunkSize + 1);
    return { points: tail.slice(from, to), opacity: .05 + .95 * ((index + 1) / chunkCount) ** 1.75 };
  }).filter((chunk) => chunk.points.length > 1);
}

function formatDate(value: number, language: LanguageCode, withYear = true) {
  return new Intl.DateTimeFormat(LANGUAGES[language].locale, { day: "2-digit", month: "short", ...(withYear ? { year: "numeric" } : { hour: "2-digit", minute: "2-digit" }), timeZone: "America/Sao_Paulo" }).format(value);
}
function formatNumber(value: number, language: LanguageCode) { return value.toLocaleString(LANGUAGES[language].locale); }

function drawCanvasPath(context: CanvasRenderingContext2D, points: WorldPoint[], camera: Camera, size: MapSize) {
  if (!points.length) return;
  context.beginPath();
  points.forEach((point, index) => {
    const screen = project(point, camera, size);
    if (index === 0) context.moveTo(screen.x, screen.y); else context.lineTo(screen.x, screen.y);
  });
}

function drawCanvasTrail(context: CanvasRenderingContext2D, chunks: Array<{ points: Array<{ x: number; y: number }>; opacity: number }>, camera: Camera, size: MapSize, routeColor: string) {
  chunks.forEach((chunk, index) => {
    context.save(); context.globalAlpha = chunk.opacity; context.lineWidth = 4 + chunk.opacity * 6; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = routeColor;
    if (index === chunks.length - 1) { context.shadowColor = routeColor; context.shadowBlur = 20; }
    drawCanvasPath(context, chunk.points as WorldPoint[], camera, size); context.stroke(); context.restore();
  });
}

async function exportTimelapseVideo({ data, language, routeColor, title, format, durationSeconds, smoothing }: { data: TimelineData; language: LanguageCode; routeColor: string; title: string; format: VideoFormat; durationSeconds: number; smoothing: number }) {
  if (!("MediaRecorder" in window) || !("captureStream" in HTMLCanvasElement.prototype)) throw new Error("unsupported");
  const canvas = document.createElement("canvas");
  const size = { width: 1440, height: 810 };
  canvas.width = size.width; canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  const formatTypes: Record<VideoFormat, string[]> = { webm: ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"], mp4: ["video/mp4;codecs=avc1.42E01E", "video/mp4"] };
  const mimeType = formatTypes[format].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error("format");
  const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 7_000_000 });
  const route = data.points.map((point) => worldPoint(point.lat, point.lon, 0));
  await new Promise<void>((resolve, reject) => {
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => reject(new Error("recorder"));
    recorder.onstop = () => {
      const extension = recorder.mimeType.includes("mp4") ? "mp4" : "webm";
      const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
      const link = document.createElement("a");
      link.href = url; link.download = `minha-linha-do-tempo.${extension}`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000); resolve();
    };
    const duration = durationSeconds * 1000;
    const draw = (now: number, startedAt?: number) => {
      const started = startedAt ?? now;
      const progress = clamp((now - started) / duration, 0, 1);
      const position = progress * (data.points.length - 1);
      const camera = getSmartCamera(data.points, position, size, smoothing);
      const activePoint = interpolatePoint(data.points, position, smoothing);
      const active = worldPoint(activePoint.lat, activePoint.lon, 0);
      const trail = getTrailChunks(route, position, active, getTrailLength(data.points.length));
      const background = context.createLinearGradient(0, 0, size.width, size.height);
      background.addColorStop(0, "#171125"); background.addColorStop(.52, "#2a2044"); background.addColorStop(1, "#171a2d");
      context.fillStyle = background; context.fillRect(0, 0, size.width, size.height);
      context.save(); context.globalAlpha = .18; context.strokeStyle = "#b5a6d8"; context.lineWidth = 1;
      for (let x = -140; x < size.width + 160; x += 82) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x + 180, size.height); context.stroke(); }
      for (let y = 30; y < size.height; y += 70) { context.beginPath(); context.moveTo(0, y); context.lineTo(size.width, y - 120); context.stroke(); }
      context.restore();
      drawCanvasTrail(context, trail, camera, size, routeColor);
      const marker = project(active, camera, size);
      context.save(); context.translate(marker.x, marker.y); context.rotate(Math.PI / 4); context.fillStyle = "#fff6d4"; context.shadowColor = routeColor; context.shadowBlur = 26; context.fillRect(-10, -10, 20, 20); context.fillStyle = routeColor; context.fillRect(-4, -4, 8, 8); context.restore();
      context.fillStyle = "#ffe89d"; context.font = "700 15px Ubuntu, sans-serif"; context.fillText("TIMELAPSE", 48, 38);
      context.fillStyle = "#fffdf7"; context.font = "400 42px Ubuntu, sans-serif"; context.fillText(title, 48, 101);
      context.fillStyle = "#d4cde1"; context.font = "400 19px Ubuntu, sans-serif"; context.fillText(formatDate(activePoint.t, language), 48, 137);
      context.fillStyle = "rgba(255,255,255,.12)"; context.fillRect(48, size.height - 62, size.width - 96, 4);
      context.fillStyle = routeColor; context.fillRect(48, size.height - 62, (size.width - 96) * progress, 4);
      if (progress < 1) requestAnimationFrame((next) => draw(next, started)); else window.setTimeout(() => recorder.stop(), 180);
    };
    recorder.start(250); requestAnimationFrame((now) => draw(now));
  });
}

function LanguageSwitcher({ language, onChange, t }: { language: LanguageCode; onChange: (language: LanguageCode) => void; t: Copy }) {
  return <div className="language-switcher" role="group" aria-label={t.language}>{(Object.keys(LANGUAGES) as LanguageCode[]).map((code) => <button key={code} type="button" onClick={() => onChange(code)} aria-pressed={language === code} title={LANGUAGES[code].label} className={language === code ? "active" : ""}>{LANGUAGES[code].short}</button>)}</div>;
}

function TimelineMap({ data, playhead, isPlaying, routeColor, smoothing, t }: { data: TimelineData; playhead: number; isPlaying: boolean; routeColor: string; smoothing: number; t: Copy }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ center: worldPoint(data.points[0].lat, data.points[0].lon, 0), zoom: 10 });
  const playheadRef = useRef(playhead);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; camera: Camera } | null>(null);
  const [size, setSize] = useState<MapSize>({ width: 920, height: 600 });
  const [camera, setCamera] = useState<Camera>(() => getHistoryCamera(data, { width: 920, height: 600 }));
  const [isFollowing, setIsFollowing] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  useEffect(() => { playheadRef.current = playhead; }, [playhead]);
  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const updateSize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const next = getHistoryCamera(data, size);
    cameraRef.current = next; setCamera(next); setIsFollowing(true);
  }, [data, size.width, size.height]);
  useEffect(() => {
    if (!isPlaying || !isFollowing) return;
    let frame = 0; let previous = performance.now();
    const follow = (now: number) => {
      const target = getSmartCamera(data.points, playheadRef.current, size, smoothing);
      const blend = 1 - Math.exp(-Math.min(90, now - previous) / lerp(150, 430, smoothing / 100));
      previous = now;
      setCamera((current) => {
        const next = { center: { x: wrapX(current.center.x + shortestXDelta(current.center.x, target.center.x) * blend), y: lerp(current.center.y, target.center.y, blend) }, zoom: lerp(current.zoom, target.zoom, blend) };
        cameraRef.current = next; return next;
      });
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [data, isFollowing, isPlaying, size, smoothing]);
  const scene = useMemo(() => {
    const tileZoom = Math.floor(camera.zoom);
    const renderScale = 2 ** (camera.zoom - tileZoom);
    const cameraTile = { x: camera.center.x * 2 ** tileZoom, y: camera.center.y * 2 ** tileZoom };
    const tileWidth = TILE_SIZE * renderScale;
    const allPoints = data.points.map((point) => project(worldPoint(point.lat, point.lon, 0), camera, size));
    const active = interpolatePoint(data.points, playhead, smoothing);
    const current = project(worldPoint(active.lat, active.lon, 0), camera, size);
    const trailChunks = getTrailChunks(allPoints, playhead, current, getTrailLength(data.points.length));
    const tileMinX = Math.floor((cameraTile.x * renderScale - size.width / 2) / tileWidth) - 1;
    const tileMaxX = Math.floor((cameraTile.x * renderScale + size.width / 2) / tileWidth) + 1;
    const tileMinY = Math.floor((cameraTile.y * renderScale - size.height / 2) / tileWidth) - 1;
    const tileMaxY = Math.floor((cameraTile.y * renderScale + size.height / 2) / tileWidth) + 1;
    const tileLimit = 2 ** tileZoom;
    const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];
    for (let x = tileMinX; x <= tileMaxX; x += 1) for (let y = tileMinY; y <= tileMaxY; y += 1) if (y >= 0 && y < tileLimit) tiles.push({ x: ((x % tileLimit) + tileLimit) % tileLimit, y, left: x * tileWidth - cameraTile.x * renderScale + size.width / 2, top: y * tileWidth - cameraTile.y * renderScale + size.height / 2 });
    const path = (points: Array<{ x: number; y: number }>) => points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    return { tiles, tileZoom, tileWidth, trailChunks: trailChunks.map((chunk) => ({ ...chunk, path: path(chunk.points) })), current };
  }, [camera, data, playhead, size, smoothing]);
  const setManualCamera = (updater: (current: Camera) => Camera) => {
    setIsFollowing(false);
    setCamera((current) => { const next = updater(current); cameraRef.current = next; return next; });
  };
  const changeZoom = (amount: number) => setManualCamera((current) => ({ ...current, zoom: clamp(current.zoom + amount, MIN_MAP_ZOOM, MAX_MAP_ZOOM) }));
  const recenter = () => { const next = isPlaying ? getSmartCamera(data.points, playheadRef.current, size, smoothing) : getHistoryCamera(data, size); cameraRef.current = next; setCamera(next); setIsFollowing(true); };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera: cameraRef.current }; setIsPanning(true); setIsFollowing(false);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const scale = 2 ** drag.camera.zoom;
    const next = { ...drag.camera, center: { x: wrapX(drag.camera.center.x - (event.clientX - drag.x) / scale), y: clamp(drag.camera.center.y - (event.clientY - drag.y) / scale, 1, TILE_SIZE - 1) } };
    cameraRef.current = next; setCamera(next);
  };
  const stopPanning = (event: PointerEvent<HTMLDivElement>) => { if (dragRef.current?.pointerId === event.pointerId) { dragRef.current = null; setIsPanning(false); } };
  const onWheel = (event: WheelEvent<HTMLDivElement>) => { event.preventDefault(); changeZoom(event.deltaY < 0 ? .65 : -.65); };
  return <div ref={mapRef} className={`map-canvas ${isPanning ? "panning" : ""}`} style={{ "--route": routeColor } as CSSProperties} aria-label={t.mapLabel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopPanning} onPointerCancel={stopPanning} onWheel={onWheel}>
    <div className="map-tiles" aria-hidden="true">{scene.tiles.map((tile) => <img key={`${scene.tileZoom}-${tile.x}-${tile.y}`} alt="" draggable={false} src={`https://tile.openstreetmap.org/${scene.tileZoom}/${tile.x}/${tile.y}.png`} style={{ left: `${tile.left}px`, top: `${tile.top}px`, width: `${scene.tileWidth}px`, height: `${scene.tileWidth}px` }} />)}</div>
    <svg className="route-layer" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true"><g className="route-trail">{scene.trailChunks.map((chunk, index) => <path key={index} className="route-past" d={chunk.path} style={{ opacity: chunk.opacity }} />)}</g><path className="point-current" d={`M${scene.current.x},${scene.current.y - 8} L${scene.current.x + 8},${scene.current.y} L${scene.current.x},${scene.current.y + 8} L${scene.current.x - 8},${scene.current.y} Z`} /></svg>
    <div className="map-controls" aria-label={t.mapLabel}><button type="button" onClick={() => changeZoom(1)} aria-label={t.zoomIn}>+</button><button type="button" onClick={() => changeZoom(-1)} aria-label={t.zoomOut}>−</button><button type="button" className="zoom-reset" onClick={recenter} aria-label={t.resetZoom}>⌖</button><button type="button" className={`follow-button ${isFollowing ? "following" : ""}`} onClick={recenter} aria-label={t.followMap}>◎</button></div>
    <div className="map-credit">© OpenStreetMap</div>
  </div>;
}

export default function Home() {
  const [language, setLanguage] = useState<LanguageCode>("pt");
  const [data, setData] = useState<TimelineData | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(55);
  const [smoothing, setSmoothing] = useState(68);
  const [isDragging, setIsDragging] = useState(false);
  const [routeColor, setRouteColor] = useState<(typeof ROUTE_COLORS)[number]>(ROUTE_COLORS[0]);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("webm");
  const [isExporting, setIsExporting] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = COPY[language];
  const timelapseSeconds = getTimelapseSeconds(speed);
  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "{}") as Partial<{ language: LanguageCode; speed: number; smoothing: number; routeColor: RouteColorKey; videoFormat: VideoFormat }>;
      if (stored.language && stored.language in LANGUAGES) setLanguage(stored.language);
      if (typeof stored.speed === "number") setSpeed(clamp(stored.speed, 0, 100));
      if (typeof stored.smoothing === "number") setSmoothing(clamp(stored.smoothing, 0, 100));
      if (stored.videoFormat === "webm" || stored.videoFormat === "mp4") setVideoFormat(stored.videoFormat);
      const savedColour = ROUTE_COLORS.find((colour) => colour.key === stored.routeColor);
      if (savedColour) setRouteColor(savedColour);
    } catch { /* Preferências inválidas não impedem o replay. */ }
    finally { setPreferencesReady(true); }
  }, []);
  useEffect(() => { document.documentElement.lang = LANGUAGES[language].htmlLang; setError(""); }, [language]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ language, speed, smoothing, routeColor: routeColor.key, videoFormat }));
  }, [language, preferencesReady, routeColor.key, smoothing, speed, videoFormat]);
  useEffect(() => {
    if (!isPlaying || !data) return;
    let frame = 0; let previous = performance.now();
    const animate = (now: number) => {
      const elapsed = Math.min(80, now - previous); previous = now;
      setPlayhead((current) => {
        const next = current + elapsed * (data.points.length - 1) / (timelapseSeconds * 1000);
        if (next >= data.points.length - 1) { setIsPlaying(false); return data.points.length - 1; }
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data, isPlaying, timelapseSeconds]);
  const openFilePicker = () => inputRef.current?.click();
  const loadFile = async (file?: File) => {
    if (!file) return;
    setError(""); setVideoError(""); setIsPlaying(false);
    try {
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error(t.fileError);
      const parsed = buildTimelineData(JSON.parse(await file.text()), t.noPoints);
      setData(parsed); setFileName(file.name); setPlayhead(0);
      window.setTimeout(() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (reason) { setError(reason instanceof SyntaxError ? t.parseError : reason instanceof Error ? reason.message : t.parseError); }
  };
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => { void loadFile(event.target.files?.[0]); event.target.value = ""; };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); void loadFile(event.dataTransfer.files[0]); };
  const resetTimeline = () => { setData(null); setFileName(""); setPlayhead(0); setError(""); setVideoError(""); setIsPlaying(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
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
  const activePoint = interpolatePoint(data.points, playhead, smoothing);
  const activeIndex = Math.floor(playhead);
  const progress = (playhead / (data.points.length - 1)) * 100;
  const jumpToStart = () => { setPlayhead(0); setIsPlaying(true); };
  const handlePlay = () => { if (playhead >= data.points.length - 1) { setPlayhead(0); setIsPlaying(true); } else setIsPlaying((value) => !value); };
  const exportVideo = async () => {
    setVideoError(""); setIsExporting(true);
    try { await exportTimelapseVideo({ data, language, routeColor: routeColor.value, title: t.timelineTitle, format: videoFormat, durationSeconds: timelapseSeconds, smoothing }); }
    catch (reason) { setVideoError(reason instanceof Error && reason.message === "unsupported" ? t.videoUnsupported : reason instanceof Error && reason.message === "format" ? t.videoFormatUnavailable : t.videoError); }
    finally { setIsExporting(false); }
  };
  return <main>
    <section className="hero-shell compact-hero"><div className="orb orb-one" /><div className="orb orb-two" />
      <nav className="topbar" aria-label={t.brand}><a className="brand" href="#timeline"><span>↗</span>{t.brand}</a><div className="nav-actions"><LanguageSwitcher language={language} onChange={setLanguage} t={t} /><button className="file-chip" type="button" onClick={resetTimeline} title={t.fileTitle}>↥ <span>{fileName}</span></button></div></nav>
      <div className="hero-content"><p className="eyebrow">Google Maps Timeline</p><h1>{t.timelineTitle}</h1><p className="hero-copy">{t.uploadDescription}</p><div className="hero-actions"><button type="button" className="primary-button" onClick={jumpToStart}><span>▶</span>{t.watchTimelapse}</button><button type="button" className="text-link button-link" onClick={resetTimeline}>{t.changeFile} <span>↥</span></button></div></div>
    </section>
    <section id="timeline" className="timeline-section">
      <div className="section-heading"><div><p className="eyebrow dark">{t.timelineEyebrow}</p><h2>{t.timelineTitle}</h2></div><p>{formatDate(data.start, language)} — {formatDate(data.end, language)}</p></div>
      <div className="experience-grid">
        <article className="map-card"><TimelineMap data={data} playhead={playhead} isPlaying={isPlaying} routeColor={routeColor.value} smoothing={smoothing} t={t} /></article>
        <aside className="control-card">
          <div className="moment-card"><strong>{formatDate(activePoint.t, language, false)}</strong><p>{t.moment} <b>{formatNumber(activeIndex + 1, language)}</b> {t.of} {formatNumber(data.sampledPointCount, language)}</p></div>
          <div className="playback-row"><button type="button" className="play-button" onClick={handlePlay} aria-label={isPlaying ? t.pause : t.play}>{isPlaying ? "Ⅱ" : "▶"}</button><div><p>{isPlaying ? t.exploring : t.ready}</p><strong>{Math.round(progress)}% {t.complete}</strong></div><button type="button" className="restart-button" onClick={() => { setPlayhead(0); setIsPlaying(false); }} aria-label={t.restart}>↺</button></div>
          <label className="range-label" htmlFor="timeline-range"><span>{formatDate(data.start, language)}</span><span>{formatDate(data.end, language)}</span></label>
          <input id="timeline-range" className="timeline-range" type="range" min="0" max={data.points.length - 1} step="0.1" value={playhead} onChange={(event) => { setPlayhead(Number(event.target.value)); setIsPlaying(false); }} style={{ "--progress": `${progress}%` } as CSSProperties} aria-label={t.browse} />
          <div className="range-control"><div className="control-heading"><span>{t.speed}</span><b>{t.speedValue(timelapseSeconds)}</b></div><input className="settings-range" type="range" min="0" max="100" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} style={{ "--progress": `${speed}%` } as CSSProperties} aria-label={t.speed} /><div className="range-ends"><span>{t.speedSlow}</span><span>{t.speedFast}</span></div></div>
          <div className="range-control"><div className="control-heading"><span>{t.smoothing}</span><b>{t.smoothingValue(smoothing)}</b></div><input className="settings-range" type="range" min="0" max="100" value={smoothing} onChange={(event) => setSmoothing(Number(event.target.value))} style={{ "--progress": `${smoothing}%` } as CSSProperties} aria-label={t.smoothing} /><div className="range-ends"><span>{t.smoothingLow}</span><span>{t.smoothingHigh}</span></div></div>
          <div className="route-colour-control"><span>{t.lineColor}</span><div>{ROUTE_COLORS.map((color) => <button key={color.key} type="button" className={routeColor.key === color.key ? "selected" : ""} style={{ "--swatch": color.value } as CSSProperties} onClick={() => setRouteColor(color)} aria-label={t.colorNames[color.key as RouteColorKey]} aria-pressed={routeColor.key === color.key} title={t.colorNames[color.key as RouteColorKey]} />)}</div></div>
          <label className="video-format-control"><span>{t.videoFormat}</span><select value={videoFormat} onChange={(event) => setVideoFormat(event.target.value as VideoFormat)}><option value="webm">{t.videoWebm}</option><option value="mp4">{t.videoMp4}</option></select></label>
          <button type="button" className="export-video-button" onClick={() => void exportVideo()} disabled={isExporting}>{isExporting ? t.creatingVideo : t.exportVideo} <span>↧</span></button>
          <p className="video-hint">{t.videoHint(timelapseSeconds)}</p>{videoError && <p className="video-error" role="alert">{videoError}</p>}<p className="data-note">{t.lightNote}</p>
        </aside>
      </div>
    </section>
    <section className="insights-section"><div className="insight-intro"><p className="eyebrow dark">{t.insightsEyebrow}</p><h2>{t.insightsTitle}</h2><p>{t.insightsDescription(formatNumber(data.segmentCount, language))}</p></div><div className="transport-list">{data.transport.slice(0, 4).map((item, index) => { const max = data.transport[0]?.count ?? 1; const mode = t.modes[item.type as keyof typeof t.modes] ?? item.type; return <div className="transport-item" key={item.type}><div className="transport-top"><span>0{index + 1}</span><strong>{mode}</strong><b>{formatNumber(item.count, language)} {t.routes}</b></div><div className="transport-bar"><i style={{ width: `${(item.count / max) * 100}%` }} /></div></div>; })}</div></section>
    <footer><span>{t.footerStart}</span><button type="button" onClick={resetTimeline}>{t.changeFile}</button><span>{t.footerEnd}</span></footer>
  </main>;
}

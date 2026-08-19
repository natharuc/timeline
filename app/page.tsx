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

const MAP_ZOOM = 9;
const TILE_SIZE = 256;
const MAX_POINTS = 4200;
const SPEEDS = [
  { label: "1×", step: 8 },
  { label: "2×", step: 20 },
  { label: "4×", step: 48 },
] as const;

type TimelinePoint = { t: number; lat: number; lon: number };
type TimelineData = {
  start: number;
  end: number;
  originalPointCount: number;
  sampledPointCount: number;
  segmentCount: number;
  visits: number;
  days: number;
  distanceKm: number;
  transport: Array<{ label: string; count: number }>;
  points: TimelinePoint[];
};
type MapSize = { width: number; height: number };
type WorldPoint = { x: number; y: number };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const modeLabels: Record<string, string> = {
  IN_PASSENGER_VEHICLE: "Veículo",
  WALKING: "Caminhada",
  IN_BUS: "Ônibus",
  IN_TRAM: "Transporte público",
  MOTORCYCLING: "Moto",
  CYCLING: "Bicicleta",
};

function parseLatLng(value: unknown) {
  const match = String(value ?? "").match(/(-?\d+(?:\.\d+)?)°\s*,\s*(-?\d+(?:\.\d+)?)°/);
  return match ? { lat: Number(match[1]), lon: Number(match[2]) } : null;
}

function getRecord(value: unknown): Record<string, any> | null {
  return typeof value === "object" && value !== null ? value as Record<string, any> : null;
}

function buildTimelineData(source: unknown): TimelineData {
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
    points.push({
      t: timestamp,
      lat: Number(coordinate.lat.toFixed(5)),
      lon: Number(coordinate.lon.toFixed(5)),
    });
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
    if (place?.latLng) {
      visits += 1;
      addPoint(place.latLng, segment.startTime);
    }
  }

  points.sort((a, b) => a.t - b.t);
  const unique = points.filter((point, index, all) => {
    const previous = all[index - 1];
    return !previous || previous.t !== point.t || previous.lat !== point.lat || previous.lon !== point.lon;
  });

  if (unique.length < 2) {
    throw new Error("Não encontramos pontos suficientes neste arquivo. Escolha uma exportação da Linha do Tempo do Google Maps.");
  }

  const step = Math.max(1, Math.ceil(unique.length / MAX_POINTS));
  const sampled = unique.filter((_, index) => index % step === 0);
  if (sampled.at(-1)?.t !== unique.at(-1)?.t) sampled.push(unique.at(-1)!);

  const days = new Set(unique.map((point) => new Date(point.t).toISOString().slice(0, 10))).size;
  const transportSummary = Object.entries(transport)
    .map(([type, count]) => ({ label: modeLabels[type] ?? type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    start: unique[0].t,
    end: unique.at(-1)!.t,
    originalPointCount: unique.length,
    sampledPointCount: sampled.length,
    segmentCount: segments.length,
    visits,
    days,
    distanceKm: Math.round(distanceMeters / 1000),
    transport: transportSummary,
    points: sampled,
  };
}

function worldPoint(lat: number, lon: number): WorldPoint {
  const worldSize = TILE_SIZE * 2 ** MAP_ZOOM;
  const latitude = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * worldSize,
    y: ((1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2) * worldSize,
  };
}

function TimelineMap({ data, activeIndex }: { data: TimelineData; activeIndex: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<MapSize>({ width: 920, height: 600 });

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const updateSize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scene = useMemo(() => {
    const rawPoints = data.points.map((point) => worldPoint(point.lat, point.lon));
    const minX = Math.min(...rawPoints.map((point) => point.x));
    const maxX = Math.max(...rawPoints.map((point) => point.x));
    const minY = Math.min(...rawPoints.map((point) => point.y));
    const maxY = Math.max(...rawPoints.map((point) => point.y));
    const padding = 64;
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);
    const scale = Math.min(
      Math.max((size.width - padding * 2) / width, 0.2),
      Math.max((size.height - padding * 2) / height, 0.2),
    );
    const offsetX = (size.width - width * scale) / 2 - minX * scale;
    const offsetY = (size.height - height * scale) / 2 - minY * scale;
    const project = (point: WorldPoint) => ({ x: point.x * scale + offsetX, y: point.y * scale + offsetY });
    const points = rawPoints.map(project);
    const tileMinX = Math.floor(-offsetX / (TILE_SIZE * scale)) - 1;
    const tileMaxX = Math.floor((size.width - offsetX) / (TILE_SIZE * scale)) + 1;
    const tileMinY = Math.floor(-offsetY / (TILE_SIZE * scale)) - 1;
    const tileMaxY = Math.floor((size.height - offsetY) / (TILE_SIZE * scale)) + 1;
    const tileLimit = 2 ** MAP_ZOOM;
    const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];

    for (let x = tileMinX; x <= tileMaxX; x += 1) {
      for (let y = tileMinY; y <= tileMaxY; y += 1) {
        if (y >= 0 && y < tileLimit) {
          tiles.push({ x: ((x % tileLimit) + tileLimit) % tileLimit, y, left: x * TILE_SIZE * scale + offsetX, top: y * TILE_SIZE * scale + offsetY });
        }
      }
    }

    const path = (slice: number) => points.slice(0, slice)
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ");
    return { points, tiles, scale, allPath: path(points.length), travelledPath: path(activeIndex + 1) };
  }, [activeIndex, data, size]);

  const current = scene.points[activeIndex] ?? scene.points[0];
  const first = scene.points[0];
  return (
    <div ref={mapRef} className="map-canvas" aria-label="Mapa dos deslocamentos registrados">
      <div className="map-tiles" aria-hidden="true">
        {scene.tiles.map((tile) => <img key={`${tile.x}-${tile.y}-${tile.left}`} alt="" draggable={false} src={`https://tile.openstreetmap.org/${MAP_ZOOM}/${tile.x}/${tile.y}.png`} style={{ left: `${tile.left}px`, top: `${tile.top}px`, width: `${TILE_SIZE * scene.scale}px`, height: `${TILE_SIZE * scene.scale}px` }} />)}
      </div>
      <svg className="route-layer" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
        <path className="route-shadow" d={scene.allPath} />
        <path className="route-past" d={scene.travelledPath} />
        {first && <circle className="point-start" cx={first.x} cy={first.y} r="5" />}
        {current && <><circle className="point-pulse" cx={current.x} cy={current.y} r="17" /><circle className="point-current" cx={current.x} cy={current.y} r="6" /></>}
      </svg>
      <div className="map-credit">© OpenStreetMap</div>
      <div className="map-legend"><span><i className="legend-line" /> Percurso</span><span><i className="legend-dot" /> Agora</span></div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(SPEEDS[1]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isPlaying || !data) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = current + speed.step;
        if (next >= data.points.length - 1) {
          setIsPlaying(false);
          return data.points.length - 1;
        }
        return next;
      });
    }, 95);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed, data]);

  const openFilePicker = () => inputRef.current?.click();
  const loadFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setIsPlaying(false);
    try {
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error("Escolha um arquivo .json exportado pelo Google Maps.");
      const parsed = buildTimelineData(JSON.parse(await file.text()));
      setData(parsed);
      setFileName(file.name);
      setActiveIndex(0);
      window.setTimeout(() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível ler esse arquivo.");
    }
  };
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void loadFile(event.target.files?.[0]);
    event.target.value = "";
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void loadFile(event.dataTransfer.files[0]);
  };

  if (!data) {
    return (
      <main className="upload-shell">
        <div className="orb orb-one" /><div className="orb orb-two" />
        <nav className="topbar" aria-label="Navegação principal"><a className="brand" href="#inicio"><span>↗</span> Linha do tempo</a><span className="private-pill"><i /> Processamento local</span></nav>
        <section id="inicio" className="upload-content">
          <div className="upload-copy"><p className="eyebrow">Sua história em movimento</p><h1>Transforme seus<br /><em>caminhos</em> em tempo.</h1><p>Escolha a exportação da Linha do Tempo do Google Maps e veja seus trajetos ganharem vida em um replay interativo.</p></div>
          <div className={`upload-card ${isDragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={onDrop}>
            <div className="upload-icon">↑</div><h2>Jogue seu arquivo aqui.</h2><p>ou escolha o JSON exportado pelo Google</p>
            <button type="button" className="primary-button" onClick={openFilePicker}>Selecionar arquivo <span>→</span></button>
            <input ref={inputRef} className="file-input" type="file" accept="application/json,.json" onChange={onFileChange} />
            {error && <p className="upload-error" role="alert">{error}</p>}
          </div>
        </section>
        <section className="privacy-strip"><span>✦</span><p><strong>O seu arquivo fica no seu dispositivo.</strong> O site lê e processa o JSON no navegador, sem guardar ou enviar seu histórico.</p></section>
      </main>
    );
  }

  const activePoint = data.points[activeIndex];
  const progress = (activeIndex / (data.points.length - 1)) * 100;
  const resetTimeline = () => { setData(null); setFileName(""); setActiveIndex(0); setError(""); setIsPlaying(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const jumpToStart = () => { setActiveIndex(0); setIsPlaying(true); };
  const handlePlay = () => { if (activeIndex >= data.points.length - 1) setActiveIndex(0); setIsPlaying((value) => !value); };

  return (
    <main>
      <section className="hero-shell compact-hero"><div className="orb orb-one" /><div className="orb orb-two" />
        <nav className="topbar" aria-label="Navegação principal"><a className="brand" href="#timeline"><span>↗</span> Linha do tempo</a><button className="file-chip" type="button" onClick={resetTimeline} title="Trocar arquivo">↥ <span>{fileName}</span></button></nav>
        <div className="hero-content"><p className="eyebrow">Google Maps • sua história em movimento</p><h1>Por onde você<br /><em>andou por aí.</em></h1><p className="hero-copy">Uma viagem visual pelos seus registros de localização — do primeiro ao último ponto, no seu ritmo.</p><div className="hero-actions"><button className="primary-button" onClick={jumpToStart}><span>▶</span> Ver timelapse</button><button className="text-link button-link" onClick={resetTimeline}>Trocar arquivo <span>↥</span></button></div></div>
        <div className="hero-stats" aria-label="Resumo do período"><div><strong>{data.days}</strong><span>dias registrados</span></div><div><strong>{data.distanceKm.toLocaleString("pt-BR")}</strong><span>km em movimento</span></div><div><strong>{data.visits}</strong><span>paradas detectadas</span></div></div>
      </section>
      <section id="timeline" className="timeline-section">
        <div className="section-heading"><div><p className="eyebrow dark">Replay da trajetória</p><h2>O tempo deixa rastros.</h2></div><p>{dateFormatter.format(data.start)} — {dateFormatter.format(data.end)}</p></div>
        <div className="experience-grid"><article className="map-card"><TimelineMap data={data} activeIndex={activeIndex} /></article>
          <aside className="control-card"><div className="now-card"><span className="now-label"><i /> você está aqui</span><strong>{dateTimeFormatter.format(activePoint.t)}</strong><p>Registro <b>{(activeIndex + 1).toLocaleString("pt-BR")}</b> de {data.sampledPointCount.toLocaleString("pt-BR")}</p></div>
            <div className="playback-row"><button className="play-button" onClick={handlePlay} aria-label={isPlaying ? "Pausar timelapse" : "Iniciar timelapse"}>{isPlaying ? "Ⅱ" : "▶"}</button><div><p>{isPlaying ? "Explorando…" : "Pronto para recomeçar"}</p><strong>{Math.round(progress)}% concluído</strong></div><button className="restart-button" onClick={() => { setActiveIndex(0); setIsPlaying(false); }} aria-label="Voltar ao início">↺</button></div>
            <label className="range-label" htmlFor="timeline-range"><span>{dateFormatter.format(data.start)}</span><span>{dateFormatter.format(data.end)}</span></label>
            <input id="timeline-range" className="timeline-range" type="range" min="0" max={data.points.length - 1} value={activeIndex} onChange={(event) => { setActiveIndex(Number(event.target.value)); setIsPlaying(false); }} style={{ "--progress": `${progress}%` } as CSSProperties} aria-label="Navegar pela linha do tempo" />
            <div className="speed-control"><span>Velocidade</span><div>{SPEEDS.map((option) => <button key={option.label} onClick={() => setSpeed(option)} className={speed.label === option.label ? "selected" : ""} aria-pressed={speed.label === option.label}>{option.label}</button>)}</div></div>
            <div className="data-note"><span>✦</span><p>Os dados foram resumidos para o replay ficar leve, mas preservam o desenho da sua trajetória.</p></div>
          </aside>
        </div>
      </section>
      <section className="insights-section"><div className="insight-intro"><p className="eyebrow dark">Em números</p><h2>Seus caminhos,<br />do seu jeito.</h2><p>O Google identificou {data.segmentCount.toLocaleString("pt-BR")} momentos na sua linha do tempo. Aqui estão os modos de deslocamento mais recorrentes.</p></div><div className="transport-list">{data.transport.slice(0, 4).map((item, index) => { const max = data.transport[0]?.count ?? 1; return <div className="transport-item" key={item.label}><div className="transport-top"><span>0{index + 1}</span><strong>{item.label}</strong><b>{item.count} trechos</b></div><div className="transport-bar"><i style={{ width: `${(item.count / max) * 100}%` }} /></div></div>; })}</div></section>
      <footer><span>Feito a partir da sua exportação do Google Maps.</span><button type="button" onClick={resetTimeline}>Trocar arquivo</button><span>Seu caminho, sua história.</span></footer>
    </main>
  );
}

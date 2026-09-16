"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatMediaTime, rangeAction, type MediaEditorProps } from "./types";

type AudioProps = MediaEditorProps;

function useAudioUrl(source: MediaEditorProps["source"]) {
  const url = useMemo(() => typeof source === "string" ? source : URL.createObjectURL(source), [source]);
  useEffect(() => () => { if (typeof source !== "string") URL.revokeObjectURL(url); }, [source, url]);
  return url;
}

export function AudioEditor({
  source, fileName, onAction, progress: externalProgress, onCancel: externalCancel, disabled,
  onReplace,
}: AudioProps) {
  const url = useAudioUrl(source);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waveform, setWaveform] = useState<Float32Array | null>(null);
  const [decodeError, setDecodeError] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    queueMicrotask(() => {
      setDuration(0); setCurrent(0); setInPoint(0); setOutPoint(0); setWaveform(null);
      setDecodeError(""); setError("");
    });
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) {
      queueMicrotask(() => { if (!cancelled) setDecodeError("Waveform decoding is unavailable in this browser."); });
      return () => { cancelled = true; };
    }
    const context = new Constructor();
    void (typeof source === "string" ? fetch(source).then((response) => {
      if (!response.ok) throw new Error("Unable to load audio source.");
      return response.arrayBuffer();
    }) : source.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        if (cancelled) return;
        const channel = buffer.getChannelData(0);
        const points = Math.min(2400, Math.max(1, channel.length));
        const values = new Float32Array(points);
        const samplesPerPoint = channel.length / points;
        for (let index = 0; index < points; index += 1) {
          let peak = 0;
          for (let sample = Math.floor(index * samplesPerPoint); sample < Math.max(1, Math.floor((index + 1) * samplesPerPoint)); sample += 1) peak = Math.max(peak, Math.abs(channel[sample] ?? 0));
          values[index] = peak;
        }
        setWaveform(values);
      })
      .catch(() => { if (!cancelled) setDecodeError("This audio format could not be decoded for waveform preview."); })
      .finally(() => { void context.close(); });
    return () => { cancelled = true; };
  }, [source]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight), ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio; canvas.height = height * ratio;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio); context.clearRect(0, 0, width, height); context.fillStyle = "rgba(127, 127, 127, .28)";
      const values = waveform;
      if (!values?.length) { context.fillRect(0, height / 2 - 1, width, 2); return; }
      const middle = height / 2, step = width / values.length;
      values.forEach((value, index) => { const bar = Math.max(1, value * middle * 0.95); context.fillRect(index * step, middle - bar, Math.max(1, step), bar * 2); });
    };
    draw(); window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [waveform]);

  function loadMetadata() {
    const next = audioRef.current?.duration;
    if (next && Number.isFinite(next)) { setDuration(next); setOutPoint(next); }
  }
  const seek = useCallback((next: number) => {
    const value = Math.min(duration, Math.max(0, next));
    if (audioRef.current) audioRef.current.currentTime = value;
    setCurrent(value);
  }, [duration]);
  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    if (!duration || !trackRef.current) return;
    const bounds = trackRef.current.getBoundingClientRect(), value = ((event.clientX - bounds.left) / bounds.width) * duration;
    const handle = (event.currentTarget as HTMLElement).dataset.handle;
    if (handle === "in") setInPoint(Math.min(outPoint, Math.max(0, value)));
    else if (handle === "out") setOutPoint(Math.max(inPoint, Math.min(duration, value)));
    else seek(value);
  }
  function moveHandle(handle: "in" | "out", event: KeyboardEvent<HTMLDivElement>) {
    const delta = event.key === "ArrowLeft" ? -0.01 : event.key === "ArrowRight" ? 0.01 : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const value = event.key === "Home" ? 0 : event.key === "End" ? duration : (handle === "in" ? inPoint : outPoint) + delta;
    if (handle === "in") setInPoint(Math.min(outPoint, Math.max(0, value)));
    else setOutPoint(Math.max(inPoint, Math.min(duration, value)));
  }
  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    if (audio.paused) { if (audio.currentTime < inPoint || audio.currentTime >= outPoint) audio.currentTime = inPoint; void audio.play(); } else audio.pause();
  }, [duration, inPoint, outPoint]);
  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime >= outPoint && !audio.paused) { audio.pause(); audio.currentTime = inPoint; setPlaying(false); }
    setCurrent(audio.currentTime);
  }
  async function trimSelection() {
    if (!duration || inPoint === outPoint || !onAction) return;
    const action = rangeAction("trim", inPoint, outPoint);
    try {
      await onAction(action);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Audio processing failed.");
    }
  }
  function cancel() { externalCancel?.(); }

  useEffect(() => {
    const handleShortcut = (event: WindowEventMap["keydown"]) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, select, textarea, button")) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seek(current - 0.01);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seek(current + 0.01);
      } else if (event.key.toLowerCase() === "i") {
        setInPoint(Math.min(outPoint, current));
      } else if (event.key.toLowerCase() === "o") {
        setOutPoint(Math.max(inPoint, current));
      } else if (event.key.toLowerCase() === "r") {
        setInPoint(0);
        setOutPoint(duration);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [current, duration, inPoint, outPoint, seek, togglePlayback]);

  const inPosition = duration ? (inPoint / duration) * 100 : 0, outPosition = duration ? (outPoint / duration) * 100 : 100;
  const activeProgress = externalProgress;

  return (
    <section className="video-editor space-y-3" tabIndex={0} aria-label={fileName ? `Audio editor for ${fileName}` : "Audio editor"} onKeyDown={(event) => { if (event.key === "Escape" && activeProgress) cancel(); }}>
      <audio ref={audioRef} src={url} preload="metadata" onLoadedMetadata={loadMetadata} onDurationChange={loadMetadata} onLoadedData={loadMetadata} onTimeUpdate={handleTimeUpdate} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <div ref={trackRef} className="video-timeline relative h-28 touch-none select-none overflow-hidden border border-line bg-panel" onPointerDown={(event) => { if (!(event.target as HTMLElement).dataset.handle) updateFromPointer(event); }} role="group" aria-label="Audio waveform timeline">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
        <div className="absolute inset-y-0 bg-foreground/10" style={{ left: `${inPosition}%`, width: `${Math.max(0, outPosition - inPosition)}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-muted" style={{ left: `${duration ? (current / duration) * 100 : 0}%` }} />
        {(["in", "out"] as const).map((handle) => {
          const position = handle === "in" ? inPosition : outPosition;
          return <div key={handle} data-handle={handle} role="slider" tabIndex={disabled ? -1 : 0} aria-label={handle === "in" ? "In point" : "Out point"} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={handle === "in" ? inPoint : outPoint} className="absolute inset-y-2 z-10 w-11 -translate-x-1/2 cursor-ew-resize rounded border-2 border-foreground bg-background shadow" style={{ left: `${position}%` }} onPointerDown={(event) => { if (disabled) return; event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event); }} onKeyDown={(event) => moveHandle(handle, event)} />;
        })}
      </div>
      {decodeError && <p className="text-xs text-muted">{decodeError}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2"><button type="button" className="control-pill" onClick={togglePlayback} disabled={disabled || !duration}>{playing ? "Pause" : "Play"}</button><span className="font-mono text-xs text-muted" aria-live="polite">{formatMediaTime(current)} / {formatMediaTime(duration)}</span></div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <label>In <input aria-label="In point" className="field media-compact-field ml-1 font-mono" type="number" min={0} max={outPoint} step={0.001} value={inPoint.toFixed(3)} onChange={(event) => setInPoint(Math.min(outPoint, Math.max(0, Number(event.target.value) || 0)))} /></label>
        <label>Out <input aria-label="Out point" className="field media-compact-field ml-1 font-mono" type="number" min={inPoint} max={duration} step={0.001} value={outPoint.toFixed(3)} onChange={(event) => setOutPoint(Math.max(inPoint, Math.min(duration, Number(event.target.value) || 0)))} /></label>
        <span className="font-mono text-xs text-foreground">Selected {formatMediaTime(outPoint - inPoint)}</span>
        <span className="text-[11px]">Space play · ←/→ seek · I/O set points · R reset</span>
      </div>
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      {activeProgress && <div className="space-y-2" aria-live="polite"><div className="flex justify-between text-xs text-muted"><span>{activeProgress.label}</span><span>{Math.round(activeProgress.ratio * 100)}%</span></div><progress className="w-full" max={1} value={activeProgress.ratio} /><button type="button" className="control-pill min-h-11" onClick={cancel}>Cancel</button></div>}
      <div className="video-action-footer">
        {onReplace && <button type="button" className="control-pill" onClick={onReplace}>Replace file</button>}
        <button type="button" aria-label="Trim selection" className="action-button" disabled={disabled || Boolean(activeProgress) || !duration || inPoint === outPoint} onClick={trimSelection}>Trim audio · {formatMediaTime(outPoint - inPoint)}</button>
      </div>
    </section>
  );
}

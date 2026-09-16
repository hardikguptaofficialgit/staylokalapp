"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type SyntheticEvent } from "react";
import { formatMediaTime, type MediaEditorProgress, type MediaSource } from "./types";

const frameStep = (fps: number) => 1 / Math.max(1, fps);

export type VideoEditorOperation = "trim" | "cut" | "split" | "frames" | "speed";

export type VideoEditorAction = {
  operation: VideoEditorOperation;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  start: string;
  duration: string;
  segmentDuration: number;
  speed?: number;
  fps?: number;
};

export type VideoEditorProps = {
  source: MediaSource;
  fileName?: string;
  onReplace?: () => void;
  onAction?: (action: VideoEditorAction) => void | Promise<unknown>;
  progress?: MediaEditorProgress & { operation?: VideoEditorOperation };
  onCancel?: () => void;
  disabled?: boolean;
  maxFileSizeBytes?: number;
};

function useMediaUrl(source: MediaSource, blocked: boolean) {
  const [createdUrl, setCreatedUrl] = useState<{ source: Blob; url: string } | null>(null);

  useEffect(() => {
    if (blocked || typeof source === "string" || typeof window === "undefined") {
      return;
    }

    const url = URL.createObjectURL(source);
    queueMicrotask(() => setCreatedUrl({ source, url }));
    return () => URL.revokeObjectURL(url);
  }, [blocked, source]);

  if (blocked) return null;
  if (typeof source === "string") return source;
  return createdUrl?.source === source ? createdUrl.url : null;
}

type MediaState = "loading" | "ready" | "unsupported" | "corrupt" | "invalid" | "capability" | "too-large";

function sourceMimeType(source: MediaSource, fileName?: string) {
  if (typeof source !== "string" && source.type) return source.type;
  const extension = fileName?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return extension === "webm" ? "video/webm" : extension === "mp4" ? "video/mp4" : extension === "mov" ? "video/quicktime" : undefined;
}

function mediaErrorMessage(state: Exclude<MediaState, "loading" | "ready" | "too-large">) {
  if (state === "unsupported") return "This browser does not support the file's video codec or container. Try a browser-supported MP4 or WebM file.";
  if (state === "corrupt") return "The file could not be decoded and may be corrupt or incomplete. Try a browser-supported MP4 or WebM file.";
  if (state === "invalid") return "This video has no finite duration, so a timeline cannot be created.";
  return "Video playback is unavailable in this browser.";
}

/**
 * The parent owns FFmpeg and passes its output back by returning it from
 * `onAction`. This keeps the editor a real control surface rather than a
 * second media processor.
 */
export function VideoEditor({ source, fileName, onAction, onReplace, progress, onCancel, disabled, maxFileSizeBytes }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const activeUrlRef = useRef<string | null>(null);
  const tooLarge = typeof source !== "string" && maxFileSizeBytes !== undefined && source.size > maxFileSizeBytes;
  const url = useMediaUrl(source, Boolean(tooLarge));
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(30);
  const [speed, setSpeed] = useState(1);
  const [mediaState, setMediaState] = useState<MediaState>(tooLarge ? "too-large" : "loading");
  const [mediaError, setMediaError] = useState("");
  const [thumbnails, setThumbnails] = useState<{ time: number; src: string }[]>([]);

  useEffect(() => {
    activeUrlRef.current = url;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDuration(0);
      setCurrent(0);
      setInPoint(0);
      setOutPoint(0);
      setPlaying(false);
      setThumbnails([]);
      setMediaState(tooLarge ? "too-large" : "loading");
      setMediaError(tooLarge ? `This file is larger than the ${Math.round((maxFileSizeBytes ?? 0) / 1024 / 1024)} MB video limit.` : "");
    });
    return () => { cancelled = true; };
  }, [maxFileSizeBytes, source, tooLarge, url]);

  useEffect(() => {
    if (mediaState !== "ready" || !url || !duration || tooLarge) return;
    let cancelled = false;
    const thumbnailVideo = document.createElement("video");
    const canvas = document.createElement("canvas");
    thumbnailVideo.muted = true;
    thumbnailVideo.preload = "auto";
    thumbnailVideo.src = url;
    const capture = async () => {
      await new Promise<void>((resolve, reject) => {
        thumbnailVideo.onloadedmetadata = () => resolve();
        thumbnailVideo.onerror = () => reject(new Error("thumbnail load failed"));
      });
      canvas.width = 180;
      canvas.height = 100;
      const values: { time: number; src: string }[] = [];
      const count = Math.min(9, Math.max(5, Math.ceil(duration / 5)));
      for (let index = 0; index < count; index += 1) {
        if (cancelled) return;
        const time = count === 1 ? 0 : (duration * index) / (count - 1);
        await new Promise<void>((resolve) => {
          thumbnailVideo.onseeked = () => resolve();
          thumbnailVideo.currentTime = Math.min(duration, time);
        });
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(thumbnailVideo, 0, 0, canvas.width, canvas.height);
        values.push({ time, src: canvas.toDataURL("image/jpeg", 0.68) });
      }
      if (!cancelled) setThumbnails(values);
    };
    void capture().catch(() => {
      if (!cancelled) setThumbnails([]);
    });
    return () => {
      cancelled = true;
      thumbnailVideo.removeAttribute("src");
      thumbnailVideo.load();
    };
  }, [duration, mediaState, tooLarge, url]);

  useEffect(() => {
    if (tooLarge || !url || typeof window === "undefined") return;
    let cancelled = false;
    const video = document.createElement("video");
    if (!video.canPlayType) {
      queueMicrotask(() => {
        if (cancelled) return;
        setMediaState("capability");
        setMediaError(mediaErrorMessage("capability"));
      });
      return () => { cancelled = true; };
    }
    const mime = sourceMimeType(source, fileName);
    if (mime && video.canPlayType(mime) === "") {
      queueMicrotask(() => {
        if (cancelled) return;
        setMediaState("unsupported");
        setMediaError(mediaErrorMessage("unsupported"));
      });
    }
    return () => { cancelled = true; };
  }, [fileName, source, tooLarge, url]);

  function isCurrentMediaEvent(event: SyntheticEvent<HTMLVideoElement>) {
    return event.currentTarget === videoRef.current
      && activeUrlRef.current === url
      && event.currentTarget.currentSrc === url;
  }

  function loadMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    if (!isCurrentMediaEvent(event)) return;
    const video = event.currentTarget;
    const nextDuration = video.duration;
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
      setMediaState("invalid");
      setMediaError(mediaErrorMessage("invalid"));
      return;
    }
    setDuration(nextDuration);
    setOutPoint((previous) => previous > 0 ? Math.min(previous, nextDuration) : nextDuration);
    setMediaState("ready");
    setMediaError("");
  }

  function handleMediaError(event: SyntheticEvent<HTMLVideoElement>) {
    if (!isCurrentMediaEvent(event)) return;
    const code = event.currentTarget.error?.code;
    const state = code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ? "unsupported" : code === MediaError.MEDIA_ERR_DECODE ? "corrupt" : "capability";
    setDuration(0);
    setPlaying(false);
    setMediaState(state);
    setMediaError(mediaErrorMessage(state));
  }

  function markMediaReady() {
    const video = videoRef.current;
    if (!video || activeUrlRef.current !== url || video.currentSrc !== url) return;
    const nextDuration = video.duration;
    if (typeof nextDuration === "number" && Number.isFinite(nextDuration) && nextDuration > 0) {
      setDuration(nextDuration);
      setOutPoint((previous) => previous > 0 ? Math.min(previous, nextDuration) : nextDuration);
      setMediaState("ready");
      setMediaError("");
    } else {
      setMediaState("invalid");
      setMediaError(mediaErrorMessage("invalid"));
    }
  }

  function handleMediaLoadStart(event: SyntheticEvent<HTMLVideoElement>) {
    if (!isCurrentMediaEvent(event) || tooLarge) return;
    setMediaState("loading");
    setMediaError("");
  }

  function handleMediaStalled(event: SyntheticEvent<HTMLVideoElement>) {
    if (!isCurrentMediaEvent(event) || mediaState !== "loading") return;
    setMediaState("loading");
  }

  function handleMediaAbort(event: SyntheticEvent<HTMLVideoElement>) {
    if (!isCurrentMediaEvent(event) || mediaState !== "loading") return;
    setMediaState("loading");
  }

  const seek = useCallback((next: number) => {
    const value = Math.min(duration, Math.max(0, next));
    if (videoRef.current) videoRef.current.currentTime = value;
    setCurrent(value);
  }, [duration]);

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    if (!duration || !trackRef.current) return;
    const bounds = trackRef.current.getBoundingClientRect();
    const value = ((event.clientX - bounds.left) / bounds.width) * duration;
    const handle = (event.currentTarget as HTMLElement).dataset.handle;
    if (handle === "in") setInPoint(Math.min(outPoint, Math.max(0, value)));
    else if (handle === "out") setOutPoint(Math.max(inPoint, Math.min(duration, value)));
    else seek(value);
  }

  function moveHandle(handle: "in" | "out", event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? frameStep(fps) * 10 : frameStep(fps);
    const delta = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const value = event.key === "Home" ? 0 : event.key === "End" ? duration : (handle === "in" ? inPoint : outPoint) + delta;
    if (handle === "in") setInPoint(Math.min(outPoint, Math.max(0, value)));
    else setOutPoint(Math.max(inPoint, Math.min(duration, value)));
  }

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || mediaState !== "ready" || !duration) return;
    if (video.paused) {
      if (video.currentTime < inPoint || video.currentTime >= outPoint) video.currentTime = inPoint;
      void video.play();
    } else video.pause();
  }, [duration, inPoint, mediaState, outPoint]);

  useEffect(() => {
    if (mediaState !== "ready") return;
    const handleShortcut = (event: WindowEventMap["keydown"]) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, select, textarea, button")) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seek(current - frameStep(fps));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seek(current + frameStep(fps));
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
  }, [current, duration, fps, inPoint, mediaState, outPoint, seek, togglePlayback]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= outPoint && !video.paused) {
      video.pause();
      video.currentTime = inPoint;
      setPlaying(false);
    }
    setCurrent(video.currentTime);
  }

  const range = duration ? ((outPoint - inPoint) / duration) * 100 : 0;
  const inPosition = duration ? (inPoint / duration) * 100 : 0;
  const outPosition = duration ? (outPoint / duration) * 100 : 100;
  const action = (operation: VideoEditorOperation): VideoEditorAction => ({
    operation,
    startSeconds: inPoint,
    endSeconds: outPoint,
    durationSeconds: outPoint - inPoint,
    segmentDuration: outPoint - inPoint,
    start: formatMediaTime(inPoint),
    duration: formatMediaTime(outPoint - inPoint),
    speed,
    fps,
  });
  async function emit(operation: VideoEditorOperation) {
    if (!onAction) return;
    await onAction(action(operation));
  }

  return (
    <section className="video-editor space-y-3" tabIndex={0} aria-busy={mediaState === "loading"} aria-label={fileName ? `Video editor for ${fileName}` : "Video editor"} data-media-state={mediaState} onKeyDown={(event) => {
      if (event.key === "Escape" && progress) onCancel?.();
    }}>
      <video
        ref={videoRef}
        key={url ?? "video-source-loading"}
        src={url ?? undefined}
        className="video-preview max-h-[min(32vh,20rem)] w-full border border-line bg-black object-contain"
        controls={false}
        preload="metadata"
        playsInline
        onLoadedMetadata={loadMetadata}
        onDurationChange={(event) => {
          if (isCurrentMediaEvent(event) && Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0) loadMetadata(event);
        }}
        onLoadedData={markMediaReady}
        onCanPlay={markMediaReady}
        onLoadStart={handleMediaLoadStart}
        onError={handleMediaError}
        onStalled={handleMediaStalled}
        onAbort={handleMediaAbort}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {mediaState === "loading" && <p className="text-xs text-muted" role="status">Loading video metadata…</p>}
      {mediaError && <p className="text-xs text-red-500" role="alert">{mediaError}</p>}
      {mediaState !== "ready" && mediaState !== "loading" && mediaState !== "too-large" && <p className="text-xs text-muted" role="status">Timeline controls are unavailable until this video can be previewed.</p>}
      {mediaState !== "ready" ? null : <div className="video-editor-workspace space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="control-pill" onClick={togglePlayback} disabled={disabled || !duration} aria-label={playing ? "Pause preview" : "Play selected range"}>{playing ? "Pause" : "Play"}</button>
          <button type="button" className="control-pill" onClick={() => seek(current - frameStep(fps))} disabled={disabled || !duration} aria-label="Previous frame">Previous frame</button>
          <button type="button" className="control-pill" onClick={() => seek(current + frameStep(fps))} disabled={disabled || !duration} aria-label="Next frame">Next frame</button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <label>FPS <input aria-label="Frames per second" className="field media-compact-field ml-1 font-mono" type="number" min={1} max={240} step={1} value={fps} onChange={(event) => setFps(Math.max(1, Number(event.target.value) || 30))} /></label>
          <label>Speed <select aria-label="Playback speed" className="field media-compact-field ml-1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>{[0.5, 0.75, 1, 1.5, 2].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
        </div>
        <span className="font-mono text-xs text-muted" aria-live="polite">{formatMediaTime(current)} / {formatMediaTime(duration)}</span>
      </div>
      <div ref={trackRef} className="video-timeline relative touch-none select-none border border-line bg-panel" onPointerDown={(event) => {
        if (!disabled && mediaState === "ready" && !(event.target as HTMLElement).dataset.handle) updateFromPointer(event);
      }} role="group" aria-label="Video timeline">
        <div className="timeline-ruler">{Array.from({ length: Math.max(2, Math.ceil(duration / 5) + 1) }, (_, index) => <span key={index} style={{ left: `${Math.min(100, (index * 5 / duration) * 100)}%` }}>{index * 5}s</span>)}</div>
        <div ref={filmstripRef} className="timeline-filmstrip" aria-label="Video thumbnail filmstrip" onWheel={(event) => {
          if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            event.currentTarget.scrollLeft += event.deltaY;
            event.preventDefault();
          }
        }}>
          <div className="timeline-filmstrip-content" style={{ width: `${Math.max(100, thumbnails.length * 140)}px` }}>
            {thumbnails.map((thumbnail, index) => <button type="button" key={thumbnail.time} className="timeline-thumbnail" style={{ left: `${((index + 0.5) / Math.max(1, thumbnails.length)) * 100}%`, width: `${100 / Math.max(1, thumbnails.length)}%` }} onClick={() => seek(thumbnail.time)} aria-label={`Seek to ${formatMediaTime(thumbnail.time)}`}><img src={thumbnail.src} alt="" /></button>)}
          </div>
        </div>
        {thumbnails.length > 1 && <>
          <button type="button" className="timeline-scroll-button timeline-scroll-left" aria-label="Scroll frames left" onClick={() => filmstripRef.current?.scrollBy({ left: -280, behavior: "smooth" })}>‹</button>
          <button type="button" className="timeline-scroll-button timeline-scroll-right" aria-label="Scroll frames right" onClick={() => filmstripRef.current?.scrollBy({ left: 280, behavior: "smooth" })}>›</button>
        </>}
        <div className="absolute inset-y-0 rounded bg-foreground/10" style={{ left: `${inPosition}%`, width: `${range}%` }} />
        <div className="timeline-playhead" style={{ left: `${duration ? (current / duration) * 100 : 0}%` }} aria-label={`Current position ${formatMediaTime(current)}`} />
        {(["in", "out"] as const).map((handle) => {
          const position = handle === "in" ? inPosition : outPosition;
          return (
            <div
              key={handle}
              data-handle={handle}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={handle === "in" ? "In point" : "Out point"}
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={handle === "in" ? inPoint : outPoint}
              className="timeline-handle absolute top-1/2 z-10 h-12 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize border-2 border-foreground bg-background"
              style={{ left: `${position}%` }}
              onPointerDown={(event) => {
                if (disabled) return;
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event);
              }}
              onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
              onPointerCancel={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
              onKeyDown={(event) => moveHandle(handle, event)}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <label>In <input aria-label="In point" className="field media-compact-field ml-1 font-mono" type="number" min={0} max={outPoint} step={0.001} value={inPoint.toFixed(3)} onChange={(event) => setInPoint(Math.min(outPoint, Math.max(0, Number(event.target.value) || 0)))} /></label>
        <label>Out <input aria-label="Out point" className="field media-compact-field ml-1 font-mono" type="number" min={inPoint} max={duration} step={0.001} value={outPoint.toFixed(3)} onChange={(event) => setOutPoint(Math.max(inPoint, Math.min(duration, Number(event.target.value) || 0)))} /></label>
        <span className="font-mono text-xs text-foreground">Selected {formatMediaTime(outPoint - inPoint)}</span>
        <span className="text-[11px] text-muted">Space play · ←/→ frame · I/O set points · R reset</span>
      </div>
      {progress && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex justify-between text-xs text-muted"><span>{progress.label}</span><span>{Math.round(progress.ratio * 100)}%</span></div>
          <progress className="w-full" max={1} value={progress.ratio} />
          {onCancel && <button type="button" className="control-pill" onClick={onCancel}>Cancel</button>}
        </div>
      )}
      {onAction && (
        <div className="video-action-footer">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="control-pill" disabled={disabled || !duration || inPoint === outPoint} onClick={() => void emit("cut")}>Cut</button>
            <button type="button" className="control-pill" disabled={disabled || !duration} onClick={() => void emit("split")}>Split</button>
            <button type="button" className="control-pill" disabled={disabled || !duration} onClick={() => void emit("frames")}>Extract frames</button>
            <button type="button" aria-label={`Apply ${speed}× speed`} className="control-pill" disabled={disabled || !duration || speed === 1} onClick={() => void emit("speed")}>Speed {speed}×</button>
            {onReplace && <button type="button" className="control-pill" onClick={onReplace}>Replace file</button>}
          </div>
          <button type="button" aria-label="Trim selection" className="action-button justify-center" disabled={disabled || !duration || inPoint === outPoint} onClick={() => void emit("trim")}>Trim video · {formatMediaTime(outPoint - inPoint)}</button>
        </div>
      )}
      </div>}
    </section>
  );
}


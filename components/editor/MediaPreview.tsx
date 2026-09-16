"use client";

import Image from "next/image";
import type { ReactNode } from "react";

export interface MediaPreviewProps {
  src?: string;
  alt?: string;
  type?: "image" | "video" | "audio" | "document";
  emptyLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function MediaPreview({
  src,
  alt = "Media preview",
  type = "image",
  emptyLabel = "Preview unavailable",
  children,
  className = "",
}: MediaPreviewProps) {
  return (
    <div className={`media-preview media-preview-${type} ${className}`.trim()}>
      {children ??
        (src && type === "image" ? (
          <Image src={src} alt={alt} className="media-preview-image" fill sizes="(max-width: 800px) 100vw, 70vw" />
        ) : src && type === "video" ? (
          <video src={src} controls className="media-preview-video" />
        ) : src && type === "audio" ? (
          <audio src={src} controls className="media-preview-audio" />
        ) : (
          <span className="media-preview-empty">{emptyLabel}</span>
        ))}
    </div>
  );
}

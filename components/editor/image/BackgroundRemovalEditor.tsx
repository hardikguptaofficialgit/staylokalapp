"use client";

import { useEffect, useState } from "react";

type BackgroundRemovalEditorProps = {
  file: File;
};

export default function BackgroundRemovalEditor({ file }: BackgroundRemovalEditorProps) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    // The URL is created here so React Strict Mode remounts receive a fresh URL.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return (
    <section className="image-background-editor" aria-label="Background removal preview">
      <div className="image-background-preview">
        {url && <img src={url} alt="Image ready for background removal" />}
      </div>
      <div>
        <p className="eyebrow">Local segmentation</p>
        <h4>Remove the background</h4>
        <p>The image stays on this device. The first run downloads and caches the segmentation model.</p>
      </div>
    </section>
  );
}

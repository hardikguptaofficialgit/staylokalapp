import { ProcessingError, type ProcessedFile, type ToolProcessor } from "./types";

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ProcessingError("This image could not be decoded.", "invalid"));
    };
    image.src = url;
  });
}

const imageProcessor: ToolProcessor = async (files, options, context) => {
  if (String(options.operation || "") === "image-contact-sheet") {
    const columns = Math.max(1, Math.min(4, Number(options.columns) || 3));
    const cardWidth = 280;
    const gap = 24;
    const labelHeight = 28;
    const images = [];
    for (const [index, file] of files.entries()) {
      if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
      const image = await loadImage(file);
      images.push(image);
      context.onProgress({ ratio: Math.min(0.4, (index + 1) / files.length / 2), label: `Loaded image ${index + 1} of ${files.length}` });
    }
    const rows = Math.ceil(images.length / columns);
    const cardHeights = images.map((image) => Math.round(cardWidth * image.naturalHeight / image.naturalWidth) + labelHeight);
    const cardHeight = Math.max(...cardHeights, 1);
    const canvas = document.createElement("canvas");
    canvas.width = columns * cardWidth + (columns + 1) * gap;
    canvas.height = rows * cardHeight + (rows + 1) * gap;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) throw new ProcessingError("Your browser could not create the contact sheet canvas.", "unsupported");
    canvasContext.fillStyle = "#f4f4f4";
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach((image, index) => {
      const width = Math.min(cardWidth, image.naturalWidth);
      const height = Math.round(width * image.naturalHeight / image.naturalWidth);
      const x = gap + (index % columns) * (cardWidth + gap);
      const y = gap + Math.floor(index / columns) * (cardHeight + gap);
      canvasContext.fillStyle = "#fff";
      canvasContext.fillRect(x, y, cardWidth, cardHeight);
      canvasContext.drawImage(image, x, y, width, height);
      canvasContext.fillStyle = "#555";
      canvasContext.font = "14px sans-serif";
      canvasContext.fillText(`Image ${index + 1}`, x + 10, y + cardHeight - 10);
      context.onProgress({ ratio: 0.4 + ((index + 1) / images.length) * 0.5, label: `Placed image ${index + 1} of ${images.length}` });
    });
    const format = String(options.format || "image/png");
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, 0.92));
    if (!blob) throw new ProcessingError("Contact sheet export failed.", "runtime");
    context.onProgress({ ratio: 1, label: "Contact sheet ready" });
    const extension = format === "image/jpeg" ? "jpg" : format.split("/")[1] || "png";
    const baseName = files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : "images";
    return [{ blob, type: format, name: `${baseName}-contact-sheet.${extension}` }];
  }
  if (String(options.operation || "") === "image-upscale") {
    let Upscaler: typeof import("upscaler").default | undefined;
    let model: typeof import("@upscalerjs/esrgan-thick/2x").default | undefined;
    try {
      const [upscalerModule, modelModule] = await Promise.all([
        import("upscaler"),
        import("@upscalerjs/esrgan-thick/2x"),
      ]);
      Upscaler = upscalerModule.default;
      model = modelModule.default;
    } catch (error) {
      throw new ProcessingError(error instanceof Error ? `AI upscaling could not load: ${error.message}` : "AI upscaling could not load.", "unsupported");
    }
    if (!Upscaler || !model) throw new ProcessingError("AI upscaling could not load.", "unsupported");
    const localModel = {
      ...model,
      path: new URL("/upscaler/esrgan/x2/model.json", window.location.origin).toString(),
      _internals: {
        ...(model as unknown as { _internals?: Record<string, unknown> })._internals,
        path: new URL("/upscaler/esrgan/x2/model.json", window.location.origin).toString(),
      },
    } as typeof model;
    let upscaler: InstanceType<typeof Upscaler>;
    try {
      upscaler = new Upscaler({ model: localModel });
    } catch (error) {
      throw new ProcessingError(error instanceof Error ? `AI upscaling could not initialize: ${error.message}` : "AI upscaling could not initialize.", "unsupported");
    }
    const outputs: ProcessedFile[] = [];
    const abort = () => upscaler.abort();
    context.signal.addEventListener("abort", abort, { once: true });
    try {
      for (const [index, file] of files.entries()) {
        if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
        const image = await loadImage(file);
        let dataUrl: string;
        try {
          dataUrl = await upscaler.upscale(image, {
            patchSize: 64,
            padding: 2,
            progress: (progress: number) => context.onProgress({
              ratio: Math.min(0.99, (index + Math.max(0, Math.min(1, progress))) / files.length),
              label: `AI upscaling · image ${index + 1} of ${files.length}`,
            }),
          });
        } catch (error) {
          throw new ProcessingError(error instanceof Error ? `AI upscaling failed: ${error.message}` : "AI upscaling failed.", "runtime");
        }
        const blob = await fetch(dataUrl).then((response) => response.blob());
        outputs.push({
          blob,
          type: "image/png",
          name: `${file.name.replace(/\.[^.]+$/, "")}-upscaled-2x.png`,
        });
      }
      return outputs;
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(error instanceof Error ? `AI upscaling failed: ${error.message}` : "AI upscaling failed.", "runtime");
    } finally {
      context.signal.removeEventListener("abort", abort);
      try {
        await upscaler.dispose();
      } catch {
        // TensorFlow backends may already release resources after an abort.
      }
    }
  }
  if (String(options.operation || "") === "image-background-remove") {
    const { removeBackground } = await import("@imgly/background-removal");
    const outputs: ProcessedFile[] = [];
    for (const [index, file] of files.entries()) {
      if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
      const webGpu = typeof navigator !== "undefined"
        ? (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu
        : undefined;
      const preferredDevice = await webGpu?.requestAdapter()
        ? "gpu"
        : "cpu";
      const runRemoval = (device: "cpu" | "gpu") => removeBackground(file, {
        model: "isnet_fp16",
        device,
        rescale: true,
        publicPath: new URL("/background-removal/", window.location.origin).toString(),
        output: { format: "image/png" },
        progress: (key: string, current: number, total: number) => {
          const phaseRatio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
          const phaseStart = key.includes("fetch") ? 0.02 : key.includes("decode") ? 0.2 : key.includes("inference") ? 0.65 : 0.9;
          const phaseSpan = key.includes("fetch") ? 0.18 : key.includes("decode") ? 0.45 : key.includes("inference") ? 0.25 : 0.08;
          context.onProgress({
            ratio: Math.min(0.99, (index + phaseStart + phaseRatio * phaseSpan) / files.length),
            label: `Removing background · ${key}`,
          });
        },
      });
      let blob: Blob;
      try {
        blob = await runRemoval(preferredDevice);
      } catch (error) {
        if (preferredDevice !== "gpu") {
          throw new ProcessingError(error instanceof Error ? `Background removal failed: ${error.message}` : "Background removal failed.", "runtime");
        }
        try {
          blob = await runRemoval("cpu");
        } catch (fallbackError) {
          throw new ProcessingError(fallbackError instanceof Error ? `Background removal failed: ${fallbackError.message}` : "Background removal failed.", "runtime");
        }
      }
      outputs.push({
        blob,
        type: "image/png",
        name: `${file.name.replace(/\.[^.]+$/, "")}-no-background.png`,
      });
    }
    return outputs;
  }
  if (String(options.operation || "") === "image-gif") {
    const first = await loadImage(files[0]);
    const width = Math.max(1, Math.min(1200, Number(options.width) || first.naturalWidth));
    const height = Math.max(1, Math.round(width * first.naturalHeight / first.naturalWidth));
    const importedGifenc = await import("gifenc");
    const defaultGifenc = importedGifenc.default as Record<string, unknown> | undefined;
    const { GIFEncoder, quantize, applyPalette } = (defaultGifenc?.GIFEncoder ? defaultGifenc : importedGifenc) as unknown as {
      GIFEncoder: () => { writeFrame: (index: Uint8Array, width: number, height: number, options: Record<string, unknown>) => void; finish: () => void; bytes: () => Uint8Array };
      quantize: (pixels: Uint8ClampedArray, maxColors: number) => number[][];
      applyPalette: (pixels: Uint8ClampedArray, palette: number[][]) => Uint8Array;
    };
    const encoder = GIFEncoder();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ProcessingError("Your browser could not create an image canvas.", "unsupported");
    for (const [index, file] of files.entries()) {
      if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
      const image = index === 0 ? first : await loadImage(file);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, width, height).data;
      const palette = quantize(pixels, 256);
      encoder.writeFrame(applyPalette(pixels, palette), width, height, { palette, delay: 500, repeat: 0 });
      context.onProgress({ ratio: (index + 1) / files.length, label: `Encoded frame ${index + 1} of ${files.length}` });
    }
    encoder.finish();
    const encoded = encoder.bytes();
    const buffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
    return [{ blob: new Blob([buffer], { type: "image/gif" }), type: "image/gif", name: `${files[0].name.replace(/\.[^.]+$/, "")}-animated.gif` }];
  }
  const width = Number(options.width) || undefined;
  const height = Number(options.height) || undefined;
  const operation = String(options.operation || "image-process");
  const requestedQuality = Number(options.quality);
  const quality = requestedQuality > 1
    ? Math.min(1, Math.max(0.1, (100 - requestedQuality) / 100))
    : Math.min(1, Math.max(0.1, requestedQuality || 0.85));
  const format = String(options.format || "image/jpeg");
  const outputs: ProcessedFile[] = [];

  for (const [index, file] of files.entries()) {
    if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
    const image = await loadImage(file);
  const ratio = operation === "image-upscale"
    ? Math.max(1, width ? width / image.naturalWidth : 2)
    : width ? Math.min(1, width / image.naturalWidth) : 1;
    const canvas = document.createElement("canvas");
    const targetWidth = operation === "image-crop" ? width ?? image.naturalWidth : Math.max(1, Math.round(image.naturalWidth * ratio));
    const targetHeight = operation === "image-crop"
      ? height ?? image.naturalHeight
      : Math.max(1, Math.round(image.naturalHeight * ratio));
    const rotated = operation === "image-rotate" && Number(options.angle || 90) % 180 !== 0;
    canvas.width = rotated ? targetHeight : targetWidth;
    canvas.height = rotated ? targetWidth : targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ProcessingError("Your browser could not create an image canvas.", "unsupported");
    ctx.save();
    if (operation === "image-flip") {
      ctx.translate(canvas.width, 0);
      if (options.flip === "vflip") {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      } else {
        ctx.scale(-1, 1);
      }
    } else if (operation === "image-rotate") {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((Number(options.angle || 90) * Math.PI) / 180);
      ctx.translate(-targetWidth / 2, -targetHeight / 2);
    }
    if (operation === "image-crop") {
      const sourceWidth = Math.min(targetWidth, image.naturalWidth);
      const sourceHeight = Math.min(targetHeight, image.naturalHeight);
      const cropX = Number(options.cropX);
      const cropY = Number(options.cropY);
      const sourceX = Math.max(0, Math.min(image.naturalWidth - sourceWidth, Number.isFinite(cropX) ? cropX : (image.naturalWidth - sourceWidth) / 2));
      const sourceY = Math.max(0, Math.min(image.naturalHeight - sourceHeight, Number.isFinite(cropY) ? cropY : (image.naturalHeight - sourceHeight) / 2));
      ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
    } else {
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    }
    if (operation === "image-watermark" && String(options.text || "").trim()) {
      const text = String(options.text).trim();
      const fontSize = Math.max(8, Number(options.fontSize) || 36);
      const margin = Math.max(16, fontSize);
      const position = String(options.position || "bottom-right");
      ctx.globalAlpha = Math.max(0, Math.min(1, Number(options.opacity) || 0.6));
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.shadowColor = "rgb(0 0 0 / 0.65)";
      ctx.shadowBlur = Math.max(2, fontSize / 8);
      const textWidth = ctx.measureText(text).width;
      const x = position.endsWith("right") ? targetWidth - margin - textWidth : position.endsWith("left") ? margin : (targetWidth - textWidth) / 2;
      const y = position.startsWith("top") ? margin + fontSize : position.startsWith("bottom") ? targetHeight - margin : (targetHeight + fontSize) / 2;
      ctx.fillText(text, x, y);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    if (operation === "image-meme") {
      const fontSize = Math.max(12, Number(options.fontSize) || Math.min(72, targetWidth / 10));
      ctx.font = `900 ${fontSize}px Impact, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      for (const [text, y] of [[String(options.topText || "").trim(), fontSize * 1.1], [String(options.bottomText || "").trim(), targetHeight - fontSize * 1.1] ] as const) {
        if (!text) continue;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = Math.max(3, fontSize / 8);
        ctx.strokeText(text.toUpperCase(), targetWidth / 2, y, targetWidth - fontSize);
        ctx.fillStyle = "#fff";
        ctx.fillText(text.toUpperCase(), targetWidth / 2, y, targetWidth - fontSize);
      }
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, quality));
    if (!blob) throw new ProcessingError("The image could not be encoded.", "runtime");
    const extension = format.split("/")[1].replace("jpeg", "jpg");
    outputs.push({
      blob,
      type: format,
      name: `${file.name.replace(/\.[^.]+$/, "")}-${operation.replace("image-", "")}.${extension}`,
    });
    context.onProgress({ ratio: (index + 1) / files.length, label: `Processed ${index + 1} of ${files.length}` });
  }
  return outputs;
};

export default imageProcessor;

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

/** Uncompressed baseline RGB TIFF (8-bit) for broad viewer support. */
export function encodeRgbaToTiff(width: number, height: number, rgba: Uint8ClampedArray): Uint8Array {
  const rgb = new Uint8Array(width * height * 3);
  for (let index = 0; index < width * height; index += 1) {
    const source = index * 4;
    const target = index * 3;
    rgb[target] = rgba[source];
    rgb[target + 1] = rgba[source + 1];
    rgb[target + 2] = rgba[source + 2];
  }

  const ifdStart = 8;
  const tagCount = 9;
  const ifdSize = 2 + tagCount * 12 + 4;
  const bitsPerSampleOffset = ifdStart + ifdSize;
  const imageOffset = bitsPerSampleOffset + 6;
  const total = imageOffset + rgb.length;
  const buffer = new Uint8Array(total);
  const view = new DataView(buffer.buffer);

  writeUint16(view, 0, 0x4949);
  writeUint32(view, 4, ifdStart);

  writeUint16(view, bitsPerSampleOffset, 8);
  writeUint16(view, bitsPerSampleOffset + 2, 8);
  writeUint16(view, bitsPerSampleOffset + 4, 8);

  let ifd = ifdStart;
  writeUint16(view, ifd, tagCount);
  ifd += 2;

  const tag = (code: number, type: number, count: number, value: number) => {
    writeUint16(view, ifd, code);
    writeUint16(view, ifd + 2, type);
    writeUint32(view, ifd + 4, count);
    writeUint32(view, ifd + 8, value);
    ifd += 12;
  };

  tag(256, 4, 1, width);
  tag(257, 4, 1, height);
  tag(258, 3, 3, bitsPerSampleOffset);
  tag(259, 3, 1, 1);
  tag(262, 3, 1, 2);
  tag(273, 4, 1, imageOffset);
  tag(277, 3, 1, 3);
  tag(278, 4, 1, height);
  tag(279, 4, 1, rgb.length);

  writeUint32(view, ifd, 0);
  buffer.set(rgb, imageOffset);
  return buffer;
}

export function encodeCanvasToTiff(canvas: HTMLCanvasElement): Uint8Array {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("TIFF canvas unavailable");
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  return encodeRgbaToTiff(width, height, pixels);
}

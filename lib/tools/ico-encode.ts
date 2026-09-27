/** Build a Windows ICO that embeds a PNG frame (Vista+ compatible). */
export async function encodeCanvasToIco(canvas: HTMLCanvasElement): Promise<Blob> {
  const maxDimension = 256;
  const work = document.createElement("canvas");
  const longest = Math.max(canvas.width, canvas.height, 1);
  const scale = Math.min(1, maxDimension / longest);
  work.width = Math.max(1, Math.round(canvas.width * scale));
  work.height = Math.max(1, Math.round(canvas.height * scale));
  const context = work.getContext("2d");
  if (!context) throw new Error("ICO canvas unavailable");
  context.drawImage(canvas, 0, 0, work.width, work.height);
  const pngBlob = await new Promise<Blob | null>((resolve) => work.toBlob(resolve, "image/png"));
  if (!pngBlob) throw new Error("ICO PNG frame failed");
  const png = new Uint8Array(await pngBlob.arrayBuffer());

  const header = new Uint8Array(6);
  const headerView = new DataView(header.buffer);
  headerView.setUint16(0, 0, true);
  headerView.setUint16(2, 1, true);
  headerView.setUint16(4, 1, true);

  const entry = new Uint8Array(16);
  entry[0] = work.width >= 256 ? 0 : work.width;
  entry[1] = work.height >= 256 ? 0 : work.height;
  const entryView = new DataView(entry.buffer);
  entryView.setUint16(4, 1, true);
  entryView.setUint16(6, 32, true);
  entryView.setUint32(8, png.length, true);
  entryView.setUint32(12, header.length + entry.length, true);

  return new Blob([header, entry, png], { type: "image/x-icon" });
}

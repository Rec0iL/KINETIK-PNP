/** Verkleinert ein Bild auf höchstens `max` Pixel Kantenlänge und liefert eine JPEG-Data-URL. */
export async function imageToDataUrl(file: File, max = 320, quality = 0.82): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', quality);
}

/** Verkleinert eine Data-URL (z.B. Porträt) für Token. */
export async function shrinkDataUrl(src: string, max = 96): Promise<string> {
  const blob = await (await fetch(src)).blob();
  const bmp = await createImageBitmap(blob);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.min(max, side);
  // Quadratischer Ausschnitt, leicht nach oben gerichtet (Gesichter)
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, 0, side, side, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', 0.8);
}

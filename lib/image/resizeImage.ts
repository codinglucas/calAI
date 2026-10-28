// Browser-only: uses createImageBitmap and <canvas>.

/**
 * Scales a photo down so its longest side is at most `maxSide` pixels and
 * re-encodes it as JPEG. Phone photos shrink from several MB to ~150 KB, so
 * the upload is fast and stays well under the API's image size limit.
 */
export async function resizeToJpeg(file: Blob, maxSide = 1024, quality = 0.85): Promise<Blob> {
  // "from-image" applies the EXIF rotation so portrait photos stay upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is unavailable.");
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the photo."))),
        "image/jpeg",
        quality,
      ),
    );
  } finally {
    bitmap.close();
  }
}

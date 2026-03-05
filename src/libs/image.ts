type Resize = {
  width: number;
  height: number;
};

type Compress = {
  quality: number; // 0 to 1
  format: "jpeg" | "png" | "webp";
};

export type ProcessImageOptions = {
  resize?: Resize;
  compress?: Compress;
};

export async function processImage(
  image: ImageObject,
  options: ProcessImageOptions,
): Promise<ImageObject> {
  const imageBitmap = await createImageBitmap(image.blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const { resize, compress } = options;

  const targetWidth = resize?.width ?? imageBitmap.width;
  const targetHeight = resize?.height ?? imageBitmap.height;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

  const outputFormat = compress?.format || image.meta.type.split("/")[1] || "jpeg";
  const quality = compress?.quality ?? 1;

  return new Promise<ImageObject>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({
            blob,
            meta: {
              width: targetWidth,
              height: targetHeight,
              size: blob.size,
              type: blob.type,
            },
          });
        } else {
          reject(new Error("Image compression failed"));
        }
      },
      `image/${outputFormat}`,
      quality,
    );
  });
}

export type ImageObject = {
  blob: Blob;
  meta: {
    width: number;
    height: number;
    size: number;
    type: string;
  };
};

export async function createImageObject(url: string): Promise<ImageObject> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch image");
  }
  const blob = await response.blob();

  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await img.decode();

  return {
    blob,
    meta: {
      width: img.naturalWidth,
      height: img.naturalHeight,
      size: blob.size,
      type: blob.type,
    },
  };
}

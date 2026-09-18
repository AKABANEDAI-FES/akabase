export type ZipEntry = {
  name: string;
  blob: Blob;
};

export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const { zip } = await import("fflate");
  const input = Object.fromEntries(
    await Promise.all(
      entries.map(
        async ({ name, blob }) => [name, new Uint8Array(await blob.arrayBuffer())] as const,
      ),
    ),
  );
  // oxlint-disable-next-line promise/avoid-new
  const data = await new Promise<Uint8Array>((resolve, reject) => {
    zip(input, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
  return new Blob([new Uint8Array(data)], { type: "application/zip" });
}

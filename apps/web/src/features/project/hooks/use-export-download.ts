import { useCallback, useState } from "react";
import { toaster } from "@akabase/ui/components/toast";
import { downloadFile } from "@/libs/download";
import { createZip } from "@/libs/zip";
import type { ZipEntry } from "@/libs/zip";

export type ExportFormat = "CSV" | "JSON" | "Excel";

type BuildFiles = () => Promise<ZipEntry[]>;

export function useExportDownload() {
  const [zipEnabled, setZipEnabled] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null);

  const download = useCallback(
    async (format: ExportFormat, buildFiles: BuildFiles): Promise<void> => {
      setPendingFormat(format);
      try {
        for (const file of await buildFiles()) {
          downloadFile(file.name, file.blob);
        }
      } catch (error) {
        console.error(`Failed to export ${format}:`, error);
        toaster.create({
          type: "error",
          title: "エラー",
          description: `${format}ファイルの生成に失敗しました`,
        });
      } finally {
        setPendingFormat(null);
      }
    },
    [],
  );

  const downloadZippable = useCallback(
    async (format: ExportFormat, zipName: string, buildFiles: BuildFiles): Promise<void> =>
      download(format, async () => {
        const files = await buildFiles();
        return zipEnabled && files.length > 1
          ? [{ name: zipName, blob: await createZip(files) }]
          : files;
      }),
    [download, zipEnabled],
  );

  return { zipEnabled, setZipEnabled, pendingFormat, download, downloadZippable };
}

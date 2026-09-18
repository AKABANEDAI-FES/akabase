import { useCallback, useState } from "react";
import { toaster } from "@akabase/ui/components/toast";
import { downloadFile } from "@/libs/download";

export type ExportFormat = "CSV" | "JSON" | "Excel";

type BuildFiles = () => Promise<{ name: string; blob: Blob }[]>;

export function useExportDownload() {
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

  return { pendingFormat, download };
}

export function downloadFile(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  // `append` resolves to the Workers `HTMLRewriter` overload here, so use `appendChild`
  document.body.appendChild(anchor);
  anchor.click();
  // Revoke after the click has been handled, the same way Ark UI's DownloadTrigger does
  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 0);
}

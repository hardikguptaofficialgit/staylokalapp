import { matchesAcceptedFile } from "@/lib/tools/validation";

export type FileQueueItem = {
  file: File;
  queueIndex: number;
};

export function acceptedFileQueueItems(files: File[], accept: readonly string[]): FileQueueItem[] {
  return files
    .map((file, queueIndex) => ({ file, queueIndex }))
    .filter(({ file }) => matchesAcceptedFile(file, [...accept]));
}

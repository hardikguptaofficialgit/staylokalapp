declare module "pptx-browser" {
  export class PptxRenderer {
    slideCount: number;
    load(source: File | Blob | ArrayBuffer, onProgress?: (progress: number, message: string) => void): Promise<void>;
    renderSlide(index: number, canvas: HTMLCanvasElement, width?: number): Promise<void>;
    destroy(): void;
  }
}

import { imageToCanvas } from './canvas';

export async function loadImageFileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const canvas = imageToCanvas(bitmap);
  bitmap.close();
  return canvas;
}

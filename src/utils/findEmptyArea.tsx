import { GeneratedImage } from "../state";

const IMG_SIZE = 400; // TODO
const isOverlappingOrTooClose = (
  x: number,
  y: number,
  images: GeneratedImage[]
): boolean => {
  const newWidth = 400;
  const newHeight = 400;
  for (const img of images) {
    const overlapX =
      x < img.transform.x + IMG_SIZE + 20 &&
      x + newWidth + 20 > img.transform.x;
    const overlapY =
      y < img.transform.y + IMG_SIZE + 20 &&
      y + newHeight + 20 > img.transform.y;
    if (overlapX && overlapY) {
      return true;
    }
  }
  return false;
};

export const findEmptyArea = (
  centerX: number,
  centerY: number,
  images: GeneratedImage[]
): { x: number; y: number } => {
  let boundary = 500; // start boundary for 1000x1000 area
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const x = Math.floor(Math.random() * (2 * boundary) - boundary) + centerX;
    const y = Math.floor(Math.random() * (2 * boundary) - boundary) + centerY;
    if (!isOverlappingOrTooClose(x, y, images)) {
      return { x, y };
    }
    boundary += 30;
  }
};

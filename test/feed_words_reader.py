import sys
import numpy as np
import pytesseract
from PIL import Image


def _find_bubble_bboxes(image, brightness_threshold=30, min_area=500):
    """Find bounding boxes of bright bubble regions on a dark background."""
    gray = np.array(image.convert("L"))
    mask = (gray > brightness_threshold).astype(np.uint8)

    # Simple connected-component labeling via flood fill
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    label_id = 0

    for y in range(h):
        for x in range(w):
            if mask[y, x] == 1 and labels[y, x] == 0:
                label_id += 1
                # BFS flood fill
                stack = [(y, x)]
                while stack:
                    cy, cx = stack.pop()
                    if cy < 0 or cy >= h or cx < 0 or cx >= w:
                        continue
                    if mask[cy, cx] == 0 or labels[cy, cx] != 0:
                        continue
                    labels[cy, cx] = label_id
                    stack.extend([(cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)])

    bboxes = []
    for lid in range(1, label_id + 1):
        ys, xs = np.where(labels == lid)
        area = len(ys)
        if area < min_area:
            continue
        bboxes.append((int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())))

    # Sort in reading order: top-to-bottom rows, then left-to-right
    if bboxes:
        row_height = np.median([b[3] - b[1] for b in bboxes])
        bboxes.sort(key=lambda b: (round(b[1] / row_height), b[0]))

    return bboxes


def read_text(image_path: str) -> str:
    try:
        image = Image.open(image_path).convert("RGB")
    except Exception as e:
        raise RuntimeError(f"Failed to open image '{image_path}': {e}") from e

    try:
        bboxes = _find_bubble_bboxes(image)
    except Exception as e:
        raise RuntimeError(f"Failed to detect bubbles in '{image_path}': {e}") from e

    if not bboxes:
        raise RuntimeError(f"No text bubbles detected in '{image_path}'")

    results = []
    for x0, y0, x1, y1 in bboxes:
        crop = image.crop((x0, y0, x1, y1))
        try:
            text = pytesseract.image_to_string(crop).strip()
        except Exception as e:
            raise RuntimeError(f"Tesseract OCR failed on '{image_path}': {e}") from e
        if text:
            results.append(text)

    return ", ".join(results)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <image_path>", file=sys.stderr)
        sys.exit(1)

    print(read_text(sys.argv[1]))

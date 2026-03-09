"""
ZODO CRM — AI Roof Estimator Microservice
FastAPI + YOLOv8n-seg (CPU optimized)
Designed for Ubuntu 24.04 VPS (2 vCPU, 8GB RAM)

Returns segmentation masks, contours, and per-segment data
alongside the original roof_area_sqft / confidence output.
"""

import io
import time
import logging
import base64
from contextlib import asynccontextmanager
from typing import Optional

import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse

# ============================================================================
# Configuration
# ============================================================================

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_IMAGE_DIM = 640
DEFAULT_ZOOM = 20
DEFAULT_LATITUDE = 49.0
SQFT_PER_SQM = 10.7639

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("roof-estimator")

# ============================================================================
# Model loading (application lifespan)
# ============================================================================

model = None  # will be set at startup


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the YOLO model once at startup, release on shutdown."""
    global model
    logger.info("Loading YOLOv8n-seg model (CPU)…")
    start = time.time()

    from ultralytics import YOLO

    model = YOLO("yolov8n-seg.pt")
    # Force CPU
    model.to("cpu")

    logger.info(f"Model loaded in {time.time() - start:.2f}s")
    yield
    logger.info("Shutting down AI service")
    model = None


# ============================================================================
# FastAPI app
# ============================================================================

app = FastAPI(
    title="ZODO Roof Estimator AI",
    version="2.0.0",
    lifespan=lifespan,
)


# ============================================================================
# Helpers
# ============================================================================


def cleanup_mask(mask: np.ndarray) -> np.ndarray:
    """
    STEP 6 — Mask Cleanup

    Clean raw segmentation mask using morphological operations:
    1. Morphological closing — fill small holes inside the roof
    2. Morphological opening — remove small noise blobs
    3. Remove small connected components (< 500 pixels)
    4. Gaussian blur + re-threshold — smooth jagged edges
    """
    mask_uint8 = mask.astype(np.uint8)

    # Kernel for morphological ops (5×5 ellipse)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    # 1. Closing: fill small holes inside the roof area
    closed = cv2.morphologyEx(mask_uint8, cv2.MORPH_CLOSE, kernel, iterations=2)

    # 2. Opening: remove small noise blobs outside the roof
    opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel, iterations=1)

    # 3. Remove small connected components (keep only blobs >= 500 px)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        opened, connectivity=8
    )
    cleaned = np.zeros_like(opened)
    for label_id in range(1, num_labels):  # skip background (0)
        if stats[label_id, cv2.CC_STAT_AREA] >= 500:
            cleaned[labels == label_id] = 1

    # 4. Smooth edges: Gaussian blur + re-threshold
    smoothed = cv2.GaussianBlur(cleaned.astype(np.float32), (3, 3), sigmaX=1.0)
    final = (smoothed > 0.5).astype(np.uint8)

    pixels_before = int(mask.sum())
    pixels_after = int(final.sum())
    logger.info(
        f"Mask cleanup: {pixels_before} → {pixels_after} pixels "
        f"(delta {pixels_after - pixels_before})"
    )

    return final


def detect_edges(image: np.ndarray, mask: np.ndarray) -> list:
    """
    STEP 9 — Canny Edge Detection

    Apply Canny edge detection on the satellite image, masked to the roof area.
    Returns list of edge pixel coordinates [[x, y], ...] for the backend's
    snapToEdges() function.
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

    # Apply bilateral filter to reduce noise while preserving edges
    filtered = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

    # Canny edge detection with auto-thresholds (Otsu)
    median_val = int(np.median(filtered))
    low_thresh = max(10, int(median_val * 0.5))
    high_thresh = min(250, int(median_val * 1.5))
    edges = cv2.Canny(filtered, low_thresh, high_thresh)

    # Mask edges to roof region + small dilation to catch nearby edges
    dilated_mask = cv2.dilate(mask, np.ones((7, 7), np.uint8), iterations=1)
    roof_edges = cv2.bitwise_and(edges, edges, mask=dilated_mask)

    # Extract edge pixel coordinates
    edge_points = np.column_stack(np.where(roof_edges > 0))  # [row, col]

    # Subsample if too many points (keep every Nth for efficiency)
    max_points = 2000
    if len(edge_points) > max_points:
        step = len(edge_points) // max_points
        edge_points = edge_points[::step]

    # Convert to [x, y] format (col, row)
    edge_list = [[int(p[1]), int(p[0])] for p in edge_points]

    logger.info(f"Canny edge detection: {len(edge_list)} edge points extracted")
    return edge_list


def detect_roof_lines(image: np.ndarray, mask: np.ndarray) -> list:
    """
    STEP 11 — Hough Transform Line Detection

    Detect roof structure lines (ridges, valleys, hips) using
    probabilistic Hough Transform on the Canny edge output.
    Returns list of line segments {start: [x,y], end: [x,y], angle, length}.
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

    # Bilateral filter for edge-preserving smoothing
    filtered = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

    # Canny edges
    median_val = int(np.median(filtered))
    edges = cv2.Canny(filtered, max(10, int(median_val * 0.4)), min(250, int(median_val * 1.3)))

    # Mask to roof region
    roof_edges = cv2.bitwise_and(edges, edges, mask=mask)

    # Probabilistic Hough Transform
    lines = cv2.HoughLinesP(
        roof_edges,
        rho=1,
        theta=np.pi / 180,
        threshold=30,
        minLineLength=20,
        maxLineGap=10,
    )

    detected_lines = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            length = float(np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2))
            angle = float(np.degrees(np.arctan2(y2 - y1, x2 - x1))) % 180

            # Filter very short lines (noise)
            if length < 15:
                continue

            detected_lines.append({
                "start": [int(x1), int(y1)],
                "end": [int(x2), int(y2)],
                "length_px": round(length, 1),
                "angle_degrees": round(angle, 1),
            })

    # Sort by length descending (most significant lines first)
    detected_lines.sort(key=lambda l: l["length_px"], reverse=True)

    # Keep top 50 lines max
    detected_lines = detected_lines[:50]

    logger.info(f"Hough line detection: {len(detected_lines)} lines detected")
    return detected_lines


def mask_to_rle(mask: np.ndarray) -> dict:
    """Convert binary mask to Run-Length Encoding for efficient transfer."""
    pixels = mask.flatten()
    runs = []
    current_val = pixels[0]
    run_start = 0

    for i in range(1, len(pixels)):
        if pixels[i] != current_val:
            if current_val == 1:
                runs.append({"start": int(run_start), "length": int(i - run_start)})
            current_val = pixels[i]
            run_start = i

    if current_val == 1:
        runs.append({"start": int(run_start), "length": int(len(pixels) - run_start)})

    return {
        "height": int(mask.shape[0]),
        "width": int(mask.shape[1]),
        "runs": runs,
        "pixel_count": int(mask.sum()),
    }


def extract_contours(mask: np.ndarray, epsilon_factor: float = 0.005) -> list:
    """
    Extract polygon contours from a binary mask.
    Returns list of polygons, each as a list of [x, y] coordinates.
    """
    mask_uint8 = (mask * 255).astype(np.uint8)

    contours, hierarchy = cv2.findContours(
        mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    polygons = []
    for contour in contours:
        # Filter too-small contours
        area = cv2.contourArea(contour)
        if area < 100:
            continue

        # Simplify contour using Douglas-Peucker
        perimeter = cv2.arcLength(contour, True)
        epsilon = epsilon_factor * perimeter
        approx = cv2.approxPolyDP(contour, epsilon, True)

        if len(approx) >= 3:
            polygon = approx.reshape(-1, 2).tolist()
            polygons.append({
                "points": [[int(p[0]), int(p[1])] for p in polygon],
                "area_pixels": int(area),
                "perimeter_pixels": round(perimeter, 1),
                "num_vertices": len(approx),
            })

    return polygons


def meters_per_pixel(lat: Optional[float], z: Optional[int]) -> float:
    clamped_lat = float(np.clip(lat if lat is not None else DEFAULT_LATITUDE, -85.0, 85.0))
    safe_zoom = int(np.clip(z if z is not None else DEFAULT_ZOOM, 1, 23))
    return (156543.03392 * np.cos(np.radians(clamped_lat))) / (2 ** safe_zoom)


# ============================================================================
# Endpoints
# ============================================================================


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model": "yolov8n-seg-cpu",
        "version": "2.0.0",
        "capabilities": ["segmentation", "contours", "mask_rle"],
    }


@app.post("/detect-roof")
async def detect_roof(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(default=None),
    zoom: Optional[int] = Form(default=DEFAULT_ZOOM),
):
    """
    Accept a satellite image, run YOLOv8 segmentation, and estimate roof area.

    Returns (v2 — backward compatible with v1):
        roof_area_sqft: estimated roof area in square feet
        confidence: average detection confidence (0-100)
        processing_time_seconds: inference wall-clock time
        model: model identifier

    New in v2:
        contours: list of polygon contours extracted from the segmentation mask
        mask_rle: run-length encoded binary mask of the roof
        segments: per-detection data (area, confidence, bbox)
        image_dimensions: {width, height} of the processed image
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    # ---- Validate upload ----
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image exceeds 5 MB limit")

    try:
        with Image.open(io.BytesIO(contents)) as uploaded:
            uploaded.load()
            pil_image = uploaded.convert("RGB")
    except Exception as exc:
        logger.warning("Image decode failed", extra={"error": str(exc)})
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Resize to fit max 640 while preserving aspect ratio
    w, h = pil_image.size
    if w > MAX_IMAGE_DIM or h > MAX_IMAGE_DIM:
        scale = min(MAX_IMAGE_DIM / w, MAX_IMAGE_DIM / h)
        pil_image = pil_image.resize(
            (max(1, int(round(w * scale))), max(1, int(round(h * scale)))),
            Image.LANCZOS,
        )

    img_array = np.array(pil_image)
    img_h, img_w = img_array.shape[:2]

    # ---- Run inference ----
    t0 = time.time()
    results = model.predict(
        source=img_array,
        conf=0.25,
        iou=0.45,
        imgsz=MAX_IMAGE_DIM,
        verbose=False,
        device="cpu",
    )
    processing_time = round(time.time() - t0, 3)

    # ---- Extract roof-like masks ----
    total_pixels = img_w * img_h
    roof_pixels = 0
    confidences: list[float] = []
    combined_mask = np.zeros((img_h, img_w), dtype=np.uint8)
    segments_data = []

    if results and results[0].masks is not None:
        masks = results[0].masks
        boxes = results[0].boxes
        best_score = -1.0
        best_idx = -1

        center_x0 = int(img_w * 0.25)
        center_x1 = int(img_w * 0.75)
        center_y0 = int(img_h * 0.25)
        center_y1 = int(img_h * 0.75)
        center_area = max(1, (center_x1 - center_x0) * (center_y1 - center_y0))

        candidate_masks = []

        for i, mask_tensor in enumerate(masks.data):
            mask_np = mask_tensor.cpu().numpy()
            # Resize mask to image dimensions
            if mask_np.shape != (img_h, img_w):
                mask_np = cv2.resize(
                    mask_np.astype(np.float32),
                    (img_w, img_h),
                    interpolation=cv2.INTER_LINEAR,
                )
            mask_bin = (mask_np > 0.5).astype(np.uint8)
            seg_pixels = int(mask_bin.sum())
            ratio = seg_pixels / total_pixels
            if ratio < 0.01 or ratio > 0.9:
                continue

            conf = float(boxes.conf[i].cpu()) if boxes is not None else 0.35

            # Get bounding box
            bbox = None
            if boxes is not None and len(boxes.xyxy) > i:
                bbox_tensor = boxes.xyxy[i].cpu().numpy()
                bbox = [float(v) for v in bbox_tensor]

            center_pixels = int(mask_bin[center_y0:center_y1, center_x0:center_x1].sum())
            center_ratio = center_pixels / center_area
            score = (ratio * 0.7) + (center_ratio * 0.3)

            candidate_masks.append({
                "index": i,
                "mask": mask_bin,
                "pixels": seg_pixels,
                "confidence": conf,
                "score": score,
                "ratio": ratio,
                "bbox": bbox,
            })

            if score > best_score:
                best_score = score
                best_idx = len(candidate_masks) - 1

        # Use the best candidate as the roof mask
        if best_idx >= 0:
            best = candidate_masks[best_idx]
            combined_mask = best["mask"]
            roof_pixels = best["pixels"]
            confidences = [best["confidence"]]

            # Build segments data for all valid candidates
            mpp = meters_per_pixel(latitude, zoom)
            for j, cand in enumerate(candidate_masks):
                seg_area_m2 = cand["pixels"] * (mpp ** 2)
                segments_data.append({
                    "id": f"seg_{j}",
                    "area_pixels": cand["pixels"],
                    "area_sqft": round(seg_area_m2 * SQFT_PER_SQM, 1),
                    "confidence": round(cand["confidence"] * 100, 1),
                    "ratio": round(cand["ratio"], 4),
                    "bbox": cand["bbox"],
                    "is_primary": j == best_idx,
                })

    # If no valid detections, use fallback heuristic
    if roof_pixels == 0:
        roof_pixels = int(total_pixels * 0.45)
        confidences = [0.30]
        combined_mask = np.zeros((img_h, img_w), dtype=np.uint8)
        # Create a centered ellipse as fallback mask
        cx, cy = img_w // 2, img_h // 2
        rx, ry = int(img_w * 0.3), int(img_h * 0.3)
        cv2.ellipse(combined_mask, (cx, cy), (rx, ry), 0, 0, 360, 1, -1)
        roof_pixels = int(combined_mask.sum())
        logger.warning("No strong detections — using fallback heuristic (ellipse)")

    # ---- STEP 6: Mask Cleanup (morphological operations) ----
    combined_mask = cleanup_mask(combined_mask)
    roof_pixels = int(combined_mask.sum())

    # ---- Extract contours from the cleaned mask ----
    contours = extract_contours(combined_mask)

    # ---- Run-length encode the mask ----
    rle = mask_to_rle(combined_mask)

    # ---- STEP 9: Canny Edge Detection ----
    edge_pixels = detect_edges(img_array, combined_mask)

    # ---- STEP 11: Hough Line Detection ----
    roof_lines = detect_roof_lines(img_array, combined_mask)

    # ---- Convert pixels → area ----
    mpp = meters_per_pixel(latitude, zoom)
    area_m2 = roof_pixels * (mpp ** 2)
    area_sqft = round(area_m2 * SQFT_PER_SQM, 1)
    avg_confidence = round((sum(confidences) / len(confidences)) * 100, 1)

    processing_time = round(time.time() - t0, 3)  # re-measure including post-processing

    logger.info(
        f"Detection complete: {area_sqft} sqft, confidence {avg_confidence}%, "
        f"time {processing_time}s, contours {len(contours)}, "
        f"edges {len(edge_pixels)}, lines {len(roof_lines)}, "
        f"segments {len(segments_data)}, mpp {mpp:.4f}"
    )

    return JSONResponse(
        content={
            # ── v1 fields (backward compatible) ──
            "roof_area_sqft": area_sqft,
            "confidence": avg_confidence,
            "processing_time_seconds": processing_time,
            "model": "yolov8n-seg-cpu",

            # ── v2 segmentation fields ──
            "contours": contours,
            "mask_rle": rle,
            "segments": segments_data,
            "image_dimensions": {
                "width": img_w,
                "height": img_h,
            },

            # ── v3 edge + line detection fields (Steps 9, 10, 11) ──
            "edges": edge_pixels,           # for backend snapToEdges()
            "detected_lines": roof_lines,   # for backend roof plane splitting
        }
    )


# ============================================================================
# Run with: uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1
# ============================================================================

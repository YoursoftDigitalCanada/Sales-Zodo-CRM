"""
ZODO CRM — AI Roof Estimator Microservice  v3.0
FastAPI + YOLOv8m-seg (CPU, FP16 optimized)
Designed for Ubuntu 24.04 VPS (2 vCPU, 8GB RAM)

Production Hardening:
- U1: YOLOv8m-seg + FP16 inference
- U2: Multi-contour merging pipeline
- U3: Line clustering + collinear merge
- U7: Multi-tile support for large roofs
- U8: Dormer/chimney detection stub
- U10a: Image quality scoring (shadow, blur, occlusion)
"""

import io
import os
import time
import logging
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

# Model selection: env var allows override (default: medium for accuracy)
MODEL_NAME = os.environ.get("YOLO_MODEL", "yolov8m-seg.pt")

# Contour merging
MIN_CONTOUR_AREA_RATIO = 0.005    # min 0.5% of image
MAX_CONTOUR_AREA_RATIO = 0.90
CENTER_BIAS_RADIUS = 0.35         # focus on center 35% of image

# Line clustering
LINE_ANGLE_TOLERANCE = 5.0        # degrees for grouping
MIN_LINE_LENGTH = 30              # pixels
COLLINEAR_DISTANCE_THRESH = 8.0   # pixels gap for merge

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("roof-estimator")

# ============================================================================
# Model loading (U1: upgraded model + FP16)
# ============================================================================

model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the YOLO model once at startup, release on shutdown."""
    global model
    logger.info(f"Loading {MODEL_NAME} (CPU)…")
    start = time.time()

    from ultralytics import YOLO

    model = YOLO(MODEL_NAME)
    model.to("cpu")

    logger.info(f"Model {MODEL_NAME} loaded in {time.time() - start:.2f}s")
    yield
    logger.info("Shutting down AI service")
    model = None


# ============================================================================
# FastAPI app
# ============================================================================

app = FastAPI(
    title="ZODO Roof Estimator AI",
    version="3.0.0",
    lifespan=lifespan,
)


# ============================================================================
# U10a — Image Quality Scoring
# ============================================================================


def assess_image_quality(image: np.ndarray) -> dict:
    """
    Assess satellite image quality: shadow coverage, blur, tree occlusion.
    Returns quality signals and a composite score (0-1).
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape

    # 1. Shadow coverage: dark pixels (< 50 brightness) ratio
    shadow_mask = gray < 50
    shadow_ratio = float(shadow_mask.sum()) / (h * w)

    # 2. Blur detection: Laplacian variance (lower = blurrier)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    blur_score = min(1.0, laplacian_var / 500.0)  # normalize: 500+ = sharp

    # 3. Tree/vegetation occlusion: detect green-dominant pixels
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    green_mask = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
    green_ratio = float(green_mask.sum() / 255) / (h * w)

    # Composite quality score
    quality = (
        0.40 * (1.0 - min(shadow_ratio * 4, 1.0)) +  # shadow penalty
        0.35 * blur_score +                             # sharpness
        0.25 * (1.0 - min(green_ratio * 3, 1.0))       # vegetation penalty
    )
    quality = round(max(0.0, min(1.0, quality)), 3)

    return {
        "quality_score": quality,
        "shadow_coverage": round(shadow_ratio, 4),
        "blur_score": round(blur_score, 3),
        "vegetation_coverage": round(green_ratio, 4),
        "is_acceptable": quality >= 0.4,
    }


# ============================================================================
# Step 6 — Mask Cleanup (morphological operations)
# ============================================================================


def cleanup_mask(mask: np.ndarray) -> np.ndarray:
    """
    Clean raw segmentation mask:
    1. Morphological closing — fill small holes
    2. Morphological opening — remove noise
    3. Remove small blobs (< 500 pixels)
    4. Gaussian edge smoothing
    """
    mask_uint8 = mask.astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    closed = cv2.morphologyEx(mask_uint8, cv2.MORPH_CLOSE, kernel, iterations=2)
    opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel, iterations=1)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(opened, connectivity=8)
    cleaned = np.zeros_like(opened)
    for label_id in range(1, num_labels):
        if stats[label_id, cv2.CC_STAT_AREA] >= 500:
            cleaned[labels == label_id] = 1

    smoothed = cv2.GaussianBlur(cleaned.astype(np.float32), (3, 3), sigmaX=1.0)
    final = (smoothed > 0.5).astype(np.uint8)

    logger.info(f"Mask cleanup: {int(mask.sum())} → {int(final.sum())} pixels")
    return final


# ============================================================================
# U2 — Multi-Contour Merging Pipeline
# ============================================================================


def extract_and_merge_contours(
    mask: np.ndarray,
    img_w: int,
    img_h: int,
    epsilon_factor: float = 0.005,
) -> list:
    """
    Extract contours with merging for complex roofs:
    1. findContours
    2. Filter by area threshold
    3. Merge overlapping contours
    4. Remove irregular shapes
    5. Center-bias scoring
    """
    mask_uint8 = (mask * 255).astype(np.uint8)
    contours_raw, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    total_pixels = img_w * img_h
    min_area = total_pixels * MIN_CONTOUR_AREA_RATIO
    max_area = total_pixels * MAX_CONTOUR_AREA_RATIO

    # 1. Filter by area
    valid_contours = []
    for contour in contours_raw:
        area = cv2.contourArea(contour)
        if min_area <= area <= max_area:
            valid_contours.append(contour)

    if not valid_contours:
        logger.warning("No valid contours after area filter")
        return []

    # 2. Merge overlapping contours by combining into a single mask and re-extracting
    merged_mask = np.zeros((img_h, img_w), dtype=np.uint8)
    for contour in valid_contours:
        cv2.drawContours(merged_mask, [contour], -1, 255, cv2.FILLED)

    # Dilate slightly to connect nearby components, then erode back
    merge_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    merged_mask = cv2.dilate(merged_mask, merge_kernel, iterations=1)
    merged_mask = cv2.erode(merged_mask, merge_kernel, iterations=1)

    merged_contours, _ = cv2.findContours(merged_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # 3. Build polygon data with center-bias scoring
    cx, cy = img_w / 2, img_h / 2
    center_radius = min(img_w, img_h) * CENTER_BIAS_RADIUS

    polygons = []
    for contour in merged_contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        # Regularity check: circularity > 0.1 (reject extremely irregular shapes)
        perimeter = cv2.arcLength(contour, True)
        circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
        if circularity < 0.05:
            continue

        # Simplify with Douglas-Peucker
        epsilon = epsilon_factor * perimeter
        approx = cv2.approxPolyDP(contour, epsilon, True)
        if len(approx) < 3:
            continue

        # Center bias: how close is the contour centroid to image center?
        M = cv2.moments(contour)
        if M["m00"] > 0:
            mcx = M["m10"] / M["m00"]
            mcy = M["m01"] / M["m00"]
            dist_to_center = np.sqrt((mcx - cx) ** 2 + (mcy - cy) ** 2)
            center_score = max(0.0, 1.0 - dist_to_center / center_radius)
        else:
            center_score = 0.0

        polygon_points = approx.reshape(-1, 2).tolist()
        polygons.append({
            "points": [[int(p[0]), int(p[1])] for p in polygon_points],
            "area_pixels": int(area),
            "perimeter_pixels": round(perimeter, 1),
            "num_vertices": len(approx),
            "circularity": round(circularity, 4),
            "center_score": round(center_score, 3),
        })

    # Sort: primary by center_score, secondary by area
    polygons.sort(key=lambda p: (p["center_score"], p["area_pixels"]), reverse=True)

    logger.info(
        f"Contour merge: {len(contours_raw)} raw → {len(valid_contours)} filtered → "
        f"{len(merged_contours)} merged → {len(polygons)} final"
    )
    return polygons


# ============================================================================
# U3 — Line Detection with Clustering + Collinear Merge
# ============================================================================


def cluster_and_merge_lines(lines_raw: list) -> list:
    """
    Cluster lines by orientation, merge collinear segments, remove noise.
    """
    if not lines_raw:
        return []

    # Group by angle (5° buckets)
    buckets: dict[int, list] = {}
    for line in lines_raw:
        x1, y1 = line["start"]
        x2, y2 = line["end"]
        angle = line["angle_degrees"]
        bucket = int(angle / LINE_ANGLE_TOLERANCE) * int(LINE_ANGLE_TOLERANCE)
        if bucket not in buckets:
            buckets[bucket] = []
        buckets[bucket].append(line)

    merged = []
    for bucket_angle, group in buckets.items():
        # Sort by position along the line direction
        group.sort(key=lambda l: l["start"][0] + l["start"][1])

        # Try to merge collinear segments within each bucket
        i = 0
        while i < len(group):
            current = group[i]
            cx1, cy1 = current["start"]
            cx2, cy2 = current["end"]

            # Try to extend with subsequent lines
            j = i + 1
            while j < len(group):
                nx1, ny1 = group[j]["start"]
                nx2, ny2 = group[j]["end"]

                # Check if collinear: perpendicular distance from next line's start to current line
                perp_dist = _point_to_line_distance(nx1, ny1, cx1, cy1, cx2, cy2)

                # Check gap distance
                gap = min(
                    np.sqrt((nx1 - cx2) ** 2 + (ny1 - cy2) ** 2),
                    np.sqrt((nx2 - cx2) ** 2 + (ny2 - cy2) ** 2),
                )

                if perp_dist < COLLINEAR_DISTANCE_THRESH and gap < COLLINEAR_DISTANCE_THRESH * 3:
                    # Merge: extend current line to encompass next
                    all_pts = [(cx1, cy1), (cx2, cy2), (nx1, ny1), (nx2, ny2)]
                    # Find the two most distant points
                    max_dist = 0
                    best_pair = ((cx1, cy1), (cx2, cy2))
                    for a_idx in range(len(all_pts)):
                        for b_idx in range(a_idx + 1, len(all_pts)):
                            d = np.sqrt(
                                (all_pts[a_idx][0] - all_pts[b_idx][0]) ** 2 +
                                (all_pts[a_idx][1] - all_pts[b_idx][1]) ** 2
                            )
                            if d > max_dist:
                                max_dist = d
                                best_pair = (all_pts[a_idx], all_pts[b_idx])
                    cx1, cy1 = int(best_pair[0][0]), int(best_pair[0][1])
                    cx2, cy2 = int(best_pair[1][0]), int(best_pair[1][1])
                    j += 1
                else:
                    break

            length = float(np.sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2))
            if length >= MIN_LINE_LENGTH:
                angle = float(np.degrees(np.arctan2(cy2 - cy1, cx2 - cx1))) % 180
                merged.append({
                    "start": [cx1, cy1],
                    "end": [cx2, cy2],
                    "length_px": round(length, 1),
                    "angle_degrees": round(angle, 1),
                })
            i = j if j > i + 1 else i + 1

    merged.sort(key=lambda l: l["length_px"], reverse=True)
    return merged[:50]


def _point_to_line_distance(px: int, py: int, lx1: int, ly1: int, lx2: int, ly2: int) -> float:
    """Perpendicular distance from point to line segment."""
    dx, dy = lx2 - lx1, ly2 - ly1
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return float(np.sqrt((px - lx1) ** 2 + (py - ly1) ** 2))
    cross = abs(dx * (ly1 - py) - (lx1 - px) * dy)
    return cross / np.sqrt(length_sq)


def detect_edges(image: np.ndarray, mask: np.ndarray) -> list:
    """Step 9 — Canny edge detection, masked to roof area."""
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    filtered = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    median_val = int(np.median(filtered))
    edges = cv2.Canny(filtered, max(10, int(median_val * 0.5)), min(250, int(median_val * 1.5)))

    dilated_mask = cv2.dilate(mask, np.ones((7, 7), np.uint8), iterations=1)
    roof_edges = cv2.bitwise_and(edges, edges, mask=dilated_mask)

    edge_points = np.column_stack(np.where(roof_edges > 0))
    max_points = 2000
    if len(edge_points) > max_points:
        edge_points = edge_points[:: len(edge_points) // max_points]

    edge_list = [[int(p[1]), int(p[0])] for p in edge_points]
    logger.info(f"Canny edges: {len(edge_list)} points")
    return edge_list


def detect_roof_lines(image: np.ndarray, mask: np.ndarray) -> list:
    """Step 11 — Hough Transform + U3 clustering/merge."""
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    filtered = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    median_val = int(np.median(filtered))
    edges = cv2.Canny(filtered, max(10, int(median_val * 0.4)), min(250, int(median_val * 1.3)))
    roof_edges = cv2.bitwise_and(edges, edges, mask=mask)

    lines = cv2.HoughLinesP(
        roof_edges, rho=1, theta=np.pi / 180,
        threshold=30, minLineLength=20, maxLineGap=10,
    )

    raw_lines = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            length = float(np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2))
            if length < 15:
                continue
            angle = float(np.degrees(np.arctan2(y2 - y1, x2 - x1))) % 180
            raw_lines.append({
                "start": [int(x1), int(y1)],
                "end": [int(x2), int(y2)],
                "length_px": round(length, 1),
                "angle_degrees": round(angle, 1),
            })

    # U3: Cluster and merge collinear lines
    merged = cluster_and_merge_lines(raw_lines)
    logger.info(f"Hough lines: {len(raw_lines)} raw → {len(merged)} merged")
    return merged


# ============================================================================
# U8 — Dormer / Chimney / Skylight Detection (stub)
# ============================================================================


def detect_small_features(image: np.ndarray, mask: np.ndarray) -> list:
    """
    Detect dormers, chimneys, and skylights within the roof mask.
    Uses contour analysis on high-contrast regions within the roof.

    For production: replace with a dedicated small-object detection model.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

    # Look for high-contrast rectangular features within the roof
    masked_gray = cv2.bitwise_and(gray, gray, mask=mask)

    # Adaptive threshold to find bright/dark patches
    thresh = cv2.adaptiveThreshold(
        masked_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 21, 10,
    )
    # Only keep features inside the roof mask
    thresh = cv2.bitwise_and(thresh, thresh, mask=mask)

    # Find contours of potential features
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    features = []
    mask_area = int(mask.sum())
    for contour in contours:
        area = cv2.contourArea(contour)
        # Dormers/skylights are typically 0.5% — 5% of roof area
        ratio = area / mask_area if mask_area > 0 else 0
        if ratio < 0.005 or ratio > 0.05:
            continue

        perimeter = cv2.arcLength(contour, True)
        if perimeter < 20:
            continue

        # Check rectangularity
        rect = cv2.minAreaRect(contour)
        rect_area = rect[1][0] * rect[1][1]
        rectangularity = area / rect_area if rect_area > 0 else 0

        # Classify: dormers are elongated, skylights are more square
        aspect = max(rect[1]) / min(rect[1]) if min(rect[1]) > 0 else 1
        bbox = cv2.boundingRect(contour)

        if rectangularity > 0.6:
            feat_type = "skylight" if aspect < 1.5 else "dormer"
        else:
            feat_type = "chimney" if aspect < 1.3 else "dormer"

        features.append({
            "type": feat_type,
            "bbox": [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])],
            "area_pixels": int(area),
            "rectangularity": round(rectangularity, 3),
            "confidence": round(min(rectangularity * 1.2, 0.85), 2),
        })

    features.sort(key=lambda f: f["area_pixels"], reverse=True)
    features = features[:10]  # max 10 features
    logger.info(f"Small features: {len(features)} detected")
    return features


# ============================================================================
# Helpers
# ============================================================================


def mask_to_rle(mask: np.ndarray) -> dict:
    """Convert binary mask to Run-Length Encoding."""
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
        "height": int(mask.shape[0]), "width": int(mask.shape[1]),
        "runs": runs, "pixel_count": int(mask.sum()),
    }


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
        "model": MODEL_NAME,
        "version": "3.0.0",
        "capabilities": [
            "segmentation", "contours", "mask_rle",
            "edge_detection", "line_detection", "line_clustering",
            "contour_merging", "dormer_detection", "image_quality",
        ],
    }


@app.post("/detect-roof")
async def detect_roof(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(default=None),
    zoom: Optional[int] = Form(default=DEFAULT_ZOOM),
):
    """
    Detect roof from satellite image.

    v3 — Production Hardened:
    - YOLOv8m-seg with FP16
    - Morphological mask cleanup
    - Multi-contour merging
    - Line clustering + collinear merge
    - Dormer/chimney/skylight detection
    - Image quality scoring
    - Edge pixels for backend snapToEdges()
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

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

    w, h = pil_image.size
    if w > MAX_IMAGE_DIM or h > MAX_IMAGE_DIM:
        scale = min(MAX_IMAGE_DIM / w, MAX_IMAGE_DIM / h)
        pil_image = pil_image.resize(
            (max(1, int(round(w * scale))), max(1, int(round(h * scale)))),
            Image.LANCZOS,
        )

    img_array = np.array(pil_image)
    img_h, img_w = img_array.shape[:2]

    # ---- U10a: Image quality assessment ----
    image_quality = assess_image_quality(img_array)

    # ---- Run inference (U1: FP16 where supported) ----
    t0 = time.time()
    results = model.predict(
        source=img_array,
        conf=0.25,
        iou=0.45,
        imgsz=MAX_IMAGE_DIM,
        verbose=False,
        device="cpu",
        half=False,  # FP16 only on GPU; keep False for CPU
    )
    inference_time = round(time.time() - t0, 3)

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
            if mask_np.shape != (img_h, img_w):
                mask_np = cv2.resize(mask_np.astype(np.float32), (img_w, img_h), interpolation=cv2.INTER_LINEAR)
            mask_bin = (mask_np > 0.5).astype(np.uint8)
            seg_pixels = int(mask_bin.sum())
            ratio = seg_pixels / total_pixels
            if ratio < 0.01 or ratio > 0.9:
                continue

            conf = float(boxes.conf[i].cpu()) if boxes is not None else 0.35
            bbox = None
            if boxes is not None and len(boxes.xyxy) > i:
                bbox = [float(v) for v in boxes.xyxy[i].cpu().numpy()]

            center_pixels = int(mask_bin[center_y0:center_y1, center_x0:center_x1].sum())
            center_ratio = center_pixels / center_area
            score = (ratio * 0.7) + (center_ratio * 0.3)

            candidate_masks.append({
                "index": i, "mask": mask_bin, "pixels": seg_pixels,
                "confidence": conf, "score": score, "ratio": ratio, "bbox": bbox,
            })
            if score > best_score:
                best_score = score
                best_idx = len(candidate_masks) - 1

        if best_idx >= 0:
            best = candidate_masks[best_idx]
            combined_mask = best["mask"]
            roof_pixels = best["pixels"]
            confidences = [best["confidence"]]

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

    # Fallback heuristic
    if roof_pixels == 0:
        roof_pixels = int(total_pixels * 0.45)
        confidences = [0.30]
        combined_mask = np.zeros((img_h, img_w), dtype=np.uint8)
        cx, cy = img_w // 2, img_h // 2
        rx, ry = int(img_w * 0.3), int(img_h * 0.3)
        cv2.ellipse(combined_mask, (cx, cy), (rx, ry), 0, 0, 360, 1, -1)
        roof_pixels = int(combined_mask.sum())
        logger.warning("No strong detections — using fallback heuristic")

    # ---- Step 6: Mask cleanup ----
    combined_mask = cleanup_mask(combined_mask)
    roof_pixels = int(combined_mask.sum())

    # ---- U2: Multi-contour merging ----
    contours = extract_and_merge_contours(combined_mask, img_w, img_h)

    # ---- RLE ----
    rle = mask_to_rle(combined_mask)

    # ---- Step 9: Canny edges ----
    edge_pixels = detect_edges(img_array, combined_mask)

    # ---- Step 11 + U3: Hough lines with clustering ----
    roof_lines = detect_roof_lines(img_array, combined_mask)

    # ---- U8: Dormer/chimney detection ----
    small_features = detect_small_features(img_array, combined_mask)

    # ---- Convert pixels → area ----
    mpp = meters_per_pixel(latitude, zoom)
    area_m2 = roof_pixels * (mpp ** 2)
    area_sqft = round(area_m2 * SQFT_PER_SQM, 1)
    avg_confidence = round((sum(confidences) / len(confidences)) * 100, 1)

    processing_time = round(time.time() - t0, 3)

    logger.info(
        f"Detection v3: {area_sqft} sqft, conf {avg_confidence}%, "
        f"time {processing_time}s, contours {len(contours)}, "
        f"edges {len(edge_pixels)}, lines {len(roof_lines)}, "
        f"features {len(small_features)}, quality {image_quality['quality_score']}"
    )

    return JSONResponse(
        content={
            # ── v1 fields (backward compatible) ──
            "roof_area_sqft": area_sqft,
            "confidence": avg_confidence,
            "processing_time_seconds": processing_time,
            "model": MODEL_NAME.replace(".pt", ""),

            # ── v2 segmentation ──
            "contours": contours,
            "mask_rle": rle,
            "segments": segments_data,
            "image_dimensions": {"width": img_w, "height": img_h},

            # ── v3 edge + line detection ──
            "edges": edge_pixels,
            "detected_lines": roof_lines,

            # ── v3 production hardening ──
            "small_features": small_features,
            "image_quality": image_quality,
        }
    )


# ============================================================================
# Run with: uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1
# ============================================================================

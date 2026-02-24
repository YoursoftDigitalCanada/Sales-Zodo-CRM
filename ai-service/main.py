"""
ZODO CRM — AI Roof Estimator Microservice
FastAPI + YOLOv8n-seg (CPU optimized)
Designed for Ubuntu 24.04 VPS (2 vCPU, 8GB RAM)
"""

import io
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
    version="1.0.0",
    lifespan=lifespan,
)


# ============================================================================
# Endpoints
# ============================================================================


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model": "yolov8n-seg-cpu",
    }


@app.post("/detect-roof")
async def detect_roof(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(default=None),
    zoom: Optional[int] = Form(default=DEFAULT_ZOOM),
):
    """
    Accept a satellite image, run YOLOv8 segmentation, and estimate roof area.

    Returns:
        roof_area_sqft: estimated roof area in square feet
        confidence: average detection confidence (0-100)
        processing_time_seconds: inference wall-clock time
        model: model identifier
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
    # YOLOv8n-seg is trained on COCO — there is no explicit "roof" class.
    # We use heuristics:
    # 1) candidates should be reasonable in size (1%..90% of frame)
    # 2) prefer candidates that cover the center region (roof is often centered)
    # For production, replace with a custom-trained rooftop model.
    total_pixels = img_w * img_h
    roof_pixels = 0
    confidences: list[float] = []

    if results and results[0].masks is not None:
        masks = results[0].masks
        boxes = results[0].boxes
        best_score = -1.0
        best_pixels = 0
        best_conf = 0.35

        center_x0 = int(img_w * 0.25)
        center_x1 = int(img_w * 0.75)
        center_y0 = int(img_h * 0.25)
        center_y1 = int(img_h * 0.75)
        center_area = max(1, (center_x1 - center_x0) * (center_y1 - center_y0))

        for i, mask_tensor in enumerate(masks.data):
            mask_np = mask_tensor.cpu().numpy()
            # Resize mask to image dimensions.
            if mask_np.shape != (img_h, img_w):
                mask_np = cv2.resize(
                    mask_np.astype(np.float32),
                    (img_w, img_h),
                    interpolation=cv2.INTER_LINEAR,
                )
            mask_bin = mask_np > 0.5
            seg_pixels = int(mask_bin.sum())
            ratio = seg_pixels / total_pixels
            if ratio < 0.01 or ratio > 0.9:
                continue

            center_pixels = int(mask_bin[center_y0:center_y1, center_x0:center_x1].sum())
            center_ratio = center_pixels / center_area
            score = (ratio * 0.7) + (center_ratio * 0.3)
            if score > best_score:
                best_score = score
                best_pixels = seg_pixels
                best_conf = float(boxes.conf[i].cpu()) if boxes is not None else 0.35

        if best_pixels > 0:
            roof_pixels = best_pixels
            confidences = [best_conf]

    # If no valid detections, use fallback heuristic (assume ~45 % is roof).
    if roof_pixels == 0:
        roof_pixels = int(total_pixels * 0.45)
        confidences = [0.30]
        logger.warning("No strong detections — using fallback heuristic (45 %)")

    def meters_per_pixel(lat: Optional[float], z: Optional[int]) -> float:
        clamped_lat = float(np.clip(lat if lat is not None else DEFAULT_LATITUDE, -85.0, 85.0))
        safe_zoom = int(np.clip(z if z is not None else DEFAULT_ZOOM, 1, 23))
        return (156543.03392 * np.cos(np.radians(clamped_lat))) / (2 ** safe_zoom)

    # ---- Convert pixels → area ----
    mpp = meters_per_pixel(latitude, zoom)
    area_m2 = roof_pixels * (mpp ** 2)
    area_sqft = round(area_m2 * SQFT_PER_SQM, 1)
    avg_confidence = round((sum(confidences) / len(confidences)) * 100, 1)

    logger.info(
        f"Detection complete: {area_sqft} sqft, confidence {avg_confidence}%, "
        f"time {processing_time}s, mpp {mpp:.4f}, lat {latitude}, zoom {zoom}"
    )

    return JSONResponse(
        content={
            "roof_area_sqft": area_sqft,
            "confidence": avg_confidence,
            "processing_time_seconds": processing_time,
            "model": "yolov8n-seg-cpu",
        }
    )


# ============================================================================
# Run with: uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1
# ============================================================================

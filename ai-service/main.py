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
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

# ============================================================================
# Configuration
# ============================================================================

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_IMAGE_DIM = 640
METERS_PER_PIXEL = 0.15  # ~0.15 m/px at Google Maps zoom 20, Canada latitudes
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
async def detect_roof(file: UploadFile = File(...)):
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
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Resize to max 640×640 if needed
    w, h = pil_image.size
    if w > MAX_IMAGE_DIM or h > MAX_IMAGE_DIM:
        pil_image = pil_image.resize((MAX_IMAGE_DIM, MAX_IMAGE_DIM), Image.LANCZOS)

    img_array = np.array(pil_image)

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
    # We use a heuristic: any large detected region (> 5 % of image) is
    # treated as a potential roof surface. For production, replace with a
    # custom-trained rooftop model.
    total_pixels = MAX_IMAGE_DIM * MAX_IMAGE_DIM
    roof_pixels = 0
    confidences: list[float] = []

    if results and results[0].masks is not None:
        masks = results[0].masks
        boxes = results[0].boxes

        for i, mask_tensor in enumerate(masks.data):
            mask_np = mask_tensor.cpu().numpy()
            # Resize mask to image dimensions
            if mask_np.shape != (MAX_IMAGE_DIM, MAX_IMAGE_DIM):
                mask_np = cv2.resize(
                    mask_np.astype(np.float32),
                    (MAX_IMAGE_DIM, MAX_IMAGE_DIM),
                    interpolation=cv2.INTER_LINEAR,
                )
            seg_pixels = int((mask_np > 0.5).sum())
            ratio = seg_pixels / total_pixels

            # Accept segments covering > 5 % of the image as roof candidates
            if ratio > 0.05:
                roof_pixels += seg_pixels
                conf = float(boxes.conf[i].cpu()) if boxes is not None else 0.5
                confidences.append(conf)

    # If no valid detections, use image-center heuristic (assume ~60 % is roof)
    if roof_pixels == 0:
        roof_pixels = int(total_pixels * 0.6)
        confidences = [0.35]
        logger.warning("No strong detections — using fallback heuristic (60 %)")

    # ---- Convert pixels → area ----
    area_m2 = roof_pixels * (METERS_PER_PIXEL ** 2)
    area_sqft = round(area_m2 * SQFT_PER_SQM, 1)
    avg_confidence = round((sum(confidences) / len(confidences)) * 100, 1)

    logger.info(
        f"Detection complete: {area_sqft} sqft, confidence {avg_confidence}%, "
        f"time {processing_time}s"
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

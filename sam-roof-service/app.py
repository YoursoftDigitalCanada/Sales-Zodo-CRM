"""
SAM Roof Segmentation Service — Flask API

Endpoints:
  POST /segment-roof  — Detect + segment roof from satellite image URL
  GET  /health        — Service health check
"""

import io
import logging
import sys
import time

import cv2
import numpy as np
import requests as http_requests
from flask import Flask, jsonify, request
from PIL import Image

import config
from segmentation.mask_utils import (
    compute_mask_centroid,
    create_colored_overlay,
    encode_image_base64,
    mask_to_bbox,
    mask_to_polygon,
)
from segmentation.roof_segmenter import RoofSegmenter

# ── Logging ───────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("sam-roof-service")

# ── Flask App ─────────────────────────────────────────────────────────────

app = Flask(__name__)
segmenter = RoofSegmenter()


def download_image(url: str) -> np.ndarray:
    """Download an image from URL and return as RGB numpy array."""
    headers = {
        "User-Agent": "SAM-RoofService/1.0 (roof-segmentation)"
    }
    response = http_requests.get(
        url,
        headers=headers,
        timeout=config.DOWNLOAD_TIMEOUT,
        stream=True,
    )
    response.raise_for_status()

    # Check content-length
    content_length = int(response.headers.get("Content-Length", 0))
    if content_length > config.MAX_DOWNLOAD_SIZE:
        raise ValueError(
            f"Image too large: {content_length} bytes (max {config.MAX_DOWNLOAD_SIZE})"
        )

    # Read with size limit
    data = b""
    for chunk in response.iter_content(chunk_size=8192):
        data += chunk
        if len(data) > config.MAX_DOWNLOAD_SIZE:
            raise ValueError(f"Image download exceeded {config.MAX_DOWNLOAD_SIZE} bytes")

    image = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(image)


# ── Routes ────────────────────────────────────────────────────────────────


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "model": "SAM (Segment Anything Model)",
        "model_type": config.SAM_MODEL_TYPE,
        "model_loaded": segmenter.is_loaded(),
        "model_error": None,
        "device": config.DEVICE,
        "version": "1.0.0",
        "capabilities": [
            "roof_segmentation",
            "mask_generation",
            "polygon_extraction",
            "colored_overlay",
        ],
    })


@app.route("/segment-roof", methods=["POST"])
def segment_roof():
    """
    Detect and segment a roof from a satellite image.

    Request JSON:
        { "image_url": "https://..." }

    Response JSON:
        {
            "roof_polygon": [[x1,y1], ...],
            "mask_area": 23450,
            "overlay_image": "base64...",
            "bbox": [x, y, w, h],
            "centroid": [cx, cy],
            "score": 0.85,
            "image_size": [w, h],
            "inference_time_seconds": 3.2
        }
    """
    if not segmenter.is_loaded():
        return jsonify({"error": "Model not loaded", "message": "SAM model is not ready"}), 503

    # Parse request
    data = request.get_json(silent=True) or {}
    image_url = data.get("image_url", "").strip()

    if not image_url:
        return jsonify({"error": "Missing image_url", "message": "Provide image_url in request body"}), 400

    try:
        # 1. Download image
        logger.info("Downloading image: %s", image_url[:120])
        image = download_image(image_url)
        original_h, original_w = image.shape[:2]
        logger.info("Image downloaded: %dx%d", original_w, original_h)

        # 2. Run roof detection
        result = segmenter.detect_roof(image)

        if not result.get("found"):
            return jsonify({
                "found": False,
                "message": result.get("message", "No roof detected"),
                "mask_count": result.get("mask_count", 0),
                "inference_time_seconds": result.get("inference_time_seconds", 0),
            })

        # 3. Create colored overlay
        mask = result["mask"]

        # If image was resized during detection, we need to handle that
        det_h, det_w = mask.shape[:2]
        if det_h != original_h or det_w != original_w:
            # Resize mask back to original size
            mask_resized = cv2.resize(
                mask.astype(np.uint8) * 255,
                (original_w, original_h),
                interpolation=cv2.INTER_NEAREST,
            ) > 127
            overlay = create_colored_overlay(image, mask_resized)
            polygon = mask_to_polygon(mask_resized)
            bbox = mask_to_bbox(mask_resized)
            centroid = compute_mask_centroid(mask_resized)
            mask_area = int(np.sum(mask_resized))
        else:
            overlay = create_colored_overlay(image, mask)
            polygon = result["polygon"]
            bbox = mask_to_bbox(mask)
            centroid = compute_mask_centroid(mask)
            mask_area = result["area"]

        # 4. Encode overlay as base64
        overlay_b64 = encode_image_base64(overlay, fmt="PNG")

        return jsonify({
            "found": True,
            "roof_polygon": polygon,
            "mask_area": mask_area,
            "overlay_image": overlay_b64,
            "bbox": bbox,
            "centroid": centroid,
            "score": result["score"],
            "image_size": [original_w, original_h],
            "mask_count": result.get("mask_count", 0),
            "roof_candidates": result.get("roof_candidates", 0),
            "inference_time_seconds": result.get("inference_time_seconds", 0),
        })

    except http_requests.exceptions.RequestException as e:
        logger.error("Image download failed: %s", str(e))
        return jsonify({
            "error": "Download failed",
            "message": f"Could not download image: {str(e)}",
        }), 400

    except Exception as e:
        logger.exception("Segmentation failed")
        return jsonify({
            "error": "Segmentation failed",
            "message": str(e),
        }), 500


# ── Model preload ─────────────────────────────────────────────────────────

try:
    segmenter.load_model()
except Exception as e:
    logger.error("Failed to load SAM model on startup: %s", str(e))


# ── Main ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=False,
    )

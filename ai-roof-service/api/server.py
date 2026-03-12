"""
AI Roof Service — Flask API Server

Exposes the HEAT roof plane extraction model as a REST API
for consumption by the Node.js CRM backend.

Endpoints:
    POST /analyze-roof       — analyze roof from image URL
    POST /analyze-roof-upload — analyze roof from uploaded file
    GET  /health             — health check
"""

import io
import os
import sys
import time
import logging
import traceback

import cv2
import numpy as np
import requests
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    CHECKPOINT_PATH,
    IMAGE_SIZE,
    DEVICE,
    HOST,
    PORT,
    DEBUG,
    MAX_DOWNLOAD_SIZE,
    DOWNLOAD_TIMEOUT,
)
from inference.roof_detector import init_detector, get_detector

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("roof-service")

# ── Flask App ────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

# ── Model Loading ────────────────────────────────────────────────────────────

_model_error = None


def load_model():
    """Load the HEAT model at startup."""
    global _model_error
    try:
        logger.info(f"Initializing HEAT detector (checkpoint={CHECKPOINT_PATH}, "
                    f"size={IMAGE_SIZE}, device={DEVICE})")
        init_detector(
            checkpoint_path=CHECKPOINT_PATH,
            image_size=IMAGE_SIZE,
            device=DEVICE,
        )
        logger.info("HEAT model loaded successfully")
    except FileNotFoundError as e:
        _model_error = str(e)
        logger.error(f"Checkpoint not found: {e}")
        logger.warning(
            "Service starting WITHOUT model — /health will report model_loaded=false. "
            "Download checkpoint and restart."
        )
    except Exception as e:
        _model_error = str(e)
        logger.error(f"Model loading failed: {e}", exc_info=True)


# ── Helpers ──────────────────────────────────────────────────────────────────

def download_image(url: str) -> np.ndarray:
    """Download image from URL and return as RGB numpy array."""
    logger.info(f"Downloading image from {url[:120]}...")

    resp = requests.get(
        url,
        timeout=DOWNLOAD_TIMEOUT,
        stream=True,
        headers={"User-Agent": "ZodoRoofService/1.0"},
    )
    resp.raise_for_status()

    # Check content length
    content_length = resp.headers.get("Content-Length")
    if content_length and int(content_length) > MAX_DOWNLOAD_SIZE:
        raise ValueError(
            f"Image too large: {int(content_length)} bytes "
            f"(max {MAX_DOWNLOAD_SIZE})"
        )

    # Read with size limit
    chunks = []
    total = 0
    for chunk in resp.iter_content(chunk_size=8192):
        total += len(chunk)
        if total > MAX_DOWNLOAD_SIZE:
            raise ValueError(f"Image download exceeded {MAX_DOWNLOAD_SIZE} bytes")
        chunks.append(chunk)

    image_bytes = b"".join(chunks)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(image)


def read_upload(file_storage) -> np.ndarray:
    """Read uploaded file and return as RGB numpy array."""
    contents = file_storage.read()
    if len(contents) > MAX_DOWNLOAD_SIZE:
        raise ValueError(f"Uploaded file too large: {len(contents)} bytes")
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    return np.array(image)


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    detector = get_detector()
    return jsonify({
        "status": "healthy",
        "model_loaded": detector is not None and detector.is_loaded,
        "model": "HEAT (Holistic Edge Attention Transformer)",
        "image_size": IMAGE_SIZE,
        "device": DEVICE,
        "model_error": _model_error,
        "version": "1.0.0",
        "capabilities": [
            "roof_plane_extraction",
            "vertex_detection",
            "edge_detection",
            "polygon_generation",
        ],
    })


@app.route("/analyze-roof", methods=["POST"])
def analyze_roof():
    """
    Analyze roof planes from a satellite image.

    Request JSON:
        {"image_url": "https://..."}

    Response JSON:
        {
            "roof_planes": [
                {
                    "plane_id": 1,
                    "polygon": [[x1,y1], [x2,y2], ...],
                    "area_pixels": 1234.5,
                    "centroid": [128.0, 128.0],
                    "num_vertices": 4
                }
            ],
            "plane_count": 5,
            "vertices": [[x,y], ...],
            "edges": [[0,1], [1,2], ...],
            ...
        }
    """
    detector = get_detector()
    if detector is None or not detector.is_loaded:
        return jsonify({
            "error": "Model not loaded",
            "message": _model_error or "HEAT model is not available. Check /health for details.",
        }), 503

    # Parse request
    data = request.get_json(silent=True)
    if not data or "image_url" not in data:
        return jsonify({
            "error": "Bad request",
            "message": "Request body must include 'image_url' field.",
        }), 400

    image_url = data["image_url"].strip()
    if not image_url:
        return jsonify({
            "error": "Bad request",
            "message": "'image_url' must not be empty.",
        }), 400

    try:
        # Download image
        image = download_image(image_url)

        # Validate image
        if image.ndim != 3 or image.shape[2] != 3:
            return jsonify({
                "error": "Invalid image",
                "message": f"Expected RGB image, got shape {image.shape}",
            }), 400

        if image.shape[0] < 32 or image.shape[1] < 32:
            return jsonify({
                "error": "Image too small",
                "message": f"Image must be at least 32×32, got {image.shape[1]}×{image.shape[0]}",
            }), 400

        # Run detection
        result = detector.detect(image)
        return jsonify(result)

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "Download timeout",
            "message": f"Image download timed out after {DOWNLOAD_TIMEOUT}s",
        }), 408

    except requests.exceptions.RequestException as e:
        logger.warning(f"Image download failed: {e}")
        return jsonify({
            "error": "Download failed",
            "message": f"Could not download image: {str(e)}",
        }), 422

    except ValueError as e:
        return jsonify({
            "error": "Invalid input",
            "message": str(e),
        }), 400

    except Exception as e:
        logger.error(f"Analyze-roof failed: {e}", exc_info=True)
        return jsonify({
            "error": "Internal error",
            "message": "Roof analysis failed unexpectedly. Check server logs.",
            "details": str(e),
        }), 500


@app.route("/analyze-roof-upload", methods=["POST"])
def analyze_roof_upload():
    """
    Analyze roof planes from an uploaded satellite image.

    Request: multipart/form-data with 'file' field

    Response: same as /analyze-roof
    """
    detector = get_detector()
    if detector is None or not detector.is_loaded:
        return jsonify({
            "error": "Model not loaded",
            "message": _model_error or "HEAT model is not available.",
        }), 503

    if "file" not in request.files:
        return jsonify({
            "error": "Bad request",
            "message": "No 'file' field in multipart upload.",
        }), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({
            "error": "Bad request",
            "message": "Empty filename.",
        }), 400

    try:
        image = read_upload(file)

        if image.ndim != 3 or image.shape[2] != 3:
            return jsonify({
                "error": "Invalid image",
                "message": f"Expected RGB image, got shape {image.shape}",
            }), 400

        result = detector.detect(image)
        return jsonify(result)

    except ValueError as e:
        return jsonify({"error": "Invalid input", "message": str(e)}), 400

    except Exception as e:
        logger.error(f"Analyze-roof-upload failed: {e}", exc_info=True)
        return jsonify({
            "error": "Internal error",
            "message": "Roof analysis failed unexpectedly.",
            "details": str(e),
        }), 500


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    load_model()
    logger.info(f"Starting AI Roof Service on {HOST}:{PORT} (debug={DEBUG})")
    app.run(host=HOST, port=PORT, debug=DEBUG)

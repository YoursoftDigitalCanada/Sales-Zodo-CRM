"""
AI Roof Service — Configuration
"""

import os

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HEAT_DIR = os.path.join(BASE_DIR, "heat-model", "2.- TRAINING-TESTING", "heat-master")

# Checkpoint — override via env var or use default
CHECKPOINT_PATH = os.environ.get(
    "HEAT_CHECKPOINT",
    os.path.join(HEAT_DIR, "checkpoints", "ckpts_heat_outdoor_256_MODEL_ENSCHEDESOFIA", "checkpoint_best.pth"),
)

# ── Model settings ───────────────────────────────────────────────────────────
IMAGE_SIZE = int(os.environ.get("HEAT_IMAGE_SIZE", "256"))
CORNER_THRESH = float(os.environ.get("HEAT_CORNER_THRESH", "0.01"))
INFER_TIMES = int(os.environ.get("HEAT_INFER_TIMES", "3"))
MAX_CORNER_NUM = 150
CORNER_TO_EDGE_MULTIPLIER = 3

# ── Server settings ──────────────────────────────────────────────────────────
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "5001"))
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"

# ── Device ───────────────────────────────────────────────────────────────────
import torch
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ── Image preprocessing (ImageNet normalization) ─────────────────────────────
IMAGE_MEAN = [0.485, 0.456, 0.406]
IMAGE_STD = [0.229, 0.224, 0.225]

# ── Polygon extraction ──────────────────────────────────────────────────────
MIN_POLYGON_AREA = 50          # pixels² — skip tiny artifacts
MIN_POLYGON_VERTICES = 3
MAX_DOWNLOAD_SIZE = 10 * 1024 * 1024  # 10 MB max image download
DOWNLOAD_TIMEOUT = 15          # seconds

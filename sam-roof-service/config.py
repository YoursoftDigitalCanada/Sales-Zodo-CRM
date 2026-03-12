import os

# ── SAM Model Configuration ───────────────────────────────────────────────

# Model type: "vit_b" (375MB, fast CPU), "vit_l" (1.2GB), "vit_h" (2.5GB, best quality)
SAM_MODEL_TYPE = os.getenv("SAM_MODEL_TYPE", "vit_b")

# Path to the SAM checkpoint file
SAM_CHECKPOINT_PATH = os.getenv(
    "SAM_CHECKPOINT_PATH",
    os.path.join(os.path.dirname(__file__), "checkpoints", "sam_vit_b_01ec64.pth"),
)

# Device: "cuda" or "cpu"
DEVICE = os.getenv("DEVICE", "cpu")

# ── Server Configuration ──────────────────────────────────────────────────

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5002"))

# ── Inference Settings ────────────────────────────────────────────────────

# Max image dimension (images larger than this are resized)
MAX_IMAGE_SIZE = int(os.getenv("MAX_IMAGE_SIZE", "1024"))

# Max image download size in bytes (10MB)
MAX_DOWNLOAD_SIZE = int(os.getenv("MAX_DOWNLOAD_SIZE", str(10 * 1024 * 1024)))

# Download timeout in seconds
DOWNLOAD_TIMEOUT = int(os.getenv("DOWNLOAD_TIMEOUT", "15"))

# ── Mask Filtering ────────────────────────────────────────────────────────

# Minimum mask area as fraction of total image area
MIN_AREA_RATIO = float(os.getenv("MIN_AREA_RATIO", "0.02"))

# Maximum mask area as fraction of total image area
MAX_AREA_RATIO = float(os.getenv("MAX_AREA_RATIO", "0.70"))

# Minimum solidity (area / convex_hull_area) for roof-like shapes
MIN_SOLIDITY = float(os.getenv("MIN_SOLIDITY", "0.5"))

# ── Overlay Settings ──────────────────────────────────────────────────────

# Roof overlay color (R, G, B)
OVERLAY_COLOR = (255, 0, 0)  # Red

# Overlay transparency (0.0 = invisible, 1.0 = opaque)
OVERLAY_ALPHA = float(os.getenv("OVERLAY_ALPHA", "0.4"))

# ── Logging ───────────────────────────────────────────────────────────────

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

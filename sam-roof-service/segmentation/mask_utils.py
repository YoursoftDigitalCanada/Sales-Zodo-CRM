"""
Mask processing utilities — overlay creation, polygon extraction, base64 encoding.
"""

import base64
import io

import cv2
import numpy as np
from PIL import Image

import config


def create_colored_overlay(
    image: np.ndarray,
    mask: np.ndarray,
    color: tuple = None,
    alpha: float = None,
) -> np.ndarray:
    """
    Create a semi-transparent colored overlay on the detected roof region.

    Args:
        image: RGB numpy array (H, W, 3)
        mask: Boolean mask (H, W) where True = roof
        color: RGB tuple, defaults to config.OVERLAY_COLOR
        alpha: Transparency, defaults to config.OVERLAY_ALPHA

    Returns:
        RGB numpy array with colored overlay
    """
    if color is None:
        color = config.OVERLAY_COLOR
    if alpha is None:
        alpha = config.OVERLAY_ALPHA

    overlay = image.copy()
    color_mask = np.zeros_like(image)
    color_mask[mask] = color

    # Blend: overlay = image * (1-alpha) + color * alpha, only on mask pixels
    overlay[mask] = cv2.addWeighted(
        image[mask].reshape(-1, 3),
        1 - alpha,
        color_mask[mask].reshape(-1, 3),
        alpha,
        0,
    ).reshape(-1, 3)

    # Draw contour outline for crisp edge
    mask_uint8 = mask.astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(overlay, contours, -1, color, 2, cv2.LINE_AA)

    return overlay


def mask_to_polygon(mask: np.ndarray, simplify_epsilon: float = 0.01) -> list:
    """
    Convert a binary mask to a simplified polygon (list of [x, y] points).

    Args:
        mask: Boolean or uint8 mask
        simplify_epsilon: Simplification factor (fraction of perimeter)

    Returns:
        List of [x, y] coordinate pairs
    """
    mask_uint8 = mask.astype(np.uint8) * 255 if mask.dtype == bool else mask
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return []

    largest = max(contours, key=cv2.contourArea)
    epsilon = simplify_epsilon * cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, epsilon, True)

    return approx.reshape(-1, 2).tolist()


def mask_to_bbox(mask: np.ndarray) -> list:
    """Extract bounding box [x, y, w, h] from a mask."""
    mask_uint8 = mask.astype(np.uint8) * 255 if mask.dtype == bool else mask
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return [0, 0, 0, 0]

    largest = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest)
    return [int(x), int(y), int(w), int(h)]


def encode_image_base64(image: np.ndarray, fmt: str = "PNG") -> str:
    """
    Encode a numpy RGB image to a base64 string.

    Args:
        image: RGB numpy array
        fmt: Image format ("PNG" or "JPEG")

    Returns:
        Base64-encoded string
    """
    pil_image = Image.fromarray(image)
    buffer = io.BytesIO()
    pil_image.save(buffer, format=fmt, quality=90)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def compute_mask_centroid(mask: np.ndarray) -> list:
    """Compute the centroid of a mask as [x, y]."""
    mask_uint8 = mask.astype(np.uint8) * 255 if mask.dtype == bool else mask
    moments = cv2.moments(mask_uint8)
    if moments["m00"] == 0:
        h, w = mask.shape[:2]
        return [w // 2, h // 2]

    cx = int(moments["m10"] / moments["m00"])
    cy = int(moments["m01"] / moments["m00"])
    return [cx, cy]

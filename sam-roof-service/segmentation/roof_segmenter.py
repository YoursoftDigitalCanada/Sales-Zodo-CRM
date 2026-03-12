"""
SAM-based roof segmenter.

Loads the Segment Anything Model, generates masks for a satellite image,
and filters them to find the most roof-like segments using geometric heuristics.
"""

import logging
import time

import cv2
import numpy as np
import torch
from segment_anything import SamAutomaticMaskGenerator, sam_model_registry

import config

logger = logging.getLogger(__name__)


class RoofSegmenter:
    """Wraps SAM model and provides roof-specific mask filtering."""

    def __init__(self):
        self.model = None
        self.mask_generator = None
        self.device = config.DEVICE
        self.model_type = config.SAM_MODEL_TYPE
        self.checkpoint_path = config.SAM_CHECKPOINT_PATH

    def load_model(self):
        """Load the SAM model and initialize the automatic mask generator."""
        logger.info(
            "Loading SAM model: type=%s, checkpoint=%s, device=%s",
            self.model_type,
            self.checkpoint_path,
            self.device,
        )
        t0 = time.time()

        sam = sam_model_registry[self.model_type](checkpoint=self.checkpoint_path)
        sam.to(device=self.device)

        self.model = sam
        self.mask_generator = SamAutomaticMaskGenerator(
            model=sam,
            points_per_side=32,
            pred_iou_thresh=0.86,
            stability_score_thresh=0.92,
            crop_n_layers=1,
            crop_n_points_downscale_factor=2,
            min_mask_region_area=100,
        )

        elapsed = round(time.time() - t0, 2)
        logger.info("SAM model loaded in %ss", elapsed)

    def is_loaded(self) -> bool:
        return self.model is not None and self.mask_generator is not None

    def generate_masks(self, image: np.ndarray) -> list:
        """Run SAM automatic mask generation on an RGB image."""
        if not self.is_loaded():
            raise RuntimeError("SAM model not loaded. Call load_model() first.")

        t0 = time.time()
        masks = self.mask_generator.generate(image)
        elapsed = round(time.time() - t0, 3)
        logger.info("SAM generated %d masks in %ss", len(masks), elapsed)
        return masks

    def score_mask_as_roof(
        self,
        mask_data: dict,
        image_h: int,
        image_w: int,
    ) -> float:
        """
        Score a SAM mask on how likely it is to be a roof.

        Criteria:
        - Area ratio: not too small, not too large
        - Solidity: roof shapes have high solidity (area / convex hull area)
        - Rectangularity: roofs tend to be roughly rectangular
        - Center proximity: the main roof is usually near the image center
        - Stability score: SAM's own confidence
        """
        seg = mask_data["segmentation"]  # bool mask H×W
        area = mask_data["area"]
        stability = mask_data.get("stability_score", 0.5)
        pred_iou = mask_data.get("predicted_iou", 0.5)

        total_pixels = image_h * image_w
        area_ratio = area / total_pixels

        # ── Area filter ───────────────────────────────────────────────────
        if area_ratio < config.MIN_AREA_RATIO or area_ratio > config.MAX_AREA_RATIO:
            return 0.0

        # ── Solidity ──────────────────────────────────────────────────────
        mask_uint8 = seg.astype(np.uint8) * 255
        contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return 0.0

        largest_contour = max(contours, key=cv2.contourArea)
        contour_area = cv2.contourArea(largest_contour)
        hull = cv2.convexHull(largest_contour)
        hull_area = cv2.contourArea(hull)

        solidity = contour_area / hull_area if hull_area > 0 else 0
        if solidity < config.MIN_SOLIDITY:
            return 0.0

        # ── Rectangularity ────────────────────────────────────────────────
        min_rect = cv2.minAreaRect(largest_contour)
        rect_area = min_rect[1][0] * min_rect[1][1]
        rectangularity = contour_area / rect_area if rect_area > 0 else 0

        # ── Center proximity ──────────────────────────────────────────────
        moments = cv2.moments(largest_contour)
        if moments["m00"] == 0:
            return 0.0

        cx = moments["m10"] / moments["m00"]
        cy = moments["m01"] / moments["m00"]
        center_x, center_y = image_w / 2, image_h / 2

        # Normalized distance from center (0 = center, 1 = corner)
        max_dist = np.sqrt(center_x**2 + center_y**2)
        dist = np.sqrt((cx - center_x) ** 2 + (cy - center_y) ** 2)
        center_score = 1.0 - (dist / max_dist)

        # ── Composite score ───────────────────────────────────────────────
        # Weight: center proximity is most important (satellite images center the house),
        # then solidity, then area ratio sweet spot, then rectangularity
        area_sweet_spot = 1.0 - abs(area_ratio - 0.15) / 0.15  # peaks at 15% of image
        area_sweet_spot = max(0.0, min(1.0, area_sweet_spot))

        score = (
            center_score * 0.35
            + solidity * 0.25
            + rectangularity * 0.15
            + area_sweet_spot * 0.10
            + stability * 0.10
            + pred_iou * 0.05
        )

        return round(score, 4)

    def detect_roof(self, image: np.ndarray) -> dict:
        """
        Full roof detection pipeline:
        1. Generate SAM masks
        2. Score each mask for roof-likeness
        3. Return the best mask + metadata

        Args:
            image: RGB numpy array (H, W, 3)

        Returns:
            dict with roof_mask, score, contour, area, etc.
        """
        t0 = time.time()
        h, w = image.shape[:2]

        # Resize if too large
        if max(h, w) > config.MAX_IMAGE_SIZE:
            scale = config.MAX_IMAGE_SIZE / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
            h, w = new_h, new_w
            logger.info("Resized image to %dx%d", w, h)

        # Generate masks
        masks = self.generate_masks(image)

        if not masks:
            return {
                "found": False,
                "message": "No masks generated by SAM",
                "inference_time_seconds": round(time.time() - t0, 3),
            }

        # Score all masks
        scored = []
        for mask_data in masks:
            score = self.score_mask_as_roof(mask_data, h, w)
            if score > 0:
                scored.append((score, mask_data))

        scored.sort(key=lambda x: x[0], reverse=True)

        if not scored:
            return {
                "found": False,
                "message": "No roof-like masks found",
                "mask_count": len(masks),
                "inference_time_seconds": round(time.time() - t0, 3),
            }

        best_score, best_mask = scored[0]
        seg = best_mask["segmentation"]

        # Extract contour + polygon
        mask_uint8 = seg.astype(np.uint8) * 255
        contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        largest_contour = max(contours, key=cv2.contourArea)

        # Simplify polygon
        epsilon = 0.01 * cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, epsilon, True)
        polygon = approx.reshape(-1, 2).tolist()

        inference_time = round(time.time() - t0, 3)
        logger.info(
            "Roof detected: score=%.3f, area=%d, polygon_points=%d, time=%ss",
            best_score,
            best_mask["area"],
            len(polygon),
            inference_time,
        )

        return {
            "found": True,
            "mask": seg,
            "score": best_score,
            "area": best_mask["area"],
            "polygon": polygon,
            "contour": largest_contour,
            "image_size": [w, h],
            "mask_count": len(masks),
            "roof_candidates": len(scored),
            "inference_time_seconds": inference_time,
        }

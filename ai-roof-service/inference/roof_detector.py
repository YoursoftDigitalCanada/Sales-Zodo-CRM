"""
HEAT Roof Plane Detector — Inference Wrapper

Loads the HEAT (Holistic Edge Attention Transformer) model and runs
roof plane extraction on satellite imagery.

Pipeline:
1. Load checkpoint (ResNet backbone + HeatCorner + HeatEdge)
2. Preprocess input image (resize, normalize)
3. Detect corners via HeatCorner with NMS
4. Detect edges via HeatEdge (iterative inference)
5. Post-process: remove isolated corners
6. Convert planar graph → closed polygons
7. Return structured JSON
"""

import os
import sys
import time
import logging
from typing import Optional

import cv2
import numpy as np
import torch
import torch.nn as nn
import skimage
import scipy.ndimage.filters as filters

# Add HEAT source to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "heat-model",
                                "2.- TRAINING-TESTING", "heat-master"))

from inference.graph_to_polygons import extract_polygons, scale_polygons

logger = logging.getLogger("roof-service")


class RoofDetector:
    """
    HEAT-based roof plane detector.

    Usage:
        detector = RoofDetector(checkpoint_path, image_size=256)
        result = detector.detect(image_array)
    """

    def __init__(
        self,
        checkpoint_path: str,
        image_size: int = 256,
        device: Optional[str] = None,
        corner_thresh: float = 0.01,
        infer_times: int = 3,
    ):
        self.image_size = image_size
        self.corner_thresh = corner_thresh
        self.infer_times = infer_times
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._loaded = False

        if not os.path.exists(checkpoint_path):
            logger.error(f"Checkpoint not found: {checkpoint_path}")
            raise FileNotFoundError(
                f"HEAT checkpoint not found at {checkpoint_path}. "
                f"Download from: https://drive.google.com/drive/folders/"
                f"1DMv5N5BE8Zcp8gLNU24Ylr9jZSnLxp9V"
            )

        self._load_model(checkpoint_path)

    def _load_model(self, checkpoint_path: str):
        """Load HEAT model components from checkpoint."""
        logger.info(f"Loading HEAT model from {checkpoint_path} on {self.device}...")
        start = time.time()

        try:
            # Import HEAT model components
            from models.resnet import ResNetBackbone
            from models.corner_models import HeatCorner
            from models.edge_models import HeatEdge
            from datasets.data_utils import get_pixel_features

            # Load checkpoint
            ckpt = torch.load(checkpoint_path, map_location=self.device)
            self._ckpt_args = ckpt["args"]
            logger.info(f"Loaded checkpoint from epoch {ckpt['epoch']}")

            # Initialize backbone
            self.backbone = ResNetBackbone()
            strides = self.backbone.strides
            num_channels = self.backbone.num_channels

            if self.device == "cuda":
                self.backbone = nn.DataParallel(self.backbone).cuda()
            else:
                # CPU mode — wrap state dict keys if needed
                self.backbone = nn.DataParallel(self.backbone)

            self.backbone.eval()

            # Initialize corner model
            self.corner_model = HeatCorner(
                input_dim=128,
                hidden_dim=256,
                num_feature_levels=4,
                backbone_strides=strides,
                backbone_num_channels=num_channels,
            )
            if self.device == "cuda":
                self.corner_model = nn.DataParallel(self.corner_model).cuda()
            else:
                self.corner_model = nn.DataParallel(self.corner_model)
            self.corner_model.eval()

            # Initialize edge model
            self.edge_model = HeatEdge(
                input_dim=128,
                hidden_dim=256,
                num_feature_levels=4,
                backbone_strides=strides,
                backbone_num_channels=num_channels,
            )
            if self.device == "cuda":
                self.edge_model = nn.DataParallel(self.edge_model).cuda()
            else:
                self.edge_model = nn.DataParallel(self.edge_model)
            self.edge_model.eval()

            # Load weights
            self.backbone.load_state_dict(ckpt["backbone"])
            self.corner_model.load_state_dict(ckpt["corner_model"])
            self.edge_model.load_state_dict(ckpt["edge_model"])

            # Precompute pixel features
            self.pixels, self.pixel_features = get_pixel_features(
                image_size=self.image_size
            )

            self._loaded = True
            elapsed = time.time() - start
            logger.info(f"HEAT model loaded in {elapsed:.2f}s on {self.device}")

        except Exception as e:
            logger.error(f"Failed to load HEAT model: {e}", exc_info=True)
            raise RuntimeError(f"HEAT model loading failed: {e}")

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def detect(self, image: np.ndarray) -> dict:
        """
        Run roof plane extraction on a satellite image.

        Args:
            image: RGB image as numpy array (H, W, 3), uint8

        Returns:
            dict with keys:
                - roof_planes: list of detected roof plane polygons
                - plane_count: number of detected planes
                - vertices: list of detected corner points
                - edges: list of edge connections
                - inference_time_seconds: processing time
                - image_size: model input size used
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded")

        start = time.time()

        try:
            # Preprocess
            original_h, original_w = image.shape[:2]
            processed_image = self._preprocess(image)

            # Run inference
            with torch.no_grad():
                pred_corners, pred_confs, pos_edges, edge_confs = self._infer(
                    processed_image
                )

            # Post-process: remove isolated corners
            pred_corners, pred_confs, pos_edges = self._postprocess(
                pred_corners, pred_confs, pos_edges
            )

            inference_time = round(time.time() - start, 3)

            # Convert to polygons
            if len(pred_corners) >= 3 and len(pos_edges) >= 3:
                polygons = extract_polygons(
                    pred_corners,
                    pos_edges,
                    image_size=self.image_size,
                )

                # Scale polygons to original image size if different
                if original_w != self.image_size or original_h != self.image_size:
                    scale_x = original_w / self.image_size
                    scale_y = original_h / self.image_size
                    for poly in polygons:
                        scaled_coords = []
                        for pt in poly["polygon"]:
                            scaled_coords.append([
                                round(pt[0] * scale_x, 1),
                                round(pt[1] * scale_y, 1),
                            ])
                        poly["polygon"] = scaled_coords
                        poly["centroid"] = [
                            round(poly["centroid"][0] * scale_x, 1),
                            round(poly["centroid"][1] * scale_y, 1),
                        ]
                        poly["area_pixels"] = round(
                            poly["area_pixels"] * scale_x * scale_y, 1
                        )
            else:
                polygons = []

            # Build response
            roof_planes = []
            for i, poly in enumerate(polygons):
                roof_planes.append({
                    "plane_id": i + 1,
                    "polygon": poly["polygon"],
                    "area_pixels": poly["area_pixels"],
                    "centroid": poly["centroid"],
                    "num_vertices": poly["num_vertices"],
                })

            # Scale corners for response
            scale_x = original_w / self.image_size
            scale_y = original_h / self.image_size
            vertices = [
                [round(float(c[0]) * scale_x, 1), round(float(c[1]) * scale_y, 1)]
                for c in pred_corners
            ]
            edges_list = [
                [int(e[0]), int(e[1])] for e in pos_edges
            ]

            result = {
                "roof_planes": roof_planes,
                "plane_count": len(roof_planes),
                "vertices": vertices,
                "vertex_count": len(vertices),
                "edges": edges_list,
                "edge_count": len(edges_list),
                "inference_time_seconds": inference_time,
                "image_size": self.image_size,
                "original_image_size": [original_w, original_h],
                "device": self.device,
            }

            logger.info(
                f"Detection complete: {len(roof_planes)} planes, "
                f"{len(vertices)} vertices, {len(edges_list)} edges, "
                f"{inference_time}s"
            )

            return result

        except Exception as e:
            logger.error(f"Detection failed: {e}", exc_info=True)
            return {
                "roof_planes": [],
                "plane_count": 0,
                "vertices": [],
                "vertex_count": 0,
                "edges": [],
                "edge_count": 0,
                "inference_time_seconds": round(time.time() - start, 3),
                "image_size": self.image_size,
                "error": str(e),
                "device": self.device,
            }

    def _preprocess(self, image: np.ndarray) -> torch.Tensor:
        """Resize and normalize image for HEAT model input."""
        from config import IMAGE_MEAN, IMAGE_STD

        # Resize to model input size
        resized = cv2.resize(
            image, (self.image_size, self.image_size), interpolation=cv2.INTER_LINEAR
        )

        # Normalize with ImageNet stats
        img = skimage.img_as_float(resized)
        img = img.transpose((2, 0, 1))  # HWC → CHW
        mean = np.array(IMAGE_MEAN)[:, np.newaxis, np.newaxis]
        std = np.array(IMAGE_STD)[:, np.newaxis, np.newaxis]
        img = (img - mean) / std

        tensor = torch.Tensor(img).unsqueeze(0)  # Add batch dim
        if self.device == "cuda":
            tensor = tensor.cuda()
        return tensor

    def _infer(self, image_tensor: torch.Tensor):
        """Run HEAT corner + edge inference pipeline."""
        from models.corner_to_edge import get_infer_edge_pairs

        # Extract image features
        image_feats, feat_mask, all_image_feats = self.backbone(image_tensor)

        # Pixel features
        pixel_features = self.pixel_features.unsqueeze(0).repeat(
            image_tensor.shape[0], 1, 1, 1
        )
        if self.device == "cuda":
            pixel_features = pixel_features.cuda()

        # Stage 1: Corner detection
        c_outputs = self.corner_model(
            image_feats, feat_mask, pixel_features, self.pixels, all_image_feats
        )
        c_outputs_np = c_outputs[0].detach().cpu().numpy()

        # Extract corners above threshold
        pos_indices = np.where(c_outputs_np >= self.corner_thresh)
        pred_corners = self.pixels[pos_indices]
        pred_confs = c_outputs_np[pos_indices]

        # NMS
        pred_corners, pred_confs = self._corner_nms(
            pred_corners, pred_confs, c_outputs.shape[1]
        )

        if len(pred_corners) == 0:
            return np.array([]), np.array([]), np.array([]), np.array([])

        # Prepare edge candidates
        pred_corners, pred_confs, edge_coords, edge_mask, edge_ids = (
            get_infer_edge_pairs(pred_corners, pred_confs)
        )

        corner_nums = torch.tensor([len(pred_corners)])
        if self.device == "cuda":
            corner_nums = corner_nums.cuda()

        max_candidates = torch.stack(
            [corner_nums.max() * self._ckpt_args.corner_to_edge_multiplier]
            * len(corner_nums),
            dim=0,
        )

        # Stage 2: Iterative edge inference
        all_pos_ids = set()
        all_edge_confs = dict()
        gt_values = torch.zeros_like(edge_mask).long()
        gt_values[:, :] = 2  # unknown

        for tt in range(self.infer_times):
            s1_logits, s2_logits_hb, s2_logits_rel, selected_ids, s2_mask, _ = (
                self.edge_model(
                    image_feats,
                    feat_mask,
                    pixel_features,
                    edge_coords,
                    edge_mask,
                    gt_values,
                    corner_nums,
                    max_candidates,
                    True,  # do_inference
                )
            )

            num_total = s1_logits.shape[2]
            num_selected = selected_ids.shape[1]
            num_filtered = num_total - num_selected

            s2_preds_hb = s2_logits_hb.squeeze().softmax(0)
            s2_preds_np = s2_preds_hb[1, :].detach().cpu().numpy()
            selected_ids_np = selected_ids.squeeze().detach().cpu().numpy()

            if tt != self.infer_times - 1:
                # Intermediate rounds: high confidence only
                pos_edge_ids = np.where(s2_preds_np >= 0.9)
                neg_edge_ids = np.where(s2_preds_np <= 0.01)

                for pos_id in pos_edge_ids[0]:
                    actual_id = selected_ids_np[pos_id]
                    if gt_values[0, actual_id] != 2:
                        continue
                    all_pos_ids.add(actual_id)
                    all_edge_confs[actual_id] = s2_preds_np[pos_id]
                    gt_values[0, actual_id] = 1

                for neg_id in neg_edge_ids[0]:
                    actual_id = selected_ids_np[neg_id]
                    if gt_values[0, actual_id] != 2:
                        continue
                    gt_values[0, actual_id] = 0

                num_to_pred = (gt_values == 2).sum()
                if num_to_pred <= num_filtered:
                    break
            else:
                # Final round: accept ≥ 0.5
                pos_edge_ids = np.where(s2_preds_np >= 0.5)
                for pos_id in pos_edge_ids[0]:
                    actual_id = selected_ids_np[pos_id]
                    if s2_mask[0][pos_id] is True or gt_values[0, actual_id] != 2:
                        continue
                    all_pos_ids.add(actual_id)
                    all_edge_confs[actual_id] = s2_preds_np[pos_id]

        # Collect results
        pos_edge_ids = list(all_pos_ids)
        edge_confs = np.array([all_edge_confs[idx] for idx in pos_edge_ids])
        pos_edges = edge_ids[pos_edge_ids].cpu().numpy()

        # Scale corners if image_size != 256
        if self.image_size != 256:
            pred_corners = pred_corners / (self.image_size / 256)

        return pred_corners, pred_confs, pos_edges, edge_confs

    def _corner_nms(
        self, preds: np.ndarray, confs: np.ndarray, heatmap_size: int
    ) -> tuple:
        """Non-maximum suppression for detected corners."""
        if len(preds) == 0:
            return preds, confs

        data = np.zeros([heatmap_size, heatmap_size])
        neighborhood_size = 5

        for i in range(len(preds)):
            y = int(np.clip(preds[i, 1], 0, heatmap_size - 1))
            x = int(np.clip(preds[i, 0], 0, heatmap_size - 1))
            data[y, x] = confs[i]

        data_max = filters.maximum_filter(data, neighborhood_size)
        maxima = data == data_max
        data_min = filters.minimum_filter(data, neighborhood_size)
        diff = (data_max - data_min) > 0
        maxima[diff == 0] = 0

        results = np.where(maxima > 0)
        filtered_preds = np.stack([results[1], results[0]], axis=-1)

        new_confs = np.array([data[p[1], p[0]] for p in filtered_preds])

        return filtered_preds, new_confs

    def _postprocess(self, corners, confs, edges):
        """Remove isolated corners (not connected to any edge)."""
        if len(corners) == 0 or len(edges) == 0:
            return corners, confs, edges

        corner_degrees = {}
        for edge_pair in edges:
            corner_degrees[edge_pair[0]] = corner_degrees.get(edge_pair[0], 0) + 1
            corner_degrees[edge_pair[1]] = corner_degrees.get(edge_pair[1], 0) + 1

        good_ids = [i for i in range(len(corners)) if i in corner_degrees]

        if len(good_ids) == len(corners):
            return corners, confs, edges

        good_corners = corners[good_ids]
        good_confs = confs[good_ids]

        id_mapping = {old: new for new, old in enumerate(good_ids)}
        new_edges = []
        for edge_pair in edges:
            if edge_pair[0] in id_mapping and edge_pair[1] in id_mapping:
                new_edges.append(
                    (id_mapping[edge_pair[0]], id_mapping[edge_pair[1]])
                )
        new_edges = np.array(new_edges) if new_edges else np.array([])

        return good_corners, good_confs, new_edges


# ── Module-level singleton ───────────────────────────────────────────────────

_detector: Optional[RoofDetector] = None


def get_detector() -> Optional[RoofDetector]:
    """Get the singleton detector instance."""
    return _detector


def init_detector(
    checkpoint_path: str,
    image_size: int = 256,
    device: Optional[str] = None,
) -> RoofDetector:
    """Initialize the singleton detector."""
    global _detector
    _detector = RoofDetector(
        checkpoint_path=checkpoint_path,
        image_size=image_size,
        device=device,
    )
    return _detector

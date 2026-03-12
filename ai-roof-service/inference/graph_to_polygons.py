"""
Graph-to-Polygons Converter

Converts the HEAT model output (corners + edge pairs) into closed polygon
regions representing individual roof planes.

Algorithm:
1. Build adjacency graph from corners and edges
2. Find all minimal cycles (faces) using the planar graph structure
3. Order vertices in each polygon (counter-clockwise)
4. Filter degenerate / tiny polygons
"""

import numpy as np
from collections import defaultdict
import logging

logger = logging.getLogger("roof-service")


def extract_polygons(
    corners: np.ndarray,
    edges: np.ndarray,
    image_size: int = 256,
    min_area: float = 50.0,
) -> list[dict]:
    """
    Convert a planar graph (corners + edges) into closed polygons.

    Args:
        corners: (N, 2) array of vertex coordinates [x, y]
        edges: (M, 2) array of edge pairs [idx_a, idx_b]
        image_size: image dimension for coordinate scaling
        min_area: minimum polygon area in pixels² to keep

    Returns:
        List of polygon dicts with keys: polygon, area, centroid, num_vertices
    """
    if len(corners) < 3 or len(edges) < 3:
        logger.warning(
            f"Insufficient graph elements: {len(corners)} corners, {len(edges)} edges"
        )
        return []

    # Build adjacency list
    adj = defaultdict(set)
    for edge in edges:
        a, b = int(edge[0]), int(edge[1])
        if a < len(corners) and b < len(corners):
            adj[a].add(b)
            adj[b].add(a)

    # Sort neighbors by angle for each vertex (planar embedding)
    sorted_adj = {}
    for node, neighbors in adj.items():
        if not neighbors:
            continue
        cx, cy = corners[node]
        angles = []
        for nb in neighbors:
            nx, ny = corners[nb]
            angle = np.arctan2(ny - cy, nx - cx)
            angles.append((angle, nb))
        angles.sort()
        sorted_adj[node] = [nb for _, nb in angles]

    # Find all minimal faces using the half-edge traversal
    visited_half_edges = set()
    faces = []

    for start_node in sorted_adj:
        for next_node in sorted_adj[start_node]:
            half_edge = (start_node, next_node)
            if half_edge in visited_half_edges:
                continue

            # Trace a face
            face = []
            current = start_node
            nxt = next_node
            max_steps = len(corners) + 2  # safety limit

            for _ in range(max_steps):
                if (current, nxt) in visited_half_edges:
                    break
                visited_half_edges.add((current, nxt))
                face.append(current)

                # Find the next half-edge: turn right at nxt
                if nxt not in sorted_adj or not sorted_adj[nxt]:
                    break

                neighbors = sorted_adj[nxt]
                # Find index of current in nxt's sorted neighbors
                try:
                    idx = neighbors.index(current)
                except ValueError:
                    break

                # Next neighbor in CW order (previous in sorted list = turn right)
                prev_idx = (idx - 1) % len(neighbors)
                new_next = neighbors[prev_idx]

                current = nxt
                nxt = new_next

                if current == start_node and nxt == next_node:
                    break

            if len(face) >= 3 and face[0] == current:
                # Verify it's a closed face (last edge returns to start)
                faces.append(face)

    # Convert faces to polygons and filter
    polygons = []
    seen_face_keys = set()

    for face in faces:
        # Normalize face to avoid duplicates (rotate to min index first)
        min_idx = face.index(min(face))
        normalized = tuple(face[min_idx:] + face[:min_idx])
        # Also check reverse
        rev_normalized = tuple(reversed(normalized))
        rev_normalized = tuple(
            rev_normalized[rev_normalized.index(min(rev_normalized)):]
            + rev_normalized[: rev_normalized.index(min(rev_normalized))]
        )

        if normalized in seen_face_keys or rev_normalized in seen_face_keys:
            continue
        seen_face_keys.add(normalized)

        # Get polygon coordinates
        poly_coords = corners[list(face)]

        # Calculate area using shoelace formula
        area = _polygon_area(poly_coords)

        if abs(area) < min_area:
            continue

        # Ensure counter-clockwise winding
        if area < 0:
            poly_coords = poly_coords[::-1]
            area = abs(area)

        # Skip the outer boundary face (largest face spanning whole image)
        bbox_area = (
            (poly_coords[:, 0].max() - poly_coords[:, 0].min())
            * (poly_coords[:, 1].max() - poly_coords[:, 1].min())
        )
        if bbox_area > (image_size * image_size * 0.85):
            continue

        centroid = poly_coords.mean(axis=0)

        polygons.append(
            {
                "polygon": poly_coords.tolist(),
                "area_pixels": round(float(abs(area)), 1),
                "centroid": [round(float(centroid[0]), 1), round(float(centroid[1]), 1)],
                "num_vertices": len(face),
                "vertex_indices": list(face),
            }
        )

    # Sort by area descending
    polygons.sort(key=lambda p: p["area_pixels"], reverse=True)

    logger.info(
        f"Graph→Polygons: {len(corners)} corners, {len(edges)} edges → "
        f"{len(faces)} faces → {len(polygons)} valid polygons"
    )
    return polygons


def _polygon_area(coords: np.ndarray) -> float:
    """Signed area via shoelace formula. Positive = CCW, Negative = CW."""
    n = len(coords)
    if n < 3:
        return 0.0
    x = coords[:, 0]
    y = coords[:, 1]
    return 0.5 * float(np.sum(x[:-1] * y[1:] - x[1:] * y[:-1]) + x[-1] * y[0] - x[0] * y[-1])


def scale_polygons(
    polygons: list[dict],
    from_size: int,
    to_size: int,
) -> list[dict]:
    """Scale polygon coordinates from model image size to original image size."""
    if from_size == to_size or from_size == 0:
        return polygons

    scale = to_size / from_size
    scaled = []
    for poly in polygons:
        coords = np.array(poly["polygon"]) * scale
        scaled.append(
            {
                **poly,
                "polygon": coords.tolist(),
                "centroid": [
                    round(poly["centroid"][0] * scale, 1),
                    round(poly["centroid"][1] * scale, 1),
                ],
                "area_pixels": round(poly["area_pixels"] * (scale ** 2), 1),
            }
        )
    return scaled

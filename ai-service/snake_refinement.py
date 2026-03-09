"""
Active Contour (Snake Algorithm) for Roof Edge Refinement

Refines AI segmentation polygon by iteratively moving vertices toward
strong image edges while maintaining smoothness constraints.

Energy function:
    E_total = α * E_smooth + β * E_curvature + γ * E_edge

Typical improvement: boundary error reduced from 3-6% to 1-3%.
Target: < 40ms per roof polygon.
"""

import time
import logging

import cv2
import numpy as np

logger = logging.getLogger("roof-estimator")

# ── Default Parameters ────────────────────────────────────────────────────

ALPHA = 0.1      # smoothness weight
BETA = 0.3       # curvature weight
GAMMA = 1.0      # edge attraction weight
MAX_ITERATIONS = 20
SEARCH_RADIUS = 6         # pixels: search neighborhood for each vertex
MAX_MOVE_RADIUS = 8       # pixels: max vertex displacement from original
CONVERGENCE_THRESHOLD = 0.5  # pixels: stop when avg movement < this
MAX_TIME_MS = 40           # performance budget


# ── Step 1: Edge Energy Map ──────────────────────────────────────────────


def compute_edge_energy_map(
    image: np.ndarray,
    mask: np.ndarray,
) -> np.ndarray:
    """
    Compute gradient magnitude from satellite image, masked to roof area.
    Uses Sobel filters and normalizes to [0, 1].
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

    # Bilateral filter to smooth noise while preserving edges
    filtered = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)

    # Sobel gradients
    grad_x = cv2.Sobel(filtered, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(filtered, cv2.CV_64F, 0, 1, ksize=3)

    # Gradient magnitude
    magnitude = np.sqrt(grad_x ** 2 + grad_y ** 2)

    # Normalize to [0, 1]
    max_val = magnitude.max()
    if max_val > 0:
        magnitude = magnitude / max_val

    # Mask to roof region (dilated slightly to allow edge attraction)
    dilated_mask = cv2.dilate(mask, np.ones((9, 9), np.uint8), iterations=1)
    magnitude = magnitude * dilated_mask.astype(np.float64)

    return magnitude


# ── Step 2: Initialize Snake ─────────────────────────────────────────────


def initialize_snake(polygon_points: list) -> np.ndarray:
    """
    Convert polygon point list to numpy snake contour.
    Ensures closed polygon.
    """
    pts = np.array(polygon_points, dtype=np.float64)

    # Ensure closed
    if len(pts) >= 2:
        if not np.allclose(pts[0], pts[-1]):
            pts = np.vstack([pts, pts[0]])

    return pts


# ── Step 3-4: Energy Computation + Iterative Optimization ────────────────


def _smoothness_energy(prev: np.ndarray, curr: np.ndarray, nxt: np.ndarray) -> float:
    """E_smooth: penalize uneven spacing (distance variance)."""
    d_prev = np.linalg.norm(curr - prev)
    d_next = np.linalg.norm(nxt - curr)
    return (d_prev - d_next) ** 2


def _curvature_energy(prev: np.ndarray, curr: np.ndarray, nxt: np.ndarray) -> float:
    """E_curvature: penalize sharp bends (second derivative)."""
    second_deriv = prev - 2 * curr + nxt
    return np.sum(second_deriv ** 2)


def _edge_energy(point: np.ndarray, energy_map: np.ndarray) -> float:
    """
    E_edge: attract toward strong edges (negative gradient magnitude).
    Lower energy = stronger edge.
    """
    x, y = int(round(point[0])), int(round(point[1]))
    h, w = energy_map.shape
    if 0 <= x < w and 0 <= y < h:
        return -energy_map[y, x]  # negative: we minimize, so strong edges = low energy
    return 0.0


def refine_polygon_snake(
    image: np.ndarray,
    mask: np.ndarray,
    polygon_points: list,
    alpha: float = ALPHA,
    beta: float = BETA,
    gamma: float = GAMMA,
    max_iterations: int = MAX_ITERATIONS,
    search_radius: int = SEARCH_RADIUS,
    max_move_radius: int = MAX_MOVE_RADIUS,
) -> dict:
    """
    Run Active Contour (Snake) optimization on a roof polygon.

    Args:
        image: RGB satellite image (numpy array)
        mask: binary roof mask (numpy array, uint8)
        polygon_points: list of [x, y] vertex coordinates
        alpha/beta/gamma: energy weights
        max_iterations: max optimization iterations
        search_radius: neighborhood search radius per vertex
        max_move_radius: max displacement from original position

    Returns:
        dict with:
            refined_points: list of [x, y] refined polygon vertices
            iterations: number of iterations run
            converged: whether convergence was reached
            avg_movement: average vertex displacement
            time_ms: processing time in milliseconds
    """
    t0 = time.time()

    if len(polygon_points) < 3:
        return {
            "refined_points": polygon_points,
            "iterations": 0,
            "converged": True,
            "avg_movement": 0.0,
            "time_ms": 0.0,
            "fallback": True,
            "fallback_reason": "Too few vertices",
        }

    # Step 1: Compute edge energy map
    energy_map = compute_edge_energy_map(image, mask)
    h_img, w_img = energy_map.shape

    # Step 2: Initialize snake
    snake = initialize_snake(polygon_points)
    original_positions = snake.copy()
    n_points = len(snake)

    # Dilate mask for constraint checking
    constraint_mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=2)

    converged = False
    total_iterations = 0
    avg_movement = 0.0

    # Step 4: Iterative optimization
    for iteration in range(max_iterations):
        # Performance check
        elapsed_ms = (time.time() - t0) * 1000
        if elapsed_ms > MAX_TIME_MS:
            logger.warning(f"Snake exceeded time budget at iter {iteration} ({elapsed_ms:.1f}ms)")
            break

        movements = []

        for i in range(n_points):
            # Skip the closing vertex (same as first)
            if i == n_points - 1 and np.allclose(snake[i], snake[0]):
                snake[i] = snake[0].copy()
                continue

            prev_idx = (i - 1) % (n_points - 1) if n_points > 1 else 0
            next_idx = (i + 1) % (n_points - 1) if i < n_points - 1 else 1

            prev_pt = snake[prev_idx]
            next_pt = snake[next_idx]
            curr_pt = snake[i]

            best_energy = float('inf')
            best_pos = curr_pt.copy()

            # Search neighborhood
            for dx in range(-search_radius, search_radius + 1, 1):
                for dy in range(-search_radius, search_radius + 1, 1):
                    candidate = curr_pt + np.array([dx, dy], dtype=np.float64)

                    # Step 5: Constraints
                    cx, cy = int(round(candidate[0])), int(round(candidate[1]))

                    # Boundary check
                    if cx < 0 or cx >= w_img or cy < 0 or cy >= h_img:
                        continue

                    # Must stay within dilated mask
                    if constraint_mask[cy, cx] == 0:
                        continue

                    # Max displacement from original
                    dist_from_orig = np.linalg.norm(candidate - original_positions[i])
                    if dist_from_orig > max_move_radius:
                        continue

                    # Compute total energy
                    e_smooth = _smoothness_energy(prev_pt, candidate, next_pt)
                    e_curv = _curvature_energy(prev_pt, candidate, next_pt)
                    e_edge = _edge_energy(candidate, energy_map)

                    total_energy = alpha * e_smooth + beta * e_curv + gamma * e_edge

                    if total_energy < best_energy:
                        best_energy = total_energy
                        best_pos = candidate.copy()

            movement = np.linalg.norm(best_pos - curr_pt)
            movements.append(movement)
            snake[i] = best_pos

        # Ensure closure
        if n_points > 1:
            snake[-1] = snake[0].copy()

        total_iterations = iteration + 1
        avg_movement = float(np.mean(movements)) if movements else 0.0

        # Convergence check
        if avg_movement < CONVERGENCE_THRESHOLD:
            converged = True
            break

    # Step 5: Check for self-intersection
    if _is_self_intersecting(snake):
        logger.warning("Snake produced self-intersecting polygon — falling back")
        return {
            "refined_points": polygon_points,
            "iterations": total_iterations,
            "converged": False,
            "avg_movement": avg_movement,
            "time_ms": round((time.time() - t0) * 1000, 1),
            "fallback": True,
            "fallback_reason": "Self-intersection detected",
        }

    # Step 6: Post-convergence smoothing pass
    snake = _smooth_contour(snake, factor=0.15)

    # Convert back to list
    refined = [[int(round(p[0])), int(round(p[1]))] for p in snake]

    elapsed_ms = round((time.time() - t0) * 1000, 1)

    logger.info(
        f"Snake refinement: {total_iterations} iters, "
        f"avg_move {avg_movement:.2f}px, "
        f"converged={converged}, time={elapsed_ms}ms"
    )

    return {
        "refined_points": refined,
        "iterations": total_iterations,
        "converged": converged,
        "avg_movement": round(avg_movement, 3),
        "time_ms": elapsed_ms,
        "fallback": False,
        "fallback_reason": None,
    }


# ── Helpers ──────────────────────────────────────────────────────────────


def _is_self_intersecting(contour: np.ndarray) -> bool:
    """
    Quick check for self-intersection using line segment intersection.
    Only checks non-adjacent segments.
    """
    n = len(contour)
    if n < 4:
        return False

    segments = [(contour[i], contour[(i + 1) % n]) for i in range(n - 1)]

    for i in range(len(segments)):
        for j in range(i + 2, len(segments)):
            if i == 0 and j == len(segments) - 1:
                continue  # skip adjacent wrap-around
            if _segments_intersect(segments[i][0], segments[i][1],
                                   segments[j][0], segments[j][1]):
                return True
    return False


def _segments_intersect(
    p1: np.ndarray, p2: np.ndarray,
    p3: np.ndarray, p4: np.ndarray,
) -> bool:
    """Check if line segment p1-p2 intersects p3-p4."""
    d1 = _cross_product_sign(p3, p4, p1)
    d2 = _cross_product_sign(p3, p4, p2)
    d3 = _cross_product_sign(p1, p2, p3)
    d4 = _cross_product_sign(p1, p2, p4)

    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
       ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True
    return False


def _cross_product_sign(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _smooth_contour(contour: np.ndarray, factor: float = 0.15) -> np.ndarray:
    """
    Laplacian smoothing: each vertex moves toward neighbor average.
    Preserves closure.
    """
    n = len(contour)
    if n < 4:
        return contour

    is_closed = np.allclose(contour[0], contour[-1])
    core = contour[:-1] if is_closed else contour
    m = len(core)

    smoothed = core.copy()
    for i in range(m):
        prev_pt = core[(i - 1) % m]
        next_pt = core[(i + 1) % m]
        avg = (prev_pt + next_pt) / 2
        smoothed[i] = core[i] + factor * (avg - core[i])

    if is_closed:
        smoothed = np.vstack([smoothed, smoothed[0]])

    return smoothed

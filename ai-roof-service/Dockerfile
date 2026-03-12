# ============================================================================
# AI Roof Service — Dockerfile
# HEAT (Holistic Edge Attention Transformer) Roof Plane Extraction
# ============================================================================

# Stage 1: Build deformable attention ops
FROM pytorch/pytorch:1.13.1-cuda11.6-cudnn8-devel AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ make \
    && rm -rf /var/lib/apt/lists/*

# Copy only the ops directory for compilation
COPY heat-model/2.-\ TRAINING-TESTING/heat-master/models/ops /build/ops

# Compile deformable attention CUDA ops
WORKDIR /build/ops
RUN python setup.py build_ext --inplace 2>/dev/null || \
    echo "WARN: CUDA ops compilation failed — will use CPU fallback"

# Stage 2: Runtime
FROM pytorch/pytorch:1.13.1-cuda11.6-cudnn8-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libcairo2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy compiled ops from builder
COPY --from=builder /build/ops /app/heat-model/2.-\ TRAINING-TESTING/heat-master/models/ops

# Copy HEAT model source (excluding large data/checkpoints)
COPY heat-model/2.-\ TRAINING-TESTING/heat-master/models /app/heat-model/2.-\ TRAINING-TESTING/heat-master/models
COPY heat-model/2.-\ TRAINING-TESTING/heat-master/datasets /app/heat-model/2.-\ TRAINING-TESTING/heat-master/datasets
COPY heat-model/2.-\ TRAINING-TESTING/heat-master/utils /app/heat-model/2.-\ TRAINING-TESTING/heat-master/utils
COPY heat-model/2.-\ TRAINING-TESTING/heat-master/metrics /app/heat-model/2.-\ TRAINING-TESTING/heat-master/metrics

# Copy service code
COPY config.py .
COPY inference/ ./inference/
COPY api/ ./api/

# Create checkpoints directory (mount or copy separately)
RUN mkdir -p /app/heat-model/2.-\ TRAINING-TESTING/heat-master/checkpoints

# Environment
ENV PYTHONUNBUFFERED=1
ENV PORT=5001
ENV HOST=0.0.0.0
ENV HEAT_IMAGE_SIZE=256

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; r=requests.get('http://localhost:5001/health'); exit(0 if r.ok else 1)"

EXPOSE 5001

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "1", "--threads", "2", \
     "--timeout", "120", "--preload", "api.server:app"]

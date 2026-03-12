FROM python:3.10-slim

WORKDIR /app

# System deps for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx libglib2.0-0 git && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create checkpoints dir
RUN mkdir -p checkpoints

ENV HOST=0.0.0.0
ENV PORT=5002
ENV DEVICE=cpu

EXPOSE 5002

CMD ["gunicorn", "--bind", "0.0.0.0:5002", "--workers", "1", "--threads", "2", "--timeout", "120", "--preload", "app:app"]

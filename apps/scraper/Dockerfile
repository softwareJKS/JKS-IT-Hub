FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV SCRAPER_PORT=3016

# Install build/curl essentials if needed for package installs
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY apps/scraper/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser and system dependencies for Chromium
RUN python -m playwright install --with-deps chromium

# Copy application source code
COPY apps/scraper ./

EXPOSE 3016

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3016"]

FROM python:3.12-slim

WORKDIR /app

# Install fonts for PDF generation
RUN apt-get update && apt-get install -y \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Expose port
EXPOSE 8080

# Run with shell to ensure proper port binding
CMD uvicorn app.main:app --host 0.0.0.0 --port 8080

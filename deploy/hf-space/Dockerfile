# DrishtiSaathi as one container (Hugging Face Space, or any Docker host):
# FastAPI on 127.0.0.1:8000 inside, the Next.js site on :7860 proxying /api/* to it.
FROM node:22-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone BACKEND_URL=http://127.0.0.1:8000
RUN npx next build

FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 && rm -rf /var/lib/apt/lists/*
COPY --from=web /usr/local/bin/node /usr/local/bin/node
RUN useradd -m -u 1000 user
WORKDIR /home/user/app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY --chown=user backend/ backend/
COPY --from=web --chown=user /web/.next/standalone web/
COPY --from=web --chown=user /web/.next/static web/.next/static
COPY --from=web --chown=user /web/public web/public
COPY --chown=user start.sh start.sh
USER user
# Demo data lives in /tmp: every restart starts from the four fresh demo patients.
ENV PUBLIC_DEMO=true DATABASE_URL=sqlite:////tmp/drishtisaathi.db \
    PORT=7860 HOSTNAME=0.0.0.0 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PYTHONUNBUFFERED=1
EXPOSE 7860
CMD ["bash", "start.sh"]

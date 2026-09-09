FROM node:22-bookworm

RUN apt-get update && \
    apt-get install -y libreoffice ghostscript qpdf ffmpeg python3 python3-pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify Ghostscript is available inside the container
RUN gs --version
# Verify FFmpeg is available inside the container
RUN ffmpeg -version
# Verify Python is available inside the container
RUN python3 --version && python3 -m pip --version

# Install PyTorch (CPU-only) + Demucs for music source separation.
# - The CPU index keeps the image lean (no CUDA libraries).
# - --extra-index-url (not --index-url) keeps PyPI as the primary index:
#   with --index-url ALL dependencies resolve from the CPU index, whose
#   typing-extensions wheel carries mismatched metadata and forces pip to
#   build from source (flit_core missing there) -> install fails.
# - The +cpu pins prevent pip from selecting the CUDA build on PyPI (which
#   ties on the base version) and keep torch inside demucs's <2.8 requirement.
# - Demucs needs TorchAudio; install both at the same version.
RUN python3 -m pip install --no-cache-dir --break-system-packages \
    torch==2.5.1+cpu torchaudio==2.5.1+cpu \
    --extra-index-url https://download.pytorch.org/whl/cpu && \
    python3 -m pip install --no-cache-dir --break-system-packages \
    "numpy==1.26.4" "scipy==1.13.1" demucs && \
    python3 -m demucs --help > /dev/null

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate the Prisma client from the copied schema. The @prisma/client
# postinstall (during `npm install` above) cannot do this because the schema
# is copied after install, so it only leaves a stub. This step must run after
# COPY and before the TypeScript build so types resolve and the runtime works.
# `prisma generate` does not require DATABASE_URL to be set (verified).
RUN npx prisma generate

# Where Demucs/torch keeps the preloaded model. Kept inside the image instead
# of the ephemeral container home directory so model reuse survives restarts.
ENV TORCH_HOME=/app/.model-cache/torch

# Preload the Demucs HTDemucs model for the music-removal tool so production
# containers do not need runtime access to the model registry.
# Offline builds skip this gracefully; the model is then fetched on first use.
RUN node scripts/preload-demucs-model.mjs || echo "Demucs model preload skipped"

# Preload the Whisper ONNX model for the speech-to-text tool so production
# containers do not need runtime access to the Hugging Face registry.
# Offline builds skip this gracefully; the model is then fetched on first use.
RUN node scripts/preload-stt-model.mjs || echo "STT model preload skipped"

RUN npm run build

ENV NODE_ENV=production
# Ensure the server binds the port Railway's Health Domain targets (3001)
# even when the platform does not inject a $PORT value itself.
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const h=require('http');h.get({host:'127.0.0.1',port:Number(process.env.PORT||3001),path:'/health',timeout:4000},r=>process.exit(r.statusCode>=200&&r.statusCode<300?0:1)).on('error',()=>process.exit(1))"

# Apply pending Prisma migrations on every start (the deployed database is
# provisioned separately, so schema changes must be deployed at runtime).
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
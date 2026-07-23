FROM node:22-bookworm

# Install LibreOffice
RUN apt-get update && \
    apt-get install -y libreoffice && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend

RUN npm install

COPY backend .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]

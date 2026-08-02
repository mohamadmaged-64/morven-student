FROM node:22-bookworm

RUN apt-get update && \
    apt-get install -y libreoffice ghostscript && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify Ghostscript is available inside the container
RUN gs --version

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
FROM node:22-bookworm

RUN apt-get update && \
    apt-get install -y libreoffice ghostscript qpdf && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify Ghostscript is available inside the container
RUN gs --version

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const h=require('http');h.get({host:'127.0.0.1',port:Number(process.env.PORT||3001),path:'/health',timeout:4000},r=>process.exit(r.statusCode>=200&&r.statusCode<300?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "start"]
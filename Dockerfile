FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./

RUN npm ci

COPY backend ./backend
COPY frontend ./frontend
COPY cli.ts ./
COPY tsconfig.json ./

RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV DB_PATH=/app/data/xml-flatten.db
ENV ENABLE_FRONTEND=true
ENV PATH_UUID=cfdi:Comprobante.cfdi:Complemento.tfd:TimbreFiscalDigital.@_UUID
ENV BATCH_SIZE=500

CMD ["npm", "run", "cli", "--", "server"]
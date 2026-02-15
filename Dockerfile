# Unified Dockerfile: builds frontend + backend into a single binary.
# Build context must be the project root.

# --- Stage 1: Build frontend ---
FROM node:22-alpine AS frontend
ARG BASE_PATH=
WORKDIR /app
COPY app/package.json app/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY app/ .
RUN VITE_BASE_PATH=${BASE_PATH} pnpm build

# --- Stage 2: Build Go binary with embedded frontend ---
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY core/ ./core/
COPY --from=frontend /app/dist ./core/internal/frontend/dist/
RUN CGO_ENABLED=0 go build -o /bin/server ./core/cmd/api

# --- Stage 3: Runtime ---
FROM alpine:3.21
RUN apk add --no-cache ca-certificates typst \
    fontconfig ttf-liberation ttf-dejavu font-noto
COPY --from=build /bin/server /bin/server
COPY core/settings/ /app/settings/
WORKDIR /app
EXPOSE 8080
CMD ["/bin/server"]

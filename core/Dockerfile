FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /bin/server ./cmd/api

FROM alpine:3.21
RUN apk add --no-cache ca-certificates typst
COPY --from=build /bin/server /bin/server
COPY settings/ /app/settings/
WORKDIR /app
EXPOSE 8080
CMD ["/bin/server"]

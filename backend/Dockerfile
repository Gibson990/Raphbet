# ---- build ----
FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /raphbet-api ./cmd/api

# ---- run ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
USER app
COPY --from=build /raphbet-api /raphbet-api
EXPOSE 8080
ENTRYPOINT ["/raphbet-api"]

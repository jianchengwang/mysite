FROM golang:1.27.1-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /mysite-api ./cmd/mysite-api
FROM alpine:3.23
RUN apk add --no-cache ca-certificates && adduser -D -u 10001 app
USER app
WORKDIR /app
COPY --from=build /mysite-api /app/mysite-api
EXPOSE 8000
ENTRYPOINT ["/app/mysite-api"]

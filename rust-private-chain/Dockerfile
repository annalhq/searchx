FROM rust:1.84-slim AS builder
WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/searchx-private-chain /usr/local/bin/searchx-private-chain
EXPOSE 9000
CMD ["searchx-private-chain"]

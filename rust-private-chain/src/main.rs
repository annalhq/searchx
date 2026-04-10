use std::env;
use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use dotenvy::dotenv;
use reqwest::Client;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

use searchx_private_chain::state::ChainState;
use searchx_private_chain::types::{AddPeerRequest, BlockSubmission, HealthResponse, SubmitResponse};

#[derive(Clone)]
struct AppState {
    chain: Arc<ChainState>,
    http: Client,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("info".parse().unwrap()))
        .init();

    let node_id = env::var("NODE_ID").unwrap_or_else(|_| "searchx-node-1".to_owned());
    let bind_address = env::var("BIND_ADDRESS").unwrap_or_else(|_| "0.0.0.0:9000".to_owned());
    let seed_peers = env::var("SEED_PEERS")
        .unwrap_or_default()
        .split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();

    let chain = Arc::new(ChainState::new(node_id.clone(), seed_peers));
    let state = AppState {
        chain,
        http: Client::new(),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/chain", get(chain_snapshot))
        .route("/peers", get(list_peers).post(add_peer))
        .route("/verify", post(verify_block))
        .route("/blocks", post(submit_block))
        .with_state(state)
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any));

    let listener = TcpListener::bind(&bind_address)
        .await
        .unwrap_or_else(|err| panic!("failed to bind {}: {}", bind_address, err));

    info!(node_id = %node_id, bind_address = %bind_address, "SearchX private chain node started");

    axum::serve(listener, app).await.unwrap_or_else(|err| {
        error!(error = %err, "server stopped unexpectedly");
    });
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_owned(),
        node_id: state.chain.node_id().to_owned(),
        height: state.chain.height().await,
        head_hash: state.chain.head_hash().await,
    })
}

async fn chain_snapshot(State(state): State<AppState>) -> Json<searchx_private_chain::types::ChainSnapshot> {
    Json(state.chain.chain_snapshot().await)
}

async fn list_peers(State(state): State<AppState>) -> Json<Vec<String>> {
    Json(state.chain.peers().await)
}

async fn add_peer(State(state): State<AppState>, Json(request): Json<AddPeerRequest>) -> (StatusCode, Json<serde_json::Value>) {
    let inserted = state.chain.add_peer(request.clone()).await;
    let status = if inserted { StatusCode::CREATED } else { StatusCode::OK };
    (
        status,
        Json(serde_json::json!({
            "added": inserted,
            "peer_url": request.peer_url,
        })),
    )
}

async fn verify_block(State(state): State<AppState>, Json(submission): Json<BlockSubmission>) -> (StatusCode, Json<searchx_private_chain::types::VerificationResult>) {
    let result = state.chain.verify_submission(&submission).await;
    let status = if result.valid { StatusCode::OK } else { StatusCode::UNPROCESSABLE_ENTITY };
    (status, Json(result))
}

async fn submit_block(State(state): State<AppState>, Json(submission): Json<BlockSubmission>) -> (StatusCode, Json<SubmitResponse>) {
    if state.chain.contains_hash(&submission.block_hash).await {
        let verification = state.chain.verify_submission(&submission).await;
        return (
            StatusCode::OK,
            Json(SubmitResponse {
                accepted: true,
                already_present: true,
                block: None,
                verification,
            }),
        );
    }

    let verification = state.chain.verify_submission(&submission).await;
    if !verification.valid {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(SubmitResponse {
                accepted: false,
                already_present: false,
                block: None,
                verification,
            }),
        );
    }

    let block = state.chain.append_block(&submission).await;
    if submission.propagate {
        broadcast_to_peers(&state, &submission).await;
    }

    (
        StatusCode::CREATED,
        Json(SubmitResponse {
            accepted: true,
            already_present: false,
            block: Some(block),
            verification,
        }),
    )
}

async fn broadcast_to_peers(state: &AppState, submission: &BlockSubmission) {
    let peers = state.chain.peers().await;
    if peers.is_empty() {
        return;
    }

    let mut outbound = submission.clone();
    outbound.propagate = false;

    for peer in peers {
        let endpoint = format!("{}/blocks", peer.trim_end_matches('/'));
        let client = state.http.clone();
        let payload = outbound.clone();
        tokio::spawn(async move {
            match client.post(&endpoint).json(&payload).send().await {
                Ok(response) if response.status().is_success() => {
                    info!(peer = %endpoint, "propagated block");
                }
                Ok(response) => {
                    warn!(peer = %endpoint, status = %response.status(), "peer rejected propagated block");
                }
                Err(err) => {
                    warn!(peer = %endpoint, error = %err, "failed to propagate block");
                }
            }
        });
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockSubmission {
    pub block_type: String,
    pub prev_hash: String,
    pub payload_json: String,
    pub block_hash: String,
    pub validator: String,
    #[serde(default = "default_true")]
    pub propagate: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddPeerRequest {
    pub peer_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockRecord {
    pub height: u64,
    pub block_type: String,
    pub prev_hash: String,
    pub payload_json: String,
    pub block_hash: String,
    pub validator: String,
    pub received_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct VerificationResult {
    pub valid: bool,
    pub reason: String,
    pub expected_hash: String,
    pub head_hash: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SubmitResponse {
    pub accepted: bool,
    pub already_present: bool,
    pub block: Option<BlockRecord>,
    pub verification: VerificationResult,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChainSnapshot {
    pub node_id: String,
    pub height: usize,
    pub head_hash: String,
    pub peers: Vec<String>,
    pub blocks: Vec<BlockRecord>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub node_id: String,
    pub height: usize,
    pub head_hash: String,
}

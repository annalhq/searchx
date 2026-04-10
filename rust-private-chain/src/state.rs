use std::collections::HashSet;
use std::sync::Arc;

use chrono::Utc;
use serde_json::Value;
use tokio::sync::RwLock;

use crate::{build_block_hash, GENESIS_HASH};
use crate::types::{AddPeerRequest, BlockRecord, BlockSubmission, ChainSnapshot, VerificationResult};

#[derive(Clone)]
pub struct ChainState {
    node_id: String,
    chain: Arc<RwLock<Vec<BlockRecord>>>,
    peers: Arc<RwLock<HashSet<String>>>,
}

impl ChainState {
    pub fn new(node_id: String, seed_peers: Vec<String>) -> Self {
        let mut peers = HashSet::new();
        for peer in seed_peers {
            let trimmed = peer.trim();
            if !trimmed.is_empty() {
                peers.insert(trimmed.to_owned());
            }
        }

        let genesis = BlockRecord {
            height: 0,
            block_type: "genesis".to_owned(),
            prev_hash: GENESIS_HASH.to_owned(),
            payload_json: "{}".to_owned(),
            block_hash: GENESIS_HASH.to_owned(),
            validator: node_id.clone(),
            received_at: Utc::now().to_rfc3339(),
        };

        Self {
            node_id,
            chain: Arc::new(RwLock::new(vec![genesis])),
            peers: Arc::new(RwLock::new(peers)),
        }
    }

    pub fn node_id(&self) -> &str {
        &self.node_id
    }

    pub async fn height(&self) -> usize {
        self.chain.read().await.len().saturating_sub(1)
    }

    pub async fn head_hash(&self) -> String {
        self.chain
            .read()
            .await
            .last()
            .map(|block| block.block_hash.clone())
            .unwrap_or_else(|| GENESIS_HASH.to_owned())
    }

    pub async fn chain_snapshot(&self) -> ChainSnapshot {
        let chain = self.chain.read().await;
        let peers = self.peers.read().await;

        ChainSnapshot {
            node_id: self.node_id.clone(),
            height: chain.len().saturating_sub(1),
            head_hash: chain.last().map(|block| block.block_hash.clone()).unwrap_or_else(|| GENESIS_HASH.to_owned()),
            peers: peers.iter().cloned().collect(),
            blocks: chain.clone(),
        }
    }

    pub async fn add_peer(&self, request: AddPeerRequest) -> bool {
        let peer = request.peer_url.trim();
        if peer.is_empty() {
            return false;
        }

        self.peers.write().await.insert(peer.to_owned())
    }

    pub async fn peers(&self) -> Vec<String> {
        self.peers.read().await.iter().cloned().collect()
    }

    pub async fn verify_submission(&self, submission: &BlockSubmission) -> VerificationResult {
        let head_hash = self.head_hash().await;
        let expected_hash = build_block_hash(&submission.prev_hash, &submission.payload_json);

        if !submission.payload_json.trim_start().starts_with('{') && !submission.payload_json.trim_start().starts_with('[') {
            return VerificationResult {
                valid: false,
                reason: "payload_json must contain valid JSON text".to_owned(),
                expected_hash,
                head_hash,
            };
        }

        if serde_json::from_str::<Value>(&submission.payload_json).is_err() {
            return VerificationResult {
                valid: false,
                reason: "payload_json is not valid JSON".to_owned(),
                expected_hash,
                head_hash,
            };
        }

        if expected_hash != submission.block_hash {
            return VerificationResult {
                valid: false,
                reason: "block_hash does not match SHA-256(prev_hash + payload_json)".to_owned(),
                expected_hash,
                head_hash,
            };
        }

        if submission.prev_hash != head_hash {
            return VerificationResult {
                valid: false,
                reason: "prev_hash does not match the current head hash".to_owned(),
                expected_hash,
                head_hash,
            };
        }

        if submission.block_type.trim().is_empty() {
            return VerificationResult {
                valid: false,
                reason: "block_type must not be empty".to_owned(),
                expected_hash,
                head_hash,
            };
        }

        if submission.validator.trim().is_empty() {
            return VerificationResult {
                valid: false,
                reason: "validator must not be empty".to_owned(),
                expected_hash,
                head_hash,
            };
        }

        VerificationResult {
            valid: true,
            reason: "block verified".to_owned(),
            expected_hash,
            head_hash,
        }
    }

    pub async fn append_block(&self, submission: &BlockSubmission) -> BlockRecord {
        let mut chain = self.chain.write().await;
        let height = chain.len() as u64;
        let block = BlockRecord {
            height,
            block_type: submission.block_type.clone(),
            prev_hash: submission.prev_hash.clone(),
            payload_json: submission.payload_json.clone(),
            block_hash: submission.block_hash.clone(),
            validator: submission.validator.clone(),
            received_at: Utc::now().to_rfc3339(),
        };
        chain.push(block.clone());
        block
    }

    pub async fn contains_hash(&self, block_hash: &str) -> bool {
        self.chain
            .read()
            .await
            .iter()
            .any(|block| block.block_hash == block_hash)
    }
}

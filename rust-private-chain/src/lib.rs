pub mod state;
pub mod types;

use sha2::{Digest, Sha256};

pub const GENESIS_HASH: &str = "0000000000000000000000000000000000000000000000000000000000000000";

pub fn sha256_hex(input: &str) -> String {
    let digest = Sha256::digest(input.as_bytes());
    hex::encode(digest)
}

pub fn build_block_hash(prev_hash: &str, payload_json: &str) -> String {
    sha256_hex(&format!("{}{}", prev_hash, payload_json))
}

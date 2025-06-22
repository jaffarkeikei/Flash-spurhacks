#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

/// Simplified Passkey data structure for demo
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PasskeyData {
    /// User's identifier
    pub user: Address,
    /// Public key for verification
    pub public_key: String,
    /// Credential ID from WebAuthn
    pub credential_id: String,
    /// Creation timestamp
    pub created_at: u64,
    /// Whether this passkey is active
    pub is_active: bool,
}

#[contract]
pub struct FlashPasskeyAuth;

#[contractimpl]
impl FlashPasskeyAuth {
    /// Initialize the contract
    pub fn initialize(env: Env) {
        // Simple initialization - just log that we're ready
        env.events().publish(("init",), "Flash Passkey Auth initialized");
    }

    /// Register a new passkey for a user (simplified for demo)
    pub fn register_passkey(
        env: Env,
        user: Address,
        public_key: String,
        credential_id: String,
    ) -> bool {
        // Ensure the user is authorized to register for themselves
        user.require_auth();

        let passkey_data = PasskeyData {
            user: user.clone(),
            public_key,
            credential_id: credential_id.clone(),
            created_at: env.ledger().timestamp(),
            is_active: true,
        };

        // Store passkey data (simplified - using temporary storage)
        env.storage().temporary().set(&user, &passkey_data);

        // Emit registration event
        env.events().publish(("register",), (&user, &credential_id));

        true
    }

    /// Check if a user has an active passkey
    pub fn has_active_passkey(env: Env, user: Address) -> bool {
        if let Some(passkey_data) = env.storage().temporary().get::<Address, PasskeyData>(&user) {
            passkey_data.is_active
        } else {
            false
        }
    }

    /// Get passkey information for a user
    pub fn get_passkey_info(env: Env, user: Address) -> Option<PasskeyData> {
        env.storage().temporary().get(&user)
    }

    /// Authenticate a user (simplified for demo)
    pub fn authenticate(env: Env, user: Address, signature: String) -> bool {
        if let Some(passkey_data) = env.storage().temporary().get::<Address, PasskeyData>(&user) {
            if passkey_data.is_active {
                // In production, would verify the signature
                // For demo, we just check if user has a passkey
                env.events().publish(("auth_success",), &user);
                return true;
            }
        }
        
        env.events().publish(("auth_failed",), &user);
        false
    }

    /// Revoke a user's passkey
    pub fn revoke_passkey(env: Env, user: Address) -> bool {
        user.require_auth();

        if let Some(mut passkey_data) = env.storage().temporary().get::<Address, PasskeyData>(&user) {
            passkey_data.is_active = false;
            env.storage().temporary().set(&user, &passkey_data);
            
            env.events().publish(("revoked",), &user);
            return true;
        }
        
        false
    }

    /// Get total number of registered users (demo function)
    pub fn get_user_count(env: Env) -> u32 {
        // Simple counter for demo purposes
        env.storage().temporary().get(&"user_count").unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    #[test]
    fn test_passkey_registration() {
        let env = Env::default();
        let contract_id = env.register_contract(None, FlashPasskeyAuth);
        let client = FlashPasskeyAuthClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let public_key = String::from_slice(&env, "mock_public_key");
        let credential_id = String::from_slice(&env, "mock_credential_id");

        // Initialize contract
        client.initialize();

        // Register passkey
        let result = client.register_passkey(&user, &public_key, &credential_id);
        assert_eq!(result, true);

        // Verify passkey was registered
        assert_eq!(client.has_active_passkey(&user), true);
    }

    #[test]
    fn test_authentication() {
        let env = Env::default();
        let contract_id = env.register_contract(None, FlashPasskeyAuth);
        let client = FlashPasskeyAuthClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let public_key = String::from_slice(&env, "mock_public_key");
        let credential_id = String::from_slice(&env, "mock_credential_id");
        let signature = String::from_slice(&env, "mock_signature");

        // Initialize and register
        client.initialize();
        client.register_passkey(&user, &public_key, &credential_id);

        // Authenticate
        let auth_result = client.authenticate(&user, &signature);
        assert_eq!(auth_result, true);
    }
} 
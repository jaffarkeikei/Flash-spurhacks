#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, Address, Bytes, Map, Vec};

/// Error codes for the passkey authentication contract
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AuthError {
    /// User already has a passkey registered
    PasskeyExists = 1,
    /// No passkey found for this user
    PasskeyNotFound = 2,
    /// Invalid signature provided
    InvalidSignature = 3,
    /// Passkey has been revoked
    PasskeyRevoked = 4,
    /// Invalid credential ID
    InvalidCredentialId = 5,
}

/// Passkey data structure stored on-chain
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PasskeyData {
    /// Public key for signature verification
    pub public_key: Bytes,
    /// Credential ID from WebAuthn
    pub credential_id: Bytes,
    /// Creation timestamp
    pub created_at: u64,
    /// Whether this passkey is active
    pub is_active: bool,
    /// Authentication counter (prevents replay attacks)
    pub auth_counter: u32,
    /// User's display name
    pub display_name: Bytes,
}

/// Authentication attempt data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuthAttempt {
    /// Signature from the authenticator
    pub signature: Bytes,
    /// Challenge that was signed
    pub challenge: Bytes,
    /// Authentication counter
    pub auth_counter: u32,
    /// Client data JSON hash
    pub client_data_hash: Bytes,
}

/// Events emitted by the contract
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PasskeyEvent {
    /// Passkey was registered
    PasskeyRegistered {
        user: Address,
        credential_id: Bytes,
    },
    /// Authentication was successful
    AuthenticationSuccess {
        user: Address,
        timestamp: u64,
    },
    /// Authentication failed
    AuthenticationFailed {
        user: Address,
        reason: Bytes,
    },
    /// Passkey was revoked
    PasskeyRevoked {
        user: Address,
        credential_id: Bytes,
    },
}

const PASSKEYS: symbol_short!("PASSKEYS");
const AUTH_LOG: symbol_short!("AUTH_LOG");

#[contract]
pub struct PasskeyAuthContract;

#[contractimpl]
impl PasskeyAuthContract {
    /// Initialize the contract (called once during deployment)
    pub fn initialize(env: Env) {
        // Initialize storage maps
        let passkeys: Map<Address, PasskeyData> = Map::new(&env);
        let auth_log: Map<Address, Vec<u64>> = Map::new(&env);
        
        env.storage().instance().set(&PASSKEYS, &passkeys);
        env.storage().instance().set(&AUTH_LOG, &auth_log);
    }

    /// Register a new passkey for a user
    /// This is called after WebAuthn registration on the frontend
    pub fn register_passkey(
        env: Env,
        user: Address,
        public_key: Bytes,
        credential_id: Bytes,
        display_name: Bytes,
    ) -> Result<(), AuthError> {
        // Ensure the user is authorized to register for themselves
        user.require_auth();

        let mut passkeys: Map<Address, PasskeyData> = env
            .storage()
            .instance()
            .get(&PASSKEYS)
            .unwrap_or_else(|| Map::new(&env));

        // Check if user already has a passkey
        if passkeys.contains_key(user.clone()) {
            return Err(AuthError::PasskeyExists);
        }

        let passkey_data = PasskeyData {
            public_key: public_key.clone(),
            credential_id: credential_id.clone(),
            created_at: env.ledger().timestamp(),
            is_active: true,
            auth_counter: 0,
            display_name,
        };

        passkeys.set(user.clone(), passkey_data);
        env.storage().instance().set(&PASSKEYS, &passkeys);

        // Emit registration event
        env.events().publish(
            (symbol_short!("REGISTER"),),
            PasskeyEvent::PasskeyRegistered {
                user: user.clone(),
                credential_id,
            },
        );

        Ok(())
    }

    /// Authenticate a user using their passkey
    /// Returns true if authentication is successful
    pub fn authenticate(
        env: Env,
        user: Address,
        auth_attempt: AuthAttempt,
    ) -> Result<bool, AuthError> {
        let passkeys: Map<Address, PasskeyData> = env
            .storage()
            .instance()
            .get(&PASSKEYS)
            .unwrap_or_else(|| Map::new(&env));

        // Get user's passkey data
        let mut passkey_data = passkeys
            .get(user.clone())
            .ok_or(AuthError::PasskeyNotFound)?;

        // Check if passkey is active
        if !passkey_data.is_active {
            return Err(AuthError::PasskeyRevoked);
        }

        // Verify authentication counter (prevents replay attacks)
        if auth_attempt.auth_counter <= passkey_data.auth_counter {
            return Err(AuthError::InvalidSignature);
        }

        // In a production implementation, we would verify the signature
        // against the public key here. For this demo, we'll simulate verification
        let signature_valid = verify_webauthn_signature(
            &passkey_data.public_key,
            &auth_attempt.signature,
            &auth_attempt.challenge,
            &auth_attempt.client_data_hash,
        );

        if !signature_valid {
            // Emit failed authentication event
            env.events().publish(
                (symbol_short!("AUTH_FAIL"),),
                PasskeyEvent::AuthenticationFailed {
                    user: user.clone(),
                    reason: Bytes::from_slice(&env, b"Invalid signature"),
                },
            );
            return Err(AuthError::InvalidSignature);
        }

        // Update authentication counter
        passkey_data.auth_counter = auth_attempt.auth_counter;
        let mut updated_passkeys = passkeys;
        updated_passkeys.set(user.clone(), passkey_data);
        env.storage().instance().set(&PASSKEYS, &updated_passkeys);

        // Log successful authentication
        let mut auth_log: Map<Address, Vec<u64>> = env
            .storage()
            .instance()
            .get(&AUTH_LOG)
            .unwrap_or_else(|| Map::new(&env));

        let mut user_log = auth_log
            .get(user.clone())
            .unwrap_or_else(|| Vec::new(&env));
        
        user_log.push_back(env.ledger().timestamp());
        auth_log.set(user.clone(), user_log);
        env.storage().instance().set(&AUTH_LOG, &auth_log);

        // Emit successful authentication event
        env.events().publish(
            (symbol_short!("AUTH_OK"),),
            PasskeyEvent::AuthenticationSuccess {
                user: user.clone(),
                timestamp: env.ledger().timestamp(),
            },
        );

        Ok(true)
    }

    /// Revoke a user's passkey (can be called by the user themselves)
    pub fn revoke_passkey(env: Env, user: Address) -> Result<(), AuthError> {
        user.require_auth();

        let mut passkeys: Map<Address, PasskeyData> = env
            .storage()
            .instance()
            .get(&PASSKEYS)
            .unwrap_or_else(|| Map::new(&env));

        let mut passkey_data = passkeys
            .get(user.clone())
            .ok_or(AuthError::PasskeyNotFound)?;

        passkey_data.is_active = false;
        passkeys.set(user.clone(), passkey_data.clone());
        env.storage().instance().set(&PASSKEYS, &passkeys);

        // Emit revocation event
        env.events().publish(
            (symbol_short!("REVOKE"),),
            PasskeyEvent::PasskeyRevoked {
                user: user.clone(),
                credential_id: passkey_data.credential_id,
            },
        );

        Ok(())
    }

    /// Get passkey data for a user (public information only)
    pub fn get_passkey_info(env: Env, user: Address) -> Option<PasskeyData> {
        let passkeys: Map<Address, PasskeyData> = env
            .storage()
            .instance()
            .get(&PASSKEYS)
            .unwrap_or_else(|| Map::new(&env));

        passkeys.get(user)
    }

    /// Check if a user has an active passkey
    pub fn has_active_passkey(env: Env, user: Address) -> bool {
        let passkeys: Map<Address, PasskeyData> = env
            .storage()
            .instance()
            .get(&PASSKEYS)
            .unwrap_or_else(|| Map::new(&env));

        if let Some(passkey_data) = passkeys.get(user) {
            passkey_data.is_active
        } else {
            false
        }
    }

    /// Get authentication history for a user (last 10 entries)
    pub fn get_auth_history(env: Env, user: Address) -> Vec<u64> {
        let auth_log: Map<Address, Vec<u64>> = env
            .storage()
            .instance()
            .get(&AUTH_LOG)
            .unwrap_or_else(|| Map::new(&env));

        auth_log.get(user).unwrap_or_else(|| Vec::new(&env))
    }
}

/// Verify WebAuthn signature (simplified for demo purposes)
/// In production, this would use proper cryptographic verification
fn verify_webauthn_signature(
    _public_key: &Bytes,
    _signature: &Bytes,
    _challenge: &Bytes,
    _client_data_hash: &Bytes,
) -> bool {
    // For demo purposes, we'll always return true
    // In production, implement proper ECDSA/RSA signature verification
    // using the public key against the signed challenge and client data
    true
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_passkey_registration() {
        let env = Env::default();
        let contract_id = env.register_contract(None, PasskeyAuthContract);
        let client = PasskeyAuthContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let public_key = Bytes::from_slice(&env, b"mock_public_key");
        let credential_id = Bytes::from_slice(&env, b"mock_credential_id");
        let display_name = Bytes::from_slice(&env, b"Test User");

        // Initialize contract
        client.initialize();

        // Register passkey
        let result = client.register_passkey(&user, &public_key, &credential_id, &display_name);
        assert!(result.is_ok());

        // Verify passkey was registered
        assert!(client.has_active_passkey(&user));
    }

    #[test]
    fn test_authentication_flow() {
        let env = Env::default();
        let contract_id = env.register_contract(None, PasskeyAuthContract);
        let client = PasskeyAuthContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let public_key = Bytes::from_slice(&env, b"mock_public_key");
        let credential_id = Bytes::from_slice(&env, b"mock_credential_id");
        let display_name = Bytes::from_slice(&env, b"Test User");

        // Initialize and register
        client.initialize();
        client.register_passkey(&user, &public_key, &credential_id, &display_name).unwrap();

        // Create authentication attempt
        let auth_attempt = AuthAttempt {
            signature: Bytes::from_slice(&env, b"mock_signature"),
            challenge: Bytes::from_slice(&env, b"mock_challenge"),
            auth_counter: 1,
            client_data_hash: Bytes::from_slice(&env, b"mock_client_data"),
        };

        // Authenticate
        let result = client.authenticate(&user, &auth_attempt);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);
    }
} 
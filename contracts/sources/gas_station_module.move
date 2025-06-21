module flashsettle::gas_station_module {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    
    // Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const ESPONSOR_NOT_REGISTERED: u64 = 2;
    const EINSUFFICIENT_SPONSOR_BALANCE: u64 = 3;
    const ETRANSACTION_NOT_ELIGIBLE: u64 = 4;
    const EMODULE_NOT_INITIALIZED: u64 = 5;
    
    struct SponsorConfig has store {
        allowed_functions: vector<String>,
        max_gas_per_txn: u64,
        active: bool,
        created_at: u64
    }
    
    struct SponsorRegistry has key {
        sponsors: Table<address, SponsorConfig>
    }
    
    struct SponsoredTxn has key, store {
        txn_hash: vector<u8>,
        sponsor: address,
        gas_amount: u64,
        processed: bool,
        created_at: u64
    }
    
    struct SponsoredTxnStore has key {
        transactions: Table<vector<u8>, SponsoredTxn>,
    }
    
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @flashsettle, ENOT_AUTHORIZED);
        
        if (!exists<SponsorRegistry>(admin_addr)) {
            move_to(admin, SponsorRegistry {
                sponsors: table::new()
            });
        };
        
        if (!exists<SponsoredTxnStore>(admin_addr)) {
            move_to(admin, SponsoredTxnStore {
                transactions: table::new()
            });
        };
    }
    
    public fun register_sponsor(
        sponsor: &signer,
        allowed_functions: vector<String>,
        max_gas_per_txn: u64
    ) acquires SponsorRegistry {
        let sponsor_addr = signer::address_of(sponsor);
        assert!(exists<SponsorRegistry>(@flashsettle), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global_mut<SponsorRegistry>(@flashsettle);
        
        let sponsor_config = SponsorConfig {
            allowed_functions,
            max_gas_per_txn,
            active: true,
            created_at: timestamp::now_seconds()
        };
        
        if (table::contains(&registry.sponsors, sponsor_addr)) {
            table::remove(&mut registry.sponsors, sponsor_addr);
        };
        
        table::add(&mut registry.sponsors, sponsor_addr, sponsor_config);
    }
    
    public fun sponsor_transaction(
        operator: &signer,
        txn_hash: vector<u8>,
        sender: address,
        function_name: String,
        gas_amount: u64
    ) acquires SponsorRegistry, SponsoredTxnStore {
        let operator_addr = signer::address_of(operator);
        assert!(operator_addr == @flashsettle, ENOT_AUTHORIZED);
        
        // Find an eligible sponsor
        let sponsor = find_eligible_sponsor(function_name, gas_amount);
        
        // Record sponsored transaction
        assert!(exists<SponsoredTxnStore>(@flashsettle), EMODULE_NOT_INITIALIZED);
        let txn_store = borrow_global_mut<SponsoredTxnStore>(@flashsettle);
        
        let sponsored_txn = SponsoredTxn {
            txn_hash,
            sponsor,
            gas_amount,
            processed: false,
            created_at: timestamp::now_seconds()
        };
        
        table::add(&mut txn_store.transactions, txn_hash, sponsored_txn);
        
        // In a real implementation, we would trigger the actual transaction sponsorship here
        // by submitting the transaction to the blockchain with the sponsor paying for gas
    }
    
    public fun process_sponsored_transaction(
        operator: &signer,
        txn_hash: vector<u8>
    ) acquires SponsoredTxnStore {
        let operator_addr = signer::address_of(operator);
        assert!(operator_addr == @flashsettle, ENOT_AUTHORIZED);
        
        assert!(exists<SponsoredTxnStore>(@flashsettle), EMODULE_NOT_INITIALIZED);
        let txn_store = borrow_global_mut<SponsoredTxnStore>(@flashsettle);
        assert!(table::contains(&txn_store.transactions, txn_hash), ETRANSACTION_NOT_ELIGIBLE);
        
        let txn = table::borrow_mut(&mut txn_store.transactions, txn_hash);
        assert!(!txn.processed, ETRANSACTION_NOT_ELIGIBLE);
        
        // Mark as processed
        txn.processed = true;
        
        // In a real implementation, we would execute the logic to transfer the gas fee
        // from the sponsor to the validators
    }
    
    public fun is_transaction_eligible(
        function_name: String,
        gas_amount: u64
    ): bool acquires SponsorRegistry {
        let sponsor = find_eligible_sponsor(function_name, gas_amount);
        sponsor != @0x0
    }
    
    fun find_eligible_sponsor(
        function_name: String,
        gas_amount: u64
    ): address acquires SponsorRegistry {
        assert!(exists<SponsorRegistry>(@flashsettle), EMODULE_NOT_INITIALIZED);
        let registry = borrow_global<SponsorRegistry>(@flashsettle);
        
        let sponsors = table::keys(&registry.sponsors);
        let i = 0;
        let len = vector::length(&sponsors);
        
        while (i < len) {
            let sponsor_addr = *vector::borrow(&sponsors, i);
            let config = table::borrow(&registry.sponsors, sponsor_addr);
            
            if (config.active && 
                gas_amount <= config.max_gas_per_txn &&
                is_function_allowed(config, function_name) &&
                coin::balance<AptosCoin>(sponsor_addr) >= gas_amount) {
                return sponsor_addr
            };
            
            i = i + 1;
        };
        
        @0x0
    }
    
    fun is_function_allowed(config: &SponsorConfig, function_name: String): bool {
        let allowed_functions = &config.allowed_functions;
        let i = 0;
        let len = vector::length(allowed_functions);
        
        while (i < len) {
            if (*vector::borrow(allowed_functions, i) == function_name) {
                return true
            };
            i = i + 1;
        };
        
        false
    }
    
    #[test_only]
    public fun initialize_for_test(account: &signer) {
        init_module(account);
    }
} 
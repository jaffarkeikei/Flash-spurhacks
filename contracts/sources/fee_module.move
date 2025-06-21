module flashsettle::fee_module {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    
    // Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EINVALID_FEE_CONFIG: u64 = 2;
    const EMODULE_NOT_INITIALIZED: u64 = 3;
    
    // Fee types
    const FEE_TYPE_PERCENTAGE: u8 = 0;
    const FEE_TYPE_FIXED: u8 = 1;
    
    struct FeeConfig has key, store {
        fee_type: u8,           // 0 = percentage, 1 = fixed
        fee_value: u64,         // For percentage: in basis points (1bp = 0.01%), for fixed: in token amount
        min_fee: u64,           // Minimum fee amount
        max_fee: u64,           // Maximum fee amount
        treasury_allocation: u64, // Basis points to allocate to treasury (remainder goes to stakers)
        updated_at: u64
    }
    
    struct FeeStore<phantom CoinType> has key {
        config: FeeConfig,
        collected_fees: Coin<CoinType>
    }
    
    struct TreasuryStore<phantom CoinType> has key {
        funds: Coin<CoinType>
    }
    
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @flashsettle, ENOT_AUTHORIZED);
        
        // Default fee config: 0.5% with min fee of 1 unit and max fee of 100 units, 80% to treasury
        let default_config = FeeConfig {
            fee_type: FEE_TYPE_PERCENTAGE,
            fee_value: 50, // 50 bp = 0.5%
            min_fee: 1,
            max_fee: 100,
            treasury_allocation: 8000, // 80%
            updated_at: timestamp::now_seconds()
        };
        
        if (!exists<FeeConfig>(admin_addr)) {
            move_to(admin, default_config);
        };
    }
    
    public fun calculate_fee<CoinType>(amount: u64): u64 acquires FeeConfig {
        assert!(exists<FeeConfig>(@flashsettle), EMODULE_NOT_INITIALIZED);
        let config = borrow_global<FeeConfig>(@flashsettle);
        
        let fee = if (config.fee_type == FEE_TYPE_PERCENTAGE) {
            // Calculate percentage fee (fee_value is in basis points)
            (amount * config.fee_value) / 10000
        } else {
            // Fixed fee
            config.fee_value
        };
        
        // Apply min/max constraints
        if (fee < config.min_fee) {
            fee = config.min_fee;
        };
        
        if (fee > config.max_fee) {
            fee = config.max_fee;
        };
        
        fee
    }
    
    public fun update_fee_config(
        admin: &signer,
        fee_type: u8,
        fee_value: u64,
        min_fee: u64,
        max_fee: u64,
        treasury_allocation: u64
    ) acquires FeeConfig {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @flashsettle, ENOT_AUTHORIZED);
        
        // Validate config parameters
        assert!(fee_type == FEE_TYPE_PERCENTAGE || fee_type == FEE_TYPE_FIXED, EINVALID_FEE_CONFIG);
        assert!(min_fee <= max_fee, EINVALID_FEE_CONFIG);
        assert!(treasury_allocation <= 10000, EINVALID_FEE_CONFIG);
        
        if (fee_type == FEE_TYPE_PERCENTAGE) {
            assert!(fee_value <= 10000, EINVALID_FEE_CONFIG); // Max 100%
        };
        
        let config = borrow_global_mut<FeeConfig>(@flashsettle);
        
        config.fee_type = fee_type;
        config.fee_value = fee_value;
        config.min_fee = min_fee;
        config.max_fee = max_fee;
        config.treasury_allocation = treasury_allocation;
        config.updated_at = timestamp::now_seconds();
    }
    
    public fun process_fee<CoinType>(
        fee_coins: Coin<CoinType>
    ) acquires FeeConfig {
        let admin_addr = @flashsettle;
        assert!(exists<FeeConfig>(admin_addr), EMODULE_NOT_INITIALIZED);
        let config = borrow_global<FeeConfig>(admin_addr);
        
        // Initialize fee store if needed
        if (!exists<FeeStore<CoinType>>(admin_addr)) {
            move_to(admin_addr, FeeStore<CoinType> {
                config: *config,
                collected_fees: coin::zero<CoinType>()
            });
        };
        
        // Initialize treasury store if needed
        if (!exists<TreasuryStore<CoinType>>(admin_addr)) {
            move_to(admin_addr, TreasuryStore<CoinType> {
                funds: coin::zero<CoinType>()
            });
        };
        
        let fee_store = borrow_global_mut<FeeStore<CoinType>>(admin_addr);
        
        // Add fee to collected fees
        coin::merge(&mut fee_store.collected_fees, fee_coins);
    }
    
    public fun distribute_fees<CoinType>(admin: &signer) acquires FeeStore, TreasuryStore, FeeConfig {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @flashsettle, ENOT_AUTHORIZED);
        
        assert!(exists<FeeStore<CoinType>>(admin_addr), EMODULE_NOT_INITIALIZED);
        assert!(exists<TreasuryStore<CoinType>>(admin_addr), EMODULE_NOT_INITIALIZED);
        
        let fee_store = borrow_global_mut<FeeStore<CoinType>>(admin_addr);
        let treasury_store = borrow_global_mut<TreasuryStore<CoinType>>(admin_addr);
        let config = borrow_global<FeeConfig>(admin_addr);
        
        let total_fees = coin::value(&fee_store.collected_fees);
        if (total_fees == 0) {
            return
        };
        
        // Calculate treasury amount
        let treasury_amount = (total_fees * config.treasury_allocation) / 10000;
        
        // Extract from collected fees
        let treasury_coins = coin::extract(&mut fee_store.collected_fees, treasury_amount);
        
        // Add to treasury
        coin::merge(&mut treasury_store.funds, treasury_coins);
        
        // The remainder would be distributed to stakers or other participants in a full implementation
        // For now, we just keep them in the fee store
    }
    
    public fun get_treasury_balance<CoinType>(): u64 acquires TreasuryStore {
        if (!exists<TreasuryStore<CoinType>>(@flashsettle)) {
            return 0
        };
        
        let treasury_store = borrow_global<TreasuryStore<CoinType>>(@flashsettle);
        coin::value(&treasury_store.funds)
    }
    
    #[test_only]
    public fun initialize_for_test(account: &signer) {
        init_module(account);
    }
} 
module flashsettle::escrow_module {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    
    // Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EESCROW_NOT_FOUND: u64 = 2;
    const EINSUFFICIENT_FUNDS: u64 = 3;
    const EMODULE_NOT_INITIALIZED: u64 = 4;
    
    struct Escrow has store {
        sender: address,
        amount: u64,
        created_at: u64
    }
    
    struct EscrowStore<phantom CoinType> has key {
        escrows: Table<u64, Escrow>,
        coins: Coin<CoinType>
    }
    
    fun init_module(account: &signer) {
        let account_addr = signer::address_of(account);
        assert!(account_addr == @flashsettle, ENOT_AUTHORIZED);
    }
    
    public fun create_escrow<CoinType>(
        sender: &signer,
        escrow_id: u64,
        amount: u64
    ) {
        let sender_addr = signer::address_of(sender);
        
        // Verify sender has sufficient funds
        assert!(coin::balance<CoinType>(sender_addr) >= amount, EINSUFFICIENT_FUNDS);
        
        // Initialize store if needed
        if (!exists<EscrowStore<CoinType>>(@flashsettle)) {
            move_to(@flashsettle, EscrowStore<CoinType> {
                escrows: table::new(),
                coins: coin::zero<CoinType>()
            });
        };
        
        // Transfer funds to escrow
        let escrow_coins = coin::withdraw<CoinType>(sender, amount);
        let escrow_store = borrow_global_mut<EscrowStore<CoinType>>(@flashsettle);
        coin::merge(&mut escrow_store.coins, escrow_coins);
        
        // Create escrow record
        let escrow = Escrow {
            sender: sender_addr,
            amount,
            created_at: timestamp::now_seconds()
        };
        
        table::add(&mut escrow_store.escrows, escrow_id, escrow);
    }
    
    public fun release_escrow<CoinType>(
        operator: &signer,
        escrow_id: u64,
        recipient: address,
        amount: u64
    ) {
        let operator_addr = signer::address_of(operator);
        assert!(operator_addr == @flashsettle, ENOT_AUTHORIZED);
        
        assert!(exists<EscrowStore<CoinType>>(@flashsettle), EMODULE_NOT_INITIALIZED);
        let escrow_store = borrow_global_mut<EscrowStore<CoinType>>(@flashsettle);
        assert!(table::contains(&escrow_store.escrows, escrow_id), EESCROW_NOT_FOUND);
        
        let escrow = table::borrow(&escrow_store.escrows, escrow_id);
        assert!(escrow.amount >= amount, EINSUFFICIENT_FUNDS);
        
        // Transfer funds to recipient
        let recipient_coins = coin::extract(&mut escrow_store.coins, amount);
        coin::deposit(recipient, recipient_coins);
        
        // Update or remove escrow record
        if (escrow.amount == amount) {
            table::remove(&mut escrow_store.escrows, escrow_id);
        } else {
            let escrow_mut = table::borrow_mut(&mut escrow_store.escrows, escrow_id);
            escrow_mut.amount = escrow_mut.amount - amount;
        }
    }
    
    public fun cancel_escrow<CoinType>(
        sender: &signer,
        escrow_id: u64
    ) {
        let sender_addr = signer::address_of(sender);
        
        assert!(exists<EscrowStore<CoinType>>(@flashsettle), EMODULE_NOT_INITIALIZED);
        let escrow_store = borrow_global_mut<EscrowStore<CoinType>>(@flashsettle);
        assert!(table::contains(&escrow_store.escrows, escrow_id), EESCROW_NOT_FOUND);
        
        let escrow = table::borrow(&escrow_store.escrows, escrow_id);
        assert!(escrow.sender == sender_addr, ENOT_AUTHORIZED);
        
        // Return funds to sender
        let sender_coins = coin::extract(&mut escrow_store.coins, escrow.amount);
        coin::deposit(sender_addr, sender_coins);
        
        // Remove escrow record
        table::remove(&mut escrow_store.escrows, escrow_id);
    }
    
    public fun get_escrow_amount<CoinType>(escrow_id: u64): u64 {
        assert!(exists<EscrowStore<CoinType>>(@flashsettle), EMODULE_NOT_INITIALIZED);
        let escrow_store = borrow_global<EscrowStore<CoinType>>(@flashsettle);
        assert!(table::contains(&escrow_store.escrows, escrow_id), EESCROW_NOT_FOUND);
        
        let escrow = table::borrow(&escrow_store.escrows, escrow_id);
        escrow.amount
    }
    
    #[test_only]
    public fun initialize_for_test(account: &signer) {
        init_module(account);
    }
} 
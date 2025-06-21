module flashsettle::flashsettle_module {
    use std::signer;
    use std::string::{Self, String};
    use aptos_framework::coin::{Self};
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};
    use aptos_std::type_info;

    // Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EINVALID_AMOUNT: u64 = 2;
    const EPAYMENT_ALREADY_PROCESSED: u64 = 3;
    const EPAYMENT_NOT_FOUND: u64 = 4;
    const EMODULE_NOT_INITIALIZED: u64 = 5;
    
    // Payment status codes
    const STATUS_CREATED: u8 = 0;
    const STATUS_PROCESSING: u8 = 1;
    const STATUS_COMPLETED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;
    const STATUS_FAILED: u8 = 4;
    
    struct Payment has key, store {
        id: u64,
        sender: address,
        recipient: address,
        amount: u64,
        fee: u64,
        currency_type: String,
        status: u8,
        created_at: u64,
        updated_at: u64
    }
    
    struct PaymentStore has key {
        payments: Table<u64, Payment>,
        next_payment_id: u64
    }

    // Initialize the module - should be called by module deployer
    fun init_module(account: &signer) {
        let account_addr = signer::address_of(account);
        assert!(account_addr == @flashsettle, ENOT_AUTHORIZED);
        
        // Initialize payment store
        if (!exists<PaymentStore>(account_addr)) {
            move_to(account, PaymentStore {
                payments: table::new(),
                next_payment_id: 1
            });
        };
    }
    
    public fun create_payment<CoinType>(
        sender: &signer,
        recipient: address,
        amount: u64,
        fee: u64
    ): u64 acquires PaymentStore {
        let sender_addr = signer::address_of(sender);
        
        // Validate the payment
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(exists<PaymentStore>(@flashsettle), EMODULE_NOT_INITIALIZED);
        
        // Create payment record
        let payment_store = borrow_global_mut<PaymentStore>(@flashsettle);
        let payment_id = payment_store.next_payment_id;
        payment_store.next_payment_id = payment_id + 1;
        
        let currency_type = type_info::type_name<CoinType>();
        
        let payment = Payment {
            id: payment_id,
            sender: sender_addr,
            recipient,
            amount,
            fee,
            currency_type,
            status: STATUS_CREATED,
            created_at: timestamp::now_seconds(),
            updated_at: timestamp::now_seconds()
        };
        
        table::add(&mut payment_store.payments, payment_id, payment);
        
        // Note: In an actual implementation, we would transfer funds to escrow here
        // escrow_module::create_escrow<CoinType>(sender, payment_id, amount + fee);
        
        payment_id
    }
    
    public fun execute_payment<CoinType>(
        operator: &signer,
        payment_id: u64
    ) acquires PaymentStore {
        // Authorization check
        let operator_addr = signer::address_of(operator);
        assert!(operator_addr == @flashsettle, ENOT_AUTHORIZED);
        
        // Get payment
        let payment_store = borrow_global_mut<PaymentStore>(@flashsettle);
        assert!(table::contains(&payment_store.payments, payment_id), EPAYMENT_NOT_FOUND);
        
        let payment = table::borrow_mut(&mut payment_store.payments, payment_id);
        assert!(payment.status == STATUS_CREATED, EPAYMENT_ALREADY_PROCESSED);
        
        // Update status
        payment.status = STATUS_PROCESSING;
        payment.updated_at = timestamp::now_seconds();
        
        // Process fee
        // In an actual implementation, we would process fees here
        // fee_module::process_fee<CoinType>(payment.fee);
        
        // Release from escrow to recipient
        // In an actual implementation, we would release from escrow here
        // escrow_module::release_escrow<CoinType>(operator, payment_id, payment.recipient, payment.amount);
        
        // Update status to completed
        payment.status = STATUS_COMPLETED;
        payment.updated_at = timestamp::now_seconds();
    }
    
    public fun cancel_payment<CoinType>(
        sender: &signer,
        payment_id: u64
    ) acquires PaymentStore {
        let sender_addr = signer::address_of(sender);
        
        // Get payment
        let payment_store = borrow_global_mut<PaymentStore>(@flashsettle);
        assert!(table::contains(&payment_store.payments, payment_id), EPAYMENT_NOT_FOUND);
        
        let payment = table::borrow_mut(&mut payment_store.payments, payment_id);
        
        // Authorization check
        assert!(payment.sender == sender_addr, ENOT_AUTHORIZED);
        assert!(payment.status == STATUS_CREATED, EPAYMENT_ALREADY_PROCESSED);
        
        // Update status
        payment.status = STATUS_CANCELLED;
        payment.updated_at = timestamp::now_seconds();
        
        // Return funds from escrow
        // In an actual implementation, we would return funds from escrow here
        // escrow_module::cancel_escrow<CoinType>(sender, payment_id);
    }
    
    public fun get_payment_status(payment_id: u64): u8 acquires PaymentStore {
        let payment_store = borrow_global<PaymentStore>(@flashsettle);
        assert!(table::contains(&payment_store.payments, payment_id), EPAYMENT_NOT_FOUND);
        
        let payment = table::borrow(&payment_store.payments, payment_id);
        payment.status
    }

    #[test_only]
    public fun initialize_for_test(account: &signer) {
        init_module(account);
    }
} 
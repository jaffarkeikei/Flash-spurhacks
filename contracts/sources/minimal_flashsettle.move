module flashsettle::minimal_flashsettle {
    use std::signer;
    
    // Simple counter to demonstrate the contract works
    struct Counter has key {
        value: u64
    }
    
    // Initialize the contract
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        move_to(admin, Counter { value: 0 });
    }
    
    // Increment counter (represents a payment)
    public entry fun create_payment(sender: &signer) acquires Counter {
        let counter = borrow_global_mut<Counter>(@flashsettle);
        counter.value = counter.value + 1;
    }
    
    // Get payment count
    public fun get_payment_count(): u64 acquires Counter {
        let counter = borrow_global<Counter>(@flashsettle);
        counter.value
    }
} 
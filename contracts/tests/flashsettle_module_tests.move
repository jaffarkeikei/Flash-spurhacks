#[test_only]
module flashsettle::flashsettle_module_tests {
    use std::signer;
    use std::string;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use flashsettle::flashsettle_module;

    // Test addresses
    const ADMIN_ADDR: address = @0x1234;
    const SENDER_ADDR: address = @0x5678;
    const RECIPIENT_ADDR: address = @0x9ABC;

    struct TestCoin {}

    #[test(admin = @flashsettle, sender = @0x5678, recipient = @0x9ABC, aptos_framework = @aptos_framework)]
    fun test_create_payment(
        admin: &signer,
        sender: &signer,
        recipient: &signer,
        aptos_framework: &signer
    ) {
        // Set up test environment
        setup_test(admin, sender, recipient, aptos_framework);

        // Create a payment
        let amount = 100;
        let fee = 5;
        let payment_id = flashsettle_module::create_payment<TestCoin>(sender, signer::address_of(recipient), amount, fee);

        // Verify payment was created with correct status
        let status = flashsettle_module::get_payment_status(payment_id);
        assert!(status == 0, 0); // STATUS_CREATED = 0
    }

    #[test(admin = @flashsettle, sender = @0x5678, recipient = @0x9ABC, aptos_framework = @aptos_framework)]
    fun test_execute_payment(
        admin: &signer,
        sender: &signer,
        recipient: &signer,
        aptos_framework: &signer
    ) {
        // Set up test environment
        setup_test(admin, sender, recipient, aptos_framework);

        // Create a payment
        let amount = 100;
        let fee = 5;
        let payment_id = flashsettle_module::create_payment<TestCoin>(sender, signer::address_of(recipient), amount, fee);

        // Execute the payment
        flashsettle_module::execute_payment<TestCoin>(admin, payment_id);

        // Verify payment status is updated to completed
        let status = flashsettle_module::get_payment_status(payment_id);
        assert!(status == 2, 0); // STATUS_COMPLETED = 2
    }

    #[test(admin = @flashsettle, sender = @0x5678, recipient = @0x9ABC, aptos_framework = @aptos_framework)]
    fun test_cancel_payment(
        admin: &signer,
        sender: &signer,
        recipient: &signer,
        aptos_framework: &signer
    ) {
        // Set up test environment
        setup_test(admin, sender, recipient, aptos_framework);

        // Create a payment
        let amount = 100;
        let fee = 5;
        let payment_id = flashsettle_module::create_payment<TestCoin>(sender, signer::address_of(recipient), amount, fee);

        // Cancel the payment
        flashsettle_module::cancel_payment<TestCoin>(sender, payment_id);

        // Verify payment status is updated to cancelled
        let status = flashsettle_module::get_payment_status(payment_id);
        assert!(status == 3, 0); // STATUS_CANCELLED = 3
    }

    #[test(admin = @flashsettle, sender = @0x5678, recipient = @0x9ABC, aptos_framework = @aptos_framework, wrong_sender = @0xDEF)]
    #[expected_failure(abort_code = 1)] // ENOT_AUTHORIZED = 1
    fun test_cancel_payment_unauthorized(
        admin: &signer,
        sender: &signer,
        recipient: &signer,
        aptos_framework: &signer,
        wrong_sender: &signer
    ) {
        // Set up test environment
        setup_test(admin, sender, recipient, aptos_framework);
        setup_account(wrong_sender, 1000);

        // Create a payment
        let amount = 100;
        let fee = 5;
        let payment_id = flashsettle_module::create_payment<TestCoin>(sender, signer::address_of(recipient), amount, fee);

        // Attempt to cancel the payment with a different sender (should fail)
        flashsettle_module::cancel_payment<TestCoin>(wrong_sender, payment_id);
    }

    // Helper function to set up the test environment
    fun setup_test(
        admin: &signer,
        sender: &signer,
        recipient: &signer,
        aptos_framework: &signer
    ) {
        // Set up timestamp for testing
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        // Initialize accounts
        setup_account(admin, 1000);
        setup_account(sender, 1000);
        setup_account(recipient, 1000);
        
        // Initialize modules
        flashsettle_module::initialize_for_test(admin);
    }
    
    fun setup_account(account: &signer, initial_balance: u64) {
        let addr = signer::address_of(account);
        if (!account::exists_at(addr)) {
            account::create_account_for_test(addr);
        };
        
        // Register for TestCoin and mint some coins
        if (!coin::is_account_registered<TestCoin>(addr)) {
            coin::register<TestCoin>(account);
        };
        
        // Note: In a real test, we would mint coins here
        // coin::deposit(addr, coin::mint<TestCoin>(initial_balance, &coin_admin));
    }
} 
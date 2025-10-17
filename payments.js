/**
 * Payment integration for Flutterwave and Paystack
 * Handles billboard purchases and premium ball payments
 */

import { supabaseManager } from './supabase.js';

// Payment Gateway Configuration
const FLUTTERWAVE_PUBLIC_KEY = 'YOUR_FLUTTERWAVE_PUBLIC_KEY';
const PAYSTACK_PUBLIC_KEY = 'YOUR_PAYSTACK_PUBLIC_KEY';

export class PaymentManager {
    constructor() {
        this.preferredGateway = 'flutterwave'; // or 'paystack'
        this.loadPaymentScripts();
    }

    // Load payment gateway scripts dynamically
    loadPaymentScripts() {
        // Load Flutterwave
        if (!document.getElementById('flutterwave-script')) {
            const flutterwaveScript = document.createElement('script');
            flutterwaveScript.id = 'flutterwave-script';
            flutterwaveScript.src = 'https://checkout.flutterwave.com/v3.js';
            document.head.appendChild(flutterwaveScript);
        }

        // Load Paystack
        if (!document.getElementById('paystack-script')) {
            const paystackScript = document.createElement('script');
            paystackScript.id = 'paystack-script';
            paystackScript.src = 'https://js.paystack.co/v1/inline.js';
            document.head.appendChild(paystackScript);
        }
    }

    /**
     * Initiate payment for billboard upload
     * @param {number} amount - Amount in Naira
     * @param {string} transactionType - 'main_billboard' or 'wall_billboard'
     * @param {object} metadata - Additional transaction data
     * @returns {Promise<object>} Payment result
     */
    async initiateBillboardPayment(amount, transactionType, metadata = {}) {
        const txRef = `bb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Record transaction in database
        await this.recordTransaction(txRef, amount, transactionType, metadata);

        // Choose payment gateway
        if (this.preferredGateway === 'flutterwave') {
            return await this.processFlutterwavePayment(amount, txRef, transactionType);
        } else {
            return await this.processPaystackPayment(amount, txRef, transactionType);
        }
    }

    /**
     * Process payment via Flutterwave
     */
    async processFlutterwavePayment(amount, txRef, transactionType) {
        return new Promise((resolve, reject) => {
            if (typeof FlutterwaveCheckout === 'undefined') {
                console.error('Flutterwave SDK not loaded');
                reject(new Error('Payment system not available'));
                return;
            }

            FlutterwaveCheckout({
                public_key: FLUTTERWAVE_PUBLIC_KEY,
                tx_ref: txRef,
                amount: amount,
                currency: "NGN",
                country: "NG",
                payment_options: "card, mobilemoney, ussd, banktransfer",
                meta: {
                    player_id: supabaseManager.playerId,
                    room_id: supabaseManager.currentRoom,
                    transaction_type: transactionType
                },
                customer: {
                    email: `${supabaseManager.playerId}@3dballspace.app`,
                    phone_number: "",
                    name: supabaseManager.playerId || "Player"
                },
                customizations: {
                    title: "3D Ball Social Space",
                    description: transactionType === 'main_billboard' 
                        ? "Main Billboard Upload" 
                        : "Wall Billboard Upload",
                    logo: "" // Add your logo URL here
                },
                callback: async (response) => {
                    if (response.status === "successful") {
                        // Verify payment on backend
                        const verified = await this.verifyFlutterwavePayment(response.transaction_id, txRef);
                        
                        if (verified) {
                            await this.updateTransactionStatus(txRef, 'completed');
                            resolve({
                                success: true,
                                reference: txRef,
                                transaction_id: response.transaction_id,
                                amount: amount
                            });
                        } else {
                            await this.updateTransactionStatus(txRef, 'failed');
                            reject(new Error('Payment verification failed'));
                        }
                    } else {
                        await this.updateTransactionStatus(txRef, 'failed');
                        reject(new Error('Payment failed'));
                    }
                },
                onclose: () => {
                    // User closed payment modal
                    this.updateTransactionStatus(txRef, 'cancelled');
                    reject(new Error('Payment cancelled'));
                }
            });
        });
    }

    /**
     * Process payment via Paystack
     */
    async processPaystackPayment(amount, txRef, transactionType) {
        return new Promise((resolve, reject) => {
            if (typeof PaystackPop === 'undefined') {
                console.error('Paystack SDK not loaded');
                reject(new Error('Payment system not available'));
                return;
            }

            const handler = PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: `${supabaseManager.playerId}@3dballspace.app`,
                amount: amount * 100, // Paystack expects amount in kobo (lowest currency unit)
                currency: 'NGN',
                ref: txRef,
                metadata: {
                    player_id: supabaseManager.playerId,
                    room_id: supabaseManager.currentRoom,
                    transaction_type: transactionType
                },
                callback: async (response) => {
                    if (response.status === 'success') {
                        // Verify payment
                        const verified = await this.verifyPaystackPayment(response.reference);
                        
                        if (verified) {
                            await this.updateTransactionStatus(txRef, 'completed');
                            resolve({
                                success: true,
                                reference: txRef,
                                transaction_id: response.transaction,
                                amount: amount
                            });
                        } else {
                            await this.updateTransactionStatus(txRef, 'failed');
                            reject(new Error('Payment verification failed'));
                        }
                    } else {
                        await this.updateTransactionStatus(txRef, 'failed');
                        reject(new Error('Payment failed'));
                    }
                },
                onClose: () => {
                    this.updateTransactionStatus(txRef, 'cancelled');
                    reject(new Error('Payment cancelled'));
                }
            });

            handler.openIframe();
        });
    }

    /**
     * Verify Flutterwave payment (should be done on backend for security)
     */
    async verifyFlutterwavePayment(transactionId, txRef) {
        try {
            // In production, this should be a backend API call
            // For now, we'll trust the client callback (NOT SECURE)
            console.warn('Payment verification should be done on backend!');
            return true;

            /* Backend verification would look like:
            const response = await fetch('YOUR_BACKEND_API/verify-flutterwave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transaction_id: transactionId, tx_ref: txRef })
            });
            const data = await response.json();
            return data.verified;
            */
        } catch (error) {
            console.error('Payment verification error:', error);
            return false;
        }
    }

    /**
     * Verify Paystack payment (should be done on backend for security)
     */
    async verifyPaystackPayment(reference) {
        try {
            // In production, this should be a backend API call
            console.warn('Payment verification should be done on backend!');
            return true;

            /* Backend verification would look like:
            const response = await fetch('YOUR_BACKEND_API/verify-paystack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference })
            });
            const data = await response.json();
            return data.verified;
            */
        } catch (error) {
            console.error('Payment verification error:', error);
            return false;
        }
    }

    /**
     * Record transaction in database
     */
    async recordTransaction(txRef, amount, transactionType, metadata) {
        try {
            const { error } = await supabaseManager.supabase
                .from('payment_transactions')
                .insert([{
                    player_id: supabaseManager.playerId,
                    transaction_type: transactionType,
                    amount: amount,
                    payment_gateway: this.preferredGateway,
                    payment_reference: txRef,
                    payment_status: 'pending',
                    metadata: metadata
                }]);

            if (error) throw error;
        } catch (error) {
            console.error('Error recording transaction:', error);
        }
    }

    /**
     * Update transaction status
     */
    async updateTransactionStatus(txRef, status) {
        try {
            const { error } = await supabaseManager.supabase
                .from('payment_transactions')
                .update({
                    payment_status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('payment_reference', txRef);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating transaction status:', error);
        }
    }

    /**
     * Initiate premium ball purchase
     * @param {number} amount - Amount in Naira
     * @returns {Promise<object>} Payment result
     */
    async initiatePremiumBallPurchase(amount = 5000) {
        const txRef = `pb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await this.recordTransaction(txRef, amount, 'premium_ball', {});

        if (this.preferredGateway === 'flutterwave') {
            return await this.processFlutterwavePayment(amount, txRef, 'premium_ball');
        } else {
            return await this.processPaystackPayment(amount, txRef, 'premium_ball');
        }
    }

    /**
     * Check if user has purchased premium balls
     */
    async hasPremiumAccess() {
        try {
            // Check by device fingerprint
            const fingerprint = await this.getDeviceFingerprint();
            
            const { data, error } = await supabaseManager.supabase
                .from('premium_purchases')
                .select('*')
                .eq('device_fingerprint', fingerprint)
                .eq('purchase_type', 'premium_ball')
                .eq('payment_status', 'completed');

            if (error) throw error;
            
            return data && data.length > 0;
        } catch (error) {
            console.error('Error checking premium access:', error);
            return false;
        }
    }

    /**
     * Simple device fingerprinting (for demonstration)
     * In production, use a proper fingerprinting library
     */
    async getDeviceFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        const dataURL = canvas.toDataURL();
        
        const fingerprint = {
            canvas: dataURL,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // Simple hash function
        const str = JSON.stringify(fingerprint);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(36);
    }

    /**
     * Set preferred payment gateway
     */
    setPreferredGateway(gateway) {
        if (gateway === 'flutterwave' || gateway === 'paystack') {
            this.preferredGateway = gateway;
            localStorage.setItem('preferredPaymentGateway', gateway);
        }
    }

    /**
     * Get preferred payment gateway from storage
     */
    getPreferredGateway() {
        return localStorage.getItem('preferredPaymentGateway') || 'flutterwave';
    }
}

// Export singleton instance
export const paymentManager = new PaymentManager();
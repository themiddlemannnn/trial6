import { supabaseManager } from './supabase.js';

/**
 * Manages billboard content uploads and competitive bidding
 */
export class BillboardManager {
    constructor(billboardFrame, userData) { // userData is now passed in
        this.billboardFrame = billboardFrame;
        this.userData = userData; // Store the user data
        this.currentBillboard = null;
        this.minimumBid = 100; // Base price in Naira
        this.premiumThreshold = 10000; // ₦10k for special announcement
        this.createUploadUI();
        this.loadCurrentBillboard();
    }

    createUploadUI() {
        // Create hamburger menu on billboard (appears when near)
        const menuButton = document.createElement('div');
        menuButton.id = 'billboardMenuButton';
        menuButton.innerHTML = '☰';
        menuButton.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            width: 50px;
            height: 50px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            z-index: 150;
            transition: background 0.2s;
        `;
        
        menuButton.addEventListener('click', () => this.showUploadModal());
        menuButton.addEventListener('mouseenter', () => {
            menuButton.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        menuButton.addEventListener('mouseleave', () => {
            menuButton.style.background = 'rgba(0, 0, 0, 0.8)';
        });
        
        document.body.appendChild(menuButton);
        this.menuButton = menuButton;

        // Check proximity to billboard to show/hide menu
        this.checkProximityInterval = setInterval(() => {
            this.checkBillboardProximity();
        }, 500);
    }

    checkBillboardProximity() {
        // This will be called from main.js with player position
        // For now, just show the button (you'll integrate this properly)
    }

    showMenuButton() {
        if (this.menuButton) {
            this.menuButton.style.display = 'flex';
        }
    }

    hideMenuButton() {
        if (this.menuButton) {
            this.menuButton.style.display = 'none';
        }
    }

    async loadCurrentBillboard() {
        this.currentBillboard = await supabaseManager.getMainBillboard();
        
        if (this.currentBillboard) {
            this.minimumBid = this.currentBillboard.amount_paid + 1;
        }
    }

    showUploadModal() {
        const modal = document.createElement('div');
        modal.id = 'billboardUploadModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 300;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
            padding: 20px;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: rgba(20, 20, 20, 0.95);
            padding: 30px;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            max-width: 600px;
            width: 100%;
            color: white;
        `;

        const currentBidText = this.currentBillboard 
            ? `₦${this.currentBillboard.amount_paid.toLocaleString()}`
            : 'No active bid';

        content.innerHTML = `
            <h2 style="margin-bottom: 20px; font-size: 24px;">Upload to Main Billboard</h2>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin-bottom: 10px;">Current Highest Bid: <strong style="color: #28a745;">${currentBidText}</strong></p>
                <p style="margin-bottom: 10px;">Minimum Bid Required: <strong style="color: #ffd700;">₦${this.minimumBid.toLocaleString()}</strong></p>
                <p style="font-size: 12px; color: #ccc;">💡 Pay ₦10,000+ for 20-second spotlight announcement!</p>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Select Content</label>
                <input type="file" id="billboardFileInput" accept="image/*,video/*" 
                    style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.1); 
                    color: white; border: 2px solid rgba(255,255,255,0.3);">
                <p style="font-size: 12px; color: #ccc; margin-top: 5px;">Max file size: 50MB | Formats: JPG, PNG, MP4, WebM</p>
            </div>

            <div id="filePreview" style="margin-bottom: 20px; display: none;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Preview</label>
                <div id="previewContainer" style="width: 100%; max-height: 300px; overflow: hidden; border-radius: 8px; background: #000;"></div>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Your Bid Amount (₦)</label>
                <input type="number" id="bidAmount" min="${this.minimumBid}" value="${this.minimumBid}" 
                    style="width: 100%; padding: 12px; font-size: 18px; border-radius: 8px; background: rgba(255,255,255,0.1); 
                    color: white; border: 2px solid rgba(255,255,255,0.3);">
                <p id="bidWarning" style="font-size: 12px; color: #ff3366; margin-top: 5px; display: none;"></p>
            </div>

            <div style="display: flex; gap: 10px;">
                <button id="uploadBillboardBtn" style="flex: 1; padding: 15px; font-size: 16px; font-weight: bold; 
                    background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Proceed to Payment
                </button>
                <button id="cancelUploadBtn" style="flex: 1; padding: 15px; font-size: 16px; 
                    background: rgba(255,255,255,0.1); color: white; border: 2px solid rgba(255,255,255,0.3); 
                    border-radius: 8px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Setup event listeners
        this.setupUploadListeners(modal);
    }

    setupUploadListeners(modal) {
        const fileInput = document.getElementById('billboardFileInput');
        const bidInput = document.getElementById('bidAmount');
        const uploadBtn = document.getElementById('uploadBillboardBtn');
        const cancelBtn = document.getElementById('cancelUploadBtn');
        const filePreview = document.getElementById('filePreview');
        const previewContainer = document.getElementById('previewContainer');
        const bidWarning = document.getElementById('bidWarning');

        let selectedFile = null;

        // File selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Check file size (50MB max)
            if (file.size > 50 * 1024 * 1024) {
                alert('File size exceeds 50MB limit');
                fileInput.value = '';
                return;
            }

            selectedFile = file;

            // Show preview
            filePreview.style.display = 'block';
            previewContainer.innerHTML = '';

            const reader = new FileReader();
            reader.onload = (event) => {
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    previewContainer.appendChild(img);
                } else if (file.type.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.src = event.target.result;
                    video.controls = true;
                    video.style.width = '100%';
                    video.style.height = 'auto';
                    previewContainer.appendChild(video);
                }
            };
            reader.readAsDataURL(file);
        });

        // Bid validation
        bidInput.addEventListener('input', () => {
            const amount = parseInt(bidInput.value);
            if (amount < this.minimumBid) {
                bidWarning.textContent = `Bid must be at least ₦${this.minimumBid.toLocaleString()}`;
                bidWarning.style.display = 'block';
                uploadBtn.disabled = true;
                uploadBtn.style.opacity = '0.5';
            } else {
                bidWarning.style.display = 'none';
                uploadBtn.disabled = false;
                uploadBtn.style.opacity = '1';
            }
        });

        // Upload button
        uploadBtn.addEventListener('click', () => {
            if (!selectedFile) {
                alert('Please select a file first');
                return;
            }

            const amount = parseInt(bidInput.value);
            if (amount < this.minimumBid) {
                alert(`Bid must be at least ₦${this.minimumBid.toLocaleString()}`);
                return;
            }

            this.processPayment(selectedFile, amount);
            modal.remove();
        });

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    async processPayment(file, amount) {
        // Show payment processing message
        const systemLog = document.getElementById('systemLog');
        systemLog.textContent = 'Initiating payment...';

        try {
            // Initialize Flutterwave/Paystack payment
            // For now, we'll simulate payment (you'll integrate actual payment gateway)
            const paymentSuccess = await this.initiatePayment(amount);

            if (paymentSuccess) {
                // Upload to Supabase
                const contentType = file.type.startsWith('video/') ? 'video' : 'image';
                const url = await supabaseManager.uploadBillboard(file, amount, contentType);

                if (url) {
                    systemLog.textContent = `Billboard uploaded successfully for ₦${amount.toLocaleString()}!`;
                    
                    // Check for premium announcement
                    if (amount >= this.premiumThreshold) {
                        this.triggerPremiumAnnouncement();
                    }
                } else {
                    systemLog.textContent = 'Upload failed. Please try again.';
                }
            } else {
                systemLog.textContent = 'Payment failed or cancelled';
            }

        } catch (error) {
            console.error('Payment error:', error);
            systemLog.textContent = 'Payment error occurred';
        }
    }

    async initiatePayment(amount) {
        // TODO: Integrate with Flutterwave or Paystack
        // This is a placeholder for payment gateway integration
        
        return new Promise((resolve) => {
            // Simulate payment dialog
            const confirmed = confirm(`Proceed to pay ₦${amount.toLocaleString()}?\n\n(Payment integration coming soon)`);
            setTimeout(() => resolve(confirmed), 500);
        });

        /* // Actual Flutterwave implementation would look like:
        
        FlutterwaveCheckout({
            public_key: "YOUR_PUBLIC_KEY",
            tx_ref: "billboard_" + Date.now(),
            amount: amount,
            currency: "NGN",
            payment_options: "card, banktransfer, ussd",
            customer: {
                email: "user@example.com",
                name: supabaseManager.playerId,
            },
            callback: function(payment) {
                if (payment.status === "successful") {
                    resolve(true);
                } else {
                    resolve(false);
                }
            },
            onclose: function() {
                resolve(false);
            }
        });
        */
    }

    triggerPremiumAnnouncement() {
        // Show full-screen announcement for 20 seconds
        const announcement = document.createElement('div');
        announcement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 500;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            animation: fadeIn 0.5s;
        `;

        const playerName = this.userData?.name || 'Someone'; // Use the stored name
        announcement.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
            <div>${playerName} just upgraded the billboard!</div>
            <div style="font-size: 24px; margin-top: 20px; color: #ffd700;">Premium Sponsor</div>
            <div style="font-size: 16px; margin-top: 40px; color: #ccc;">Focus on billboard in 3 seconds...</div>
        `;

        document.body.appendChild(announcement);

        // Remove announcement after 5 seconds, then force camera focus
        setTimeout(() => {
            announcement.remove();
            window.dispatchEvent(new CustomEvent('forceBillboardFocus'));
        }, 5000);
    }

    cleanup() {
        if (this.checkProximityInterval) {
            clearInterval(this.checkProximityInterval);
        }
        if (this.menuButton) {
            this.menuButton.remove();
        }
    }
}
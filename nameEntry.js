/**
 * Handles the name entry and ball selection flow after device selection
 */

export class NameEntrySystem {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.selectedColor = '#ff3366'; // Default pink
        this.selectedBallType = 'default'; // 'default' or 'premium'
        this.countryCode = 'NG'; // Default Nigeria
        this.createUI();
        this.detectCountry();
    }

    createUI() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'nameEntryModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
        `;

        // Create content container
        const content = document.createElement('div');
        content.style.cssText = `
            background: rgba(20, 20, 20, 0.9);
            padding: 40px;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            max-width: 500px;
            width: 90%;
        `;

        content.innerHTML = `
            <h2 style="font-size: 28px; margin-bottom: 10px;">Welcome to the Space!</h2>
            <p style="font-size: 14px; color: #ccc; margin-bottom: 30px;">Enter your details to join</p>
            
            <div style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 8px; text-align: left; font-size: 14px; font-weight: bold;">Your Name / Alias</label>
                <input type="text" id="playerNameInput" maxlength="20" placeholder="Enter your name..." 
                    style="width: 100%; padding: 12px; font-size: 16px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.3); 
                    background: rgba(0,0,0,0.5); color: white; outline: none;">
            </div>

            <div style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 8px; text-align: left; font-size: 14px; font-weight: bold;">Ball Color</label>
                <div id="colorPicker" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                    ${this.generateColorOptions()}
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 8px; text-align: left; font-size: 14px; font-weight: bold;">Ball Type</label>
                <div style="display: flex; gap: 10px;">
                    <button id="defaultBallBtn" class="ball-type-btn" style="flex: 1; padding: 15px; font-size: 14px; 
                        background: #007bff; color: white; border: 2px solid #007bff; border-radius: 8px; cursor: pointer;">
                        Default (Free)
                    </button>
                    <button id="premiumBallBtn" class="ball-type-btn" style="flex: 1; padding: 15px; font-size: 14px; 
                        background: rgba(255,215,0,0.2); color: white; border: 2px solid #ffd700; border-radius: 8px; cursor: pointer;">
                        Premium 3D ✨
                    </button>
                </div>
                <p id="premiumNote" style="font-size: 12px; color: #ffd700; margin-top: 8px; display: none;">
                    Premium balls are unlocked after purchase
                </p>
            </div>

            <div style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 8px; text-align: left; font-size: 14px; font-weight: bold;">Country</label>
                <select id="countrySelect" style="width: 100%; padding: 12px; font-size: 16px; border-radius: 8px; 
                    border: 2px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.5); color: white; outline: none;">
                    ${this.generateCountryOptions()}
                </select>
            </div>

            <button id="joinSpaceBtn" style="width: 100%; padding: 15px; font-size: 18px; font-weight: bold; 
                background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; 
                transition: background 0.2s;">
                Join Space
            </button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add event listeners
        this.setupEventListeners();
    }

    generateColorOptions() {
        const colors = [
            '#ff3366', '#3366ff', '#33ff66', '#ffff33', '#ff33ff', '#33ffff',
            '#ff6633', '#6633ff', '#33ff99', '#ff9933', '#9933ff', '#ffffff'
        ];

        return colors.map(color => `
            <div class="color-option" data-color="${color}" style="
                width: 50px; 
                height: 50px; 
                border-radius: 50%; 
                background: ${color}; 
                cursor: pointer; 
                border: 3px solid ${color === this.selectedColor ? 'white' : 'transparent'};
                transition: transform 0.2s, border 0.2s;
            "></div>
        `).join('');
    }

    generateCountryOptions() {
        const countries = [
            { code: 'NG', name: 'Nigeria' },
            { code: 'US', name: 'United States' },
            { code: 'GB', name: 'United Kingdom' },
            { code: 'CA', name: 'Canada' },
            { code: 'GH', name: 'Ghana' },
            { code: 'ZA', name: 'South Africa' },
            { code: 'KE', name: 'Kenya' },
            { code: 'FR', name: 'France' },
            { code: 'DE', name: 'Germany' },
            { code: 'IN', name: 'India' },
            { code: 'BR', name: 'Brazil' },
            { code: 'JP', name: 'Japan' },
            { code: 'CN', name: 'China' },
            { code: 'AU', name: 'Australia' }
        ];

        return countries.map(country => `
            <option value="${country.code}" ${country.code === this.countryCode ? 'selected' : ''}>
                ${country.name}
            </option>
        `).join('');
    }

    setupEventListeners() {
        // Color selection
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                colorOptions.forEach(opt => opt.style.border = '3px solid transparent');
                e.target.style.border = '3px solid white';
                this.selectedColor = e.target.dataset.color;
            });

            option.addEventListener('mouseenter', (e) => {
                e.target.style.transform = 'scale(1.1)';
            });

            option.addEventListener('mouseleave', (e) => {
                e.target.style.transform = 'scale(1)';
            });
        });

        // Ball type selection
        const defaultBtn = document.getElementById('defaultBallBtn');
        const premiumBtn = document.getElementById('premiumBallBtn');
        const premiumNote = document.getElementById('premiumNote');

        defaultBtn.addEventListener('click', () => {
            this.selectedBallType = 'default';
            defaultBtn.style.background = '#007bff';
            defaultBtn.style.borderColor = '#007bff';
            premiumBtn.style.background = 'rgba(255,215,0,0.2)';
            premiumBtn.style.borderColor = '#ffd700';
            premiumNote.style.display = 'none';
        });

        premiumBtn.addEventListener('click', () => {
            // Check if user has purchased premium balls
            const hasPremium = localStorage.getItem('premiumBalls') === 'true';
            
            if (hasPremium) {
                this.selectedBallType = 'premium';
                premiumBtn.style.background = '#ffd700';
                premiumBtn.style.borderColor = '#ffd700';
                defaultBtn.style.background = 'rgba(0,123,255,0.2)';
                defaultBtn.style.borderColor = '#007bff';
                premiumNote.style.display = 'none';
            } else {
                // Show purchase option
                premiumNote.style.display = 'block';
                premiumNote.innerHTML = '⚠️ Premium balls require payment. <a href="#" id="buyPremiumLink" style="color: #ffd700; text-decoration: underline;">Buy Now</a>';
                
                document.getElementById('buyPremiumLink')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showPremiumPurchase();
                });
            }
        });

        // Country selection
        document.getElementById('countrySelect').addEventListener('change', (e) => {
            this.countryCode = e.target.value;
        });

        // Join button
        document.getElementById('joinSpaceBtn').addEventListener('click', () => {
            this.handleJoin();
        });

        // Enter key on name input
        document.getElementById('playerNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleJoin();
            }
        });
    }

    handleJoin() {
        const nameInput = document.getElementById('playerNameInput');
        const name = nameInput.value.trim();

        if (!name) {
            nameInput.style.borderColor = '#ff3366';
            nameInput.placeholder = 'Name is required!';
            return;
        }

        if (name.length < 2) {
            nameInput.style.borderColor = '#ff3366';
            alert('Name must be at least 2 characters long');
            return;
        }

        // Remove modal
        document.getElementById('nameEntryModal')?.remove();

        // Call completion callback
        this.onComplete({
            name,
            ballColor: this.selectedColor,
            ballType: this.selectedBallType,
            countryCode: this.countryCode
        });
    }

    async detectCountry() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            this.countryCode = data.country_code || 'NG';
            
            const countrySelect = document.getElementById('countrySelect');
            if (countrySelect) {
                countrySelect.value = this.countryCode;
            }
        } catch (error) {
            console.log('Could not detect country, using default (Nigeria)');
        }
    }

    showPremiumPurchase() {
        alert('Premium ball purchase feature coming soon!\nIntegration with Flutterwave/Paystack will be added.');
        // TODO: Implement payment integration
    }
}
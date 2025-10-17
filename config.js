/**
 * Centralized configuration file for the 3D Ball Social Space
 * Update these values according to your environment (development/production)
 */

export const CONFIG = {
    // =====================================================
    // SUPABASE CONFIGURATION
    // =====================================================
    SUPABASE: {
        URL: 'https://dornwmydtlrozontalmd.supabase.co', // Your URL has been added
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcm53bXlkdGxyb3pvbnRhbG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzY4NjgsImV4cCI6MjA3NjIxMjg2OH0.-GHaZetnOB1wVF5TzY09iA8s89cwDMDrGmg3mnyy_3M', // Your Anon Key has been added
        STORAGE_BUCKET: 'billboard-content'
    },

    // =====================================================
    // PAYMENT GATEWAY CONFIGURATION
    // =====================================================
    PAYMENT: {
        // Preferred gateway: 'flutterwave' or 'paystack'
        PREFERRED_GATEWAY: 'flutterwave',
        
        FLUTTERWAVE: {
            PUBLIC_KEY: 'YOUR_FLUTTERWAVE_PUBLIC_KEY', // Test: FLWPUBK_TEST-xxxxx, Live: FLWPUBK-xxxxx
            MODE: 'test' // 'test' or 'live'
        },
        
        PAYSTACK: {
            PUBLIC_KEY: 'YOUR_PAYSTACK_PUBLIC_KEY', // Test: pk_test_xxxxx, Live: pk_live_xxxxx
            MODE: 'test' // 'test' or 'live'
        }
    },

    // =====================================================
    // ROOM CONFIGURATION
    // =====================================================
    ROOM: {
        MAX_PLAYERS: 25, // Maximum players per room
        RESET_HOURS: 12, // Room resets every 12 hours
        INACTIVE_TIMEOUT: 120000, // Kick after 2 minutes (in milliseconds)
        POSITION_UPDATE_INTERVAL: 100 // Update position every 100ms
    },

    // =====================================================
    // BILLBOARD CONFIGURATION
    // =====================================================
    BILLBOARD: {
        MAIN: {
            MIN_BID: 100, // Minimum bid in Naira
            PREMIUM_THRESHOLD: 10000, // ₦10k for special announcement
            MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB in bytes
            FOCUS_DURATION: 20000, // Premium announcement duration (20 seconds)
            RESET_HOURS: 12 // Billboard resets every 12 hours
        },
        
        WALL: {
            BASE_PRICE: 1000, // ₦1,000 per upload
            MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB for wall billboards
            SLIDESHOW_INTERVAL: 5000, // 5 seconds per image
            MAX_IMAGES_PER_WALL: 10 // Maximum images in slideshow
        },
        
        ALLOWED_FORMATS: {
            IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
            VIDEO: ['video/mp4', 'video/webm']
        }
    },

    // =====================================================
    // PLAYER CONFIGURATION
    // =====================================================
    PLAYER: {
        DEFAULT_BALL_COLOR: '#ff3366',
        BALL_RADIUS: 1.2,
        
        MOVEMENT: {
            ACCELERATION: 0.012,
            SPRINT_ACCELERATION: 0.024,
            DAMPING: 0.96,
            JUMP_STRENGTH: 0.5,
            GRAVITY: 0.02
        },
        
        PREMIUM_BALLS: {
            PRICE: 5000, // ₦5,000 for premium balls
            GLB_MODELS: [
                // Add your 3D ball model URLs here
                // { id: 'soccer', name: 'Soccer Ball', url: 'models/soccer.glb', price: 5000 },
                // { id: 'basketball', name: 'Basketball', url: 'models/basketball.glb', price: 5000 },
            ]
        }
    },

    // =====================================================
    // CAMERA CONFIGURATION
    // =====================================================
    CAMERA: {
        DESKTOP_DISTANCE: 25,
        MOBILE_DISTANCE: 12,
        MIN_DISTANCE: 8,
        MAX_DISTANCE: 50,
        FOV: 75,
        AUTO_ROTATE_SPEED: 0.02,
        LERP_FACTOR: 0.08
    },

    // =====================================================
    // CHAT CONFIGURATION
    // =====================================================
    CHAT: {
        MAX_LENGTH: 50, // Maximum characters per message
        BUBBLE_DURATION: 10000, // 10 seconds
        RATE_LIMIT: {
            MAX_MESSAGES: 10, // Maximum messages
            WINDOW: 60000 // Per 60 seconds (1 minute)
        }
    },

    // =====================================================
    // UI CONFIGURATION
    // =====================================================
    UI: {
        SYSTEM_MESSAGE_DURATION: 5000, // 5 seconds
        LOADING_TEXT: 'Loading...',
        CONNECTING_TEXT: 'Connecting to space...',
        
        COLORS: {
            PRIMARY: '#007bff',
            SUCCESS: '#28a745',
            DANGER: '#ff3366',
            WARNING: '#ffd700',
            DARK: 'rgba(0, 0, 0, 0.8)'
        }
    },

    // =====================================================
    // MODERATION CONFIGURATION
    // =====================================================
    MODERATION: {
        AUTO_FLAG_THRESHOLD: 3, // Auto-flag content after 3 reports
        BAN_DURATION: 86400000, // 24 hours in milliseconds
        
        BLOCKED_WORDS: [
            // Add your blocked words here
            // These should be filtered from chat messages
        ],
        
        REPORT_CATEGORIES: [
            'harassment',
            'inappropriate_content',
            'spam',
            'other'
        ]
    },

    // =====================================================
    // PERFORMANCE CONFIGURATION
    // =====================================================
    PERFORMANCE: {
        GRAPHICS_QUALITY: {
            LOW: {
                shadowMapSize: 512,
                antialias: false,
                fog: false
            },
            MEDIUM: {
                shadowMapSize: 1024,
                antialias: true,
                fog: true
            },
            HIGH: {
                shadowMapSize: 2048,
                antialias: true,
                fog: true
            }
        },
        
        AUTO_DETECT_QUALITY: true, // Automatically detect device capability
        TARGET_FPS: 60,
        MAX_REMOTE_PLAYERS_RENDERED: 24 // Don't render more than this for performance
    },

    // =====================================================
    // ANALYTICS CONFIGURATION
    // =====================================================
    ANALYTICS: {
        ENABLED: true,
        TRACK_EVENTS: {
            JOIN: true,
            LEAVE: true,
            CHAT: true,
            BILLBOARD_UPLOAD: true,
            PAYMENT: true
        }
    },

    // =====================================================
    // DEVELOPMENT/DEBUG CONFIGURATION
    // =====================================================
    DEBUG: {
        ENABLED: false, // Set to true during development
        LOG_POSITION_UPDATES: false,
        LOG_PLAYER_EVENTS: false,
        LOG_PAYMENT_EVENTS: false,
        SHOW_FPS: false,
        SKIP_PAYMENTS: false // For testing without real payments
    },

    // =====================================================
    // ENVIRONMENT DETECTION
    // =====================================================
    get IS_PRODUCTION() {
        return window.location.hostname !== 'localhost' && 
               window.location.hostname !== '127.0.0.1';
    },

    get IS_MOBILE() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get configuration value with fallback
 */
export function getConfig(path, fallback = null) {
    const keys = path.split('.');
    let value = CONFIG;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return fallback;
        }
    }
    
    return value !== undefined ? value : fallback;
}

/**
 * Validate configuration before starting app
 */
export function validateConfig() {
    const errors = [];
    
    // Check Supabase configuration
    if (!CONFIG.SUPABASE.URL || CONFIG.SUPABASE.URL === 'YOUR_SUPABASE_URL') {
        errors.push('Supabase URL not configured');
    }
    
    if (!CONFIG.SUPABASE.ANON_KEY || CONFIG.SUPABASE.ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        errors.push('Supabase Anon Key not configured');
    }
    
    // Check payment configuration (at least one gateway)
    const flutterwaveConfigured = CONFIG.PAYMENT.FLUTTERWAVE.PUBLIC_KEY && 
                                   CONFIG.PAYMENT.FLUTTERWAVE.PUBLIC_KEY !== 'YOUR_FLUTTERWAVE_PUBLIC_KEY';
    
    const paystackConfigured = CONFIG.PAYMENT.PAYSTACK.PUBLIC_KEY && 
                               CONFIG.PAYMENT.PAYSTACK.PUBLIC_KEY !== 'YOUR_PAYSTACK_PUBLIC_KEY';
    
    if (!flutterwaveConfigured && !paystackConfigured) {
        errors.push('No payment gateway configured (Flutterwave or Paystack required)');
    }
    
    if (errors.length > 0) {
        console.error('❌ Configuration Errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        
        if (!CONFIG.DEBUG.ENABLED) {
            throw new Error('Configuration validation failed. Please check console for details.');
        }
    } else {
        console.log('✅ Configuration validated successfully');
    }
    
    return errors.length === 0;
}

/**
 * Log configuration status (for debugging)
 */
export function logConfigStatus() {
    if (!CONFIG.DEBUG.ENABLED) return;
    
    console.group('🔧 Configuration Status');
    console.log('Environment:', CONFIG.IS_PRODUCTION ? 'Production' : 'Development');
    console.log('Supabase URL:', CONFIG.SUPABASE.URL);
    console.log('Payment Gateway:', CONFIG.PAYMENT.PREFERRED_GATEWAY);
    console.log('Max Players:', CONFIG.ROOM.MAX_PLAYERS);
    console.log('Mobile Device:', CONFIG.IS_MOBILE);
    console.groupEnd();
}

// Auto-validate on import (only in non-production)
if (!CONFIG.IS_PRODUCTION && CONFIG.DEBUG.ENABLED) {
    validateConfig();
    logConfigStatus();
}
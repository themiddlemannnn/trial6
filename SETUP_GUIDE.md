# 3D Ball Social Space - Complete Setup Guide

## 🎯 Overview
This guide will walk you through setting up your 3D multiplayer social space with Supabase backend and payment integration.

---

## 📁 Required Files Structure

```
your-project/
├── index.html (✅ existing - updated)
├── style.css (✅ existing)
├── main.js (✅ existing - updated)
├── player.js (✅ existing)
├── sceneSetup.js (✅ existing)
├── ui.js (✅ existing)
├── mobile.js (✅ existing)
├── controls.js (you have this)
├── mobile-controls.js (you have this)
├── ai.js (you have this)
├── collisions.js (you have this)
├── supabase.js (⭐ NEW - created)
├── nameEntry.js (⭐ NEW - created)
├── billboardManager.js (⭐ NEW - created)
├── payments.js (⭐ NEW - created)
└── schema.sql (⭐ NEW - created)
```

---

## 🚀 Step-by-Step Setup

### Step 1: Set Up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project"
   - Create a new organization and project
   - Choose a region close to Nigeria (e.g., Frankfurt or London)
   - Wait for project to be provisioned

2. **Run the Database Schema**
   - Go to your Supabase Dashboard
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"
   - Copy the entire contents of `schema.sql` file I created
   - Paste it into the editor
   - Click "Run" to execute the schema
   - You should see "Success. No rows returned"

3. **Set Up Storage Bucket**
   - Go to "Storage" in the left sidebar
   - Click "New bucket"
   - Name it: `billboard-content`
   - Make it **Public**
   - Set file size limit: 52428800 bytes (50MB)
   - Under "Allowed MIME types", add: `image/*`, `video/*`
   - Click "Create bucket"

4. **Get Your Credentials**
   - Go to "Project Settings" (gear icon)
   - Click "API" in the settings menu
   - Copy your:
     - **Project URL** (looks like: `https://xxxxx.supabase.co`)
     - **Anon/Public Key** (starts with `eyJ...`)

5. **Update `supabase.js`**
   ```javascript
   const SUPABASE_URL = 'your-project-url-here';
   const SUPABASE_ANON_KEY = 'your-anon-key-here';
   ```

---

### Step 2: Set Up Payment Gateways

#### Option A: Flutterwave Setup

1. **Create Flutterwave Account**
   - Go to [flutterwave.com](https://flutterwave.com)
   - Sign up for a business account
   - Complete KYC verification

2. **Get API Keys**
   - Go to Dashboard → Settings → API
   - Copy your **Public Key** (Test mode for development)
   - Update `payments.js`:
   ```javascript
   const FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST-xxxxx';
   ```

3. **Configure Webhook (Optional but Recommended)**
   - In Flutterwave Dashboard → Settings → Webhooks
   - Add your webhook URL: `https://your-backend-api.com/webhook/flutterwave`
   - This helps verify payments server-side

#### Option B: Paystack Setup

1. **Create Paystack Account**
   - Go to [paystack.com](https://paystack.com)
   - Sign up and verify your business

2. **Get API Keys**
   - Go to Settings → API Keys & Webhooks
   - Copy your **Public Key** (Test mode)
   - Update `payments.js`:
   ```javascript
   const PAYSTACK_PUBLIC_KEY = 'pk_test_xxxxx';
   ```

3. **Configure Webhook**
   - Add webhook URL in Paystack dashboard
   - This ensures payment verification

---

### Step 3: Update Your Existing Files

#### Update `index.html`
Add these script imports before the closing `</body>` tag:

```html
<!-- Add these BEFORE your existing scripts -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://checkout.flutterwave.com/v3.js"></script>
<script src="https://js.paystack.co/v1/inline.js"></script>

<!-- Your existing scripts -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script type="module" src="main.js"></script>
```

#### Update `player.js`
Add a constructor parameter for ball color:

```javascript
// Change the constructor signature
constructor(scene, startPos, ballColor = 0xff3366) {
    this.scene = scene;
    
    // ... existing code ...
    
    // Update ball material creation
    const material = new THREE.MeshStandardMaterial({ 
        color: ballColor,  // Use the passed color instead of hardcoded
        roughness: 0.3, 
        metalness: 0.4 
    });
    
    // ... rest of the code stays the same ...
}
```

---

### Step 4: Testing Your Setup

#### Local Testing

1. **Install a Local Server**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js
   npx http-server -p 8000
   ```

2. **Open in Browser**
   - Navigate to `http://localhost:8000`
   - Open browser console (F12) to check for errors

3. **Test Flow**
   - Select device type (Desktop/Mobile)
   - Enter your name and select ball color
   - Check if you join the room successfully
   - Open another browser tab/window
   - Join with a different name
   - Verify you see both players

#### What to Test

✅ **Device Selection**: Modal appears on load  
✅ **Name Entry**: Can enter name and select color  
✅ **Room Connection**: "Connected to Room" message appears  
✅ **Player Count**: Shows correct number (1, 2, 3...)  
✅ **Movement Sync**: Other players move when they move  
✅ **Chat**: Messages appear above balls  
✅ **Billboard Menu**: Button appears near billboard  

---

### Step 5: Important Considerations

#### Security Notes

⚠️ **CRITICAL**: The payment verification in `payments.js` currently runs on the client side, which is **NOT SECURE** for production.

**You MUST create a backend service** to:
1. Verify Flutterwave/Paystack payments
2. Confirm payment amounts
3. Update Supabase after verification

**Recommended Backend Setup:**
- Use Supabase Edge Functions (serverless)
- Or deploy a simple Node.js/Python API
- Handle webhook callbacks from payment gateways

Example Node.js verification endpoint:
```javascript
// backend/verify-payment.js
app.post('/verify-flutterwave', async (req, res) => {
  const { transaction_id, tx_ref } = req.body;
  
  // Call Flutterwave verification API
  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
    {
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`
      }
    }
  );
  
  const data = await response.json();
  
  if (data.status === 'success' && data.data.status === 'successful') {
    // Update Supabase
    // Return success
    res.json({ verified: true });
  } else {
    res.json({ verified: false });
  }
});
```

#### Performance Optimization

1. **Position Update Throttling**
   - Currently updates every 100ms (10 times/second)
   - Adjust `POSITION_UPDATE_INTERVAL` in `main.js` if needed

2. **Player Cleanup**
   - Inactive players auto-removed after 2 minutes
   - Adjust in Supabase function `cleanup_inactive_players()`

3. **Room Capacity**
   - Set to 25 players per room
   - Change `MAX_PLAYERS_PER_ROOM` in `supabase.js`

---

### Step 6: Deployment

#### Frontend Deployment (Netlify/Vercel)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy on Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import from Git"
   - Select your repository
   - Build settings: Leave empty (static site)
   - Click "Deploy"

3. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Click "Deploy"

#### Custom Domain (Optional)

1. Buy domain (Namecheap, GoDaddy, etc.)
2. In Netlify/Vercel, add custom domain
3. Update DNS records as instructed

---

### Step 7: Production Checklist

Before going live:

- [ ] Replace Supabase test keys with production keys
- [ ] Switch Flutterwave/Paystack to LIVE mode keys
- [ ] Set up backend payment verification
- [ ] Configure webhook URLs for payment gateways
- [ ] Test payments with small amounts
- [ ] Set up Supabase Row Level Security properly
- [ ] Enable Supabase realtime for all tables
- [ ] Set up monitoring/logging
- [ ] Add error tracking (Sentry, LogRocket)
- [ ] Test on multiple devices
- [ ] Optimize assets (compress videos/images)
- [ ] Add privacy policy and terms of service
- [ ] Set up content moderation system

---

## 🔧 Advanced Features to Add

### 1. Wall Billboards
Create `wallBillboards.js`:
```javascript
// Similar to billboardManager.js but for wall-mounted billboards
// Slideshow rotation with multiple contributors
// ₦1,000 base price
```

### 2. Country Flag Display
Install flag icon library:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@6.6.6/css/flag-icons.min.css"/>
```

Update `createNameLabel()` in `ui.js` to include flag emoji.

### 3. Emote System
Add to `player.js`:
```javascript
showEmote(emoji) {
    // Create large emoji sprite above player
    // Animate with bounce effect
    // Auto-remove after 3 seconds
}
```

### 4. Report System
Create `moderation.js`:
```javascript
// Report inappropriate content
// Block/mute players
// Admin dashboard for reviewing reports
```

### 5. Analytics Dashboard
Track:
- Daily active users
- Billboard revenue
- Average session time
- Popular times/days

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module errors"
**Solution**: Ensure all import paths are correct and files exist

### Issue: Supabase connection fails
**Solution**: 
- Check your Project URL and Anon Key
- Verify Supabase project is active
- Check browser console for CORS errors

### Issue: Players not syncing
**Solution**:
- Enable Realtime in Supabase (Database → Replication)
- Check RLS policies allow reads/writes
- Verify `subscribeToPlayers()` is being called

### Issue: Payment modal doesn't appear
**Solution**:
- Check payment script loaded (view Network tab)
- Verify public keys are correct
- Check for JavaScript errors in console

### Issue: Videos not playing
**Solution**:
- Use supported formats (MP4, WebM)
- Videos must have user interaction to autoplay
- Check file size (<50MB)

---

## 📊 Monitoring & Maintenance

### Daily Tasks
- Check Supabase database size
- Review error logs
- Monitor payment transactions
- Check for inappropriate content

### Weekly Tasks
- Backup database
- Review analytics
- Update content moderation rules
- Check server costs

### Monthly Tasks
- Security audit
- Performance optimization
- Feature updates based on user feedback
- Payment reconciliation

---

## 💰 Cost Estimation (Monthly)

**Supabase** (Free tier):
- Database: Free up to 500MB
- Bandwidth: Free up to 5GB
- Realtime: Free up to 200 concurrent connections

**Upgrade needed when**:
- $25/month (Pro): 8GB database, 50GB bandwidth
- $599/month (Team): More resources, priority support

**Hosting** (Netlify/Vercel):
- Free for most projects
- Bandwidth: ~100GB free/month

**Payment Gateway Fees**:
- Flutterwave: 1.4% per transaction
- Paystack: 1.5% per transaction (+₦100 for local cards)

**Example Revenue Scenario**:
- 100 billboard uploads/day at avg ₦5,000 = ₦500,000/day
- Payment fees (1.5%): ₦7,500/day
- Net revenue: ₦492,500/day
- Monthly: ~₦14.7M (minus hosting ~₦50k)

---

## 🎉 Next Steps After Setup

1. **Test Everything Thoroughly**
   - Multiple devices
   - Different browsers
   - Various network speeds

2. **Gather Feedback**
   - Soft launch with friends
   - Fix bugs and improve UX
   - Iterate based on feedback

3. **Marketing**
   - Social media presence
   - Nigerian tech communities
   - University campuses
   - WhatsApp groups

4. **Scale Gradually**
   - Monitor server costs
   - Optimize database queries
   - Add CDN for media files
   - Consider load balancing

---

## 📞 Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Three.js Docs**: https://threejs.org/docs
- **Flutterwave Docs**: https://developer.flutterwave.com
- **Paystack Docs**: https://paystack.com/docs

---

## ✅ Quick Verification Checklist

Before considering setup complete:

```
[ ] Supabase project created and schema deployed
[ ] Storage bucket created with correct permissions
[ ] Supabase credentials added to supabase.js
[ ] Payment gateway account created (Flutterwave/Paystack)
[ ] Payment public keys added to payments.js
[ ] All new files created and added to project
[ ] main.js updated with multiplayer code
[ ] player.js updated with color parameter
[ ] index.html updated with script imports
[ ] Local server running successfully
[ ] Can select device type
[ ] Can enter name and select ball color
[ ] Players sync across multiple browser tabs
[ ] Chat messages appear
[ ] Billboard menu appears
[ ] No console errors
```

---

Good luck with your 3D Ball Social Space! 🎊
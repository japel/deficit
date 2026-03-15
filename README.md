# Diet Dashboard PWA

Personal diet tracking Progressive Web App for weight loss with meal planning and macro targets.

## Features

- 🌓 **Dark Mode** - Toggle between light and dark themes
- 📱 **PWA Support** - Install as a mobile app
- 📊 **Weight Tracking** - Track progress with visual graphs
- 🍽️ **Meal Planning** - 4-week rotating meal plan
- 👥 **Household Mode** - Separate tracking for husband and wife with portion calculations
- 💾 **Offline Support** - Works without internet connection
- 📈 **Macro Tracking** - Monitor protein, fat, and carb intake
- 🏦 **Calorie Bank** - Track remaining daily calories

## Setup

### 1. Generate PWA Icons

**Option A: Using Browser (Easiest)**
1. Open `generate-icons.html` in your browser
2. Download all 4 icons by clicking each download button
3. Place the PNG files in the project root folder

**Option B: Using Node.js**
```bash
npm install canvas
node create-icons.js
```

### 2. Deploy

The app needs to be served over HTTPS for PWA installation to work. Options:

**GitHub Pages:**
```bash
# Push to GitHub
git add .
git commit -m "Add PWA icons"
git push origin master

# Enable GitHub Pages in repository settings
# Set source to "master" branch
```

**Local Testing with HTTPS:**
```bash
# Using Python
python3 -m http.server 8000

# Using npx
npx http-server -p 8000
```

Then access via `http://localhost:8000`

**Deploy to production:**
- Vercel: `vercel --prod`
- Netlify: Drag & drop the folder
- GitHub Pages: Enable in repository settings

### 3. Install as PWA

**Android Chrome:**
1. Visit the deployed URL
2. Tap the menu (⋮) → "Add to Home Screen"
3. Confirm installation

**iOS Safari:**
1. Visit the deployed URL
2. Tap Share button → "Add to Home Screen"
3. Confirm

## Project Structure

```
diet/
├── index.html              # Main app
├── app.js                  # Application logic
├── sw.js                   # Service worker
├── manifest.json           # PWA manifest
├── icon-192.png           # App icon (192x192)
├── icon-512.png           # App icon (512x512)
├── icon-maskable-192.png  # Maskable icon (192x192)
├── icon-maskable-512.png  # Maskable icon (512x512)
├── generate-icons.html    # Icon generator tool
└── create-icons.js        # Node.js icon generator
```

## Technologies

- **Vanilla JavaScript** - No framework dependencies
- **Tailwind CSS** - Utility-first styling
- **Service Worker** - Offline functionality
- **localStorage** - Data persistence
- **Canvas API** - Weight graph rendering

## User Profiles

**Husband:**
- Age: 40, Height: 173cm
- Weight: 83kg → 77kg (6kg loss)
- Calories: 1,550/day
- Timeline: 12 weeks

**Wife:**
- Age: 33, Height: 172cm
- Weight: 72kg → 68kg (4kg loss)
- Calories: 1,777/day
- Timeline: 8 weeks

## Features Detail

### Dark Mode
- Toggle with moon/sun icon in header
- Persisted to localStorage
- All components theme-aware including canvas graphs

### Household Portions
- Meals scaled by calorie ratio (47% / 53%)
- Separate tracking per user
- Shows total to cook + individual portions

### Calorie Banking
- Mark meals/snacks as eaten
- Add custom food items
- Real-time remaining calories

### Weight Tracking
- Daily weight entry
- Visual progress graph
- Statistics (total lost, remaining)
- Historical log with delete option

## License

Personal use project

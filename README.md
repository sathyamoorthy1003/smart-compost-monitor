# Smart Food-Waste-to-Compost Monitor — Website

A complete IoT product website for the Smart Compost Monitor project (Bengaluru Climate Project).

## 🌿 Features

- **Landing Page** — Professional product showcase with features, architecture, components, and testing plan
- **Live Dashboard** — Real-time sensor monitoring connected to Firebase Realtime Database
  - Temperature, Moisture, Humidity, Fan Status cards
  - Interactive Chart.js line chart (24-hour history)
  - Circular gauges
  - Alert history table
- **Fully Responsive** — Mobile-first design
- **Firebase Integration** — Real-time data from ESP32 via Firebase RTDB
- **Demo Mode** — Simulated data when Firebase has no readings

## 🚀 Deploy

### Netlify (Recommended)
1. Push this folder to a GitHub repository
2. Connect the repo to [Netlify](https://netlify.com)
3. Set publish directory to `/` (root of this folder)
4. Deploy!

### GitHub Pages
1. Push this folder to a GitHub repository
2. Go to Settings → Pages
3. Set source to `main` branch, root directory
4. Your site will be live at `https://username.github.io/repo-name/`

## 🔧 Configuration

### Firebase
Edit `js/firebase-config.js` to update your Firebase credentials.

### ESP32
The Arduino code (`food.ino`) needs to be updated to push data to Firebase.
Add the Firebase ESP32 library and write sensor data to a path like:
```
/compost/current/temp
/compost/current/hum
/compost/current/moisture
/compost/current/fan
```

## 📁 File Structure

```
smart-compost-website/
├── index.html          # Landing page
├── dashboard.html      # Live dashboard
├── css/
│   ├── style.css       # Main styles
│   └── dashboard.css   # Dashboard-specific styles
├── js/
│   ├── main.js         # Navigation & animations
│   ├── firebase-config.js  # Firebase credentials
│   └── dashboard.js    # Dashboard logic, charts, gauges
├── assets/             # Images (optional)
├── netlify.toml        # Netlify config
└── README.md           # This file
```

## 🛠 Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript
- Chart.js for data visualization
- Firebase Realtime Database (compat SDK)
- Font Awesome icons
- Google Fonts (Inter)


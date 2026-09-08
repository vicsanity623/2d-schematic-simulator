# 🌍 Elden Earth

A real-world geo-location territory-claiming and idle income game. Walk the real world, collect diamonds, spin the fortune wheel for Elden Bucks (EB), claim real 10×10 ft tiles beneath your feet, and earn simulated passive rent ($USD) every fraction of a second.

Built with **pure static HTML5 / CSS3 / Vanilla JS** — zero build step, no backend server required, and 100% hosted for free on GitHub Pages as a full **Progressive Web App (PWA)**.

---

## ✨ Implemented Core Features & Mechanics

* [x] **🔮 Realm Citadels & Dyson Sphere Territory Holds (Pokémon GO Style Gyms):** 
  * **$0.01 Capsule Drop:** Automatically rolls a Common (50%), Rare (30%), Epic (15%), or Legendary (5%) permanent Capsule upon reaching $\ge \$0.01$ balance.
  * **10X Colossal Monuments:** Plantable directly at your feet on any unowned parcel with real-time growth countdowns evolving into towering 10X tall glassmorphism monuments with nested rotating kinetic rings and ground stronghold parcels.
  * **Multiplayer Garrison Defense:** Station 3D avatars inside holds with live defense tickers (`05D : 12H : 23M : 02s`) and guaranteed hourly Diamond & EB harvesting (scaling up to 24 Diamonds + ~72 EB/day for Legendary).
  * **Reflex Meter Siege Duels:** Walk within 100m, spend 1 Diamond, and time your strike in the gold zone to shatter the defender's shield, dethrone them, and earn a **+5 EB Conquest Bounty** (defender keeps 100% of banked loot!).
  * **Anti-Abuse Proximity & Prerequisite Locks:** Players must have planted their own Citadel before launching sieges, and cannot attack any Citadel within **250 meters** of their own home Hold (friendly neighborhood treaty).
* [x] **⚡ Citadel Evolution & Upgrade Forge:**
  * **Ascension Progression:** Upgrade existing holds through **Common $\rightarrow$ Rare $\rightarrow$ Epic $\rightarrow$ Legendary**!
  * **Dual-Currency Forge:** Spend either **Elden Bucks (EB)** or **Diamonds (◆)** as an active walking sink (*50 EB / 75 ◆ for Rare, 100 EB / 125 ◆ for Epic, 300 EB / 400 ◆ for Legendary*).
  * **10-Minute Evolution Phase:** Triggers a live 10-minute transformation countdown with an auto-promoter that evolves the Citadel, updates visual kinetic rings and ground parcel borders, and unlocks upgraded hourly yields upon completion!
* [x] **🔋 High-Efficiency Battery & Thermal Optimization Suite:**
  * **5km Horizon Culling:** Dynamically culls all Citadels and player plot signboards further than 5,000 meters away, stopping the mobile CPU/GPU from computing thousands of matrix projections across distant states/countries.
  * **Dynamic Three.js Frame Throttling:** Caps idle character rendering at **15 FPS when stationary** (cutting GPU power by 75%) while ramping smoothly to **60 FPS when actively walking**.
  * **Background Sleep Controller:** Puts WebGL rendering, GPS polling, and interval timers to complete sleep (`0% GPU/CPU`) when the phone screen is locked or in a pocket.
  * **GPS Satellite Radio Sleep:** Uses `{ maximumAge: 5000 }` and a 1.5-meter movement threshold so the physical GPS chip powers down between pulses when stationary.
  * **Debounced Flash Storage (90% Disk I/O Reduction):** Buffers `localStorage.setItem` writes to 10-second intervals during normal rent generation, preventing continuous physical flash memory wear.
  * **Low-Power Mobile WebGL:** Disables MSAA (`antialias: false`), sets `fadeDuration: 0`, and routes rendering through mobile energy-efficiency cores (`powerPreference: "low-power"`).
* [x] **🏛️ 1% Weekly Realm Dividend Pool (Top 10 Global Landlords):**
  * Tracks live Total Global Lifetime Rent Accrued across all players worldwide.
  * Every Monday at 12:00 AM UTC, distributes a **1% Dividend Pool** to the Top 10 Global Landlords:
    * 🥇 1st: 25% | 🥈 2nd: 15% | 🥉 3rd: 10% (Top 3 split 50%)
    * 🏅 4th–10th: Split the remaining 50% (~7.14% each).
  * Features a side HUD countdown button, live treasury inspection modal, and automatic Monday celebration claim modal with tamper-proof ISO-week anti-duplicate locks.
* [x] **🔒 Single Active Session Lock & Instant Cloud Authority:**
  * Generates unique session tokens (`activeSessionId`) on every device.
  * If an account is opened on desktop while active on mobile, the background session immediately freezes saving and displays an **"Active on Another Device"** modal to eliminate data overwrites.
  * True Cloud Authority guarantees desktop and mobile load identical real-time progress.
* [x] **💎 Automated Diamond Extractor Base ($1.00 Upgrade Unlock):** 
  * Unlockable beacon for players owning **5+ connected plots** (Limit 1 per player) that automatically mines 1 Diamond every 10 minutes (holds up to 50 gems). 
  * Unlocks a dynamic **Level Upgrade Forge at $1.00+ balance** ($1.00, $2.00, etc.) that alternately expands storage capacity (50 $\rightarrow$ 51 $\rightarrow$ 52...) and reduces mining times!
* [x] **💵 Spendable Cash vs. Lifetime Accrued Rent Separation:**
  * **Spendable Cash (`state.cash`):** Used to purchase Extractor upgrades without penalizing your standing.
  * **Lifetime Accrued Rent (`state.lifetimeRent`):** Permanent, non-decreasing score that tracks all earnings generated since day one, powering the Passive Rent leaderboards and tie-breakers!
* [x] **🏆 Territory-Scoped Leaderboards (Atlas Earth Style):** 
  * 4-tier filtering tabs (🌐 Global, 🇺🇸 Country, 🏛️ State, 🏘️ City) displaying active royal titles (`⚔️ Lord of the Elden Realm`, `🦅 President`, `🏛️ Governor`, `👑 Mayor`) with 0ms in-memory cached switching.
  * **Live Offline Rent Simulation:** Accurately projects passive rent growth for offline players in real-time without corrupting save states.
  * **Unique Coordinate Set Deduplication:** Mathematically eliminates double-counting between local state and cloud syncs.
  * **Passive Rent Tie-Breakers:** Ties in plot counts are decisively resolved by highest Lifetime Accrued Rent!
* [x] **👑 3-Tier Political Leadership & Stackable Dividends:** Real-time leadership hierarchy based on parcel counts:
  * **👑 Mayors:** City / Town rulers earn **+2 EB (2%)** on local land purchases.
  * **🏛️ Governors:** State / Province rulers earn **+2 EB (2%)** on regional land purchases.
  * **🦅 Presidents:** Country rulers earn **+2 EB (2%)** on national land purchases.
  * **⚔️ Stackable Royalties:** Holding all 3 titles simultaneously unlocks a **+6 EB (6%) Triple Crown Royalty** deposited directly to Google Cloud saves!
* [x] **🎮 3D WebGL Engine & 60° Isometric Camera:** Powered by **MapLibre GL JS & OpenFreeMap** for unlimited, 100% free vector map loads with 60° isometric camera tilt, free 360° touch orbit gestures, and true 3D extruded city buildings with zero token rate-limits.
* [x] **💬 Real-Time Global Community Chat:** Slide-up mobile MMO chat drawer in the bottom bar with a 25-message live log, profanity filter, 4-second anti-spam cooldown, XSS sanitization, and unread notification badge.
* [x] **🧍 3D Animated Mixamo Characters (Three.js WebGL):** Integrated Three.js custom layer rendering upright, hero-scaled 3D character models (`.glb`) at real-time GPS coordinates with automatic `Idle` $\leftrightarrow$ `Walk` speed-based animation blending.
* [x] **⏳ Cinematic Slow-Motion 3D Loading Stage:** Auto-framed Three.js stage showcasing CesiumMan stepping forward in 40% slow motion with cyan/gold rim lighting behind the spinning diamond logo, with automatic WebGL context cleanup.
* [x] **🧭 True North Navigation & Compass Reset:** Dedicated compass button that smoothly animates camera bearing back to True North (0°) and restores default 18.5 zoom.
* [x] **📐 "Buy Land" Cinematic 2D Mode:** One-tap button that smoothly flies the camera from 60° 3D down to a flat 2D top-down view (`pitch: 0`), reveals the 10×10 ft grid strictly within reach, and allows precise land claims without building occlusions.
* [x] **👗 3D Wardrobe & Character Selector:** In-game wardrobe modal accessible via a gold **✎ Pencil** on the Player Info profile card, allowing players to hot-swap between multiple 3D models (`Soldier`, `Xbot`, `Fox`, `CesiumMan`, `Custom`).
* [x] **🎰 Hardware-Secured 100% Win Cryptographic Spin Wheel:** Provably fair spin wheel using the **Web Cryptography API (`window.crypto.getRandomValues`)** and modulo-bias-free rejection sampling. Features rare **+12 and +24 Diamond Mega Jackpots** and a ruby-red **Lucky 7 EB slice** with zero miss slices!
* [x] **🚶 3-Tier Proximity Diamond Spawning (1km Realm):** Generates diamonds across a full 1,000-meter radius (40% immediate reach within 85m, 35% walking distance up to 350m, 25% horizon exploration up to 1,000m) with a generous **25-minute lifetime** designed for real-world walks.
* [x] **⚡ Anti-Bot 20-Minute Boost Loop:** Floating `+2 EB` boost button appearing on a strict 20-minute cooldown locked to `state.lastBoostClaim` to prevent multi-tab and refresh abuse.
* [x] **🔥 Real-time Multiplayer Firestore Sync:** Live WebSocket streaming across all players worldwide to see newly claimed lands, plot rarities, and avatars in real time without refreshing.
* [x] **☁️ Firebase Cloud Saves & Anti-Exploit Security:** Permanent account backups stored in Google Cloud Firestore with strict document validation rules preventing console value manipulation and automatic session recovery for returning players.
* [x] **📅 30-Day Daily Login Calendar:** Strict 1-day-per-day streak check-in rewards scaling up to a **200 EB Jackpot on Day 30**.
* [x] **📱 Progressive Web App (PWA):** Installable directly to iOS & Android home screens with responsive 5-button flexbox controls, Android touch listeners, Brave Shields awareness, and network-first offline asset caching via `sw.js`.

---

## 🗺️ Master Development Roadmap

### 🔊 I. Sensory & Audiovisual Polish
* [ ] **1. Phase 4: Web Audio SFX & Mobile Haptics:** *(Next Priority)*
  * Synthesized crystal chimes when picking up diamonds.
  * Tactile phone vibration pulses when collecting gems or spinning the wheel.
  * Ticking clicks on the wheel and a royal trumpet fanfare on claiming land.
* [ ] **2. 🎉 Celebration Confetti & Screen Fireworks:**
  * Golden particle cascade across the screen when winning 25 EB / 50 EB or rolling a Legendary plot.
* [ ] **3. 🌙 Real-Time Day / Night & Weather Cycle:**
  * Dynamic lighting based on local sunrise/sunset—streetlights glow at night, with subtle rain/fog particle overlays.
* [ ] **4. 🧭 3D Dynamic Compass Rose:**
  * A mini compass dial on the HUD that rotates smoothly with device orientation / camera bearing.

---

### 🗺️ II. Map Exploration & World Features
* [x] **5. 🔮 Realm Citadels & Dyson Sphere Territory Holds:** *(Completed)*
* [ ] **6. 🎁 Tiered Mystery Chests on the Map:**
  * Bronze, Silver, and Golden chests spawning randomly that require keys or diamonds to open for big EB payouts.
* [ ] **7. 💎 Diamond Radar Compass Pointers:**
  * Subtle glowing arrows around the edge of your screen pointing toward off-screen diamonds so you know which street to walk down.
* [ ] **8. 🌈 Prismatic / Super Diamonds (1-in-50 Spawn):**
  * Rare iridescent rainbow crystals that award **+3 Diamonds** or an instant 2-hour boost potion when tapped.
* [ ] **9. 🧲 Diamond Magnet Boost Potion:**
  * A 15-minute consumable buff that doubles your collection reach to vacuum up all neighborhood diamonds without moving.

---

### 👑 III. Social, Multiplayer & Prestige
* [x] **10. 👑 Local Mayorship & Regional Dividends:** *(Completed)*
* [x] **11. 💬 Global Live Activity Feed:** *(Completed)*
* [x] **12. 🏆 Global & Local Leaderboards:** *(Completed)*
* [x] **13. 💬 In-Game Global Community Chat:** *(Completed)*
* [x] **14. ⚡ Citadel Evolution & Upgrade Forge:** *(Completed)*
* [x] **15. 🏛️ 1% Weekly Realm Dividend Pool:** *(Completed)*
* [ ] **16. 🤝 Player-to-Player Parcel Marketplace:**
  * Put owned plots up for sale on the open market for EB or trade tiles with friends.
* [ ] **17. 🛡️ Realm Guilds & Joint Kingdoms:**
  * Form alliances to connect plots into massive shared kingdoms with a communal Diamond Vault.
* [ ] **18. 🎟️ Referral / Friend Invite Code System:**
  * Share your code; when a friend claims their 5th plot, both of you get **+50 EB free**.

---

### 📅 IV. Retention & Daily Progression
* [x] **19. 📅 30-Day Daily Login Calendar:** *(Completed)*
* [ ] **20. 📜 Daily Quests & Weekly Bounties:**
  * 3 daily missions (*Collect 3 diamonds*, *Spin twice*, *Keep 30X active for 2 hrs*) rewarding bonus EB.
* [ ] **21. ⚡ "Blood Moon / Solar Flare" 50X Weekend Events:**
  * 24-hour weekend flash events where the boost multiplier temporarily jumps to **50X**.
* [ ] **22. 📈 Prestige Milestones & Player Leveling Track:**
  * Title ranks (*Novice, Baron, Count, Duke, Monarch*) that unlock golden avatar borders and exclusive profile emblems.
* [ ] **23. 🚶 Real-World Step Counter / Pedometer Sync:**
  * Awards passive EB for physical steps taken throughout the day (e.g. 1,000 steps = +5 EB).

---

### 🏰 V. Customization & Base Building
* [ ] **24. 🏰 3D Plot Landmarks & Monuments:**
  * Place 3D structures on owned land (Castles, Golden Trees, Neon Shrines) that grant a **+15% permanent income boost** to surrounding tiles.
* [ ] **25. 🎨 Parcel Ground Skins & Theme Customization:**
  * Customize how your owned plots look: Cyberpunk Grid, Medieval Cobblestone, Molten Lava, or Glacial Ice.
* [ ] **26. 🛂 Travel Passport & City Stamps:**
  * Collect digital passport stamps when claiming land in new cities; each badge gives an account-wide **+5% rent multiplier**.
* [ ] **27. 📦 Player Inventory & Item Bag:**
  * A clean inventory screen to manage boost potions, keys, cosmetic badges, and collectible relics.

---

## 📁 Repository Structure

```text
├── index.html          # Main application structure, modals, HUD & portrait guard
├── manifest.json       # PWA app configuration & home screen icons
├── sw.js               # Service Worker for local asset caching & offline play
├── css/
│   └── style.css       # Dark fantasy theme, animations, radar pulses & glowing borders
├── models/             # 3D GLTF / GLB Skeletal Character Models
│   ├── Soldier.glb     # Vanguard Soldier (Idle, Walk, Run)
│   ├── Xbot.glb        # X-Operative Android (Mixamo Rig)
│   ├── Fox.glb         # Low-Poly Spirit Fox (Survey, Walk)
│   ├── CesiumMan.glb   # Cesium Tracksuit Walker
│   └── character.glb   # Custom Champion
└── js/
    ├── config.js       # Central tuning file (rates, drop weights, radiuses, Firebase keys)
    ├── geo.js          # Web Mercator math, 3-tier proximity diamond spawner, tile bounds
    ├── storage.js      # Save engine, Firestore cloud sync, offline progress & lifetimeRent
    ├── auth.js         # Google Identity Services OAuth & instant auto-login session restore
    ├── loading.js      # 3D slow-motion stage, bootloader pipeline & zero-race condition loader
    ├── character.js    # Three.js WebGL custom layer & frame-throttled speed animation controller
    ├── diamonds.js     # MapLibre 3D markers, viewport culling & flying gem arc particle to HUD
    ├── grid.js         # 10x10ft tile rendering, 5km horizon culling, flood-fill clustering
    ├── wheel.js        # GPU-accelerated CSPRNG wheel with 3D gems & failsafe timer
    ├── feed.js         # Live activity feed ticker with dedicated event broadcasting
    ├── leaderboard.js  # 4-tier scoped leaderboards with offline rent simulation & tie-breakers
    ├── foliage.js      # Standing grass tufts & zero-context pre-rendered 3D mushrooms
    ├── chat.js         # Real-time community global chat drawer with moderation & anti-spam
    ├── citadels.js     # 3D Dyson Sphere monuments, 5km horizon culling, forge upgrades & siege combat
    ├── pool.js         # 1% Weekly Realm Treasury Dividend Pool engine & Monday distribution
    └── main.js         # Game loop, GPS power-saving controller, camera transitions & UI wiring
```

---

## 🚀 How to Host on GitHub Pages

1. **Create a GitHub repository** (public or private) and upload all project files preserving the folder structure.
2. In your repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, choose `main` (or default branch), and select folder `/ (root)`.
4. Click **Save**. GitHub Pages will deploy your game at `https://yourusername.github.io/your-repo/`.
5. Open the link on your phone. Tap **Share → Add to Home Screen** on iOS or **Install App** on Android to play in full-screen standalone mode.

---

## 🔑 Optional: Enable Google Sign-In & Firebase Cloud Saves

By default, the game offers instant on-device Guest mode with persistent saves. To enable **Google Sign-In & Firebase Cloud Saves**:

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials) and create an **OAuth 2.0 Client ID** (Authorized origin: `https://yourusername.github.io`).
2. Copy your Client ID into `js/config.js`:
   ```javascript
   GOOGLE_CLIENT_ID: "your-id-here.apps.googleusercontent.com",
   ```
3. Create a free project at [firebase.google.com](https://firebase.google.com), enable **Firestore Database**, and paste your config keys into `js/config.js`:
   ```javascript
   FIREBASE_CONFIG: {
     apiKey: "YOUR_API_KEY",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-app",
     // ...
   }
   ```
4. Commit and push. Your game will now auto-save progress to the cloud and sync multiplayer territories live worldwide!

---

## ⚙️ Game Balance & Plot Rarities

All gameplay tuning parameters are centralized in **`js/config.js`**:

| Rarity | Drop Chance | Rent per Second | Color |
| :--- | :---: | :---: | :---: |
| **Common** | **50%** | `$0.0000000011/s` | Slate Grey (`#8fa3b8`) |
| **Rare** | **30%** | `$0.0000000160/s` | Cyan Blue (`#4f9dd6`) |
| **Epic** | **15%** | `$0.0000000220/s` | Royal Purple (`#a86ee0`) |
| **Legendary** | **5%** | `$0.0000000440/s` | Radiant Gold (`#e0a84f`) |

---

## 👥 3D Assets & Model Attributions

* **Character Models:** Mixamo / Adobe (CC0 / Royalty Free Standard)
* **CesiumMan & Xbot:** Khronos Group & Three.js Official Samples
* **Grass Yellowing:** Steve B [CC-BY] via Poly Pizza
* **White Dandelions:** Aeres Vistaas [CC-BY] via Poly Pizza
* **Pine Tree & Autumn Foliage:** Quaternius [CC0]
* **Mushrooms:** Jarlan Perez [CC-BY] via Poly Pizza
* **Tower / Landmark:** Anonymous [CC-BY] via Poly Pizza
* **Twisted Tree & Bushes:** Quaternius [CC0]

---

## 📄 License & Disclaimer

This is a personal, open-source fan implementation of real-world grid collection games. Built from scratch with pure web standards for educational and entertainment purposes.
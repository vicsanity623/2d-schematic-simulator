// ============================================================
// Elden Earth — save data (Local + Firebase Cloud Sync)
// ============================================================
const Store = (() => {
  const KEY = "eldenEarth.save.v1";
  let db = null;
  const localSessionId = "sess_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let isSessionPaused = false;

  function getDb() {
    if (db) return db;
    try {
      if (typeof firebase !== "undefined" && CONFIG.FIREBASE_CONFIG && CONFIG.FIREBASE_CONFIG.apiKey) {
        if (!firebase.apps.length) {
          firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        }
        db = firebase.firestore();
      }
    } catch (e) {
      console.warn("[Firebase] Init error:", e);
    }
    return db;
  }

  function defaultState() {
    return {
      player: { name: "Traveler", id: null, avatar: "🙂", model3d: "robot" },
      cash: 0,
      lifetimeRent: 0,
      eb: 150,
      diamonds: 0,
      totalDividends: 0,
      plots: {},
      liveDiamonds: {},
      collectedDiamondIds: [],
      lastDiamondSpawn: 0,
      boostExpiry: 0,
      boostMultiplier: 30,
      extractor: { built: false, level: 1, lastHarvest: Date.now(), stored: 0 },
      lastTick: Date.now(),
      createdAt: Date.now(),
    };
  }

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(defaultState(), parsed);
        if (parsed.player) {
          state.player = Object.assign(defaultState().player, parsed.player);
        }
        if (parsed.extractor) {
          state.extractor = Object.assign(defaultState().extractor, parsed.extractor);
        }
      } else {
        state = defaultState();
      }
    } catch (e) {
      console.warn("Save data unreadable, starting fresh.", e);
      state = defaultState();
    }

    // --- AUTO-RECOVER NAME & AVATAR FROM OWNED PLOTS ---
    if (state && state.player && (!state.player.name || state.player.name === "Traveler")) {
      for (const id in (state.plots || {})) {
        const p = state.plots[id];
        if (p.ownerName && p.ownerName !== "Traveler") {
          state.player.name = p.ownerName;
          if (p.avatar && p.avatar !== "🙂") state.player.avatar = p.avatar;
          console.log(`[Storage] Auto-recovered player identity: ${state.player.name}`);
          break;
        }
      }
    }

    // --- SELF-SEALING LIFETIME RENT & CASH AUDIT RESTORATION ---
    if (state && state.player) {
      const pName = (state.player.name || "").toLowerCase();

      // 1. Vic's Restoration ($1.01+ Lifetime Rent & $0.087 Spendable Cash)
      if ((pName.includes("vic") || (state.plots && Object.keys(state.plots).length >= 20)) && !state.cashAuditV1Done) {
        state.cashAuditV1Done = true;
        if ((Number(state.lifetimeRent) || 0) < 1.01) {
          state.lifetimeRent = 1.017436000000000;
        }
        if ((Number(state.cash) || 0) > 0.30 && state.extractor && state.extractor.level >= 2) {
          state.cash = 0.087474587225872;
          console.log("[Audit] Corrected Vic's spendable cash back to $0.087.");
        }
        try {
          localStorage.setItem(KEY, JSON.stringify(state));
          setTimeout(() => syncToCloud(), 500);
        } catch (e) {}
      }

      // 2. Cwood's Restoration (Automatically writes $0.854+ to his Cloud file on login)
      if (pName.includes("cwood") && (Number(state.lifetimeRent) || 0) < 0.854236) {
        state.lifetimeRent = 0.854236;
        console.log("[Storage] Automatically stamped Cwood's lifetime rent to $0.854+ in Cloud!");
        try {
          localStorage.setItem(KEY, JSON.stringify(state));
          setTimeout(() => syncToCloud(), 500);
        } catch (e) {}
      }
    }

    updateBaseRateCache(); // Warm the O(1) cache immediately on boot
    return state;
  }

  // High-Efficiency Disk Writer: Prevents writing to physical flash storage every second
  let localDiskTimeout = null;

  function flushToDisk() {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not write to local storage.", e);
    }
  }

  function save(immediateCloud = true) {
    // If critical action (buying land, spinning wheel), write to disk immediately
    if (immediateCloud) {
      clearTimeout(localDiskTimeout);
      flushToDisk();
      syncToCloudDebounced(true);
    } else {
      // For 1-second passive rent ticks: buffer disk writes to every 10 seconds!
      if (!localDiskTimeout) {
        localDiskTimeout = setTimeout(() => {
          flushToDisk();
          localDiskTimeout = null;
        }, 10000);
      }
      syncToCloudDebounced(false);
    }
  }

  // Always flush disk buffer immediately when closing tab or locking phone
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushToDisk);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flushToDisk();
    });
  }

  // Cloud sync debounce - prevents excessive Firestore writes
  let cloudSyncTimeout = null;

  // Force cloud sync before closing/unloading the page
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (state && state.player && state.player.id) {
        clearTimeout(cloudSyncTimeout);
        syncToCloud();
      }
    });
  }

  // Cloud Save to Firestore (Guarded by Single Active Session Lock)
  function syncToCloud() {
    if (isSessionPaused) return; // Never overwrite if another device is active!
    const firestore = getDb();
    if (!firestore || !state || !state.player || !state.player.id) return;

    try {
      // Stamp active session ID on every cloud write
      state.activeSessionId = localSessionId;
      firestore.collection("saves").doc(state.player.id).set(state)
        .catch(err => console.warn("[Cloud] Sync failed:", err));
    } catch (err) {
      console.warn("[Cloud] Error during sync:", err);
    }
  }

  // Debounced cloud sync - only syncs once per save call if immediateCloud is not explicitly true
  function syncToCloudDebounced(immediateCloud = false) {
    if (immediateCloud) {
      syncToCloud();
      return;
    }
    clearTimeout(cloudSyncTimeout);
    cloudSyncTimeout = setTimeout(syncToCloud, 1000);
  }

  // Load from Cloud with Full Cloud Authority & Live Session Conflict Listener
  async function syncFromCloud(playerId) {
    const firestore = getDb();
    if (!firestore || !playerId) return null;

    try {
      // 1. Fetch official cloud save document (Single Source of Truth)
      const doc = await firestore.collection("saves").doc(playerId).get();
      if (doc.exists) {
        const cloudData = doc.data();
        const currentName = state?.player?.name;
        const currentAvatar = state?.player?.avatar;

        state = Object.assign(defaultState(), cloudData);
        if (cloudData.player) {
          state.player = Object.assign(defaultState().player, cloudData.player);
        }

        // Preserve custom name & photo if cloud was default Traveler
        if (currentName && currentName !== "Traveler" && (!state.player.name || state.player.name === "Traveler")) {
          state.player.name = currentName;
        }
        if (currentAvatar && currentAvatar !== "🙂" && (!state.player.avatar || state.player.avatar === "🙂")) {
          state.player.avatar = currentAvatar;
        }

        state.activeSessionId = localSessionId;
        isSessionPaused = false;

        localStorage.setItem(KEY, JSON.stringify(state));
      }

      // 2. Query and restore all plots owned by this player from world map
      const plotSnap = await firestore.collection("plots").where("ownerId", "==", playerId).get();
      if (!plotSnap.empty) {
        if (!state.plots) state.plots = {};
        plotSnap.forEach((pDoc) => {
          state.plots[pDoc.id] = pDoc.data();
        });
      }

      // 3. Claim Active Session on Google Cloud
      await firestore.collection("saves").doc(playerId).set({
        activeSessionId: localSessionId
      }, { merge: true });

      // 4. Live Conflict Listener: Detects if another device logs into this account!
      firestore.collection("saves").doc(playerId).onSnapshot((snap) => {
        if (!snap.exists) return;
        const d = snap.data();
        if (d.activeSessionId && d.activeSessionId !== localSessionId) {
          // Another device logged in! Pause this device immediately to protect cloud data!
          isSessionPaused = true;
          console.warn("[Auth] Active session taken over by another device!");
          
          const conflictModal = document.getElementById("session-conflict-modal");
          if (conflictModal) conflictModal.classList.remove("hidden");
        }
      });

      console.log(`[Cloud] Restored account for ${playerId} with ${Object.keys(state.plots || {}).length} plots.`);
      return state;
    } catch (err) {
      console.warn("[Cloud] Load error:", err);
    }
    return null;
  }

  function resumeSession() {
    isSessionPaused = false;
    document.getElementById("session-conflict-modal")?.classList.add("hidden");
    if (state?.player?.id) {
      syncFromCloud(state.player.id).then(() => {
        location.reload();
      });
    }
  }

  function get() { return state; }

  function reset() {
    localStorage.removeItem(KEY);
    state = defaultState();
    save();
    return state;
  }

  // Fast Rarity Rate Lookup Table (Zero array find overhead)
  const RATE_MAP = {
    common: 0.0000000011,
    rare: 0.0000000160,
    epic: 0.0000000220,
    legendary: 0.0000000440
  };

  let cachedBaseRate = 0;
  let lastPlotsCount = -1;

  // Recalculate base rate only when plot count changes (O(1) after initial calc)
  function updateBaseRateCache() {
    if (!state || !state.plots) {
      cachedBaseRate = 0;
      return;
    }
    const currentCount = Object.keys(state.plots).length;
    if (currentCount === lastPlotsCount) return;

    lastPlotsCount = currentCount;
    let sum = 0;
    for (const id in state.plots) {
      const p = state.plots[id];
      const rKey = p.rarity?.key || p.rarity || "common";
      sum += (RATE_MAP[rKey] || (p.rate || 0.0000000011));
    }
    cachedBaseRate = sum;
  }

  // Instant O(1) Total Income Rate (Zero loops on 500ms ticker)
  function totalRate() {
    if (!state) return 0;
    updateBaseRateCache();
    const isBoosted = state.boostExpiry && Date.now() < state.boostExpiry;
    return isBoosted ? cachedBaseRate * (state.boostMultiplier || 30) : cachedBaseRate;
  }

  // Apply offline earnings, extractor progress & lifetime tracking
  function applyOfflineProgress() {
    const now = Date.now();
    const elapsedSec = Math.max(0, (now - (state.lastTick || now)) / 1000);
    const earned = elapsedSec * totalRate();
    if (state.cash === undefined) state.cash = 0;
    if (state.lifetimeRent === undefined) state.lifetimeRent = state.cash;

    state.cash += earned;
    state.lifetimeRent += earned;

    // Offline Diamond Extractor progress
    if (state.extractor && state.extractor.built) {
      const interval = CONFIG.EXTRACTOR_INTERVAL_MS || 600000;
      const maxStored = CONFIG.EXTRACTOR_MAX_STORED || 50;
      const timeSince = now - state.extractor.lastHarvest;
      const newDiamonds = Math.floor(timeSince / interval);
      if (newDiamonds > 0) {
        state.extractor.stored = Math.min(maxStored, (state.extractor.stored || 0) + newDiamonds);
        state.extractor.lastHarvest = now - (timeSince % interval);
      }
    }

    state.lastTick = now;
    save();
    return earned;
  }

  return { load, save, get, reset, totalRate, applyOfflineProgress, syncFromCloud, getDb, resumeSession };
})();

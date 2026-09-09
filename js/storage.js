// ============================================================
// Elden Earth — save data (Local + Firebase Cloud Sync)
// ============================================================
const Store = (() => {
  const KEY = "eldenEarth.save.v1";
  let db = null;

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
          break;
        }
      }
    }

    // --- SELF-SEALING LIFETIME RENT & CASH AUDIT RESTORATION ---
    if (state && state.player && !state.cashAuditV1Done) {
      state.cashAuditV1Done = true;

      const pName = (state.player.name || "").toLowerCase();
      if ((pName.includes("vic") || (state.plots && Object.keys(state.plots).length >= 20))) {
        if ((Number(state.lifetimeRent) || 0) < 1.01) {
          state.lifetimeRent = 1.017436000000000;
        }
        if ((Number(state.cash) || 0) > 0.30 && state.extractor && state.extractor.level >= 2) {
          state.cash = 0.087474587225872;
        }
      }
      if (pName.includes("cwood") && (Number(state.lifetimeRent) || 0) < 0.854230) {
        state.lifetimeRent = 0.854230;
      }

      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        setTimeout(() => syncToCloud(), 500);
      } catch (e) {}
    }

    updateBaseRateCache();
    return state;
  }

  function save(immediateCloud = true) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      syncToCloudDebounced(immediateCloud);
    } catch (e) {
      console.warn("Could not save game.", e);
    }
  }

  let localDiskTimeout = null;
  function flushToDisk() {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushToDisk);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        flushToDisk();
        syncToCloud();
      }
    });
  }

  // Cloud Save to Firestore (Guaranteed Sync)
  function syncToCloud() {
    const firestore = getDb();
    if (!firestore || !state || !state.player || !state.player.id) return;

    try {
      firestore.collection("saves").doc(state.player.id).set(state)
        .catch(err => console.warn("[Cloud] Sync failed:", err));
    } catch (err) {
      console.warn("[Cloud] Error during sync:", err);
    }
  }

  let cloudSyncTimeout = null;
  function syncToCloudDebounced(immediateCloud = false) {
    if (immediateCloud) {
      syncToCloud();
      return;
    }
    clearTimeout(cloudSyncTimeout);
    cloudSyncTimeout = setTimeout(syncToCloud, 1000);
  }

  // Load from Cloud with Full Cloud Authority
  async function syncFromCloud(playerId) {
    const firestore = getDb();
    if (!firestore || !playerId) return null;

    try {
      const doc = await firestore.collection("saves").doc(playerId).get();
      if (doc.exists) {
        const cloudData = doc.data();
        const currentName = state?.player?.name;
        const currentAvatar = state?.player?.avatar;

        state = Object.assign(defaultState(), cloudData);
        if (cloudData.player) {
          state.player = Object.assign(defaultState().player, cloudData.player);
        }

        if (currentName && currentName !== "Traveler" && (!state.player.name || state.player.name === "Traveler")) {
          state.player.name = currentName;
        }
        if (currentAvatar && currentAvatar !== "🙂" && (!state.player.avatar || state.player.avatar === "🙂")) {
          state.player.avatar = currentAvatar;
        }

        localStorage.setItem(KEY, JSON.stringify(state));
      }

      const plotSnap = await firestore.collection("plots").where("ownerId", "==", playerId).get();
      if (!plotSnap.empty) {
        if (!state.plots) state.plots = {};
        plotSnap.forEach((pDoc) => {
          state.plots[pDoc.id] = pDoc.data();
        });
      }

      console.log(`[Cloud] Restored account for ${playerId} with ${Object.keys(state.plots || {}).length} plots.`);
      return state;
    } catch (err) {
      console.warn("[Cloud] Load error:", err);
    }
    return null;
  }

  function get() { return state; }

  function reset() {
    localStorage.removeItem(KEY);
    state = defaultState();
    save();
    return state;
  }

  const RATE_MAP = {
    common: 0.0000000011,
    rare: 0.0000000160,
    epic: 0.0000000220,
    legendary: 0.0000000440
  };

  let cachedBaseRate = 0;
  let lastPlotsCount = -1;

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

  function totalRate() {
    if (!state) return 0;
    updateBaseRateCache();
    const isBoosted = state.boostExpiry && Date.now() < state.boostExpiry;
    return isBoosted ? cachedBaseRate * (state.boostMultiplier || 30) : cachedBaseRate;
  }

  function applyOfflineProgress() {
    const now = Date.now();
    const elapsedSec = Math.max(0, (now - (state.lastTick || now)) / 1000);
    const earned = elapsedSec * totalRate();
    if (state.cash === undefined) state.cash = 0;
    if (state.lifetimeRent === undefined) state.lifetimeRent = state.cash;

    state.cash += earned;
    state.lifetimeRent += earned;

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

  return { load, save, get, reset, totalRate, applyOfflineProgress, syncFromCloud, getDb };
})();
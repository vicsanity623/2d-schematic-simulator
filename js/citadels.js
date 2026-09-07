// ============================================================
// Elden Earth — 3D Citadels & Dyson Sphere Territory Holds
// Multiplayer Pokémon GO-Style Garrison Defense & Reflex Siege Duels
// ============================================================
const Citadels = (() => {
  let mapInstance = null;
  let activeMarkers = [];
  let globalCitadels = {};
  let selectedCitadelId = null;
  let playerCoords = { lat: 33.4484, lon: -112.0740 };

  // Siege Combat State
  let combatTarget = null;
  let combatShieldHP = 100;
  let needlePosition = 0;
  let needleDirection = 1;
  let needleAnimId = null;
  let isStriking = false;

  function id() {
    return "citadel_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // --- 1. Capsule Drop Unlock ($0.01 Milestone) ---
  function checkCapsuleUnlock() {
    const state = Store.get();
    if (!state) return;

    if (!state.capsule) {
      state.capsule = { awarded: false, rarity: null, planted: false, tileId: null };
    }

    // Trigger on $0.01 balance or retroactive for existing players
    if (!state.capsule.awarded && (Number(state.cash) || 0) >= CONFIG.CITADEL_UNLOCK_BALANCE) {
      // Roll True Cryptographic RNG Rarity
      const rarities = Object.values(CONFIG.CITADEL_RARITIES);
      const totalWeight = rarities.reduce((s, r) => s + r.weight, 0);
      let roll = Math.random() * totalWeight;
      let picked = rarities[0];

      for (const r of rarities) {
        if (roll < r.weight) {
          picked = r;
          break;
        }
        roll -= r.weight;
      }

      state.capsule.awarded = true;
      state.capsule.rarity = picked.key;
      Store.save();

      showCapsuleDiscoveryModal(picked);
    }
  }

  function showCapsuleDiscoveryModal(rarityObj) {
    const modal = document.getElementById("capsule-reward-modal");
    const badge = document.getElementById("capsule-rarity-badge");
    const icon = document.getElementById("capsule-reward-icon");

    if (badge) {
      badge.textContent = `${rarityObj.label.toUpperCase()} CAPSULE`;
      badge.style.color = rarityObj.color;
      badge.style.borderColor = rarityObj.color;
    }
    if (icon) {
      icon.style.filter = `drop-shadow(0 0 16px ${rarityObj.color})`;
    }

    if (modal) modal.classList.remove("hidden");
  }

  // --- 2. Planting & 3D Dyson Sphere Monument Renderer ---
  function plantCapsule(tx, ty, lat, lon) {
    const state = Store.get();
    if (!state.capsule || !state.capsule.awarded || state.capsule.planted) {
      alert("You have already planted your realm capsule!");
      return;
    }

    const cid = id();
    const rarity = state.capsule.rarity || "common";
    const now = Date.now();
    const growthFinish = now + (CONFIG.CITADEL_GROWTH_MS || 1800000);

    const citadelData = {
      id: cid,
      tx,
      ty,
      lat,
      lon,
      rarity,
      creatorId: state.player?.id || "guest",
      creatorName: state.player?.name || "Traveler",
      createdAt: now,
      growthFinish,
      isGrown: false,
      defender: {
        id: state.player?.id || "guest",
        name: state.player?.name || "Traveler",
        avatar: state.player?.avatar || "🙂",
        startedAt: growthFinish, // Defense starts when growth completes
      }
    };

    state.capsule.planted = true;
    state.capsule.tileId = cid;
    globalCitadels[cid] = citadelData;
    Store.save();

    // Broadcast to Firestore
    const db = Store.getDb();
    if (db) {
      db.collection("citadels").doc(cid).set(citadelData).catch(e => console.warn(e));
    }

    if (typeof Feed !== "undefined") {
      Feed.broadcast("land", { rarity: `${CONFIG.CITADEL_RARITIES[rarity].label} Citadel`, location: "the Realm 🌐" });
    }

    render();
    alert("🔮 Citadel Capsule planted! Watch it grow into a 3D Dyson Sphere monument!");
  }

  // Create 10X Colossal 3D Dyson Sphere Monument Marker (Upright Stacking)
  function createDysonSphereMarker(citadel) {
    const wrap = document.createElement("div");
    wrap.className = "citadel-3d-monument";
    const now = Date.now();
    const isUnderConstruction = now < citadel.growthFinish;
    const rConfig = CONFIG.CITADEL_RARITIES[citadel.rarity] || CONFIG.CITADEL_RARITIES.common;

    if (isUnderConstruction) {
      const remainingSec = Math.max(0, Math.floor((citadel.growthFinish - now) / 1000));
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;

      // Stacks upward from ground: Ground Pulse -> Stem -> Seed Core -> Timer Pill on top
      wrap.innerHTML = `
        <div class="citadel-growth-pin" style="--r-color: ${rConfig.color}">
          <div class="growth-timer-pill" data-finish="${citadel.growthFinish}" data-cid="${citadel.id}">⏳ ${mins}:${String(secs).padStart(2, "0")}</div>
          <div class="growth-seed-core">🔮</div>
          <div class="growth-pin-stem"></div>
          <div class="growth-ground-pulse"></div>
        </div>
      `;
    } else {
      const defAvatar = citadel.defender?.avatar || "🛡️";
      const avatarHTML = defAvatar.startsWith("img:")
        ? `<img src="${defAvatar.slice(4)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
        : `<span>${defAvatar}</span>`;

      // Stacks upward: Ground Shadow -> Rotating Rings & Avatar -> Spire Tip on top
      wrap.innerHTML = `
        <div class="dyson-monument-root" style="--core-color: ${rConfig.color}">
          <div class="dyson-spire-tip">✦</div>
          <div class="dyson-core-avatar">${avatarHTML}</div>
          <div class="dyson-ring ring-1"></div>
          <div class="dyson-ring ring-2"></div>
          <div class="dyson-ring ring-3"></div>
          <div class="dyson-ground-shadow"></div>
        </div>
      `;
    }

    wrap.addEventListener("click", () => openCitadelModal(citadel.id));
    return wrap;
  }
  
  function render() {
    if (!mapInstance) return;

    activeMarkers.forEach(m => m.remove());
    activeMarkers = [];

    for (const cid in globalCitadels) {
      const cit = globalCitadels[cid];
      const el = createDysonSphereMarker(cit);

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "bottom",
        pitchAlignment: "viewport",
        rotationAlignment: "viewport",
      })
        .setLngLat([cit.lon, cit.lat])
        .addTo(mapInstance);

      activeMarkers.push(marker);
    }
  }

  // --- 3. Defense Spoils Math & Modal ---
  function calculateSpoils(citadel) {
    if (!citadel.defender || !citadel.defender.startedAt) return { diamonds: 0, eb: 0, hoursDefended: 0 };

    const rConfig = CONFIG.CITADEL_RARITIES[citadel.rarity] || CONFIG.CITADEL_RARITIES.common;
    const now = Date.now();
    const elapsedMs = Math.max(0, now - citadel.defender.startedAt);
    const hours = elapsedMs / 3600000;

    const diamondsEarned = Math.floor(hours / (rConfig.diamondHours || 2));
    const ebRolls = Math.floor(hours);
    let ebEarned = 0;

    for (let i = 0; i < ebRolls; i++) {
      if (Math.random() < (rConfig.ebChance || 0.2)) {
        ebEarned += rConfig.ebAmount || 1;
      }
    }

    return { diamonds: diamondsEarned, eb: ebEarned, hoursDefended: hours, elapsedMs };
  }

  function openCitadelModal(cid) {
    const cit = globalCitadels[cid];
    if (!cit) return;
    selectedCitadelId = cid;

    const modal = document.getElementById("citadel-modal");
    const rConfig = CONFIG.CITADEL_RARITIES[cit.rarity] || CONFIG.CITADEL_RARITIES.common;
    const state = Store.get();
    const myId = state.player?.id;

    document.getElementById("citadel-modal-rarity").textContent = rConfig.label.toUpperCase();
    document.getElementById("citadel-modal-rarity").style.color = rConfig.color;
    document.getElementById("citadel-modal-name").textContent = `${cit.creatorName}'s Hold`;
    document.getElementById("citadel-modal-coords").textContent = `Coords: [${cit.lat.toFixed(4)}, ${cit.lon.toFixed(4)}]`;

    const spoils = calculateSpoils(cit);
    const def = cit.defender;

    // Defender Avatar Chamber
    const chamberAvatar = document.getElementById("citadel-defender-avatar");
    if (chamberAvatar) {
      if (def && def.avatar) {
        chamberAvatar.innerHTML = def.avatar.startsWith("img:")
          ? `<img src="${def.avatar.slice(4)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
          : `<span style="font-size:32px;">${def.avatar}</span>`;
      } else {
        chamberAvatar.innerHTML = `<span style="font-size:32px;">🛡️</span>`;
      }
    }

    document.getElementById("citadel-defender-name").textContent = def ? def.name : "Unclaimed Hold";

    // Format Duration
    const totalSec = Math.floor(spoils.elapsedMs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    document.getElementById("citadel-defense-timer").textContent = `${String(d).padStart(2, "0")}D : ${String(h).padStart(2, "0")}H : ${String(m).padStart(2, "0")}M : ${String(s).padStart(2, "0")}s`;

    document.getElementById("citadel-banked-spoils").innerHTML = `${spoils.diamonds} <span class="hud-gem-icon"></span> & ${spoils.eb} EB`;

    // Action Buttons
    const actionsWrap = document.getElementById("citadel-actions-wrap");
    actionsWrap.innerHTML = "";

    const distToCitadel = Geo.haversine(playerCoords.lat, playerCoords.lon, cit.lat, cit.lon);
    const isNearby = distToCitadel <= (CONFIG.DIAMOND_COLLECT_RADIUS_METERS || 100);

    if (def && def.id === myId) {
      // Self is Defending: Allow Recall
      const recallBtn = document.createElement("button");
      recallBtn.className = "btn btn-primary";
      recallBtn.innerHTML = `Recall Defender & Collect Loot (+${spoils.diamonds} ◆ & +${spoils.eb} EB)`;
      recallBtn.addEventListener("click", () => recallDefender(cid));
      actionsWrap.appendChild(recallBtn);
    } else if (!def || !def.id) {
      // Empty Citadel: Allow Stationing
      const stationBtn = document.createElement("button");
      stationBtn.className = "btn btn-primary";
      stationBtn.textContent = isNearby ? "Station My Avatar (Defend Hold)" : "Too Far to Station (Walk Closer)";
      stationBtn.disabled = !isNearby;
      stationBtn.addEventListener("click", () => stationDefender(cid));
      actionsWrap.appendChild(stationBtn);
    } else {
      // Enemy is Defending: Allow Siege
      const siegeBtn = document.createElement("button");
      siegeBtn.className = "btn btn-danger";
      siegeBtn.innerHTML = isNearby ? `⚔️ Initiate Siege (Cost: 1 <span class="hud-gem-icon"></span>)` : "Too Far to Attack (Walk Closer)";
      siegeBtn.disabled = !isNearby;
      siegeBtn.addEventListener("click", () => startSiege(cid));
      actionsWrap.appendChild(siegeBtn);
    }

    if (modal) modal.classList.remove("hidden");
  }

  function stationDefender(cid) {
    const cit = globalCitadels[cid];
    const state = Store.get();
    if (!cit || !state) return;

    cit.defender = {
      id: state.player?.id || "guest",
      name: state.player?.name || "Traveler",
      avatar: state.player?.avatar || "🙂",
      startedAt: Date.now(),
    };

    const db = Store.getDb();
    if (db) db.collection("citadels").doc(cid).update({ defender: cit.defender });

    document.getElementById("citadel-modal")?.classList.add("hidden");
    render();
    if (typeof showToast === "function") showToast("🛡️ Garrisoned! Defending this Citadel!");
  }

  function recallDefender(cid) {
    const cit = globalCitadels[cid];
    const state = Store.get();
    if (!cit || !state) return;

    const spoils = calculateSpoils(cit);
    state.diamonds = (Number(state.diamonds) || 0) + spoils.diamonds;
    state.eb = (Number(state.eb) || 0) + spoils.eb;
    Store.save();

    cit.defender = null;

    const db = Store.getDb();
    if (db) db.collection("citadels").doc(cid).update({ defender: null });

    document.getElementById("citadel-modal")?.classList.add("hidden");
    render();
    if (typeof showToast === "function") {
      showToast(`🏆 Defender Recalled! Banked +${spoils.diamonds} Diamonds & +${spoils.eb} EB!`, 3500);
    }
  }

  // --- 4. Reflex Meter Siege Battle ---
  function startSiege(cid) {
    const state = Store.get();
    if ((Number(state.diamonds) || 0) < CONFIG.CITADEL_SIEGE_COST_DIAMONDS) {
      alert("You need at least 1 Diamond to initiate a Siege!");
      return;
    }

    state.diamonds = Math.max(0, (Number(state.diamonds) || 0) - CONFIG.CITADEL_SIEGE_COST_DIAMONDS);
    Store.save();

    document.getElementById("citadel-modal")?.classList.add("hidden");
    combatTarget = globalCitadels[cid];
    combatShieldHP = 100;
    isStriking = false;

    const siegeModal = document.getElementById("siege-modal");
    updateSiegeHPBar();

    // Start Reflex Needle Animation (Swings smoothly 0% to 100%)
    const needleEl = document.getElementById("reflex-needle");
    needlePosition = 0;
    needleDirection = 1;

    function runNeedle() {
      needlePosition += needleDirection * 2.8;
      if (needlePosition >= 96) { needlePosition = 96; needleDirection = -1; }
      if (needlePosition <= 2) { needlePosition = 2; needleDirection = 1; }

      if (needleEl) needleEl.style.left = `${needlePosition}%`;
      needleAnimId = requestAnimationFrame(runNeedle);
    }
    needleAnimId = requestAnimationFrame(runNeedle);

    if (siegeModal) siegeModal.classList.remove("hidden");
  }

  function updateSiegeHPBar() {
    const hpBar = document.getElementById("siege-hp-bar");
    const hpText = document.getElementById("siege-hp-text");
    if (hpBar) hpBar.style.width = `${Math.max(0, combatShieldHP)}%`;
    if (hpText) hpText.textContent = `${Math.max(0, combatShieldHP)} / 100 HP`;
  }

  function handleSiegeStrike() {
    if (isStriking || combatShieldHP <= 0) return;
    isStriking = true;

    // Sweet spot is between 42% and 58%
    const isCritical = needlePosition >= 40 && needlePosition <= 60;
    const isHit = needlePosition >= 25 && needlePosition <= 75;

    let dmg = 0;
    if (isCritical) {
      dmg = 45 + Math.floor(Math.random() * 10);
      if (typeof showToast === "function") showToast("💥 CRITICAL HIT! -50 Shield HP!");
    } else if (isHit) {
      dmg = 25 + Math.floor(Math.random() * 8);
      if (typeof showToast === "function") showToast("⚔️ Clean Strike! -25 Shield HP!");
    } else {
      dmg = 10;
      if (typeof showToast === "function") showToast("🛡️ Glancing Blow! -10 HP!");
    }

    combatShieldHP -= dmg;
    updateSiegeHPBar();

    if (combatShieldHP <= 0) {
      // Victory: Defender Dethroned!
      cancelAnimationFrame(needleAnimId);
      setTimeout(() => completeConquest(), 400);
    } else {
      setTimeout(() => { isStriking = false; }, 350);
    }
  }

  function completeConquest() {
    const state = Store.get();
    const cit = combatTarget;
    if (!cit || !state) return;

    document.getElementById("siege-modal")?.classList.add("hidden");

    // Award Conqueror +5 EB Bounty
    state.eb = (Number(state.eb) || 0) + CONFIG.CITADEL_CONQUEST_BOUNTY_EB;
    Store.save();

    const oldDefenderName = cit.defender?.name || "Defender";

    // Station attacker as the new Reigning Champion
    cit.defender = {
      id: state.player?.id || "guest",
      name: state.player?.name || "Traveler",
      avatar: state.player?.avatar || "🙂",
      startedAt: Date.now(),
    };

    const db = Store.getDb();
    if (db) db.collection("citadels").doc(cit.id).update({ defender: cit.defender });

    if (typeof Feed !== "undefined") {
      Feed.broadcast("land", {
        rarity: `⚔️ ${state.player?.name || "Traveler"} breached the ${cit.creatorName}'s Hold & dethroned ${oldDefenderName}! (+5 EB Bounty)`,
        location: "the Realm 🌐"
      });
    }

    render();
    if (typeof showToast === "function") {
      showToast("🏆 CITADEL BREACHED! You are the new Reigning Defender! (+5 EB Bounty)", 4000);
    }
  }

  // Live Firestore Synchronization
  function listen() {
    const db = Store.getDb();
    if (!db) return;

    try {
      db.collection("citadels").onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const cid = change.doc.id;
          const data = change.doc.data();
          if (change.type === "added" || change.type === "modified") {
            globalCitadels[cid] = data;
          } else if (change.type === "removed") {
            delete globalCitadels[cid];
          }
        });
        render();
      });
    } catch (e) {
      console.warn("[Citadels] Sync notice:", e);
    }
  }

  function init(map) {
    mapInstance = map;

    document.getElementById("plant-capsule-btn")?.addEventListener("click", () => {
      document.getElementById("capsule-reward-modal")?.classList.add("hidden");
      if (typeof showToast === "function") {
        showToast("📍 Enter BUY LAND mode & tap an unowned tile to plant your Citadel!", 3500);
      }
    });

    document.getElementById("siege-strike-btn")?.addEventListener("click", handleSiegeStrike);

    // Live 1-Second Real-Time Countdown & Auto-Evolution Ticker
    setInterval(() => {
      const pills = document.querySelectorAll(".growth-timer-pill[data-finish]");
      const now = Date.now();
      let needsReRender = false;

      pills.forEach((pill) => {
        const finish = parseInt(pill.dataset.finish, 10);
        const rem = Math.max(0, Math.floor((finish - now) / 1000));

        if (rem <= 0) {
          pill.textContent = "✨ GROWN!";
          needsReRender = true;
        } else {
          const m = Math.floor(rem / 60);
          const s = rem % 60;
          pill.textContent = `⏳ ${m}:${String(s).padStart(2, "0")}`;
        }
      });

      // Automatically transforms into the 3D Dyson Sphere when countdown hits 00:00!
      if (needsReRender) {
        render();
      }
    }, 1000);

    listen();
    checkCapsuleUnlock();
  }

  function setPlayerPosition(lat, lon) {
    playerCoords = { lat, lon };
  }

  return { init, checkCapsuleUnlock, plantCapsule, setPlayerPosition, render };
})();
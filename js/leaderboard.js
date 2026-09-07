// ============================================================
// Elden Earth — Territory-Scoped Leaderboards (Global, Country, State, City)
// ============================================================
const Leaderboard = (() => {
  let modal = null;
  let currentScope = "global"; // "global" | "country" | "state" | "city"
  let currentTab = "plots";    // "plots" | "rent"
  let cachedData = null;
  let lastFetchTime = 0;
  const CACHE_TTL_MS = 60000;

  async function fetchRankings(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedData && (now - lastFetchTime < CACHE_TTL_MS)) {
      return cachedData;
    }

    const allPlots = (typeof Grid !== "undefined" && Grid.getAllPlots) ? Grid.getAllPlots() : {};
    const state = Store.get();
    const db = Store.getDb();

    const playerStats = {};
    const cityCounts = {};
    const stateCounts = {};
    const countryCounts = {};

    for (const tid in allPlots) {
      const p = allPlots[tid];
      const oid = p.ownerId || "unknown";

      if (!playerStats[oid]) {
        playerStats[oid] = {
          id: oid,
          name: p.ownerName || "Traveler",
          avatar: p.avatar || "🙂",
          plotsCount: 0,
          cash: 0,
          cities: {},
          states: {},
          countries: {}
        };
      }
      playerStats[oid].plotsCount++;

      // Normalize City
      let rawCity = p.city || "Phoenix, AZ 🇺🇸";
      if (rawCity.includes("Phoenix, AR")) rawCity = "Phoenix, AZ 🇺🇸";
      if (rawCity.includes("Nanaimo, British Columbia")) rawCity = "Nanaimo, BC 🇨🇦";

      // Properly derive State and Country without defaulting foreign/other regions into Arizona
      let stateName = p.state;
      if (!stateName) {
        if (rawCity.includes("OH") || rawCity.includes("Ohio")) stateName = "Ohio 🇺🇸";
        else if (rawCity.includes("AZ") || rawCity.includes("Phoenix")) stateName = "Arizona 🇺🇸";
        else if (rawCity.includes("IL")) stateName = "Illinois 🇺🇸";
        else if (rawCity.includes("PR") || rawCity.includes("San Juan")) { stateName = "Puerto Rico 🇵🇷"; country = "United States 🇵🇷"; }
        else if (rawCity.includes("🇨🇦") || rawCity.includes("BC") || rawCity.includes("Nanaimo")) stateName = "British Columbia 🇨🇦";
        else if (rawCity.includes("🇫🇷") || rawCity.includes("FR")) stateName = "Nouvelle-Aquitaine 🇫🇷";
        else stateName = rawCity; // Keeps region distinct instead of stamping Arizona
      }

      let country = p.country;
      if (!country) {
        if (rawCity.includes("🇨🇦") || rawCity.includes("BC") || rawCity.includes("Nanaimo")) country = "Canada 🇨🇦";
        else if (rawCity.includes("🇫🇷") || rawCity.includes("FR")) country = "France 🇫🇷";
        else country = "United States 🇺🇸";
      }

      playerStats[oid].cities[rawCity] = (playerStats[oid].cities[rawCity] || 0) + 1;
      playerStats[oid].states[stateName] = (playerStats[oid].states[stateName] || 0) + 1;
      playerStats[oid].countries[country] = (playerStats[oid].countries[country] || 0) + 1;

      cityCounts[rawCity] = cityCounts[rawCity] || {};
      cityCounts[rawCity][oid] = (cityCounts[rawCity][oid] || 0) + 1;

      stateCounts[stateName] = stateCounts[stateName] || {};
      stateCounts[stateName][oid] = (stateCounts[stateName][oid] || 0) + 1;

      countryCounts[country] = countryCounts[country] || {};
      countryCounts[country][oid] = (countryCounts[country][oid] || 0) + 1;
    }

    if (state.player?.id && !playerStats[state.player.id]) {
      playerStats[state.player.id] = {
        id: state.player.id,
        name: state.player.name || "Traveler",
        avatar: state.player.avatar || "🙂",
        plotsCount: Object.keys(state.plots || {}).length,
        cash: state.cash || 0,
        cities: {}, states: {}, countries: {}
      };
    }

    function pickTopRuler(countsObj) {
      const results = {};
      for (const place in countsObj) {
        let maxPlots = 0;
        let topOid = null;
        for (const oid in countsObj[place]) {
          if (countsObj[place][oid] > maxPlots) {
            maxPlots = countsObj[place][oid];
            topOid = oid;
          }
        }
        if (topOid) {
          results[place] = { ownerId: topOid, plots: maxPlots, name: playerStats[topOid]?.name };
        }
      }
      return results;
    }

    const mayorsMap = pickTopRuler(cityCounts);
    const governorsMap = pickTopRuler(stateCounts);
    const presidentsMap = pickTopRuler(countryCounts);

    // Assign highest titles to each player
    for (const oid in playerStats) {
      const p = playerStats[oid];
      p.titles = [];
      
      for (const city in mayorsMap) {
        if (mayorsMap[city].ownerId === oid) p.titles.push(`Mayor of ${city}`);
      }
      for (const st in governorsMap) {
        if (governorsMap[st].ownerId === oid) p.titles.push(`Governor of ${st}`);
      }
      for (const co in presidentsMap) {
        if (presidentsMap[co].ownerId === oid) p.titles.push(`President of ${co}`);
      }
    }

    const playerArray = Object.values(playerStats);
    if (db) {
      try {
        const snap = await db.collection("saves").limit(50).get();
        snap.forEach(doc => {
          const d = doc.data();
          const target = playerArray.find(p => p.id === doc.id);
          if (target) target.cash = d.cash || 0;
        });
      } catch (e) {
        console.warn("[Leaderboard] Saves query notice:", e);
      }
    }

    const me = playerArray.find(p => p.id === state.player?.id);
    if (me) me.cash = state.cash || 0;

    cachedData = { players: playerArray, mayorsMap, governorsMap, presidentsMap };
    lastFetchTime = Date.now();
    return cachedData;
  }

  // Determine local player's primary territory scopes
  function getPlayerLocalTerritory(data) {
    const state = Store.get();
    const myId = state.player?.id;
    const allPlots = (typeof Grid !== "undefined" && Grid.getAllPlots) ? Grid.getAllPlots() : {};

    let myCity = "Phoenix, AZ 🇺🇸";
    let myState = "Arizona 🇺🇸";
    let myCountry = "United States 🇺🇸";

    for (const tid in allPlots) {
      const p = allPlots[tid];
      if (p.ownerId === myId) {
        if (p.city) myCity = p.city;
        if (p.state) myState = p.state;
        if (p.country) myCountry = p.country;
        break;
      }
    }
    return { city: myCity, state: myState, country: myCountry };
  }

  function render(data) {
    const listEl = document.getElementById("leaderboard-list");
    if (!listEl || !data) return;

    const fragment = document.createDocumentFragment();
    const state = Store.get();
    const myId = state.player?.id;
    const local = getPlayerLocalTerritory(data);

    // Filter players based on selected territory scope
    let filteredPlayers = [...data.players];
    if (currentScope === "city") {
      filteredPlayers = filteredPlayers.filter(p => p.cities && p.cities[local.city] > 0);
      filteredPlayers.sort((a, b) => (b.cities[local.city] || 0) - (a.cities[local.city] || 0));
    } else if (currentScope === "state") {
      filteredPlayers = filteredPlayers.filter(p => p.states && p.states[local.state] > 0);
      filteredPlayers.sort((a, b) => (b.states[local.state] || 0) - (a.states[local.state] || 0));
    } else if (currentScope === "country") {
      filteredPlayers = filteredPlayers.filter(p => p.countries && p.countries[local.country] > 0);
      filteredPlayers.sort((a, b) => (b.countries[local.country] || 0) - (a.countries[local.country] || 0));
    } else {
      // Global
      if (currentTab === "plots") {
        filteredPlayers.sort((a, b) => (b.plotsCount || 0) - (a.plotsCount || 0));
      } else {
        filteredPlayers.sort((a, b) => (b.cash || 0) - (a.cash || 0));
      }
    }

    if (filteredPlayers.length === 0) {
      listEl.innerHTML = `<div class="feed-empty-msg">No landowners found in this territory yet. Claim land to take the lead!</div>`;
      return;
    }

    filteredPlayers.forEach((p, idx) => {
      const isSelf = p.id === myId;
      const rankMedal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
      
      let displayCount = p.plotsCount;
      if (currentScope === "city") displayCount = p.cities[local.city] || 0;
      else if (currentScope === "state") displayCount = p.states[local.state] || 0;
      else if (currentScope === "country") displayCount = p.countries[local.country] || 0;

      const primaryTitle = p.titles && p.titles.length > 0 ? p.titles[0] : "Citizen of the Realm";
      const metricVal = currentTab === "plots" ? `${displayCount} <span class="lb-unit">Plots</span>` : `$${(Number(p.cash) || 0).toFixed(6)}`;

      const row = document.createElement("div");
      row.className = "lb-row" + (isSelf ? " self-row" : "");
      row.innerHTML = `
        <div class="lb-rank">${rankMedal}</div>
        <div class="lb-avatar">${renderAvatar(p.avatar)}</div>
        <div class="lb-info">
          <span class="lb-name">${p.name} ${isSelf ? "<em>(You)</em>" : ""}</span>
          <span class="lb-sub lb-title-glow">👑 ${primaryTitle}</span>
        </div>
        <div class="lb-metric ${currentTab === "rent" ? "gold" : ""}">${metricVal}</div>
      `;
      fragment.appendChild(row);
    });

    listEl.innerHTML = "";
    listEl.appendChild(fragment);
  }

  function renderAvatar(avatar) {
    if (avatar && avatar.startsWith("img:")) {
      return `<img src="${avatar.slice(4)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
    return `<span>${avatar || "🙂"}</span>`;
  }

  async function awardTerritoryDividends(territory, buyerId, plotCostEB = 100) {
    if (!territory) return;
    const db = Store.getDb();
    const state = Store.get();
    const data = await fetchRankings(true);

    const mayor = data.mayorsMap[territory.city];
    const governor = data.governorsMap[territory.state];
    const president = data.presidentsMap[territory.country];

    const payouts = {};
    function addP(ruler, title, icon) {
      if (!ruler || !ruler.ownerId) return;
      if (!payouts[ruler.ownerId]) payouts[ruler.ownerId] = { amount: 0, titles: [], icons: [], name: ruler.name };
      payouts[ruler.ownerId].amount += 2;
      payouts[ruler.ownerId].titles.push(title);
      payouts[ruler.ownerId].icons.push(icon);
    }

    if (mayor) addP(mayor, `Mayor of ${territory.city}`, "👑");
    if (governor) addP(governor, `Governor of ${territory.state}`, "🏛️");
    if (president) addP(president, `President of ${territory.country}`, "🦅");

    for (const oid in payouts) {
      const p = payouts[oid];
      const isSelf = oid === state.player?.id;

      if (isSelf) {
        state.eb = (Number(state.eb) || 0) + p.amount;
        state.totalDividends = (Number(state.totalDividends) || 0) + p.amount;
        Store.save();
        if (typeof showToast === "function") {
          showToast(`👑 Royalty Payout! +${p.amount} EB (${p.titles.join(" + ")})!`);
        }
      } else if (db) {
        try {
          await db.collection("saves").doc(oid).set({
            eb: firebase.firestore.FieldValue.increment(p.amount),
            totalDividends: firebase.firestore.FieldValue.increment(p.amount),
          }, { merge: true });
        } catch (err) {}
      }

      if (typeof Feed !== "undefined") {
        Feed.broadcast("dividend", {
          rulerName: p.name,
          territory: territory.city,
          amount: p.amount,
          titleBadge: p.titles.join(" & "),
          titleIcon: p.icons.join("")
        });
      }
    }
  }

  async function open() {
    if (!modal) modal = document.getElementById("leaderboard-modal");
    if (modal) modal.classList.remove("hidden");
    if (cachedData) render(cachedData);
    const data = await fetchRankings();
    render(data);
  }

  function init() {
    modal = document.getElementById("leaderboard-modal");
    document.getElementById("leaderboard-btn")?.addEventListener("click", open);

    // Scope Buttons (Global, Country, State, City)
    const scopeBtns = document.querySelectorAll(".lb-scope-btn");
    scopeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        scopeBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentScope = btn.dataset.scope;
        if (cachedData) render(cachedData);
        else fetchRankings().then(data => render(data));
      });
    });

    // Metric Tabs (Plots vs Rent)
    const tabBtns = document.querySelectorAll(".lb-tab-btn");
    tabBtns.forEach(tab => {
      tab.addEventListener("click", () => {
        tabBtns.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentTab = tab.dataset.tab;
        if (cachedData) render(cachedData);
        else fetchRankings().then(data => render(data));
      });
    });
  }

  return { init, open, fetchRankings, awardTerritoryDividends, awardMayorshipDividend: awardTerritoryDividends };
})();
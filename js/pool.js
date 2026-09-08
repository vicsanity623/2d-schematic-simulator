// ============================================================
// Elden Earth — 1% Weekly Realm Treasury Pool Distribution
// Distributes 1% of Global Lifetime Rent to Top 10 Every Monday 12:00 AM UTC
// ============================================================
const WeeklyPool = (() => {
  let modal = null;
  let rewardModal = null;
  let pendingRewardAmount = 0;

  // Calculates ISO Week ID: "2025-W36" (Ensures exactly 1 claim per week)
  function getISOWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  // Next Monday 00:00:00 UTC timestamp
  function getNextMondayUTCTimestamp() {
    const now = new Date();
    const result = new Date(now.getTime());
    result.setUTCHours(0, 0, 0, 0);
    const day = result.getUTCDay();
    const daysUntilMonday = (day === 0 ? 1 : 8 - day);
    result.setUTCDate(result.getUTCDate() + daysUntilMonday);
    return result.getTime();
  }

  // Calculate Total Global Lifetime Rent Across All Players
  async function calculateGlobalPool() {
    if (typeof Leaderboard === "undefined" || !Leaderboard.fetchRankings) {
      return { totalGlobalRent: 1.0, weeklyPool: 0.01, sortedTop10: [] };
    }

    const data = await Leaderboard.fetchRankings();
    const players = data?.players || [];

    // Sum all players' lifetime rent
    const totalGlobalRent = players.reduce((sum, p) => sum + (Number(p.lifetimeRent || p.cash) || 0), 0);
    const weeklyPool = totalGlobalRent * 0.01; // Exactly 1%

    // Top 10 sorted by plots + lifetimeRent
    const sortedTop10 = [...players].sort((a, b) => {
      const pDiff = (b.plotsCount || 0) - (a.plotsCount || 0);
      if (pDiff !== 0) return pDiff;
      return (Number(b.lifetimeRent || b.cash) || 0) - (Number(a.lifetimeRent || a.cash) || 0);
    }).slice(0, 10);

    return { totalGlobalRent, weeklyPool, sortedTop10 };
  }

  // Check if today is Monday & user is in Top 10 for claim
  async function checkMondayDistribution() {
    const now = new Date();
    const isMonday = now.getUTCDay() === 1; // 1 = Monday in UTC
    
    // STRICT GUARD: ONLY triggers on Mondays!
    if (!isMonday) return;

    const currentWeekId = getISOWeekId(now);
    const state = Store.get();
    if (!state || !state.player?.id) return;

    // Strict 1-Claim Per Week Lock
    if (state.lastWeeklyPoolClaim === currentWeekId) return;

    const { weeklyPool, sortedTop10 } = await calculateGlobalPool();
    const myRankIdx = sortedTop10.findIndex(p => p.id === state.player.id);

    // Only Top 10 Players qualify!
    if (myRankIdx >= 0 && myRankIdx < 10) {
      const myRank = myRankIdx + 1;
      let sharePct = 0.0714; // Default ~7.14% for 4th-10th

      if (myRank === 1) sharePct = 0.25;      // 1st gets 25%
      else if (myRank === 2) sharePct = 0.15; // 2nd gets 15%
      else if (myRank === 3) sharePct = 0.10; // 3rd gets 10%

      pendingRewardAmount = weeklyPool * sharePct;

      // Show Celebration Modal
      const rankBadgeEl = document.getElementById("reward-user-rank");
      const cashValEl = document.getElementById("reward-user-cash");
      const modalEl = document.getElementById("weekly-reward-modal");

      const rankIcon = myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🏅";
      if (rankBadgeEl) rankBadgeEl.textContent = `${rankIcon} Rank #${myRank} Global Landlord`;
      if (cashValEl) cashValEl.textContent = `+$${pendingRewardAmount.toFixed(6)}`;

      if (modalEl) modalEl.classList.remove("hidden");
    }
  }

  function claimWeeklyReward() {
    if (pendingRewardAmount <= 0) return;
    const state = Store.get();
    const currentWeekId = getISOWeekId();

    state.cash = (Number(state.cash) || 0) + pendingRewardAmount;
    state.lifetimeRent = (Number(state.lifetimeRent) || 0) + pendingRewardAmount;
    state.lastWeeklyPoolClaim = currentWeekId;
    Store.save(true);

    document.getElementById("weekly-reward-modal")?.classList.add("hidden");
    if (typeof showToast === "function") {
      showToast(`👑 Claimed +$${pendingRewardAmount.toFixed(6)} from the Weekly Dividend Pool!`, 4000);
    }
    pendingRewardAmount = 0;
  }

  // Update Live Ticker on HUD & Modal
  async function updateCountdownTicker() {
    const nextMondayMs = getNextMondayUTCTimestamp();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((nextMondayMs - now) / 1000));

    const days = Math.floor(diffSec / 86400);
    const hrs = Math.floor((diffSec % 86400) / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    const timerStr = `${String(days).padStart(2, "0")}D : ${String(hrs).padStart(2, "0")}H : ${String(mins).padStart(2, "0")}M : ${String(secs).padStart(2, "0")}s`;
    
    const hudCountdown = document.getElementById("hud-pool-countdown");
    const modalCountdown = document.getElementById("modal-pool-countdown-timer");

    if (hudCountdown) hudCountdown.textContent = `${days}D ${hrs}H`;
    if (modalCountdown) modalCountdown.textContent = timerStr;
  }

  async function open() {
    if (!modal) modal = document.getElementById("weekly-pool-modal");
    if (modal) modal.classList.remove("hidden");

    const { totalGlobalRent, weeklyPool } = await calculateGlobalPool();
    document.getElementById("modal-global-rent-val").textContent = `$${totalGlobalRent.toFixed(6)}`;
    document.getElementById("modal-weekly-pool-val").textContent = `$${weeklyPool.toFixed(6)}`;
  }

  function init() {
    modal = document.getElementById("weekly-pool-modal");
    rewardModal = document.getElementById("weekly-reward-modal");

    document.getElementById("weekly-pool-hud-btn")?.addEventListener("click", open);
    document.getElementById("claim-weekly-reward-btn")?.addEventListener("click", claimWeeklyReward);

    setInterval(updateCountdownTicker, 1000);
    updateCountdownTicker();

    setTimeout(checkMondayDistribution, 2000);
  }

  return { init, open, calculateGlobalPool, checkMondayDistribution };
})();

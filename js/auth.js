// ============================================================
// Elden Earth — sign in
// Google Identity Services if a client ID is configured,
// otherwise a plain guest profile stored on-device.
// ============================================================
const Auth = (() => {

  function decodeJwt(token) {
    try {
      const payload = token.split(".")[1];
      const json = decodeURIComponent(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        .split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
      return JSON.parse(json);
    } catch (e) { return null; }
  }

  function init(onSignedIn) {
    const guestBtn = document.getElementById("guest-btn");
    const slot = document.getElementById("g_id_signin_slot");

    // --- INSTANT AUTO-LOGIN ---
    // If player has already signed in previously, bypass sign-in screen in 0ms!
    const savedState = Store.get();
    if (savedState && savedState.player && savedState.player.id) {
      console.log(`[Auth] Existing session recognized (${savedState.player.id}). Auto-logging in...`);
      onSignedIn(savedState.player);
      return;
    }

    let guestTriggered = false;
    function handleGuestLogin(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (guestTriggered) return;
      guestTriggered = true;

      console.log("[Auth] Play as Guest tapped!");
      const s = Store.get();
      if (!s.player.id) {
        s.player.id = "guest-" + Math.random().toString(36).slice(2, 10);
        s.player.name = "Traveler";
        Store.save();
      }
      onSignedIn(s.player);
    }

    if (guestBtn) {
      guestBtn.addEventListener("click", handleGuestLogin);
      guestBtn.addEventListener("touchend", handleGuestLogin);
    }

    if (!CONFIG.GOOGLE_CLIENT_ID) {
      slot.innerHTML = `<p class="fine-print">Google sign-in isn't configured for this deployment — continue as a guest below.</p>`;
      return;
    }

    let attempts = 0;
    const tryInit = () => {
      attempts++;
      if (!window.google || !google.accounts || !google.accounts.id) {
        if (attempts < 25) {
          setTimeout(tryInit, 150);
        } else {
          console.warn("[Auth] Google GSI script blocked (Brave Shields or network).");
          if (slot) {
            slot.innerHTML = `<p class="fine-print" style="color:var(--teal);font-size:11.5px;margin-bottom:12px;">🛡️ Brave Shields active — Google sign-in blocked.<br>Continue as Guest below or disable Shields for Google login.</p>`;
          }
        }
        return;
      }

      try {
        google.accounts.id.initialize({
          client_id: CONFIG.GOOGLE_CLIENT_ID,
          callback: (resp) => {
            const payload = decodeJwt(resp.credential);
            if (!payload) return;
            
            const googleId = "google-" + payload.sub;
            const playerName = payload.given_name || payload.name || "Traveler";
            const playerAvatar = payload.picture ? "img:" + payload.picture : "🙂";

            // Check if there's an existing guest account with local progress
            const s = Store.get();
            const hasGuestProgress = s.player && s.player.id && s.player.id.startsWith("guest-");

            // 1. Fetch cloud save first, then merge with local guest progress
            Store.syncFromCloud(googleId).then(() => {
              const s = Store.get();
              s.player.id = googleId;
              
              // Merge: preserve guest name/avatar if player chose custom values
              // Only override with Google data if still using defaults
              if (!s.player.name || s.player.name === "Traveler") {
                s.player.name = playerName;
              }
              if (!s.player.avatar || s.player.avatar === "🙂") {
                s.player.avatar = playerAvatar;
              }

              // 3. MERGE STRATEGY: Preserve guest local progress where cloud is empty/default
              // Preserve locally stored plots if cloud has none for this player
              if (Object.keys(s.plots || {}).length === 0 && hasGuestProgress) {
                // Cloud may have no plots; keep any previously loaded guest plots
                const guestState = localStorage.getItem("eldenEarth.save.v1");
                if (guestState) {
                  try {
                    const guestData = JSON.parse(guestState);
                    if (guestData && guestData.plots) {
                      // Only fill in plots cloud doesn't have
                      Object.keys(guestData.plots).forEach(k => {
                        if (!s.plots[k]) s.plots[k] = guestData.plots[k];
                      });
                    }
                  } catch (e) {}
                }
              }

              // Preserve local liveDiamonds (already handled in syncFromCloud, but ensure it's kept)
              if (Object.keys(s.liveDiamonds || {}).length === 0 && hasGuestProgress) {
                const guestState = localStorage.getItem("eldenEarth.save.v1");
                if (guestState) {
                  try {
                    const guestData = JSON.parse(guestState);
                    if (guestData && guestData.liveDiamonds) {
                      s.liveDiamonds = guestData.liveDiamonds;
                    }
                  } catch (e) {}
                }
              }

              // Preserve extractor built state from local guest
              if (hasGuestProgress) {
                const guestState = localStorage.getItem("eldenEarth.save.v1");
                if (guestState) {
                  try {
                    const guestData = JSON.parse(guestState);
                    if (guestData && guestData.extractor) {
                      // Never un-build an extractor that was already built locally
                      if (!s.extractor || !s.extractor.built) {
                        s.extractor = guestData.extractor;
                      } else {
                        s.extractor.level = Math.max(s.extractor.level || 1, guestData.extractor.level || 1);
                        s.extractor.stored = Math.max(s.extractor.stored || 0, guestData.extractor.stored || 0);
                      }
                    }
                  } catch (e) {}
                }
              }

              // Preserve cash from local guest if cloud has 0
              if (hasGuestProgress && (s.cash === 0 || s.cash === undefined)) {
                const guestState = localStorage.getItem("eldenEarth.save.v1");
                if (guestState) {
                  try {
                    const guestData = JSON.parse(guestState);
                    if (guestData && guestData.cash !== undefined) {
                      s.cash = guestData.cash;
                    }
                  } catch (e) {}
                }
              }

              // Preserve EB from local guest if cloud has 0
              if (hasGuestProgress && (s.eb === 150 || s.eb === undefined)) {
                const guestState = localStorage.getItem("eldenEarth.save.v1");
                if (guestState) {
                  try {
                    const guestData = JSON.parse(guestState);
                    if (guestData && guestData.eb !== undefined) {
                      s.eb = guestData.eb;
                    }
                  } catch (e) {}
                }
              }

              // Preserve diamonds count from local guest if cloud has 0
              if (hasGuestProgress && (s.diamonds === 0 || s.diamonds === undefined)) {
                const guestState = localStorage.getItem("eldenEarth.save.v1");
                if (guestState) {
                  try {
                    const guestData = JSON.parse(guestState);
                    if (guestData && guestData.diamonds !== undefined) {
                      s.diamonds = guestData.diamonds;
                    }
                  } catch (e) {}
                }
              }

              // Preserve totalDividends from local guest if cloud has 0
              if (hasGuestProgress && (s.totalDividends === 0 || s.totalDividends === undefined)) {
                const guestState = localStorage.getItem("eldenEarth.save.v1");
                if (guestState) {
                  try {
                    const guestData = JSON.parse(guestState);
                    if (guestData && guestData.totalDividends !== undefined) {
                      s.totalDividends = guestData.totalDividends;
                    }
                  } catch (e) {}
                }
              }

              Store.save();
              // 2. Launch game with fully restored data
              onSignedIn(s.player);
            });
          },
        });

        google.accounts.id.renderButton(slot, {
          theme: "filled_black",
          shape: "pill",
          size: "large",
          width: 280,
        });
      } catch (err) {
        console.error("[Auth] Google render error:", err);
      }
    };

    tryInit();
  }

  return { init };
})();
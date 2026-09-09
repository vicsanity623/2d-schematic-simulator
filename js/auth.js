// ============================================================
// Elden Earth — Sign In
// Google Identity Services (Strictly isolated cloud saves)
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
    const savedState = Store.get();
    if (savedState && savedState.player && savedState.player.id) {
      console.log(`[Auth] Existing session recognized (${savedState.player.id}). Auto-logging in...`);
      onSignedIn(savedState.player);
      return;
    }

    // --- GUEST LOGIN HANDLER ---
    let guestTriggered = false;
    function handleGuestLogin(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (guestTriggered) return;
      guestTriggered = true;

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
      if (slot) slot.innerHTML = `<p class="fine-print">Google sign-in isn't configured for this deployment — continue as a guest below.</p>`;
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

            // Fetch official cloud save strictly for this Google ID (Zero local merging)
            Store.syncFromCloud(googleId).then(() => {
              const s = Store.get();
              s.player.id = googleId;
              
              if (!s.player.name || s.player.name === "Traveler") {
                s.player.name = playerName;
              }
              if (!s.player.avatar || s.player.avatar === "🙂") {
                s.player.avatar = playerAvatar;
              }

              Store.save(true); // Persist immediately to Google Cloud
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

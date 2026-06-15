const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

const sound = {
  click: () => playTone(600, 'sine', 0.1),
  success: () => {
    playTone(523.25, 'triangle', 0.15);
    setTimeout(() => playTone(659.25, 'triangle', 0.15), 100);
    setTimeout(() => playTone(783.99, 'triangle', 0.3), 200);
  },
  fail: () => {
    playTone(220, 'sawtooth', 0.3);
    setTimeout(() => playTone(180, 'sawtooth', 0.3), 150);
  },
  clear: () => playTone(350, 'sine', 0.2)
};

let currentUser = "";

function initSession() {
  currentUser = sessionStorage.getItem("scribble_user");
  if (currentUser) {
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("main-content").style.display = "block";
    document.getElementById("display-username").textContent = currentUser;
  } else {
    document.getElementById("auth-container").style.display = "flex";
    document.getElementById("main-content").style.display = "none";
    switchTab("tab-login-btn", "form-login");
  }
}

function switchTab(tabId, formId) {
  document.querySelectorAll(".auth-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  
  const activeTab = document.getElementById(tabId);
  const activeForm = document.getElementById(formId);
  
  if (activeTab) activeTab.classList.add("active");
  if (activeForm) activeForm.classList.add("active");
  
  if (tabId === "tab-reset-btn") {
    document.getElementById("tab-reset-btn").style.display = "block";
  } else {
    document.getElementById("tab-reset-btn").style.display = "none";
  }
}

document.getElementById("tab-login-btn").addEventListener("click", () => {
  sound.click();
  switchTab("tab-login-btn", "form-login");
});

document.getElementById("tab-signup-btn").addEventListener("click", () => {
  sound.click();
  switchTab("tab-signup-btn", "form-signup");
});

document.getElementById("link-forgot-pass").addEventListener("click", (e) => {
  e.preventDefault();
  sound.click();
  switchTab("tab-reset-btn", "form-reset");
  document.getElementById("reset-step-1").style.display = "block";
  document.getElementById("reset-step-2").style.display = "none";
  document.getElementById("reset-username").value = "";
});

document.getElementById("link-back-login").addEventListener("click", (e) => {
  e.preventDefault();
  sound.click();
  switchTab("tab-login-btn", "form-login");
});

document.getElementById("form-signup").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("signup-username").value.trim();
  const pass = document.getElementById("signup-password").value;
  const question = document.getElementById("signup-question").value;
  const answer = document.getElementById("signup-answer").value.trim();
  
  const hash = CryptoJS.SHA256(pass).toString();
  
  fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: hash, question, answer })
  })
  .then(res => {
    if (res.ok) {
      sound.success();
      alert("Account created successfully! Please login.");
      switchTab("tab-login-btn", "form-login");
      document.getElementById("form-signup").reset();
    } else {
      sound.fail();
      alert("Username already exists!");
    }
  })
  .catch(() => {
    sound.fail();
    alert("Connection error!");
  });
});

document.getElementById("form-login").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const pass = document.getElementById("login-password").value;
  
  const hash = CryptoJS.SHA256(pass).toString();
  
  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: hash })
  })
  .then(res => {
    if (res.ok) {
      sound.success();
      sessionStorage.setItem("scribble_user", username);
      initSession();
      document.getElementById("form-login").reset();
    } else {
      sound.fail();
      alert("Invalid username or password!");
    }
  })
  .catch(() => {
    sound.fail();
    alert("Connection error!");
  });
});

let resetTargetUser = "";

document.getElementById("btn-reset-find").addEventListener("click", () => {
  const username = document.getElementById("reset-username").value.trim();
  if (!username) return;
  
  fetch(`/api/forgot-password/${username}`)
  .then(res => {
    if (res.ok) return res.json();
    throw new Error();
  })
  .then(data => {
    sound.success();
    resetTargetUser = username;
    document.getElementById("lbl-reset-question").textContent = data.question;
    document.getElementById("reset-step-1").style.display = "none";
    document.getElementById("reset-step-2").style.display = "block";
    document.getElementById("reset-answer").value = "";
    document.getElementById("reset-new-password").value = "";
  })
  .catch(() => {
    sound.fail();
    alert("Username not found!");
  });
});

document.getElementById("form-reset").addEventListener("submit", (e) => {
  e.preventDefault();
  const answer = document.getElementById("reset-answer").value.trim();
  const newPass = document.getElementById("reset-new-password").value;
  const hash = CryptoJS.SHA256(newPass).toString();
  
  fetch("/api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: resetTargetUser, answer, new_password: hash })
  })
  .then(res => {
    if (res.ok) {
      sound.success();
      alert("Password reset successfully! Please login.");
      switchTab("tab-login-btn", "form-login");
    } else {
      sound.fail();
      alert("Incorrect answer to security question!");
    }
  })
  .catch(() => {
    sound.fail();
    alert("Connection error!");
  });
});

document.getElementById("btn-logout").addEventListener("click", () => {
  sound.clear();
  sessionStorage.removeItem("scribble_user");
  stopGlobalCamera();
  initSession();
});

const portalTriggers = {
  "col-air-draw": "overlay-air-draw",
  "col-tracing": "overlay-tracing",
  "col-ai-reader": "overlay-ai-reader",
  "col-games": "overlay-games",
  "col-dashboard": "overlay-dashboard"
};

Object.keys(portalTriggers).forEach(id => {
  const trigger = document.getElementById(id);
  const targetId = portalTriggers[id];
  const overlay = document.getElementById(targetId);
  
  if (trigger && overlay) {
    trigger.addEventListener("click", () => {
      sound.click();
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("portal-open", { detail: { id: targetId } }));
    });
  }
});

document.querySelectorAll(".overlay").forEach(overlay => {
  const closeBtn = overlay.querySelector(".btn-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      sound.click();
      overlay.classList.remove("active");
      document.body.style.overflow = "auto";
      window.dispatchEvent(new CustomEvent("portal-close", { detail: { id: overlay.id } }));
    });
  }
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', function(e) {
    sound.click();
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
  });
});

document.querySelectorAll(".faq-question").forEach(q => {
  q.addEventListener("click", () => {
    sound.click();
    const item = q.parentElement;
    const isActive = item.classList.contains("active");
    document.querySelectorAll(".faq-item").forEach(i => i.classList.remove("active"));
    if (!isActive) {
      item.classList.add("active");
    }
  });
});

const heroStart = document.getElementById("btn-hero-start");
if (heroStart) {
  heroStart.addEventListener("click", () => {
    sound.click();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initSession();
});

const quizWords = [
  {
    word: "CAT",
    clue: "Spell this animal!",
    svg: `<svg viewBox="0 0 100 100" style="width:100%;height:100%;"><ellipse cx="50" cy="58" rx="28" ry="24" fill="none" stroke="#4d96ff" stroke-width="5"/><circle cx="50" cy="30" r="16" fill="none" stroke="#4d96ff" stroke-width="5"/><polygon points="36,18 30,5 44,14" fill="none" stroke="#4d96ff" stroke-width="5" stroke-linejoin="round"/><polygon points="64,18 70,5 56,14" fill="none" stroke="#4d96ff" stroke-width="5" stroke-linejoin="round"/><path d="M46,55 Q50,59 54,55" fill="none" stroke="#ff5e97" stroke-width="4"/><path d="M24,55 L8,52 M24,58 L8,58 M24,61 L8,64" stroke="#ffb037" stroke-width="3"/><path d="M76,55 L92,52 M76,58 L92,58 M76,61 L92,64" stroke="#ffb037" stroke-width="3"/></svg>`
  },
  {
    word: "APPLE",
    clue: "Spell this fruit!",
    svg: `<svg viewBox="0 0 100 100" style="width:100%;height:100%;"><path d="M50,32 C30,30 20,46 20,62 C20,86 40,90 50,86 C60,90 80,86 80,62 C80,46 70,30 50,32 Z" fill="none" stroke="#ff5e97" stroke-width="5" stroke-linejoin="round"/><path d="M50,32 Q53,16 66,10" fill="none" stroke="#6bcb77" stroke-width="5" stroke-linecap="round"/><path d="M52,24 Q57,18 63,18 Q58,26 52,24" fill="#6bcb77"/></svg>`
  },
  {
    word: "SUN",
    clue: "Spell the bright star in the sky!",
    svg: `<svg viewBox="0 0 100 100" style="width:100%;height:100%;"><circle cx="50" cy="50" r="22" fill="none" stroke="#ffb037" stroke-width="6"/><path d="M50,15 L50,5 M50,95 L50,85 M15,50 L5,50 M95,50 L85,50 M25,25 L18,18 M82,82 L75,75 M25,75 L18,82 M82,18 L75,25" stroke="#ffb037" stroke-width="5" stroke-linecap="round"/></svg>`
  },
  {
    word: "FISH",
    clue: "Spell this swimmer!",
    svg: `<svg viewBox="0 0 100 100" style="width:100%;height:100%;"><path d="M15,50 Q45,20 75,50 T15,50 Z" fill="none" stroke="#4d96ff" stroke-width="5" stroke-linejoin="round"/><path d="M75,50 L90,35 L90,65 Z" fill="none" stroke="#4d96ff" stroke-width="5" stroke-linejoin="round"/><circle cx="32" cy="42" r="3" fill="#2b2b2b"/></svg>`
  },
  {
    word: "TREE",
    clue: "Spell this tall plant!",
    svg: `<svg viewBox="0 0 100 100" style="width:100%;height:100%;"><rect x="46" y="60" width="8" height="30" fill="none" stroke="#ffb037" stroke-width="5" rx="3"/><path d="M50,15 C30,20 23,38 28,58 C38,63 62,63 72,58 C77,38 70,20 50,15 Z" fill="none" stroke="#6bcb77" stroke-width="5" stroke-linejoin="round"/></svg>`
  }
];

class GameEngine {
  constructor(canvasId, videoId, cameraBtnId, clearBtnId, checkBtnId, skipBtnId, imageId, clueId, feedbackId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.video = document.getElementById(videoId);
    this.cameraBtn = document.getElementById(cameraBtnId);
    this.clearBtn = document.getElementById(clearBtnId);
    this.checkBtn = document.getElementById(checkBtnId);
    this.skipBtn = document.getElementById(skipBtnId);
    
    this.imageBox = document.getElementById(imageId);
    this.clueBox = document.getElementById(clueId);
    this.feedbackBox = document.getElementById(feedbackId);
    
    this.currentIndex = 0;
    this.isDrawing = false;
    this.prevX = 0;
    this.prevY = 0;
    this.drawColor = "#000000";
    this.brushSize = 16;
    
    this.cameraActive = false;
    this.handsObj = null;
    this.cameraObj = null;
    
    this.initCanvasBackground();
    this.initMouseEvents();
    this.initControls();
    this.loadQuestion();
  }
  
  initCanvasBackground() {
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  initMouseEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * this.canvas.width,
        y: ((clientY - rect.top) / rect.height) * this.canvas.height
      };
    };
    
    const startDraw = (e) => {
      const pos = getPos(e);
      this.isDrawing = true;
      this.prevX = pos.x;
      this.prevY = pos.y;
    };
    
    const draw = (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.drawStroke(this.prevX, this.prevY, pos.x, pos.y);
      this.prevX = pos.x;
      this.prevY = pos.y;
    };
    
    const stopDraw = () => {
      this.isDrawing = false;
    };
    
    this.canvas.addEventListener("mousedown", startDraw);
    this.canvas.addEventListener("mousemove", draw);
    this.canvas.addEventListener("mouseup", stopDraw);
    this.canvas.addEventListener("mouseleave", stopDraw);
    
    this.canvas.addEventListener("touchstart", startDraw);
    this.canvas.addEventListener("touchmove", draw);
    this.canvas.addEventListener("touchend", stopDraw);
  }
  
  drawStroke(x1, y1, x2, y2) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = this.drawColor;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.stroke();
  }
  
  initControls() {
    this.clearBtn.addEventListener("click", () => {
      if (sound.clear) sound.clear();
      this.initCanvasBackground();
      this.feedbackBox.textContent = "";
    });
    
    this.skipBtn.addEventListener("click", () => {
      if (sound.click) sound.click();
      this.nextQuestion();
    });
    
    this.checkBtn.addEventListener("click", () => {
      this.checkSpelling();
    });
    
    if (this.cameraBtn) {
      this.cameraBtn.addEventListener("click", () => {
        if (sound.click) sound.click();
        this.toggleCamera();
      });
    }
  }
  
  loadQuestion() {
    const q = quizWords[this.currentIndex];
    this.imageBox.innerHTML = q.svg;
    this.clueBox.textContent = q.clue;
    this.feedbackBox.textContent = "";
    this.feedbackBox.style.color = "inherit";
    this.initCanvasBackground();
  }
  
  nextQuestion() {
    this.currentIndex = (this.currentIndex + 1) % quizWords.length;
    this.loadQuestion();
  }
  
  checkSpelling() {
    const dataUrl = this.canvas.toDataURL("image/png");
    const target = quizWords[this.currentIndex].word;
    
    this.checkBtn.textContent = "Checking...";
    this.checkBtn.disabled = true;
    this.feedbackBox.textContent = "AI is evaluating your spelling...";
    this.feedbackBox.style.color = "#555";
    
    fetch("/api/predict-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, user: currentUser })
    })
    .then(res => res.json())
    .then(data => {
      this.checkBtn.textContent = "Submit spelling";
      this.checkBtn.disabled = false;
      
      const recognized = data.text.toUpperCase().replace(/[^A-Z]/g, "");
      
      if (recognized === target) {
        if (sound.success) sound.success();
        this.feedbackBox.textContent = "🎉 Correct! Magnificent spelling!";
        this.feedbackBox.style.color = "#6bcb77";
        this.speakText(`Awesome! You spelled ${target} correctly!`);
        
        fetch("/api/log-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: currentUser,
            type: "SpellingGame",
            value: target,
            confidence: 1.0
          })
        });
        
        setTimeout(() => {
          this.nextQuestion();
        }, 2200);
      } else {
        if (sound.fail) sound.fail();
        this.feedbackBox.textContent = `❌ read as: "${data.text}". Try writing clearly!`;
        this.feedbackBox.style.color = "#ff5e97";
        this.speakText(`Almost there! That spelled as ${data.text}. Try drawing again!`);
      }
    })
    .catch(err => {
      this.checkBtn.textContent = "Submit spelling";
      this.checkBtn.disabled = false;
      this.feedbackBox.textContent = "Error submitting spelling.";
      if (sound.fail) sound.fail();
    });
  }
  
  speakText(text) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.35;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
  
  toggleCamera() {
    if (this.cameraActive) {
      this.disableCamera();
    } else {
      this.enableCamera();
    }
  }
  
  enableCamera() {
    stopGlobalCamera();
    this.cameraActive = true;
    this.cameraBtn.textContent = "Disable Camera";
    this.cameraBtn.classList.remove("btn-secondary-action");
    this.cameraBtn.classList.add("btn-primary-action");
    this.video.style.display = "block";
    
    this.handsObj = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    
    this.handsObj.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.7
    });
    
    this.handsObj.onResults((results) => this.processHands(results));
    
    this.cameraObj = new Camera(this.video, {
      onFrame: async () => {
        if (this.cameraActive) {
          await this.handsObj.send({ image: this.video });
        }
      },
      width: 640,
      height: 480
    });
    
    activeCamera = this.cameraObj;
    activeHands = this.handsObj;
    this.cameraObj.start();
  }
  
  disableCamera() {
    this.cameraActive = false;
    if (this.cameraBtn) {
      this.cameraBtn.textContent = "Enable Camera";
      this.cameraBtn.classList.add("btn-secondary-action");
      this.cameraBtn.classList.remove("btn-primary-action");
    }
    this.video.style.display = "none";
    stopGlobalCamera();
  }
  
  processHands(results) {
    if (!this.cameraActive) return;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      const ix = (1 - landmarks[8].x) * this.canvas.width;
      const iy = landmarks[8].y * this.canvas.height;
      
      const indexUp = landmarks[8].y < landmarks[6].y;
      const middleUp = landmarks[12].y < landmarks[10].y;
      
      if (indexUp && !middleUp) {
        if (this.prevX === 0 && this.prevY === 0) {
          this.prevX = ix;
          this.prevY = iy;
        }
        this.drawStroke(this.prevX, this.prevY, ix, iy);
        this.prevX = ix;
        this.prevY = iy;
      } else {
        this.prevX = 0;
        this.prevY = 0;
      }
    } else {
      this.prevX = 0;
      this.prevY = 0;
    }
  }
}

window.addEventListener("portal-open", (e) => {
  if (e.detail.id === "overlay-games") {
    new GameEngine("game-canvas", "game-webcam", "btn-game-camera-toggle", "btn-game-clear", "btn-game-check", "btn-game-skip", "game-image", "game-clue", "game-feedback");
  }
});

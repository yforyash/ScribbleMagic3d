class TracingEngine {
  constructor(canvasId, videoId, cameraBtnId, selectId, verifyBtnId, clearBtnId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.video = document.getElementById(videoId);
    this.cameraBtn = document.getElementById(cameraBtnId);
    this.select = document.getElementById(selectId);
    this.verifyBtn = document.getElementById(verifyBtnId);
    this.clearBtn = document.getElementById(clearBtnId);
    
    this.currentLevel = 1;
    this.isDrawing = false;
    this.prevX = 0;
    this.prevY = 0;
    
    this.drawColor = "#4d96ff";
    this.brushSize = 14;
    
    this.cameraActive = false;
    this.handsObj = null;
    this.cameraObj = null;
    
    this.pointsToTrace = [];
    
    this.initMouseEvents();
    this.initLevelSelectors();
    this.initControls();
    this.loadLevel(1);
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
  
  initLevelSelectors() {
    document.querySelectorAll(".level-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll(".level-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        const lvl = parseInt(card.getAttribute("data-level"));
        if (sound.click) sound.click();
        this.loadLevel(lvl);
      });
    });
    
    this.select.addEventListener("change", () => {
      if (sound.click) sound.click();
      this.drawBackgroundGuide();
    });
  }
  
  loadLevel(lvl) {
    this.currentLevel = lvl;
    this.select.innerHTML = "";
    
    let options = [];
    if (lvl === 1) {
      options = [
        { value: "line-v", text: "Vertical Line" },
        { value: "line-h", text: "Horizontal Line" },
        { value: "circle", text: "Big Circle" },
        { value: "wave", text: "Sine Wave" }
      ];
    } else if (lvl === 2) {
      options = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(c => ({ value: `char-${c}`, text: `Letter ${c}` }));
    } else if (lvl === 3) {
      options = ["CAT", "DOG", "SUN", "TOY", "STAR", "FISH", "BIRD", "TREE"].map(w => ({ value: `word-${w}`, text: w }));
    } else if (lvl === 4) {
      options = [{ value: "free", text: "Lined Board" }];
    }
    
    options.forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.text;
      this.select.appendChild(el);
    });
    
    this.drawBackgroundGuide();
  }
  
  drawBackgroundGuide() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.pointsToTrace = [];
    const val = this.select.value;
    
    if (val === "line-v") {
      this.drawGuideLine(400, 80, 400, 420);
      for (let y = 80; y <= 420; y += 15) {
        this.pointsToTrace.push({ x: 400, y: y });
      }
    } else if (val === "line-h") {
      this.drawGuideLine(150, 250, 650, 250);
      for (let x = 150; x <= 650; x += 15) {
        this.pointsToTrace.push({ x: x, y: 250 });
      }
    } else if (val === "circle") {
      this.ctx.beginPath();
      this.ctx.arc(400, 250, 130, 0, 2 * Math.PI);
      this.ctx.strokeStyle = "#e2e8f0";
      this.ctx.lineWidth = 15;
      this.ctx.stroke();
      for (let th = 0; th < 2 * Math.PI; th += 0.08) {
        this.pointsToTrace.push({
          x: 400 + 130 * Math.cos(th),
          y: 250 + 130 * Math.sin(th)
        });
      }
    } else if (val === "wave") {
      this.ctx.beginPath();
      let drawing = false;
      for (let x = 150; x <= 650; x += 5) {
        let y = 250 + 90 * Math.sin((x - 150) / 45);
        if (!drawing) {
          this.ctx.moveTo(x, y);
          drawing = true;
        } else {
          this.ctx.lineTo(x, y);
        }
        if (x % 15 === 0) {
          this.pointsToTrace.push({ x: x, y: y });
        }
      }
      this.ctx.strokeStyle = "#e2e8f0";
      this.ctx.lineWidth = 15;
      this.ctx.stroke();
    } else if (val.startsWith("char-")) {
      const char = val.split("-")[1];
      this.rasterizeText(char, 290);
    } else if (val.startsWith("word-")) {
      const word = val.split("-")[1];
      this.rasterizeText(word, 140);
    } else if (val === "free") {
      this.drawFreeLines();
    }
  }
  
  drawGuideLine(x1, y1, x2, y2) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = "#e2e8f0";
    this.ctx.lineWidth = 15;
    this.ctx.lineCap = "round";
    this.ctx.stroke();
  }
  
  drawFreeLines() {
    this.ctx.beginPath();
    for (let y = 100; y <= 400; y += 80) {
      this.ctx.moveTo(50, y);
      this.ctx.lineTo(750, y);
    }
    this.ctx.strokeStyle = "#cfe3ff";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.moveTo(120, 0);
    this.ctx.lineTo(120, 500);
    this.ctx.strokeStyle = "#ffd0df";
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }
  
  rasterizeText(text, size) {
    this.ctx.font = `bold ${size}px Fredoka, Quicksand, sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    
    this.ctx.fillStyle = "#f1f5f9";
    this.ctx.fillText(text, 400, 240);
    
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = "#cbd5e1";
    this.ctx.strokeText(text, 400, 240);
    
    const offscreen = document.createElement("canvas");
    offscreen.width = this.canvas.width;
    offscreen.height = this.canvas.height;
    const octx = offscreen.getContext("2d");
    
    octx.font = `bold ${size}px Fredoka, Quicksand, sans-serif`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillStyle = "#ffffff";
    octx.fillText(text, 400, 240);
    
    const imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
    const step = 12;
    for (let y = 0; y < offscreen.height; y += step) {
      for (let x = 0; x < offscreen.width; x += step) {
        const idx = (y * offscreen.width + x) * 4;
        if (imgData.data[idx] > 200) {
          this.pointsToTrace.push({ x: x, y: y });
        }
      }
    }
  }
  
  initControls() {
    this.clearBtn.addEventListener("click", () => {
      if (sound.clear) sound.clear();
      this.drawBackgroundGuide();
    });
    
    this.verifyBtn.addEventListener("click", () => {
      this.verifyTrace();
    });
    
    if (this.cameraBtn) {
      this.cameraBtn.addEventListener("click", () => {
        if (sound.click) sound.click();
        this.toggleCamera();
      });
    }
  }
  
  verifyTrace() {
    if (this.currentLevel === 4) {
      if (sound.success) sound.success();
      alert("Beautiful free writing!");
      return;
    }
    
    if (this.pointsToTrace.length === 0) return;
    
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    let hits = 0;
    
    this.pointsToTrace.forEach(pt => {
      const radius = 18;
      let hit = false;
      
      for (let dy = -radius; dy <= radius; dy += 4) {
        for (let dx = -radius; dx <= radius; dx += 4) {
          const px = Math.floor(pt.x + dx);
          const py = Math.floor(pt.y + dy);
          
          if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
            const idx = (py * this.canvas.width + px) * 4;
            const r = imgData.data[idx];
            const g = imgData.data[idx + 1];
            const b = imgData.data[idx + 2];
            
            if (r === 77 && g === 150 && b === 255) {
              hit = true;
              break;
            }
          }
        }
        if (hit) break;
      }
      
      if (hit) hits++;
    });
    
    const score = (hits / this.pointsToTrace.length) * 100;
    
    if (score > 60) {
      if (sound.success) sound.success();
      alert(`Success! Tracing score: ${score.toFixed(0)}%`);
      
      fetch("/api/log-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: currentUser,
          type: "Tracing",
          value: this.select.value,
          confidence: score / 100
        })
      });
      
    } else {
      if (sound.fail) sound.fail();
      alert(`Try again! Tracing score: ${score.toFixed(0)}%`);
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
  if (e.detail.id === "overlay-tracing") {
    new TracingEngine("trace-canvas", "trace-webcam", "btn-trace-camera-toggle", "trace-pattern-select", "btn-trace-verify", "btn-trace-clear");
  }
});

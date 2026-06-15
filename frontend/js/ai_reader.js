class AiReaderEngine {
  constructor(canvasId, videoId, cameraBtnId, clearBtnId, predictBtnId, modeSelectId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.video = document.getElementById(videoId);
    this.cameraBtn = document.getElementById(cameraBtnId);
    this.clearBtn = document.getElementById(clearBtnId);
    this.predictBtn = document.getElementById(predictBtnId);
    this.modeSelect = document.getElementById(modeSelectId);
    
    this.isDrawing = false;
    this.prevX = 0;
    this.prevY = 0;
    
    this.drawColor = "#000000";
    this.brushSize = 18;
    
    this.cameraActive = false;
    this.handsObj = null;
    this.cameraObj = null;
    
    this.initCanvasBackground();
    this.initMouseEvents();
    this.initControls();
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
      
      document.getElementById("ai-output-placeholder").style.display = "block";
      document.getElementById("ai-output-val").style.display = "none";
      document.getElementById("ai-output-txt").style.display = "none";
      document.getElementById("ai-output-conf").style.display = "none";
    });
    
    this.predictBtn.addEventListener("click", () => {
      this.runAiGuess();
    });
    
    if (this.cameraBtn) {
      this.cameraBtn.addEventListener("click", () => {
        if (sound.click) sound.click();
        this.toggleCamera();
      });
    }
  }
  
  runAiGuess() {
    const dataUrl = this.canvas.toDataURL("image/png");
    const mode = this.modeSelect.value;
    const url = mode === "digit" ? "/api/predict-digit" : "/api/predict-text";
    
    this.predictBtn.textContent = "AI Reading...";
    this.predictBtn.disabled = true;
    
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, user: currentUser })
    })
    .then(res => res.json())
    .then(data => {
      this.predictBtn.textContent = "AI Guess Now";
      this.predictBtn.disabled = false;
      
      document.getElementById("ai-output-placeholder").style.display = "none";
      const valEl = document.getElementById("ai-output-val");
      const txtEl = document.getElementById("ai-output-txt");
      const confEl = document.getElementById("ai-output-conf");
      
      if (mode === "digit") {
        valEl.textContent = data.digit;
        valEl.style.display = "block";
        txtEl.style.display = "none";
        
        confEl.textContent = `Confidence: ${(data.confidence * 100).toFixed(0)}%`;
        confEl.style.display = "block";
        
        if (sound.success) sound.success();
        this.speakText(`I guess the digit is ${data.digit}`);
      } else {
        txtEl.textContent = data.text;
        txtEl.style.display = "block";
        valEl.style.display = "none";
        confEl.style.display = "none";
        
        if (sound.success) sound.success();
        this.speakText(`I read the text: ${data.text}`);
      }
    })
    .catch(err => {
      this.predictBtn.textContent = "AI Guess Now";
      this.predictBtn.disabled = false;
      if (sound.fail) sound.fail();
      alert("AI reading failed!");
    });
  }
  
  speakText(text) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.3;
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
  if (e.detail.id === "overlay-ai-reader") {
    new AiReaderEngine("ai-canvas", "ai-webcam", "btn-ai-camera-toggle", "btn-ai-clear", "btn-ai-predict", "ai-mode-select");
  }
});

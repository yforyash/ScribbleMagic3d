let activeCamera = null;
let activeHands = null;

function stopGlobalCamera() {
  if (activeCamera) {
    try {
      activeCamera.stop();
    } catch(e) {}
    activeCamera = null;
  }
  if (activeHands) {
    try {
      activeHands.close();
    } catch(e) {}
    activeHands = null;
  }
  document.querySelectorAll("video").forEach(v => {
    if (v.srcObject) {
      v.srcObject.getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
  });
}

window.addEventListener("portal-close", () => {
  stopGlobalCamera();
});

class AirDrawingEngine {
  constructor(canvasId, videoId, cameraBtnId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.video = document.getElementById(videoId);
    this.cameraBtn = document.getElementById(cameraBtnId);
    
    this.isDrawing = false;
    this.prevX = 0;
    this.prevY = 0;
    
    this.currentColor = "#ff5e97";
    this.brushSize = 10;
    
    this.cameraActive = false;
    this.handsObj = null;
    this.cameraObj = null;
    
    this.initMouseEvents();
    this.initControls();
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
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.stroke();
  }
  
  initControls() {
    const colorsRow = document.getElementById("draw-colors");
    if (colorsRow) {
      colorsRow.querySelectorAll(".color-option").forEach(opt => {
        opt.addEventListener("click", () => {
          colorsRow.querySelectorAll(".color-option").forEach(o => o.classList.remove("active"));
          opt.classList.add("active");
          this.currentColor = opt.getAttribute("data-color");
          if (sound.click) sound.click();
        });
      });
    }
    
    const slider = document.getElementById("draw-brush-size");
    if (slider) {
      slider.addEventListener("input", (e) => {
        this.brushSize = parseInt(e.target.value);
      });
    }
    
    const clearBtn = document.getElementById("btn-draw-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (sound.clear) sound.clear();
      });
    }
    
    const saveBtn = document.getElementById("btn-draw-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const link = document.createElement("a");
        link.download = `scribble_${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
        if (sound.success) sound.success();
      });
    }
    
    if (this.cameraBtn) {
      this.cameraBtn.addEventListener("click", () => {
        if (sound.click) sound.click();
        this.toggleCamera();
      });
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
  if (e.detail.id === "overlay-air-draw") {
    new AirDrawingEngine("draw-canvas", "draw-webcam", "btn-draw-camera-toggle");
  }
});

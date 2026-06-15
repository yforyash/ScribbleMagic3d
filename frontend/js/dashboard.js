class DashboardEngine {
  constructor(totalId, accId, digitsId, wordsId, rowsId, downloadBtnId, clearBtnId) {
    this.totalEl = document.getElementById(totalId);
    this.accEl = document.getElementById(accId);
    this.digitsEl = document.getElementById(digitsId);
    this.wordsEl = document.getElementById(wordsId);
    this.rowsEl = document.getElementById(rowsId);
    this.downloadBtn = document.getElementById(downloadBtnId);
    this.clearBtn = document.getElementById(clearBtnId);
    
    this.historyData = [];
    
    this.initControls();
    this.fetchData();
  }
  
  initControls() {
    this.downloadBtn.addEventListener("click", () => {
      this.downloadCsv();
    });
    
    this.clearBtn.addEventListener("click", () => {
      this.clearHistory();
    });
  }
  
  fetchData() {
    fetch(`/api/history/${currentUser}`)
      .then(res => res.json())
      .then(data => {
        this.historyData = data;
        this.renderStats();
        this.renderTable();
      })
      .catch(err => {
        alert("Failed to load dashboard data.");
      });
  }
  
  renderStats() {
    const total = this.historyData.length;
    this.totalEl.textContent = total;
    
    const tracingLogs = this.historyData.filter(d => d.type === "Tracing");
    if (tracingLogs.length > 0) {
      const avgAcc = tracingLogs.reduce((sum, d) => sum + d.confidence, 0) / tracingLogs.length;
      this.accEl.textContent = `${(avgAcc * 100).toFixed(0)}%`;
    } else {
      this.accEl.textContent = "0%";
    }
    
    const digits = this.historyData.filter(d => d.type === "Digit").length;
    this.digitsEl.textContent = digits;
    
    const words = this.historyData.filter(d => d.type === "OCR" || d.type === "SpellingGame").length;
    this.wordsEl.textContent = words;
  }
  
  renderTable() {
    this.rowsEl.innerHTML = "";
    
    if (this.historyData.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" style="text-align:center;color:#999;padding:30px;">No learning history logged yet. Start playing!</td>`;
      this.rowsEl.appendChild(tr);
      return;
    }
    
    this.historyData.forEach(row => {
      const tr = document.createElement("tr");
      
      let scoreText = "-";
      if (row.type === "Tracing") {
        scoreText = `${(row.confidence * 100).toFixed(0)}% Match`;
      } else if (row.type === "Digit") {
        scoreText = `${(row.confidence * 100).toFixed(0)}% Conf`;
      } else if (row.type === "SpellingGame") {
        scoreText = "100% Correct";
      }
      
      tr.innerHTML = `
        <td><strong>${row.type}</strong></td>
        <td><code>${row.value}</code></td>
        <td>${scoreText}</td>
        <td>${row.timestamp}</td>
      `;
      this.rowsEl.appendChild(tr);
    });
  }
  
  downloadCsv() {
    if (this.historyData.length === 0) {
      alert("No data available to download.");
      return;
    }
    
    let csv = "Activity,Value,Confidence,Timestamp\n";
    this.historyData.forEach(d => {
      csv += `"${d.type}","${d.value}",${d.confidence},"${d.timestamp}"\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `scribble_progress_${currentUser}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (sound.success) sound.success();
  }
  
  clearHistory() {
    if (!confirm("Are you sure you want to clear all history logs? This cannot be undone.")) {
      return;
    }
    
    fetch(`/api/clear-history/${currentUser}`, { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (sound.clear) sound.clear();
        this.fetchData();
      })
      .catch(err => {
        alert("Failed to clear logs.");
      });
  }
}

window.addEventListener("portal-open", (e) => {
  if (e.detail.id === "overlay-dashboard") {
    new DashboardEngine("stat-total-draws", "stat-avg-accuracy", "stat-digits-spotted", "stat-words-learned", "history-rows", "btn-dash-download", "btn-dash-clear");
  }
});

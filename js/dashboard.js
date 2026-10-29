/* ============================================
   DASHBOARD JS — Firebase + Charts + Alerts
   Matches reference layout: 3 cards + chart + alerts table
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---- State ----
  const state = {
    temperature: null,
    humidity: null,
    moisture: null,
    fan: false,
    history: { timestamps: [], temperatures: [], moistures: [] },
    alerts: [],
    connected: false,
    lastUpdate: null
  };

  // ---- DOM references ----
  const dom = {
    tempValue: document.getElementById('tempValue'),
    moistureValue: document.getElementById('moistureValue'),
    fanValue: document.getElementById('fanValue'),
    fanIcon: document.getElementById('fanIcon'),
    tempBadge: document.getElementById('tempBadge'),
    moistureBadge: document.getElementById('moistureBadge'),
    fanBadge: document.getElementById('fanBadge'),
    tempCard: document.getElementById('tempCard'),
    moistureCard: document.getElementById('moistureCard'),
    fanCard: document.getElementById('fanCard'),
    tempMarker: document.getElementById('tempMarker'),
    moistureMarker: document.getElementById('moistureMarker'),
    connectionStatus: document.getElementById('connectionStatus'),
    dashDatetime: document.getElementById('dashDatetime'),
    alertsBody: document.getElementById('alertsBody')
  };

  // ---- Chart Setup ----
  const ctx = document.getElementById('mainChart');
  let mainChart = null;
  if (ctx) {
    mainChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Temperature (°C)',
            data: [],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ef4444',
            yAxisID: 'y'
          },
          {
            label: 'Moisture (%)',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#3b82f6',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { family: 'Inter', weight: '600' },
            bodyFont: { family: 'Inter' },
            padding: 12,
            cornerRadius: 8,
            displayColors: true
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#94a3b8',
              maxTicksLimit: 12
            }
          },
          y: {
            position: 'left',
            title: {
              display: true,
              text: 'Temperature (°C)',
              font: { family: 'Inter', size: 12, weight: '600' },
              color: '#ef4444'
            },
            min: 0,
            max: 60,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#94a3b8'
            }
          },
          y1: {
            position: 'right',
            title: {
              display: true,
              text: 'Moisture (%)',
              font: { family: 'Inter', size: 12, weight: '600' },
              color: '#3b82f6'
            },
            min: 0,
            max: 100,
            grid: { drawOnChartArea: false },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#94a3b8'
            }
          }
        }
      }
    });
  }

  // ---- Update Dashboard ----
  function updateDashboard(data) {
    if (!data) return;

    const temp = data.temp !== undefined ? data.temp : data.temperature;
    const hum = data.hum !== undefined ? data.hum : data.humidity;
    const moist = data.moisture;
    const fan = data.fan;

    state.temperature = temp;
    state.humidity = hum;
    state.moisture = moist;
    state.fan = fan;
    state.lastUpdate = new Date();

    // Update values
    if (dom.tempValue) dom.tempValue.textContent = temp !== null && temp !== undefined ? temp.toFixed(1) : '--';
    if (dom.moistureValue) dom.moistureValue.textContent = moist !== null && moist !== undefined ? moist : '--';
    if (dom.fanValue) dom.fanValue.textContent = fan ? 'ON' : 'OFF';

    // Fan spinning
    if (dom.fanIcon) {
      if (fan) {
        dom.fanIcon.classList.add('spinning');
        dom.fanValue.style.color = '#22c55e';
      } else {
        dom.fanIcon.classList.remove('spinning');
        dom.fanValue.style.color = '#ef4444';
      }
    }

    // Badges
    if (temp !== null && temp !== undefined) {
      updateBadge(dom.tempBadge, dom.tempCard, temp, 30, 40);
      // Position marker: map 0-60 to 0-100%
      if (dom.tempMarker) dom.tempMarker.style.left = Math.min(100, Math.max(0, (temp / 60) * 100)) + '%';
    }
    if (moist !== null && moist !== undefined) {
      updateBadge(dom.moistureBadge, dom.moistureCard, moist, 50, 65);
      if (dom.moistureMarker) dom.moistureMarker.style.left = Math.min(100, Math.max(0, moist)) + '%';
    }
    if (dom.fanBadge) dom.fanBadge.textContent = 'Auto Mode';

    // Add to history
    const timeStr = state.lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    state.history.timestamps.push(timeStr);
    state.history.temperatures.push(temp);
    state.history.moistures.push(moist);

    // Keep last 50 data points
    const MAX_POINTS = 50;
    if (state.history.timestamps.length > MAX_POINTS) {
      state.history.timestamps.shift();
      state.history.temperatures.shift();
      state.history.moistures.shift();
    }

    // Update chart
    if (mainChart) {
      mainChart.data.labels = state.history.timestamps;
      mainChart.data.datasets[0].data = state.history.temperatures;
      mainChart.data.datasets[1].data = state.history.moistures;
      mainChart.update('none');
    }

    // Generate alerts
    checkAlerts(temp, moist, fan);

    // Update datetime
    if (dom.dashDatetime) {
      dom.dashDatetime.textContent = state.lastUpdate.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      }) + '  ' + state.lastUpdate.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
  }

  function updateBadge(badge, card, value, min, max) {
    if (!badge) return;
    if (value >= min && value <= max) {
      badge.textContent = 'In Range';
      badge.className = 'metric-badge in-range';
      if (card) card.className = 'metric-card normal';
    } else if (value > max) {
      badge.textContent = 'High';
      badge.className = 'metric-badge out-range';
      if (card) card.className = 'metric-card alert-high';
    } else {
      badge.textContent = 'Low';
      badge.className = 'metric-badge out-range';
      if (card) card.className = 'metric-card alert-low';
    }
  }

  function checkAlerts(temp, moist, fan) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    if (temp !== null && temp !== undefined) {
      if (temp > 40) {
        addAlert(timeStr, 'Temperature High', temp.toFixed(1) + ' °C', 'high');
      } else if (temp < 30 && temp > 0) {
        addAlert(timeStr, 'Temperature Low', temp.toFixed(1) + ' °C', 'low');
      }
    }

    if (moist !== null && moist !== undefined) {
      if (moist > 65) {
        addAlert(timeStr, 'Moisture High', moist + ' %', 'high');
      } else if (moist < 50 && moist > 0) {
        addAlert(timeStr, 'Moisture Low', moist + ' %', 'low');
      }
    }

    if (fan) {
      addAlert(timeStr, 'Fan ON (Auto)', '—', 'info');
    }
  }

  function addAlert(time, event, value, type) {
    // Avoid duplicate consecutive alerts
    if (state.alerts.length > 0) {
      const last = state.alerts[0];
      if (last.event === event) return;
    }

    state.alerts.unshift({ time, event, value, type });

    // Keep last 10
    if (state.alerts.length > 10) state.alerts.pop();

    renderAlerts();
  }

  function renderAlerts() {
    if (!dom.alertsBody) return;
    dom.alertsBody.innerHTML = state.alerts.map(a => `
      <tr>
        <td><code>${a.time}</code></td>
        <td>
          <span class="alert-event">
            <span class="alert-dot ${a.type}"></span>
            ${a.event}
          </span>
        </td>
        <td>${a.value}</td>
      </tr>
    `).join('');
  }

  function setConnectionStatus(status) {
    const el = dom.connectionStatus;
    if (!el) return;
    const dot = el.querySelector('.status-dot');
    const text = el.querySelector('.status-text');

    if (status === 'online') {
      dot.className = 'status-dot online';
      text.textContent = 'Online';
      state.connected = true;
    } else if (status === 'offline') {
      dot.className = 'status-dot offline';
      text.textContent = 'Connecting…';
      state.connected = false;
    } else {
      dot.className = 'status-dot error';
      text.textContent = 'Error';
      state.connected = false;
    }
  }

  // ---- Firebase Listener ----
  function startFirebaseListener() {
    try {
      const rootRef = database.ref('/');
      rootRef.once('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setConnectionStatus('online');
          console.log('Firebase data found:', val);

          let dataPath = '/';
          if (val.compost) dataPath = 'compost';
          else if (val.sensor) dataPath = 'sensor';
          else if (val.data) dataPath = 'data';
          else if (val.readings) dataPath = 'readings';

          database.ref(dataPath).on('value', (snap) => {
            const data = snap.val();
            if (data) {
              const sensorData = data.current || data;
              updateDashboard(sensorData);
            }
          });
        } else {
          console.log('No data in Firebase yet. Starting demo mode.');
          setConnectionStatus('offline');
          startDemoMode();
        }
      }).catch((err) => {
        console.warn('Firebase read error:', err.message);
        setConnectionStatus('offline');
        startDemoMode();
      });

      database.ref('.info/connected').on('value', (snap) => {
        if (snap.val() === true) {
          setConnectionStatus('online');
        } else {
          setConnectionStatus('offline');
        }
      });

    } catch (e) {
      console.warn('Firebase not available, starting demo mode.', e);
      setConnectionStatus('offline');
      startDemoMode();
    }
  }

  // ---- Demo Mode (simulated data when Firebase is empty) ----
  function startDemoMode() {
    console.log('Demo mode active — showing simulated data');

    // Seed initial alerts
    state.alerts = [
      { time: '14:10', event: 'Moisture Low', value: '42 %', type: 'low' },
      { time: '13:45', event: 'Fan ON (Auto)', value: '—', type: 'info' },
      { time: '12:30', event: 'Temperature High', value: '43.5 °C', type: 'high' },
      { time: '11:15', event: 'Moisture Low', value: '48 %', type: 'low' },
      { time: '10:00', event: 'System Start', value: '—', type: 'info' }
    ];
    renderAlerts();

    // Seed initial chart data (24 hours)
    for (let h = 0; h <= 24; h += 1) {
      const hourStr = String(h).padStart(2, '0') + ':00';
      state.history.timestamps.push(hourStr);
      // Simulate temp: ~32-46°C with daily cycle
      const t = 36 + 8 * Math.sin((h - 6) * Math.PI / 12) + (Math.random() - 0.5) * 2;
      state.history.temperatures.push(parseFloat(t.toFixed(1)));
      // Simulate moisture: ~40-65%
      const m = 52 + 10 * Math.sin((h - 12) * Math.PI / 12) + (Math.random() - 0.5) * 4;
      state.history.moistures.push(parseFloat(m.toFixed(0)));
    }

    // Initial render
    const initialData = {
      temp: 32.5,
      hum: 65.2,
      moisture: 58,
      fan: true
    };
    updateDashboard(initialData);

    // Simulate periodic updates
    setInterval(() => {
      const lastTemp = state.history.temperatures[state.history.temperatures.length - 1];
      const lastMoist = state.history.moistures[state.history.moistures.length - 1];

      const newTemp = lastTemp + (Math.random() - 0.5) * 2;
      const newMoist = Math.max(0, Math.min(100, lastMoist + (Math.random() - 0.5) * 3));
      const newHum = 60 + (Math.random() - 0.5) * 10;

      updateDashboard({
        temp: parseFloat(newTemp.toFixed(1)),
        hum: parseFloat(newHum.toFixed(1)),
        moisture: Math.round(newMoist),
        fan: newTemp > 30
      });
    }, 5000);
  }

  // ---- Initialize ----
  if (typeof firebase !== 'undefined' && typeof database !== 'undefined') {
    startFirebaseListener();
  } else {
    console.log('Firebase SDK not loaded, starting demo mode.');
    setConnectionStatus('offline');
    startDemoMode();
  }

  // Update clock
  setInterval(() => {
    if (dom.dashDatetime && !state.connected) {
      const now = new Date();
      dom.dashDatetime.textContent = now.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      }) + '  ' + now.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
  }, 1000);
});

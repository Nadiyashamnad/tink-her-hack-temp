// ============================================
//  CycleSense – Main App Logic  •  v2.0
// ============================================

(function () {
    'use strict';

    // ---- State ----
    let currentPage = 'dashboard';
    let privacyMode = false;
    let selectedMood = '';
    let selectedFoodCategory = 'healthy';
    let charts = {};

    // ---- Wellness Tips rotation ----
    const TIPS = [
        { icon: '🧘‍♀️', title: 'Mindful Movement', text: 'Gentle yoga and stretching can help alleviate pelvic pain. Even 15 minutes a day makes a difference.' },
        { icon: '🥗', title: 'Anti-Inflammatory Diet', text: 'Leafy greens, berries, and omega-3-rich fish may reduce PCOS and endometriosis symptoms.' },
        { icon: '💧', title: 'Stay Hydrated', text: 'Drinking 8+ glasses of water daily can reduce bloating and support hormone balance.' },
        { icon: '😴', title: 'Prioritise Sleep', text: 'Aiming for 7–9 hours of sleep helps regulate cortisol which directly impacts your hormonal health.' },
        { icon: '🌞', title: 'Vitamin D Matters', text: 'Low Vitamin D is linked to PCOS. Short sun exposure or supplements can support ovarian health.' },
        { icon: '🫁', title: 'Breathe Deeply', text: 'Diaphragmatic breathing activates the parasympathetic system, reducing inflammation and pelvic tension.' },
    ];

    // ---- Init ----
    document.addEventListener('DOMContentLoaded', () => {
        loadSettings();
        setupNav();
        setupHamburger();
        checkAuth();
        updateHeaderDate();
        initSymptomTracker();
        updateNotificationBadge();
        checkSystemAlerts();
    });

    function checkAuth() {
        // No authentication required, but keeping the function structure for feature flags/future use
        const sidebar = document.getElementById('sidebar');
        const hBtn = document.getElementById('hamburger-btn');
        const bNav = document.getElementById('bottom-nav');

        if (sidebar) sidebar.style.display = 'flex';
        if (hBtn) hBtn.style.display = 'flex';
        if (bNav) bNav.style.display = 'flex';

        navigateTo('dashboard');
        syncAndRefresh();
        updateUserName();
    }

    async function syncAndRefresh() {
        await Promise.all([
            CycleStorage.syncSymptoms(),
            CycleStorage.syncFoods()
        ]);
        if (currentPage === 'dashboard') renderDashboard();
        else if (currentPage === 'symptoms') renderSymptomHistory();
        else if (currentPage === 'food') renderFoodList();
    }


    // ---- Date ----
    function updateHeaderDate() {
        const el = document.getElementById('header-date');
        if (!el) return;
        const now = new Date();
        el.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    function updateUserName() {
        const user = CycleStorage.getUser();
        document.querySelectorAll('[data-user-name]').forEach(el => {
            el.textContent = user.name;
        });
    }

    // ---- Navigation ----
    function setupNav() {
        document.querySelectorAll('[data-page]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                navigateTo(el.getAttribute('data-page'));
                closeSidebar();
            });
        });
    }

    function navigateTo(page) {
        currentPage = page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('page-' + page);
        if (target) target.classList.add('active');
        document.querySelectorAll('[data-page]').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-page') === page);
        });
        renderPage(page);
    }

    function renderPage(page) {
        switch (page) {
            case 'dashboard': renderDashboard(); break;
            case 'symptoms': renderSymptomHistory(); break;
            case 'food': renderFoodList(); break;
            case 'water': renderWaterTracker(); break;
            case 'risk': renderRiskScore(); break;
            case 'patterns': renderCharts(); break;
            case 'analysis': renderAnalysis(); break;
            case 'doctors': break; // static
            case 'report': renderReport(); break;
            case 'settings': renderSettings(); break;
            case 'notifications': renderNotifications(); break;
        }
    }

    // ---- Hamburger ----
    function setupHamburger() {
        const btn = document.getElementById('hamburger-btn');
        const overlay = document.getElementById('sidebar-overlay');
        if (btn) btn.addEventListener('click', openSidebar);
        if (overlay) overlay.addEventListener('click', closeSidebar);
    }
    function openSidebar() {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebar-overlay').classList.add('open');
    }
    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('open');
    }

    // ---- Privacy Mode ----
    function loadSettings() {
        const s = CycleStorage.getSettings();
        privacyMode = s.privacyMode;
        applyPrivacyMode();

        applyTheme(s.theme || 'light');
    }

    window.toggleTheme = function () {
        const s = CycleStorage.getSettings();
        const newTheme = s.theme === 'dark' ? 'light' : 'dark';
        s.theme = newTheme;
        CycleStorage.saveSettings(s);
        applyTheme(newTheme);
        showNotification(`${newTheme === 'dark' ? '🌙 Dark' : '☀️ Bright'} Mode active`, 'info');
    };

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    window.togglePrivacy = function (checkbox) {
        privacyMode = checkbox.checked;
        const s = CycleStorage.getSettings();
        s.privacyMode = privacyMode;
        CycleStorage.saveSettings(s);
        applyPrivacyMode();
        document.querySelectorAll('.privacy-toggle-cb').forEach(cb => {
            cb.checked = privacyMode;
        });
        showNotification(privacyMode ? '🔒 Privacy Mode enabled' : '🔓 Privacy Mode disabled', 'info');
    };

    function applyPrivacyMode() {
        document.body.classList.toggle('privacy-mode', privacyMode);
        document.querySelectorAll('.privacy-toggle-cb').forEach(cb => {
            cb.checked = privacyMode;
        });
    }

    // ---- DASHBOARD ----
    function renderDashboard() {
        const user = CycleStorage.getUser();
        const symptoms = CycleStorage.getSymptoms();
        const risk = RiskCalculator.compute();
        const today = new Date().toISOString().split('T')[0];
        const todaySymptoms = symptoms.filter(s => s.date === today);

        // Greeting
        const hr = new Date().getHours();
        const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
        const greetEl = document.getElementById('dashboard-greeting');
        if (greetEl) greetEl.textContent = `${greeting}, `;

        // Cycle progress
        const pct = Math.min(100, Math.round((user.cycleDay / user.cycleLength) * 100));
        const fill = document.getElementById('cycle-fill');
        if (fill) fill.style.width = pct + '%';
        const cycEl = document.getElementById('cycle-day-display');
        if (cycEl) cycEl.textContent = `Day ${user.cycleDay} of ${user.cycleLength}`;

        // Today's log
        const symEl = document.getElementById('today-symptoms');
        if (symEl) {
            symEl.innerHTML = todaySymptoms.length === 0
                ? '<span style="color:var(--text-muted)">Nothing logged today</span>'
                : `Pain: <strong>${todaySymptoms[0].pain}/10</strong> &nbsp;·&nbsp; Mood: ${todaySymptoms[0].mood || '—'} &nbsp;·&nbsp; Fatigue: <strong>${todaySymptoms[0].fatigue}/10</strong>`;
        }

        // Risk
        const riskEl = document.getElementById('dash-risk-score');
        const riskLabel = document.getElementById('dash-risk-label');
        if (riskEl) riskEl.textContent = risk.score;
        if (riskLabel) {
            riskLabel.textContent = risk.level.charAt(0).toUpperCase() + risk.level.slice(1) + ' Risk';
            riskLabel.className = 'card-sub risk-score-label risk-label-' + risk.level;
        }

        // Rotating wellness tip
        const tip = TIPS[Math.floor(Date.now() / 1000 / 60 / 60) % TIPS.length];
        const tipEl = document.getElementById('daily-tip');
        if (tipEl) {
            tipEl.innerHTML = `
                <div class="tip-card">
                    <div class="tip-icon">${tip.icon}</div>
                    <div>
                        <div class="tip-title">${tip.title}</div>
                        <div class="tip-text">${tip.text}</div>
                    </div>
                </div>`;
        }
    }

    // ---- SYMPTOM TRACKER ----
    window.initSymptomTracker = function () {
        const painSlider = document.getElementById('pain-slider');
        const painDisplay = document.getElementById('pain-value');
        const fatigueSlider = document.getElementById('fatigue-slider');
        const fatigueDisplay = document.getElementById('fatigue-value');

        if (painSlider) painSlider.addEventListener('input', () => { if (painDisplay) painDisplay.textContent = painSlider.value; });
        if (fatigueSlider) fatigueSlider.addEventListener('input', () => { if (fatigueDisplay) fatigueDisplay.textContent = fatigueSlider.value; });

        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedMood = btn.getAttribute('data-mood');
            });
        });
    };

    window.saveSymptoms = async function () {
        const pain = parseInt(document.getElementById('pain-slider')?.value || 5);
        const fatigue = parseInt(document.getElementById('fatigue-slider')?.value || 5);
        const periodStart = document.getElementById('period-start')?.value || '';
        const periodEnd = document.getElementById('period-end')?.value || '';

        try {
            // Save to Backend
            console.log("1")
            await CycleStorage.apiRequest('/period/add', 'POST', {
                startDate: periodStart || new Date().toISOString(),
                endDate: periodEnd || null,
                painLevel: pain,
                fatigueLevel: fatigue,
                mood: selectedMood
            });

            // Still save to local for immediate UI update (syncAndRefresh will overwrite later)
            CycleStorage.addSymptom({ pain, fatigue, mood: selectedMood, periodStart, periodEnd });
            console.log("2")
            if (periodStart) {
                const start = new Date(periodStart);
                const diff = Math.floor((new Date() - start) / 86400000) + 1;
                const user = CycleStorage.getUser();
                user.cycleDay = Math.max(1, diff);
                user.periodStart = periodStart;
                if (periodEnd) user.periodEnd = periodEnd;
                CycleStorage.saveUser(user);
            }

            showNotification('✅ Symptoms saved & synced!', 'success');
            syncAndRefresh();
        } catch (e) {
            showNotification('❌ Sync failed: ' + e.message, 'error');
            // Fallback to local only for now?
            CycleStorage.addSymptom({ pain, fatigue, mood: selectedMood, periodStart, periodEnd });
            renderSymptomHistory();
            renderDashboard();
        }

        checkSystemAlerts();
    };

    function renderSymptomHistory() {
        const container = document.getElementById('symptom-history-list');
        if (!container) return;
        const symptoms = CycleStorage.getSymptoms().slice(0, 10);
        if (symptoms.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No symptoms logged yet. Start tracking to see history.</p></div>`;
            return;
        }
        container.innerHTML = symptoms.map(s => `
            <div class="symptom-history-item">
                <div>
                    <strong>${s.date}</strong> &nbsp;·&nbsp;
                    Pain: <strong>${s.pain}/10</strong> &nbsp;·&nbsp;
                    Fatigue: <strong>${s.fatigue}/10</strong>
                    ${s.mood ? ` &nbsp;·&nbsp; ${s.mood}` : ''}
                </div>
                ${s.periodStart ? `<div style="font-size:.75rem;color:var(--text-muted)">🗓 ${s.periodStart}${s.periodEnd ? ' → ' + s.periodEnd : ''}</div>` : ''}
            </div>`).join('');
    }

    // ---- FOOD TRACKER ----
    window.setFoodCategory = function (cat, btn) {
        selectedFoodCategory = cat;
        document.querySelectorAll('.food-chip').forEach(c => c.classList.remove('selected'));
        btn.classList.add('selected');
    };

    window.addFood = async function () {
        const input = document.getElementById('food-input');
        if (!input || !input.value.trim()) { showNotification('⚠️ Enter a food item first', 'warning'); return; }

        showNotification('⏳ Syncing food…', 'info');
        await CycleStorage.addFood({ name: input.value.trim(), category: selectedFoodCategory });
        input.value = '';
        showNotification('🍎 Food logged & synced!', 'success');
        renderFoodList();
    };

    window.deleteFood = async function (id) {
        showNotification('⏳ Removing…', 'info');
        await CycleStorage.deleteFood(id);
        renderFoodList();
        showNotification('🗑️ Item removed', 'success');
    };

    function renderFoodList() {
        const container = document.getElementById('food-list');
        if (!container) return;
        const foods = CycleStorage.getFoods();
        if (foods.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">🍽️</div><p>No foods logged yet. Add your first entry above.</p></div>`;
            return;
        }
        const catEmoji = { healthy: '🥗', junk: '🍔', sugar: '🍰', caffeine: '☕' };
        container.innerHTML = foods.map(f => `
            <div class="food-item cat-${f.category}">
                <div class="food-item-left">
                    <span>${catEmoji[f.category] || '🍽️'}</span>
                    <span style="font-weight:700;color:var(--text-primary)">${escHtml(f.name)}</span>
                    <span class="food-category-badge badge-${f.category}">${cap(f.category)}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:.74rem;color:var(--text-muted)">${f.date}</span>
                    <button class="food-delete-btn" onclick="deleteFood(${f.id})" title="Remove">🗑️</button>
                </div>
            </div>`).join('');
    }

    // ---- WATER TRACKER ----
    const WATER_KEY = 'water_';

    function getTodayWaterKey() {
        return WATER_KEY + new Date().toISOString().split('T')[0];
    }

    function getWaterData(dateKey) {
        return CycleStorage.get(dateKey, { glasses: 0 });
    }

    function saveWaterData(dateKey, data) {
        CycleStorage.set(dateKey, data);
    }

    function getWaterGoal() {
        return parseInt(CycleStorage.get('water_goal', 8));
    }

    function renderWaterTracker() {
        const todayKey = getTodayWaterKey();
        const todayData = getWaterData(todayKey);
        const goal = getWaterGoal();

        // Update date label
        const dateLabel = document.getElementById('water-date-label');
        if (dateLabel) dateLabel.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        // Update count & ring
        updateWaterUI(todayData.glasses, goal);

        // Render glass buttons
        renderWaterGlasses(todayData.glasses, goal);

        // Render weekly history
        renderWaterHistory();

        // Set slider
        const slider = document.getElementById('water-goal-slider');
        const valDisplay = document.getElementById('water-goal-val');
        if (slider) { slider.value = goal; }
        if (valDisplay) valDisplay.textContent = goal;
    }

    function updateWaterUI(current, goal) {
        const countEl = document.getElementById('water-count');
        const goalDisplay = document.getElementById('water-goal-display');
        const ring = document.getElementById('water-ring-circle');

        if (countEl) countEl.textContent = current;
        if (goalDisplay) goalDisplay.textContent = goal;

        if (ring) {
            const circumference = 414.69;
            const pct = Math.min(1, current / goal);
            ring.style.strokeDashoffset = circumference - pct * circumference;
            ring.style.stroke = pct >= 1 ? '#51cf66' : 'url(#waterGrad)';
        }
    }

    function renderWaterGlasses(current, goal) {
        const container = document.getElementById('water-glasses');
        if (!container) return;
        const total = Math.max(goal, current);
        container.innerHTML = Array.from({ length: total }, (_, i) => {
            const filled = i < current;
            return `<button class="water-glass ${filled ? 'filled' : ''}" onclick="window.tapWaterGlass(${i})" title="Glass ${i + 1}">
                <span class="glass-icon">${filled ? '💧' : '🥛'}</span>
            </button>`;
        }).join('');
    }

    window.tapWaterGlass = function (idx) {
        const todayKey = getTodayWaterKey();
        const data = getWaterData(todayKey);
        const goal = getWaterGoal();
        // Toggle: clicking a filled glass at the end removes it; clicking empty fills
        if (idx === data.glasses - 1) {
            data.glasses = Math.max(0, data.glasses - 1);
        } else {
            data.glasses = idx + 1;
        }
        saveWaterData(todayKey, data);
        updateWaterUI(data.glasses, goal);
        renderWaterGlasses(data.glasses, goal);
        if (data.glasses >= goal) showToast('🎉 Daily hydration goal reached!');
    };

    window.addWaterGlass = function () {
        const todayKey = getTodayWaterKey();
        const data = getWaterData(todayKey);
        const goal = getWaterGoal();
        data.glasses += 1;
        saveWaterData(todayKey, data);
        updateWaterUI(data.glasses, goal);
        renderWaterGlasses(data.glasses, goal);
        if (data.glasses === goal) {
            showNotification('🎉 Daily hydration goal reached!', 'success');
            CycleStorage.addAlert({ title: 'Goal Achieved!', text: 'You met your hydration goal for today. Great job! 💧', type: 'success' });
        }
        else showNotification('💧 Glass added!', 'success');
    };

    window.removeWaterGlass = function () {
        const todayKey = getTodayWaterKey();
        const data = getWaterData(todayKey);
        const goal = getWaterGoal();
        if (data.glasses <= 0) { showToast('⚠️ Already at 0'); return; }
        data.glasses -= 1;
        saveWaterData(todayKey, data);
        updateWaterUI(data.glasses, goal);
        renderWaterGlasses(data.glasses, goal);
    };

    window.updateWaterGoal = function (val) {
        CycleStorage.set('water_goal', parseInt(val));
        const display = document.getElementById('water-goal-val');
        if (display) display.textContent = val;
        const todayKey = getTodayWaterKey();
        const data = getWaterData(todayKey);
        updateWaterUI(data.glasses, parseInt(val));
        renderWaterGlasses(data.glasses, parseInt(val));
    };

    function renderWaterHistory() {
        const container = document.getElementById('water-history');
        if (!container) return;
        const goal = getWaterGoal();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = WATER_KEY + d.toISOString().split('T')[0];
            const data = getWaterData(key);
            days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), glasses: data.glasses, goal });
        }
        container.innerHTML = days.map(d => {
            const pct = Math.min(100, Math.round((d.glasses / d.goal) * 100));
            const color = pct >= 100 ? '#51cf66' : pct >= 50 ? '#74c0fc' : '#f7c948';
            return `<div class="water-history-row">
                <span class="water-day-label">${d.label}</span>
                <div class="water-bar-track">
                    <div class="water-bar-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                <span class="water-day-count">${d.glasses}/${d.goal}</span>
            </div>`;
        }).join('');
    }

    // ---- RISK SCORE ----
    function renderRiskScore() {
        const risk = RiskCalculator.compute();
        const scoreEl = document.getElementById('risk-score-value');
        const labelEl = document.getElementById('risk-score-label');
        const explEl = document.getElementById('risk-explanation');

        if (scoreEl) {
            scoreEl.textContent = risk.score;
            scoreEl.className = 'risk-score-value risk-' + risk.level;
        }
        if (labelEl) {
            const labels = { low: 'Low Risk 🌿', medium: 'Moderate Risk ⚠️', high: 'High Risk 🔴' };
            labelEl.textContent = labels[risk.level];
            labelEl.className = 'risk-score-label risk-label-' + risk.level;
        }
        if (explEl) {
            const explains = {
                low: 'Your symptom patterns indicate low risk. Keep logging daily to maintain accurate tracking.',
                medium: 'Some patterns suggest moderate concern. Consider tracking more frequently and consulting a doctor.',
                high: 'Your patterns show elevated markers. Please consult a gynecologist for a comprehensive evaluation.'
            };
            explEl.textContent = explains[risk.level];
        }

        renderGauge(risk.score);

        const factorsEl = document.getElementById('risk-factors');
        if (factorsEl) {
            if (risk.factors.length === 0) {
                factorsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>Log symptoms to generate your risk score.</p></div>`;
            } else {
                factorsEl.innerHTML = risk.factors.map(f => `
                    <div class="risk-factor-item">
                        <span style="min-width:120px">${f.name}</span>
                        <div class="risk-factor-bar">
                            <div class="risk-factor-fill" style="width:${Math.round((f.value / f.max) * 100)}%;background:${f.fill}"></div>
                        </div>
                        <span style="font-size:.8rem;font-weight:800;color:var(--text-primary);min-width:44px;text-align:right">${f.value}/${f.max}</span>
                    </div>`).join('');
            }
        }

        const suggestionsSection = document.getElementById('ai-suggestions-section');
        const suggestionsGrid = document.getElementById('ai-suggestions-grid');

        if (suggestionsGrid) {
            suggestionsSection.style.display = 'block';
            suggestionsGrid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <div class="loader-spinner" style="font-size: 2rem; margin-bottom: 10px;">✨</div>
                    <p style="color: var(--text-secondary); font-weight: 600;">CycleSense AI is thinking...</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">Generating personalized health insights based on your trends</p>
                </div>`;

            // Fetch dynamic suggestions
            const symptoms = CycleStorage.getSymptoms().slice(0, 10);
            const foods = CycleStorage.getFoods();
            const waterToday = getWaterData(getTodayWaterKey());

            const avgPain = symptoms.length ? (symptoms.reduce((s, x) => s + (x.pain || 0), 0) / symptoms.length) : 0;
            const avgFatigue = symptoms.length ? (symptoms.reduce((s, x) => s + (x.fatigue || 0), 0) / symptoms.length) : 0;
            const junkFoods = foods.filter(f => f.category === 'junk' || f.category === 'sugar').length;

            CycleStorage.apiRequest('/ai/suggestions', 'POST', {
                avgPain: avgPain.toFixed(1),
                avgFatigue: avgFatigue.toFixed(1),
                junkFoods,
                waterGlasses: waterToday.glasses
            }).then(suggestions => {
                if (suggestions && suggestions.length > 0) {
                    suggestionsGrid.innerHTML = suggestions.map(s => `
                        <div class="card suggestion-card">
                            <div class="suggestion-icon">${s.icon}</div>
                            <div class="suggestion-title">${s.title}</div>
                            <div class="suggestion-text">${s.text}</div>
                        </div>
                    `).join('');
                } else {
                    suggestionsSection.style.display = 'none';
                }
            }).catch(err => {
                console.error("AI Suggestions Error:", err);
                suggestionsGrid.innerHTML = `
                    <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-muted);">
                        <p>⚠️ AI suggestions are currently unavailable.</p>
                        <p style="font-size: 0.75rem; color: #ff6b6b; margin-top: 5px;">${err.message}</p>
                    </div>`;
            });
        }
    }

    function renderGauge(score) {
        const canvas = document.getElementById('risk-gauge-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2, cy = h * 0.88;
        const r = Math.min(w, h * 1.6) * 0.38;
        const sA = Math.PI, eA = 2 * Math.PI;
        const fA = sA + (score / 100) * Math.PI;

        // Track
        ctx.beginPath();
        ctx.arc(cx, cy, r, sA, eA);
        ctx.strokeStyle = '#ede6ff';
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Fill arc
        const color = score < 35 ? '#6bcb8b' : score < 65 ? '#f7c948' : '#f47b7b';
        ctx.beginPath();
        ctx.arc(cx, cy, r, sA, fA);
        ctx.strokeStyle = color;
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Needle dot
        const nx = cx + Math.cos(fA) * r;
        const ny = cy + Math.sin(fA) * r;
        ctx.beginPath();
        ctx.arc(nx, ny, 10, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Tick labels
        ctx.font = 'bold 11px Nunito, sans-serif';
        ctx.fillStyle = '#b0a0c0';
        ctx.textAlign = 'center';
        ctx.fillText('0', cx - r - 6, cy + 4);
        ctx.fillText('50', cx, cy - r - 8);
        ctx.fillText('100', cx + r + 8, cy + 4);
    }

    // ---- CHARTS ----
    function renderCharts() {
        const symptoms = CycleStorage.getSymptoms().slice(0, 14).reverse();
        const labels = symptoms.map(s => s.date ? s.date.slice(5) : '');
        const painData = symptoms.map(s => s.pain || 0);
        const fatigueData = symptoms.map(s => s.fatigue || 0);
        const moodMap = { '😄 Happy': 9, '🙂 Good': 7, '😐 Okay': 5, '😔 Sad': 3, '😰 Anxious': 4, '😤 Irritated': 4 };
        const moodData = symptoms.map(s => moodMap[s.mood] || 5);

        const defaults = {
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(200,180,232,.13)' }, ticks: { color: '#9a6ecb', font: { size: 11, weight: '700' } } },
                y: { grid: { color: 'rgba(200,180,232,.13)' }, ticks: { color: '#9a6ecb', font: { size: 11, weight: '700' } } }
            },
            animation: { duration: 900, easing: 'easeInOutQuart' }
        };

        const mkGrad = (ctxRef, c1, c2) => {
            const g = ctxRef.createLinearGradient(0, 0, 0, 200);
            g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
        };

        makeChart('pain-chart', {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['Log data'],
                datasets: [{
                    data: painData.length ? painData : [0],
                    borderColor: '#e07aaa',
                    backgroundColor: ctx => mkGrad(ctx.chart.ctx, 'rgba(224,122,170,.35)', 'rgba(224,122,170,.02)'),
                    fill: true, tension: 0.4, pointRadius: 5,
                    pointBackgroundColor: '#e07aaa', pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2.5
                }]
            },
            options: { ...defaults, scales: { ...defaults.scales, y: { ...defaults.scales.y, min: 0, max: 10 } } }
        });

        makeChart('fatigue-chart', {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ['Log data'],
                datasets: [{
                    data: fatigueData.length ? fatigueData : [0],
                    backgroundColor: ctx => mkGrad(ctx.chart.ctx, 'rgba(197,179,232,.95)', 'rgba(197,179,232,.25)'),
                    borderRadius: 8, borderSkipped: false
                }]
            },
            options: { ...defaults, scales: { ...defaults.scales, y: { ...defaults.scales.y, min: 0, max: 10 } } }
        });

        makeChart('mood-chart', {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['Log data'],
                datasets: [{
                    data: moodData.length ? moodData : [5],
                    borderColor: '#f4a7c5',
                    backgroundColor: ctx => mkGrad(ctx.chart.ctx, 'rgba(244,167,197,.32)', 'rgba(244,167,197,.02)'),
                    fill: true, tension: 0.4, pointRadius: 5,
                    pointBackgroundColor: '#f4a7c5', pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2.5
                }]
            },
            options: { ...defaults, scales: { ...defaults.scales, y: { ...defaults.scales.y, min: 0, max: 10 } } }
        });
    }

    function makeChart(id, config) {
        if (charts[id]) charts[id].destroy();
        const canvas = document.getElementById(id);
        if (!canvas) return;
        charts[id] = new Chart(canvas.getContext('2d'), config);
    }

    // ---- DATASET ANALYSIS ----
    async function renderAnalysis() {
        const symptoms = CycleStorage.getSymptoms();

        const emptyCard = document.getElementById('analysis-empty-card');
        const loadingEl = document.getElementById('analysis-loading');
        const tableEl = document.getElementById('analysis-table');
        const interpCard = document.getElementById('analysis-interpretation-card');

        if (symptoms.length === 0) {
            if (emptyCard) emptyCard.style.display = 'block';
            if (tableEl) tableEl.style.display = 'none';
            if (interpCard) interpCard.style.display = 'none';
            if (loadingEl) loadingEl.style.display = 'none';
            return;
        }

        if (emptyCard) emptyCard.style.display = 'none';
        if (loadingEl) loadingEl.style.display = 'block';
        if (tableEl) tableEl.style.display = 'none';
        if (interpCard) interpCard.style.display = 'none';

        // Compute user averages from local storage
        const avgPain = parseFloat((symptoms.reduce((s, x) => s + x.pain, 0) / symptoms.length).toFixed(1));
        // Period irregularity: 1 if any entry has no periodStart logged in recent 30 days
        const recent = symptoms.slice(0, 30);
        const withPeriod = recent.filter(s => s.periodStart).length;
        const irregular = withPeriod > 0 && withPeriod < recent.length * 0.6 ? 1 : 0;
        // Junk food count
        const foods = CycleStorage.getFoods();
        const junkFoods = foods.filter(f => f.category === 'junk' || f.category === 'sugar' || f.category === 'caffeine').length;

        try {
            const data = await CycleStorage.apiRequest(`/analysis/compare?pain=${avgPain}&irregular=${irregular}&junkFoods=${junkFoods}`);

            if (loadingEl) loadingEl.style.display = 'none';

            // Render gauge
            renderAnalysisGauge(data.similarityScore);

            // Score value + label
            const scoreEl = document.getElementById('analysis-score-value');
            const labelEl = document.getElementById('analysis-score-label');
            if (scoreEl) {
                scoreEl.textContent = data.similarityScore;
                scoreEl.className = 'risk-score-value risk-' + (data.riskLevel === 'low' ? 'low' : data.riskLevel === 'moderate' ? 'medium' : 'high');
            }
            if (labelEl) {
                const labels = { low: 'Low Similarity 🌿', moderate: 'Moderate Similarity ⚠️', high: 'High Similarity 🔴' };
                labelEl.textContent = labels[data.riskLevel] || data.riskLevel;
                labelEl.className = 'risk-score-label risk-label-' + (data.riskLevel === 'moderate' ? 'medium' : data.riskLevel);
            }

            // Percentile bar
            const pBar = document.getElementById('analysis-percentile-bar');
            const pText = document.getElementById('analysis-percentile-text');
            if (pBar) pBar.style.width = data.painPercentile + '%';
            if (pText) pText.textContent = `Your average pain (${avgPain}/10) is higher than ${data.painPercentile}% of diagnosed patients in the dataset.`;

            // Comparison table
            const tbody = document.getElementById('analysis-table-body');
            const dc = data.datasetComparison;
            if (tbody && dc) {
                const row = (label, you, diag, healthy, highlight) => {
                    const youColor = highlight ? '#e07aaa' : 'var(--text-primary)';
                    return `<tr style="border-top:1px solid var(--border)">
                        <td style="padding:8px 10px;font-size:.82rem;color:var(--text-secondary)">${label}</td>
                        <td style="padding:8px 10px;text-align:center;font-weight:800;color:${youColor}">${you}</td>
                        <td style="padding:8px 10px;text-align:center;font-size:.82rem;color:var(--text-muted)">${diag}</td>
                        <td style="padding:8px 10px;text-align:center;font-size:.82rem;color:var(--text-muted)">${healthy}</td>
                    </tr>`;
                };
                tbody.innerHTML = [
                    row('Avg Pain (0–10)', avgPain, dc.diagnosed.meanPain, dc.healthy.meanPain, avgPain >= dc.diagnosed.meanPain),
                    row('Cycle Irregular', irregular ? 'Yes' : 'No', dc.diagnosed.irregularityRate + '%', dc.healthy.irregularityRate + '%', irregular === 1),
                    row('Hormone Proxy', data.userValues.hormoneProxy + '%', dc.diagnosed.hormoneAbnRate + '%', dc.healthy.hormoneAbnRate + '%', data.userValues.hormoneProxy >= dc.diagnosed.hormoneAbnRate),
                    row('Dataset Size', '—', dc.diagnosedCount.toLocaleString(), dc.healthyCount.toLocaleString(), false)
                ].join('');
                if (tableEl) tableEl.style.display = 'table';
            }

            // Interpretation
            const interpEl = document.getElementById('analysis-interpretation');
            if (interpEl) {
                const interpretations = {
                    low: `Your symptom profile has <strong>low similarity</strong> (${data.similarityScore}/100) to patients diagnosed with endometriosis in this dataset of ${dc.totalDatasetRows.toLocaleString()} patients. Your average pain (${avgPain}/10) is below the diagnosed group mean (${dc.diagnosed.meanPain}). Keep tracking consistently — patterns become more meaningful over time.`,
                    moderate: `Your symptom profile shows <strong>moderate similarity</strong> (${data.similarityScore}/100) to diagnosed patients. Your average pain (${avgPain}/10) is near the diagnosed group mean (${dc.diagnosed.meanPain}). This does not indicate a diagnosis, but you may benefit from discussing your symptoms with a gynaecologist.`,
                    high: `Your symptom profile has <strong>high similarity</strong> (${data.similarityScore}/100) to patients diagnosed with endometriosis. Your pain level and cycle patterns closely mirror the diagnosed group in a dataset of ${dc.totalDatasetRows.toLocaleString()} patients. <strong>Please consider speaking with a specialist</strong> — early evaluation makes a significant difference.`
                };
                interpEl.innerHTML = interpretations[data.riskLevel] || '';
                if (interpCard) interpCard.style.display = 'block';
            }

        } catch (err) {
            if (loadingEl) loadingEl.textContent = '⚠️ Could not load dataset analysis. Make sure the server is running.';
            console.error('Dataset Analysis Error Details:', {
                message: err.message,
                avgPain,
                irregular,
                junkFoods,
                error: err
            });
        }
    }

    function renderAnalysisGauge(score) {
        const canvas = document.getElementById('analysis-gauge-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2, cy = h * 0.88;
        const r = Math.min(w, h * 1.6) * 0.38;
        const sA = Math.PI, eA = 2 * Math.PI;
        const fA = sA + (score / 100) * Math.PI;

        ctx.beginPath();
        ctx.arc(cx, cy, r, sA, eA);
        ctx.strokeStyle = '#ede6ff';
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.stroke();

        const color = score < 35 ? '#6bcb8b' : score < 60 ? '#f7c948' : '#f47b7b';
        ctx.beginPath();
        ctx.arc(cx, cy, r, sA, fA);
        ctx.strokeStyle = color;
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.stroke();

        const nx = cx + Math.cos(fA) * r;
        const ny = cy + Math.sin(fA) * r;
        ctx.beginPath();
        ctx.arc(nx, ny, 10, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = 'bold 11px Nunito, sans-serif';
        ctx.fillStyle = '#b0a0c0';
        ctx.textAlign = 'center';
        ctx.fillText('0', cx - r - 6, cy + 4);
        ctx.fillText('50', cx, cy - r - 8);
        ctx.fillText('100', cx + r + 8, cy + 4);
    }

    // ---- REPORT ----
    function renderReport() {
        const symptoms = CycleStorage.getSymptoms();
        const user = CycleStorage.getUser();
        const risk = RiskCalculator.compute();

        const avgPain = symptoms.length ? (symptoms.reduce((s, x) => s + x.pain, 0) / symptoms.length).toFixed(1) : 0;
        const avgFatigue = symptoms.length ? (symptoms.reduce((s, x) => s + x.fatigue, 0) / symptoms.length).toFixed(1) : 0;

        const Q = id => document.getElementById(id);
        if (Q('report-name')) Q('report-name').textContent = user.name;
        if (Q('report-date')) Q('report-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        if (Q('report-cycle')) Q('report-cycle').textContent = `Day ${user.cycleDay} of ${user.cycleLength}`;
        if (Q('report-period-start')) Q('report-period-start').textContent = user.periodStart || '—';
        if (Q('report-period-end')) Q('report-period-end').textContent = user.periodEnd || '—';
        if (Q('report-total-logs')) Q('report-total-logs').textContent = symptoms.length + ' entries';
        if (Q('report-avg-pain')) Q('report-avg-pain').textContent = avgPain + '/10';
        if (Q('report-avg-fatigue')) Q('report-avg-fatigue').textContent = avgFatigue + '/10';
        if (Q('report-risk')) {
            Q('report-risk').textContent = `${risk.score} (${risk.level.toUpperCase()})`;
            Q('report-risk').className = 'report-row-value risk-' + risk.level;
        }
    }

    // ---- SETTINGS ----
    function renderSettings() {
        const s = CycleStorage.getSettings();
        document.querySelectorAll('.privacy-toggle-cb').forEach(cb => { cb.checked = s.privacyMode; });
    }

    window.resetAllData = function () {
        if (confirm('⚠️ Are you sure? This will permanently delete ALL tracked data. This cannot be undone.')) {
            CycleStorage.clearAll();
            showNotification('🗑️ All data has been reset', 'warning');
            renderDashboard();
        }
    };

    window.downloadReport = function () {
        renderReport();
        showNotification('📄 Opening print / save as PDF…', 'info');
        setTimeout(() => window.print(), 700);
    };

    // ---- NOTIFICATION CENTER ----
    function renderNotifications() {
        const container = document.getElementById('notifications-list');
        if (!container) return;

        const alerts = CycleStorage.getAlerts();
        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>Your notification tray is empty.</p>
                </div>`;
        } else {
            container.innerHTML = alerts.map(a => `
                <div class="notification-item ${a.read ? '' : 'unread'} ni-priority-${a.type}" onclick="handleAlertClick(${a.id})">
                    <div class="ni-icon">${getAlertIcon(a.type)}</div>
                    <div class="ni-content">
                        <div class="ni-title">${a.title}</div>
                        <div class="ni-text">${a.text}</div>
                        <div class="ni-time">${new Date(a.timestamp).toLocaleString()}</div>
                    </div>
                </div>
            `).join('');
        }
        updateNotificationBadge();
    }

    function getAlertIcon(type) {
        const icons = { success: '✅', warning: '⚠️', error: '🚨', info: '💡' };
        return icons[type] || '🔔';
    }

    window.handleAlertClick = function (id) {
        CycleStorage.markAlertRead(id);
        renderNotifications();
    };

    window.clearAllNotifications = function () {
        if (confirm('Clear all health alerts?')) {
            CycleStorage.clearAlerts();
            renderNotifications();
            showNotification('Notification tray cleared', 'info');
        }
    };

    function updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;
        const unreadCount = CycleStorage.getAlerts().filter(a => !a.read).length;
        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    // Automated Health Checks
    function checkSystemAlerts() {
        const risk = RiskCalculator.compute();
        const alerts = CycleStorage.getAlerts();

        // High Risk Alert
        if (risk.score > 70 && !alerts.some(a => a.type === 'error' && a.title.includes('High Risk'))) {
            CycleStorage.addAlert({
                title: 'High Health Marker Detected',
                text: `Your AI Risk Score reached ${risk.score}. We recommend consulting a specialist for an evaluation.`,
                type: 'error'
            });
        }

        // Hydration Check (if past 2 PM and glasses < 3)
        const hr = new Date().getHours();
        const todayKey = getTodayWaterKey();
        const water = getWaterData(todayKey);
        if (hr >= 14 && water.glasses < 3 && !alerts.some(a => a.title.includes('Stay Hydrated') && a.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10))) {
            CycleStorage.addAlert({
                title: 'Stay Hydrated! 💧',
                text: 'You haven\'t logged much water today. Drinking water helps reduce period bloating and fatigue.',
                type: 'warning'
            });
        }

        updateNotificationBadge();
    }


    // ---- Global Notification System ----
    function showNotification(msg, type = 'info', duration = 3000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const icons = {
            success: '✅',
            info: '💡',
            warning: '⚠️',
            error: '🛑'
        };

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${icons[type] || '🔔'}</div>
            <div class="notification-content">${msg}</div>
        `;

        container.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.classList.add('removing');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // ---- Helpers ----
    function escHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    // ---- Expose globals ----
    window.navigateTo = navigateTo;
    window.openSidebar = openSidebar;
    window.closeSidebar = closeSidebar;
    window.showNotification = showNotification;
    window.showToast = showNotification; // for backward compatibility if any inline calls exist
    window.initSymptomTracker = window.initSymptomTracker; // already set above

})();

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
    });

    function checkAuth() {
        const token = CycleStorage.getToken();
        const sidebar = document.getElementById('sidebar');
        const hBtn = document.getElementById('hamburger-btn');
        const bNav = document.getElementById('bottom-nav');

        if (!token) {
            navigateTo('auth');
            if (sidebar) sidebar.style.display = 'none';
            if (hBtn) hBtn.style.display = 'none';
            if (bNav) bNav.style.display = 'none';
        } else {
            if (sidebar) sidebar.style.display = 'flex';
            if (hBtn) hBtn.style.display = 'flex';
            if (bNav) bNav.style.display = 'flex';
            navigateTo('dashboard');
            syncAndRefresh();
            updateUserName();
        }
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

    window.toggleAuthMode = function (mode) {
        const isLogin = mode === 'login';
        document.getElementById('login-form').style.display = isLogin ? 'block' : 'none';
        document.getElementById('signup-form').style.display = isLogin ? 'none' : 'block';
        document.getElementById('auth-card').querySelector('h2').textContent = isLogin ? 'Welcome Back' : 'Join CycleSense';
    };

    window.handleLogin = async function () {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        if (!email || !password) return showToast('⚠️ Enter all fields');

        try {
            const data = await CycleStorage.apiRequest('/auth/login', 'POST', { email, password });
            CycleStorage.setToken(data.token);
            showToast('✅ Welcome back!');
            checkAuth();
        } catch (e) { showToast('❌ ' + e.message); }
    };

    window.handleSignup = async function () {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        if (!name || !email || !password) return showToast('⚠️ Enter all fields');

        try {
            await CycleStorage.apiRequest('/auth/register', 'POST', { name, email, password });
            showToast('✅ Account created! Please log in.');
            toggleAuthMode('login');
        } catch (e) { showToast('❌ ' + e.message); }
    };

    window.logout = function () {
        CycleStorage.removeToken();
        CycleStorage.clearAll();
        showToast('👋 Logged out');
        checkAuth();
    };

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
            case 'risk': renderRiskScore(); break;
            case 'patterns': renderCharts(); break;
            case 'doctors': break; // static
            case 'report': renderReport(); break;
            case 'settings': renderSettings(); break;
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
        showToast(privacyMode ? '🔒 Privacy Mode enabled' : '🔓 Privacy Mode disabled');
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
        const acne = document.getElementById('acne-toggle')?.checked || false;
        const hairFall = document.getElementById('hairfall-toggle')?.checked || false;
        const periodStart = document.getElementById('period-start')?.value || '';
        const periodEnd = document.getElementById('period-end')?.value || '';

        try {
            // Save to Backend
            await CycleStorage.apiRequest('/period/add', 'POST', {
                startDate: periodStart || new Date().toISOString(),
                endDate: periodEnd || null,
                painLevel: pain,
                fatigueLevel: fatigue,
                mood: selectedMood,
                acne,
                hairFall
            });

            // Still save to local for immediate UI update (syncAndRefresh will overwrite later)
            CycleStorage.addSymptom({ pain, fatigue, mood: selectedMood, acne, hairFall, periodStart, periodEnd });

            if (periodStart) {
                const start = new Date(periodStart);
                const diff = Math.floor((new Date() - start) / 86400000) + 1;
                const user = CycleStorage.getUser();
                user.cycleDay = Math.max(1, diff);
                user.periodStart = periodStart;
                if (periodEnd) user.periodEnd = periodEnd;
                CycleStorage.saveUser(user);
            }

            showToast('✅ Symptoms saved & synced!');
            syncAndRefresh();
        } catch (e) {
            showToast('❌ Sync failed: ' + e.message);
            // Fallback to local only for now?
            CycleStorage.addSymptom({ pain, fatigue, mood: selectedMood, acne, hairFall, periodStart, periodEnd });
            renderSymptomHistory();
            renderDashboard();
        }
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
                    ${s.acne ? ' &nbsp;<span class="badge badge-pink">Acne</span>' : ''}
                    ${s.hairFall ? ' &nbsp;<span class="badge badge-purple">Hair Fall</span>' : ''}
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
        if (!input || !input.value.trim()) { showToast('⚠️ Enter a food item first'); return; }

        showToast('⏳ Syncing food…');
        await CycleStorage.addFood({ name: input.value.trim(), category: selectedFoodCategory });
        input.value = '';
        showToast('🍎 Food logged & synced!');
        renderFoodList();
    };

    window.deleteFood = async function (id) {
        showToast('⏳ Removing…');
        await CycleStorage.deleteFood(id);
        renderFoodList();
        showToast('🗑️ Item removed');
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

    // ---- REPORT ----
    function renderReport() {
        const symptoms = CycleStorage.getSymptoms();
        const user = CycleStorage.getUser();
        const risk = RiskCalculator.compute();

        const avgPain = symptoms.length ? (symptoms.reduce((s, x) => s + x.pain, 0) / symptoms.length).toFixed(1) : 0;
        const avgFatigue = symptoms.length ? (symptoms.reduce((s, x) => s + x.fatigue, 0) / symptoms.length).toFixed(1) : 0;
        const acneCount = symptoms.filter(x => x.acne).length;
        const hairCount = symptoms.filter(x => x.hairFall).length;

        const Q = id => document.getElementById(id);
        if (Q('report-name')) Q('report-name').textContent = user.name;
        if (Q('report-date')) Q('report-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        if (Q('report-cycle')) Q('report-cycle').textContent = `Day ${user.cycleDay} of ${user.cycleLength}`;
        if (Q('report-period-start')) Q('report-period-start').textContent = user.periodStart || '—';
        if (Q('report-period-end')) Q('report-period-end').textContent = user.periodEnd || '—';
        if (Q('report-total-logs')) Q('report-total-logs').textContent = symptoms.length + ' entries';
        if (Q('report-avg-pain')) Q('report-avg-pain').textContent = avgPain + '/10';
        if (Q('report-avg-fatigue')) Q('report-avg-fatigue').textContent = avgFatigue + '/10';
        if (Q('report-acne')) Q('report-acne').textContent = acneCount + ' occurrences';
        if (Q('report-hairfall')) Q('report-hairfall').textContent = hairCount + ' occurrences';
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
            showToast('🗑️ All data has been reset');
            renderDashboard();
        }
    };

    window.downloadReport = function () {
        renderReport();
        showToast('📄 Opening print / save as PDF…');
        setTimeout(() => window.print(), 700);
    };

    // ---- Toast ----
    function showToast(msg) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
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
    window.showToast = showToast;
    window.initSymptomTracker = window.initSymptomTracker; // already set above

})();

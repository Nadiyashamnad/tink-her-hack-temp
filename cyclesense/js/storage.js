// ============================================
//  CycleSense – Storage Module (LocalStorage)
//  All data scoped under "cyclesense_" prefix
// ============================================

const CycleStorage = {
    PREFIX: 'cyclesense_',

    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(this.PREFIX + key);
            return raw !== null ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    },

    set(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
        } catch (e) { console.error('Storage error:', e); }
    },

    remove(key) { localStorage.removeItem(this.PREFIX + key); },

    clearAll() {
        Object.keys(localStorage)
            .filter(k => k.startsWith(this.PREFIX))
            .forEach(k => localStorage.removeItem(k));
    },

    // ---- User ----
    getUser() {
        return this.get('user', {
            name: 'Sarah',
            cycleDay: 14,
            cycleLength: 28,
            periodStart: '',
            periodEnd: ''
        });
    },
    saveUser(data) { this.set('user', data); },

    // ---- Symptoms ----
    getSymptoms() { return this.get('symptoms', []); },
    addSymptom(entry) {
        const list = this.getSymptoms();
        list.unshift({
            ...entry,
            id: Date.now(),
            date: entry.date || new Date().toISOString().split('T')[0]
        });
        this.set('symptoms', list);
    },

    // ---- Food ----
    getFoods() { return this.get('foods', []); },
    async addFood(entry) {
        try {
            const food = await this.apiRequest('/food/add', 'POST', entry);
            const list = this.getFoods();
            list.unshift({ ...food, id: food.id, date: new Date(food.date).toISOString().split('T')[0] });
            this.set('foods', list);
            return food;
        } catch (e) {
            console.error('Add food error:', e);
            // Fallback to local
            const list = this.getFoods();
            list.unshift({ ...entry, id: Date.now(), date: new Date().toISOString().split('T')[0] });
            this.set('foods', list);
        }
    },
    async deleteFood(id) {
        try {
            await this.apiRequest(`/food/${id}`, 'DELETE');
        } catch (e) { console.error('Delete food error:', e); }

        const list = this.getFoods().filter(f => f.id !== id);
        this.set('foods', list);
    },

    // ---- Settings ----
    getSettings() {
        return this.get('settings', { privacyMode: false });
    },
    saveSettings(data) { this.set('settings', data); },

    // ---- API Sync ----
    async apiRequest(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (body) options.body = JSON.stringify(body);

        // If the frontend is hosted on a different port (e.g. Live Server on 5504), 
        // explicitly target the backend on port 5000.
        const apiBase = window.location.port !== '5000' ? 'http://localhost:5000/api' : '/api';
        const res = await fetch(`${apiBase}${endpoint}`, options);
        let data;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        } else {
            const text = await res.text();
            data = { msg: text || 'Unknown error occurred' };
        }

        if (!res.ok) throw new Error(data.msg || 'API Error');
        return data;
    },

    async syncSymptoms() {
        try {
            const data = await this.apiRequest('/period');
            if (Array.isArray(data)) {
                const transformed = data.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0)).map(s => ({
                    id: s.id,
                    _id: s.id,
                    date: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
                    pain: s.painLevel || 0,
                    fatigue: s.fatigueLevel || 0,
                    mood: s.mood || '',
                    periodStart: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
                    periodEnd: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : ''
                }));
                this.set('symptoms', transformed);
            }
        } catch (e) { console.error('Sync error:', e); }
    },

    async syncFoods() {
        try {
            const data = await this.apiRequest('/food');
            if (Array.isArray(data)) {
                const transformed = data.map(f => ({
                    id: f.id,
                    _id: f.id,
                    name: f.name,
                    category: f.category,
                    date: new Date(f.date).toISOString().split('T')[0]
                }));
                this.set('foods', transformed);
            }
        } catch (e) { console.error('Sync foods error:', e); }
    },

    // ---- Alerts ----
    getAlerts() {
        return this.get('persistent_alerts', []);
    },
    saveAlerts(alerts) {
        this.set('persistent_alerts', alerts);
    },
    addAlert(alert) {
        const alerts = this.getAlerts();
        const newAlert = {
            id: Date.now(),
            read: false,
            timestamp: new Date().toISOString(),
            ...alert
        };
        alerts.unshift(newAlert);
        this.saveAlerts(alerts.slice(0, 50)); // Keep last 50
        return newAlert;
    },
    markAlertRead(id) {
        const alerts = this.getAlerts();
        const a = alerts.find(x => x.id === id);
        if (a) a.read = true;
        this.saveAlerts(alerts);
    },
    clearAlerts() {
        this.saveAlerts([]);
    }
};

// ============================================
//  Risk Score Calculator
//  Weighted scoring: Pain 40%, Fatigue 40%, Diet 20%
// ============================================
const RiskCalculator = {
    compute() {
        const symptoms = CycleStorage.getSymptoms();
        const foods = CycleStorage.getFoods();

        if (symptoms.length === 0) return { score: 0, level: 'low', factors: [] };

        const recent = symptoms.slice(0, 10);
        const avgPain = recent.reduce((s, x) => s + (x.pain || 0), 0) / recent.length;
        const avgFatigue = recent.reduce((s, x) => s + (x.fatigue || 0), 0) / recent.length;
        const junkFoods = foods.filter(f => f.category === 'junk' || f.category === 'sugar').length;

        const painScore = (avgPain / 10) * 40;
        const fatigueScore = (avgFatigue / 10) * 40;
        const foodScore = Math.min(junkFoods / 5, 1) * 20;

        const total = Math.round(painScore + fatigueScore + foodScore);
        const clamped = Math.min(100, Math.max(0, total));
        const level = clamped < 35 ? 'low' : clamped < 65 ? 'medium' : 'high';

        const factors = [
            { name: 'Pain Level', value: Math.round(painScore), max: 40, fill: avgPain > 6 ? '#f47b7b' : avgPain > 3 ? '#f7c948' : '#6bcb8b' },
            { name: 'Fatigue', value: Math.round(fatigueScore), max: 40, fill: avgFatigue > 6 ? '#f47b7b' : '#f7c948' },
            { name: 'Diet Impact', value: Math.round(foodScore), max: 20, fill: '#f7c948' },
        ];

        // Suggestions logic
        const suggestions = [];
        if (avgPain > 6) {
            suggestions.push({
                icon: '🧘‍♀️',
                title: 'Yoga for Pain Relief',
                text: 'Try gentle Child\'s Pose or Reclined Bound Angle pose to relax pelvic muscles and ease cramps.'
            });
        }
        if (avgFatigue > 6) {
            suggestions.push({
                icon: '🥬',
                title: 'Boost Iron Intake',
                text: 'High fatigue can be linked to iron deficiency. Increase intake of spinach, lentils, and lean red meat.'
            });
        }
        const withPeriod = recent.filter(s => s.periodStart).length;
        if (withPeriod > 0 && withPeriod < recent.length * 0.6) {
            suggestions.push({
                icon: '🕯️',
                title: 'Lifestyle Syncing',
                text: 'Irregular cycles benefit from consistent sleep and reduced cortisol. Try magnesium-rich snacks before bed.'
            });
        }

        return { score: clamped, level, factors, suggestions };
    }
};

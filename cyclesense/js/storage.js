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
            list.unshift({ ...food, id: food._id, date: new Date(food.date).toISOString().split('T')[0] });
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

        const list = this.getFoods().filter(f => f.id !== id && f._id !== id);
        this.set('foods', list);
    },

    // ---- Settings ----
    getSettings() {
        return this.get('settings', { privacyMode: false });
    },
    saveSettings(data) { this.set('settings', data); },

    // ---- Token ----
    getToken() { return localStorage.getItem(this.PREFIX + 'token'); },
    setToken(token) { localStorage.setItem(this.PREFIX + 'token', token); },
    removeToken() { localStorage.removeItem(this.PREFIX + 'token'); },

    // ---- API Sync ----
    async apiRequest(endpoint, method = 'GET', body = null) {
        const token = this.getToken();
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token || ''
            }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`/api${endpoint}`, options);
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'API Error');
        return data;
    },

    async syncSymptoms() {
        try {
            const data = await this.apiRequest('/period');
            if (Array.isArray(data)) {
                const transformed = data.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0)).map(s => ({
                    id: s._id,
                    _id: s._id,
                    date: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
                    pain: s.painLevel || 0,
                    fatigue: s.fatigueLevel || 0,
                    mood: s.mood || '',
                    acne: s.acne || false,
                    hairFall: s.hairFall || false,
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
                    id: f._id,
                    _id: f._id,
                    name: f.name,
                    category: f.category,
                    date: new Date(f.date).toISOString().split('T')[0]
                }));
                this.set('foods', transformed);
            }
        } catch (e) { console.error('Sync foods error:', e); }
    }
};

// ============================================
//  Risk Score Calculator
//  Weighted scoring: Pain 35%, Fatigue 25%,
//  Acne 20%, Hair Fall 10%, Diet 10%
// ============================================
const RiskCalculator = {
    compute() {
        const symptoms = CycleStorage.getSymptoms();
        const foods = CycleStorage.getFoods();

        if (symptoms.length === 0) return { score: 0, level: 'low', factors: [] };

        const recent = symptoms.slice(0, 10);
        const avgPain = recent.reduce((s, x) => s + (x.pain || 0), 0) / recent.length;
        const avgFatigue = recent.reduce((s, x) => s + (x.fatigue || 0), 0) / recent.length;
        const acneCount = recent.filter(x => x.acne).length;
        const hairCount = recent.filter(x => x.hairFall).length;
        const junkFoods = foods.filter(f => f.category === 'junk' || f.category === 'sugar').length;

        const painScore = (avgPain / 10) * 35;
        const fatigueScore = (avgFatigue / 10) * 25;
        const acneScore = (acneCount / Math.max(recent.length, 1)) * 20;
        const hairScore = (hairCount / Math.max(recent.length, 1)) * 10;
        const foodScore = Math.min(junkFoods / 5, 1) * 10;

        const total = Math.round(painScore + fatigueScore + acneScore + hairScore + foodScore);
        const clamped = Math.min(100, Math.max(0, total));
        const level = clamped < 35 ? 'low' : clamped < 65 ? 'medium' : 'high';

        const factors = [
            { name: 'Pain Level', value: Math.round(painScore), max: 35, fill: avgPain > 6 ? '#f47b7b' : avgPain > 3 ? '#f7c948' : '#6bcb8b' },
            { name: 'Fatigue', value: Math.round(fatigueScore), max: 25, fill: avgFatigue > 6 ? '#f47b7b' : '#f7c948' },
            { name: 'Acne / Hormonal', value: Math.round(acneScore), max: 20, fill: '#c8b4e8' },
            { name: 'Hair Fall', value: Math.round(hairScore), max: 10, fill: '#f5a7c7' },
            { name: 'Diet Impact', value: Math.round(foodScore), max: 10, fill: '#f7c948' },
        ];

        return { score: clamped, level, factors };
    }
};

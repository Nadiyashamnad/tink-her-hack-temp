// ============================================
//  CycleSense – Dataset Analysis Route
//  GET /api/analysis/compare
//  Compares user symptom values against the
//  Kaggle endometriosis dataset statistics
// ============================================

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Load pre-computed dataset stats once at startup
const STATS_PATH = path.join(__dirname, '..', 'data', 'dataset_stats.json');
let datasetStats = null;

try {
    datasetStats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
    console.log('✅ Dataset stats loaded:', datasetStats.totalRows, 'rows');
} catch (e) {
    console.error('⚠️  Could not load dataset_stats.json:', e.message);
}

/**
 * GET /api/analysis/compare
 * Query params:
 *   pain        - float 0-10  (user's average pain level)
 *   irregular   - 0 or 1      (whether periods are irregular)
 *   junkFoods   - int 0+      (number of junk/sugar food entries)
 */
router.get('/compare', (req, res) => {
    console.log('🔍 Received comparison request:', req.query);
    if (!datasetStats) {
        console.error('❌ Dataset stats not loaded!');
        return res.status(503).json({ msg: 'Dataset stats not loaded. Run: node scripts/analyze_dataset.js' });
    }

    const pain = parseFloat(req.query.pain) || 0;
    const irregular = parseInt(req.query.irregular) || 0;
    const junkFoods = parseInt(req.query.junkFoods) || 0;
    console.log(`📊 Processing: pain=${pain}, irregular=${irregular}, junkFoods=${junkFoods}`);

    const dg = datasetStats.diagnosedGroup;
    const hg = datasetStats.healthyGroup;
    const w = datasetStats.scoringWeights;

    // Normalize pain to 0-1 range (max = 10)
    const normPain = Math.min(1, pain / 10);

    // Hormone proxy: junk food count → 0-1 (cap at 10 entries)
    const hormoneProxy = Math.min(1, junkFoods / 10);

    // Weighted similarity to diagnosed group profile
    // Pain: how close to diagnosed mean vs healthy mean
    const painDiff_diag = Math.abs(pain - dg.meanPain);
    const painDiff_healthy = Math.abs(pain - hg.meanPain);
    const painScore = painDiff_diag < painDiff_healthy
        ? 1 - (painDiff_diag / 10)
        : (painDiff_healthy / 10);

    // Irregularity: exact match to diagnosed rate
    const irregScore = irregular === 1
        ? dg.irregularityRate           // matches diagnosed profile
        : (1 - hg.irregularityRate);    // matches healthy profile inversely

    // Hormone score
    const hormoneScore = hormoneProxy * dg.hormoneAbnRate;

    // Composite similarity score 0-100
    const rawScore = (painScore * w.pain + irregScore * w.irregularity + hormoneScore * w.hormoneProxy);
    const similarityScore = Math.round(Math.min(100, Math.max(0, rawScore * 100)));

    // Pain percentile among diagnosed patients
    const roundedPain = (Math.round(pain * 2) / 2).toFixed(1);
    const painPercentile = datasetStats.painLookup[roundedPain] || 0;

    // Risk level
    const riskLevel = similarityScore < 35 ? 'low' : similarityScore < 60 ? 'moderate' : 'high';

    res.json({
        similarityScore,
        riskLevel,
        painPercentile,       // % of diagnosed patients with pain <= user's pain
        userValues: {
            pain,
            irregular,
            junkFoods,
            hormoneProxy: parseFloat((hormoneProxy * 100).toFixed(1))
        },
        datasetComparison: {
            totalDatasetRows: datasetStats.totalRows,
            diagnosedCount: dg.count,
            healthyCount: hg.count,
            diagnosed: {
                meanPain: dg.meanPain,
                irregularityRate: parseFloat((dg.irregularityRate * 100).toFixed(1)),
                hormoneAbnRate: parseFloat((dg.hormoneAbnRate * 100).toFixed(1)),
                meanAge: dg.meanAge
            },
            healthy: {
                meanPain: hg.meanPain,
                irregularityRate: parseFloat((hg.irregularityRate * 100).toFixed(1)),
                hormoneAbnRate: parseFloat((hg.hormoneAbnRate * 100).toFixed(1)),
                meanAge: hg.meanAge
            }
        }
    });
});

/**
 * GET /api/analysis/stats
 * Returns raw dataset statistics for display
 */
router.get('/stats', (req, res) => {
    if (!datasetStats) return res.status(503).json({ msg: 'Stats not available' });
    res.json({
        totalRows: datasetStats.totalRows,
        diagnosedCount: datasetStats.diagnosedGroup.count,
        healthyCount: datasetStats.healthyGroup.count,
        generatedAt: datasetStats.generatedAt
    });
});

module.exports = router;

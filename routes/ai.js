const express = require("express");
const router = express.Router();

router.post("/suggestions", async (req, res) => {
    const { avgPain, avgFatigue, junkFoods, waterGlasses } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    // --- MOCK MODE FALLBACK ---
    // Only run mock mode if key is missing OR is the specific placeholder string
    if (!apiKey || apiKey === 'your_openrouter_key_here') {
        console.log("AI Suggestions: Running in Mock Mode (No Key found)");
        const mocks = [
            { icon: '🧘‍♀️', title: 'Pelvic Floor Yoga', text: 'Try deep breathing in Child\'s Pose to help relax the pelvic floor and reduce intense cramping.' },
            { icon: '🥬', title: 'Iron Absorption', text: 'Your energy is low. Combine iron-rich foods with Vitamin C to boost absorption and fight fatigue.' },
            { icon: '💧', title: 'Hydration Strategy', text: 'You\'re below the hydration target. Sip water every hour to prevent bloating and headache.' }
        ];
        return res.json(mocks);
    }

    console.log("AI Suggestions: Requesting live insights from OpenRouter...");

    const prompt = `
        Act as a PCOS and Endometriosis health companion for a user with the following recent health metrics:
        - Average Pain Level: ${avgPain}/10
        - Average Fatigue Level: ${avgFatigue}/10
        - Recent Junk Food/Sugar Intake: ${junkFoods} items
        - Daily Water Intake: ${waterGlasses} glasses

        Provide 3 short, gentle, and actionable health suggestions. 
        Each suggestion must include an emoji icon, a short title, and a brief explanation (max 20 words).
        Return ONLY a JSON array of objects with the structure: [{ "icon": "emoji", "title": "Title", "text": "Explanation" }]
    `;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://cyclesense.app", // Optional
                "X-Title": "CycleSense AI", // Optional
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openrouter/free",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenRouter API Error:", data);
            throw new Error(data.error?.message || `API returned ${response.status}`);
        }

        if (!data.choices || !data.choices[0]) {
            console.error("Unexpected OpenRouter Response:", data);
            throw new Error("No response content from AI");
        }

        const content = data.choices[0].message.content;
        console.log("RAW AI CONTENT:", content);
        console.log("AI Response received successfully.");

        // Parsing the JSON from the LLM response
        const startIdx = content.indexOf('[');
        const endIdx = content.lastIndexOf(']') + 1;

        if (startIdx === -1 || endIdx === 0) {
            console.error("AI returned non-JSON content:", content);
            throw new Error("AI response was not in the expected format");
        }

        const suggestions = JSON.parse(content.substring(startIdx, endIdx));
        res.json(suggestions);
    } catch (error) {
        console.error("Detailed AI Error:", error.message);
        res.status(500).json({ msg: "AI insight generation failed. Please try again later." });
    }
});

module.exports = router;

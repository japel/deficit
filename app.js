// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/deficit/sw.js', { scope: '/deficit/' })
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// Dark Mode Management
function initDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark mode
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);

    // Re-render weight chart with new theme colors
    if (document.getElementById('weight-chart')) {
        renderWeightChart();
    }
}

// Initialize dark mode on load
initDarkMode();

// User Profiles
const USERS = {
    husband: {
        name: "Husband",
        age: 40,
        gender: "male",
        height: 173,
        startWeight: 83,
        targetWeight: 77,
        activityLevel: "sedentary",
        targets: {
            calories: 1550,
            protein: 140,
            fat: 50,
            carbs: 135
        },
        cookingPreference: "enjoys",
        exerciseDays: 0
    },
    wife: {
        name: "Wife",
        age: 33,
        gender: "female",
        height: 172,
        startWeight: 72,
        targetWeight: 68,
        activityLevel: "moderate", // 5 days exercise
        targets: {
            calories: 1777,
            protein: 136,
            fat: 55,
            carbs: 160
        },
        cookingPreference: "assembly-only", // 5-min max
        exerciseDays: 5
    }
};

// Device Fingerprint for automatic user detection
function generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);

    const fingerprint = {
        canvas: canvas.toDataURL(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        touchSupport: 'ontouchstart' in window
    };

    // Create a simple hash
    const str = JSON.stringify(fingerprint);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// Auto-detect user or prompt for first-time setup
function detectUser() {
    const deviceId = generateDeviceFingerprint();
    const storedMapping = localStorage.getItem('deviceUserMapping');

    if (storedMapping) {
        const mapping = JSON.parse(storedMapping);
        if (mapping[deviceId]) {
            console.log('Detected user:', mapping[deviceId]);
            return mapping[deviceId];
        }
    }

    // First time on this device - show setup modal
    return null;
}

// Save device-user mapping
function saveDeviceUserMapping(user) {
    const deviceId = generateDeviceFingerprint();
    const storedMapping = localStorage.getItem('deviceUserMapping');
    const mapping = storedMapping ? JSON.parse(storedMapping) : {};

    mapping[deviceId] = user;
    localStorage.setItem('deviceUserMapping', JSON.stringify(mapping));
    localStorage.setItem('currentUser', user);
}

// Show first-time setup modal
function showUserSetupModal() {
    const modal = document.createElement('div');
    modal.id = 'user-setup-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-secondary); border-radius: 16px; padding: 32px; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h2 style="color: var(--text-primary); font-size: 24px; margin-bottom: 16px; text-align: center;">👋 Welcome to Diet Dashboard!</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px; text-align: center;">This device will be automatically associated with your profile.</p>

            <div style="display: grid; gap: 12px;">
                <button onclick="selectUser('husband')" style="
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    border: none;
                    padding: 20px;
                    border-radius: 12px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    👨 Husband's Device
                </button>

                <button onclick="selectUser('wife')" style="
                    background: linear-gradient(135deg, #ec4899, #db2777);
                    color: white;
                    border: none;
                    padding: 20px;
                    border-radius: 12px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    👩 Wife's Device
                </button>
            </div>

            <p style="color: var(--text-tertiary); font-size: 12px; margin-top: 20px; text-align: center;">
                ℹ️ You can change this later using the toggle in the header
            </p>
        </div>
    `;

    document.body.appendChild(modal);
}

// Handle user selection from modal
window.selectUser = function(user) {
    saveDeviceUserMapping(user);
    currentUser = user;

    // Remove modal
    const modal = document.getElementById('user-setup-modal');
    if (modal) {
        modal.remove();
    }

    // Update UI
    switchUser(user);
    updateAutoDetectLabel();
};

// Update auto-detect label and current user display
function updateAutoDetectLabel() {
    const label = document.getElementById('auto-detect-label');
    const userLabel = document.getElementById('current-user-label');

    if (label) {
        const wasAutoDetected = detectUser() !== null;
        if (wasAutoDetected) {
            label.textContent = '📱 Auto-detected';
            label.style.display = 'block';
        } else {
            label.textContent = '✋ Manually set';
            label.style.display = 'block';
        }
    }

    if (userLabel) {
        const emoji = currentUser === 'husband' ? '👨' : '👩';
        const name = USERS[currentUser].name;
        userLabel.textContent = `${emoji} ${name}`;
    }
}

// Confirm user switch with dialog
window.confirmUserSwitch = function() {
    const otherUser = currentUser === 'husband' ? 'wife' : 'husband';
    const otherEmoji = otherUser === 'husband' ? '👨' : '👩';
    const otherName = USERS[otherUser].name;

    const confirmed = confirm(
        `Switch to ${otherEmoji} ${otherName}'s profile?\n\n` +
        `This will update the device mapping and show ${otherName}'s data.`
    );

    if (confirmed) {
        saveDeviceUserMapping(otherUser);
        currentUser = otherUser;
        switchUser(otherUser);
        updateAutoDetectLabel();
    }
};

// Reset device mapping (for switching devices between users)
function resetDeviceMapping() {
    if (confirm('This will allow you to reassign this device to a different user. Continue?')) {
        const deviceId = generateDeviceFingerprint();
        const storedMapping = localStorage.getItem('deviceUserMapping');
        if (storedMapping) {
            const mapping = JSON.parse(storedMapping);
            delete mapping[deviceId];
            localStorage.setItem('deviceUserMapping', JSON.stringify(mapping));
        }
        localStorage.removeItem('currentUser');
        // Reload page to show setup modal
        location.reload();
    }
}

// Initialize user detection
let currentUser = detectUser();

// Migrate old localStorage to new device mapping system
if (!currentUser && localStorage.getItem('currentUser')) {
    const oldUser = localStorage.getItem('currentUser');
    console.log('Migrating old user preference:', oldUser);
    saveDeviceUserMapping(oldUser);
    currentUser = oldUser;
}

// Show setup modal if no user detected
if (!currentUser) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showUserSetupModal);
    } else {
        showUserSetupModal();
    }
    // Default to husband until user selects
    currentUser = 'husband';
}

// Portion calculations for household
const HOUSEHOLD_PORTIONS = {
    totalCalories: USERS.husband.targets.calories + USERS.wife.targets.calories, // 3327
    husband: {
        percentage: (USERS.husband.targets.calories / (USERS.husband.targets.calories + USERS.wife.targets.calories)) * 100, // 47%
        multiplier: USERS.husband.targets.calories / (USERS.husband.targets.calories + USERS.wife.targets.calories)
    },
    wife: {
        percentage: (USERS.wife.targets.calories / (USERS.husband.targets.calories + USERS.wife.targets.calories)) * 100, // 53%
        multiplier: USERS.wife.targets.calories / (USERS.husband.targets.calories + USERS.wife.targets.calories)
    }
};

// Helper functions to get current user data
function getCurrentTargets() {
    return USERS[currentUser].targets;
}

function getCurrentWeightGoals() {
    return {
        start: USERS[currentUser].startWeight,
        target: USERS[currentUser].targetWeight
    };
}

function getUserPortion(user) {
    return HOUSEHOLD_PORTIONS[user];
}

// Helper to detect meal type from meal object
function getMealType(meal) {
    const type = meal.type.toLowerCase();
    if (type.includes('breakfast')) return 'breakfast';
    if (type.includes('lunch')) return 'lunch';
    if (type.includes('dinner')) return 'dinner';
    return 'other';
}

function scaleNutrition(baseNutrition, user, mealType = null, isBusinessDay = false) {
    const multiplier = HOUSEHOLD_PORTIONS[user].multiplier;

    // Wife skips breakfast on business days (weekdays)
    if (user === 'wife' && isBusinessDay && mealType === 'breakfast') {
        return {
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0
        };
    }

    // Wife gets extra calories on lunch/dinner during business days (to compensate for skipped breakfast)
    // Average breakfast is ~400 cals, split between lunch and dinner = +200 each
    let bonusMultiplier = 1.0;
    if (user === 'wife' && isBusinessDay && (mealType === 'lunch' || mealType === 'dinner')) {
        // Add ~25% more to lunch and dinner to compensate for breakfast
        bonusMultiplier = 1.25;
    }

    return {
        calories: Math.round(baseNutrition.calories * multiplier * bonusMultiplier),
        protein: Math.round(baseNutrition.protein * multiplier * bonusMultiplier),
        fat: Math.round(baseNutrition.fat * multiplier * bonusMultiplier),
        carbs: Math.round(baseNutrition.carbs * multiplier * bonusMultiplier)
    };
}

function switchUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', user);

    // Update user label
    updateAutoDetectLabel();

    // Update header
    const userProfile = USERS[user];
    document.getElementById('header-journey').textContent =
        `${userProfile.startWeight}kg → ${userProfile.targetWeight}kg Journey`;
    document.getElementById('header-target').textContent =
        `${userProfile.targets.calories.toLocaleString()} kcal`;

    // Update timeline info
    const timeline = TIMELINE[user];
    if (document.getElementById('timeline-label')) {
        document.getElementById('timeline-label').textContent = `Target Date (${timeline.weeks} weeks)`;
        document.getElementById('target-date').textContent = formatDateShort(timeline.endDate);
    }

    // Refresh views
    updateWeightDisplay();
    updateDailyView();

    // Reload weekly menu with new user context
    const weeklyContainer = document.getElementById('weekly-menu-container');
    if (weeklyContainer) {
        weeklyContainer.innerHTML = '';
        loadWeeklyMenu();
    }
}

// Eating Window
const EATING_WINDOW = {
    start: "10:00",
    end: "20:00",
    description: "10 AM - 8 PM (14-hour fasting window)"
};

// 4-Week Meal Plan Database
// Sunday (1) - Thursday (5): Dinner becomes next day's lunch
// Friday (6) - Saturday (7): Separate lunch and dinner
const MEAL_PLAN = {
    1: { // Week 1
        1: { // Sunday
            isBusinessDay: true,
            meals: [
                {
                    name: "Breakfast Egg Scramble",
                    type: "Breakfast (10:00 AM)",
                    calories: 380,
                    protein: 32,
                    fat: 20,
                    carbs: 18,
                    recipe: "3 whole eggs scrambled with spinach, mushrooms, cherry tomatoes. Side of 1 slice wholegrain toast.",
                    prepNote: "Quick 10-min cook",
                    fullRecipe: `
**Ingredients:**
• 3 large whole eggs
• 1 cup fresh spinach
• 1/2 cup mushrooms, sliced
• 1/2 cup cherry tomatoes, halved
• 1 slice wholegrain toast
• 1 tsp olive oil
• Salt, pepper to taste

**Instructions:**
1. Heat olive oil in a non-stick pan over medium heat
2. Add mushrooms and sauté for 2-3 minutes until softened
3. Add spinach and cherry tomatoes, cook for 1 minute until spinach wilts
4. In a bowl, whisk eggs with salt and pepper
5. Pour eggs into the pan, stir gently to scramble (2-3 minutes)
6. Toast the bread while eggs are cooking
7. Serve eggs alongside toast

**Macros per serving:** 380 cal | 32g protein | 20g fat | 18g carbs
**Prep time:** 10 minutes`
                },
                {
                    name: "Greek Chicken Bowl",
                    type: "Dinner (6:00 PM) → Lunch Tomorrow",
                    calories: 520,
                    protein: 55,
                    fat: 18,
                    carbs: 38,
                    recipe: "Marinated chicken breast (300g) with tzatziki, cucumber, tomatoes, red onion, and quinoa (100g dry). Season with oregano, lemon, garlic.",
                    prepNote: "Batch cook 600g chicken for 2 servings",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 600g chicken breast
• 100g dry quinoa (makes ~300g cooked)
• 1 cucumber, diced
• 2 tomatoes, diced
• 1/2 red onion, thinly sliced
• 150g Greek yogurt (for tzatziki)
• 2 cloves garlic, minced
• 1 tbsp lemon juice
• 1 tsp dried oregano
• 2 tbsp olive oil
• Salt, pepper to taste

**Instructions:**
1. Marinate chicken with 1 tbsp olive oil, oregano, minced garlic, salt, and pepper (15 mins minimum)
2. Cook quinoa according to package directions (usually 15 minutes in boiling water)
3. Make tzatziki: Mix Greek yogurt with 1/2 diced cucumber, remaining garlic, lemon juice, salt
4. Grill or pan-fry chicken breasts for 6-7 minutes per side until internal temp reaches 165°F (75°C)
5. Let chicken rest 5 minutes, then slice
6. Assemble bowls: Quinoa base, sliced chicken, diced vegetables, drizzle with tzatziki
7. Store second portion in airtight container for tomorrow's lunch

**Macros per serving:** 520 cal | 55g protein | 18g fat | 38g carbs
**Prep time:** 30 minutes | **Cook time:** 20 minutes`
                }
            ],
            snacks: [
                {
                    name: "Greek Yogurt + Berries",
                    time: "2:00 PM",
                    calories: 180,
                    protein: 20,
                    fat: 3,
                    carbs: 18,
                    recipe: "200g plain Greek yogurt with 100g mixed berries"
                },
                {
                    name: "Apple + Almonds",
                    time: "4:00 PM",
                    calories: 200,
                    protein: 6,
                    fat: 9,
                    carbs: 25,
                    recipe: "1 medium apple with 15 almonds"
                },
                {
                    name: "Protein Coffee",
                    time: "10:30 AM",
                    calories: 120,
                    protein: 20,
                    fat: 2,
                    carbs: 6,
                    recipe: "Coffee with 1 scoop whey protein blended in"
                }
            ]
        },
        2: { // Monday
            isBusinessDay: true,
            meals: [
                {
                    name: "Protein Oatmeal",
                    type: "Breakfast (10:00 AM)",
                    calories: 420,
                    protein: 35,
                    fat: 12,
                    carbs: 45,
                    recipe: "60g oats cooked with 1 scoop protein powder, topped with banana slices and 1 tbsp peanut butter.",
                    prepNote: "5-min microwave option",
                    fullRecipe: `
**Ingredients:**
• 60g rolled oats
• 1 scoop (30g) vanilla or unflavored whey protein powder
• 250ml water or almond milk
• 1 medium banana, sliced
• 1 tbsp peanut butter
• Pinch of cinnamon (optional)
• Pinch of salt

**Instructions:**
1. Add oats, water/milk, and a pinch of salt to a microwave-safe bowl
2. Microwave on high for 2-3 minutes, stirring halfway through
3. Let cool for 1 minute, then stir in protein powder thoroughly (mix well to avoid clumps)
4. Top with sliced banana and drizzle with peanut butter
5. Sprinkle with cinnamon if desired

**Macros per serving:** 420 cal | 35g protein | 12g fat | 45g carbs
**Prep time:** 5 minutes`
                },
                {
                    name: "Greek Chicken Bowl (from Sunday)",
                    type: "Office Lunch (1:00 PM)",
                    calories: 520,
                    protein: 55,
                    fat: 18,
                    carbs: 38,
                    recipe: "Reheated portion from Sunday dinner",
                    prepNote: "Already prepped!"
                },
                {
                    name: "Spicy Turkey Chili",
                    type: "Dinner (7:00 PM) → Lunch Tomorrow",
                    calories: 480,
                    protein: 50,
                    fat: 14,
                    carbs: 42,
                    recipe: "Lean ground turkey (250g) with kidney beans, tomatoes, peppers, onions, chili spices. Serve with small portion brown rice (60g dry).",
                    prepNote: "Makes 2-3 servings easily",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g lean ground turkey (93% lean)
• 1 can (400g) kidney beans, drained and rinsed
• 1 can (400g) diced tomatoes
• 1 bell pepper, diced
• 1 medium onion, diced
• 2 cloves garlic, minced
• 120g dry brown rice
• 2 tbsp tomato paste
• 1 tbsp chili powder
• 1 tsp cumin
• 1/2 tsp paprika
• 1/2 tsp cayenne pepper (adjust to taste)
• 1 tbsp olive oil
• Salt and pepper to taste
• 500ml low-sodium chicken broth

**Instructions:**
1. Cook brown rice according to package directions (usually 25-30 minutes in boiling water)
2. Heat olive oil in a large pot over medium-high heat
3. Add diced onion and bell pepper, sauté for 4-5 minutes until softened
4. Add minced garlic, cook for 1 minute until fragrant
5. Add ground turkey, break apart with a spoon, cook for 6-7 minutes until browned
6. Stir in tomato paste and all spices (chili powder, cumin, paprika, cayenne)
7. Add diced tomatoes, kidney beans, and chicken broth
8. Bring to a boil, then reduce heat and simmer for 20-25 minutes, stirring occasionally
9. Season with salt and pepper to taste
10. Serve over brown rice (60g dry rice per portion), store second portion for tomorrow's lunch

**Macros per serving:** 480 cal | 50g protein | 14g fat | 42g carbs
**Prep time:** 15 minutes | **Cook time:** 30 minutes`
                }
            ],
            snacks: [
                {
                    name: "Cottage Cheese Bowl",
                    time: "11:00 AM",
                    calories: 200,
                    protein: 28,
                    fat: 4,
                    carbs: 12,
                    recipe: "200g cottage cheese with cucumber and cherry tomatoes"
                },
                {
                    name: "Protein Bar",
                    time: "4:00 PM",
                    calories: 200,
                    protein: 20,
                    fat: 8,
                    carbs: 18,
                    recipe: "Quality protein bar (Grenade, Quest, etc.)"
                }
            ]
        },
        3: { // Tuesday
            isBusinessDay: true,
            meals: [
                {
                    name: "High Protein Smoothie",
                    type: "Breakfast (10:00 AM)",
                    calories: 380,
                    protein: 40,
                    fat: 10,
                    carbs: 35,
                    recipe: "1 scoop whey, 1 banana, 200ml almond milk, 1 tbsp almond butter, handful spinach, ice.",
                    prepNote: "Blend and go",
                    fullRecipe: `
**Ingredients:**
• 1 scoop (30g) whey protein powder (vanilla or chocolate)
• 1 medium ripe banana
• 200ml unsweetened almond milk
• 1 tbsp almond butter
• 1 large handful fresh spinach (about 30g)
• 1 cup ice cubes
• Optional: 1/2 tsp vanilla extract

**Instructions:**
1. Add almond milk to blender first (helps with blending)
2. Add spinach and blend briefly until broken down
3. Add banana (broken into chunks), almond butter, and protein powder
4. Add ice cubes
5. Blend on high for 45-60 seconds until smooth and creamy
6. Add more liquid if too thick, or more ice if too thin
7. Pour into a glass and drink immediately

**Macros per serving:** 380 cal | 40g protein | 10g fat | 35g carbs
**Prep time:** 3 minutes`
                },
                {
                    name: "Spicy Turkey Chili (from Monday)",
                    type: "Office Lunch (1:00 PM)",
                    calories: 480,
                    protein: 50,
                    fat: 14,
                    carbs: 42,
                    recipe: "Reheated from Monday dinner",
                    prepNote: "Already prepped!"
                },
                {
                    name: "Baked Salmon with Roasted Veggies",
                    type: "Dinner (6:30 PM) → Lunch Tomorrow",
                    calories: 500,
                    protein: 48,
                    fat: 22,
                    carbs: 28,
                    recipe: "200g salmon fillet, roasted broccoli, bell peppers, zucchini with 150g sweet potato. Drizzle with olive oil and lemon.",
                    prepNote: "Bake everything on one tray - 25 mins at 200°C",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 400g salmon fillet (2 portions)
• 300g sweet potato, cubed
• 200g broccoli florets
• 1 bell pepper, chopped
• 1 medium zucchini, sliced
• 2 tbsp olive oil
• 1 lemon (juice and zest)
• 2 cloves garlic, minced
• Salt and pepper to taste
• Fresh dill or parsley (optional)

**Instructions:**
1. Preheat oven to 200°C (400°F)
2. Line a large baking sheet with parchment paper
3. Toss sweet potato cubes with 1 tbsp olive oil, salt, and pepper, spread on one side of tray
4. Roast sweet potatoes for 10 minutes first (they take longer)
5. Meanwhile, toss broccoli, bell pepper, and zucchini with remaining olive oil, garlic, salt, and pepper
6. After 10 minutes, add vegetables to the other side of the tray
7. Place salmon fillets on top of vegetables, season with salt, pepper, and lemon zest
8. Drizzle everything with lemon juice
9. Bake for 15 minutes until salmon is cooked through and vegetables are tender
10. Garnish with fresh dill or parsley if desired, store second portion for tomorrow

**Macros per serving:** 500 cal | 48g protein | 22g fat | 28g carbs
**Prep time:** 10 minutes | **Cook time:** 25 minutes`
                }
            ],
            snacks: [
                {
                    name: "Boiled Eggs + Veggies",
                    time: "11:00 AM",
                    calories: 180,
                    protein: 16,
                    fat: 10,
                    carbs: 8,
                    recipe: "2 boiled eggs with carrot and celery sticks"
                },
                {
                    name: "Beef Jerky",
                    time: "3:30 PM",
                    calories: 120,
                    protein: 18,
                    fat: 4,
                    carbs: 4,
                    recipe: "30g quality beef jerky"
                }
            ]
        },
        4: { // Wednesday
            isBusinessDay: true,
            meals: [
                {
                    name: "Avocado Toast with Egg",
                    type: "Breakfast (10:00 AM)",
                    calories: 400,
                    protein: 22,
                    fat: 20,
                    carbs: 32,
                    recipe: "2 slices wholegrain toast, half avocado mashed, 2 poached eggs, cherry tomatoes.",
                    prepNote: "Quick 10-min breakfast",
                    fullRecipe: `
**Ingredients:**
• 2 slices wholegrain bread
• 1/2 ripe avocado
• 2 large eggs
• 1/2 cup cherry tomatoes, halved
• 1 tsp white vinegar (for poaching)
• Salt, pepper, and red pepper flakes to taste
• Fresh lemon juice (optional)

**Instructions:**
1. Bring a pot of water to a gentle simmer, add vinegar
2. Toast bread slices to desired crispness
3. While bread toasts, crack eggs into small bowls
4. Create a gentle whirlpool in simmering water, carefully slide in eggs one at a time
5. Poach eggs for 3-4 minutes for runny yolk, 5 minutes for firmer yolk
6. While eggs poach, mash avocado with a fork, season with salt, pepper, and lemon juice
7. Spread mashed avocado evenly on toasted bread
8. Remove eggs with slotted spoon, place on top of avocado toast
9. Top with halved cherry tomatoes and sprinkle with red pepper flakes

**Macros per serving:** 400 cal | 22g protein | 20g fat | 32g carbs
**Prep time:** 10 minutes`
                },
                {
                    name: "Baked Salmon with Roasted Veggies (from Tuesday)",
                    type: "Office Lunch (1:00 PM)",
                    calories: 500,
                    protein: 48,
                    fat: 22,
                    carbs: 28,
                    recipe: "Reheated from Tuesday dinner",
                    prepNote: "Already prepped!"
                },
                {
                    name: "Beef Stir-Fry with Rice Noodles",
                    type: "Dinner (7:00 PM) → Lunch Tomorrow",
                    calories: 510,
                    protein: 52,
                    fat: 16,
                    carbs: 42,
                    recipe: "200g lean beef strips, mixed stir-fry veggies (peppers, snap peas, broccoli), 60g rice noodles, soy sauce, ginger, garlic.",
                    prepNote: "High heat wok cooking - 15 mins total",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 400g lean beef sirloin, sliced into thin strips
• 120g dried rice noodles
• 1 bell pepper, sliced
• 150g snap peas
• 1 cup broccoli florets
• 3 cloves garlic, minced
• 1 tbsp fresh ginger, grated
• 3 tbsp low-sodium soy sauce
• 1 tbsp oyster sauce
• 1 tsp sesame oil
• 2 tbsp vegetable oil
• 1 tsp cornstarch
• 2 green onions, sliced
• Salt and pepper to taste

**Instructions:**
1. Cook rice noodles according to package directions, drain and set aside
2. Mix beef strips with cornstarch, salt, and pepper in a bowl
3. Heat wok or large skillet over high heat until smoking hot
4. Add 1 tbsp vegetable oil, swirl to coat
5. Add beef in a single layer, cook 2 minutes per side until browned, remove and set aside
6. Add remaining oil, then garlic and ginger, stir-fry for 30 seconds
7. Add all vegetables, stir-fry for 3-4 minutes until tender-crisp
8. Return beef to wok, add cooked noodles
9. Pour in soy sauce, oyster sauce, and sesame oil, toss everything for 2 minutes
10. Garnish with green onions, divide into 2 portions (store one for tomorrow)

**Macros per serving:** 510 cal | 52g protein | 16g fat | 42g carbs
**Prep time:** 10 minutes | **Cook time:** 15 minutes`
                }
            ],
            snacks: [
                {
                    name: "Protein Shake",
                    time: "11:00 AM",
                    calories: 180,
                    protein: 30,
                    fat: 3,
                    carbs: 8,
                    recipe: "1 scoop whey with water or almond milk"
                },
                {
                    name: "Hummus + Veggies",
                    time: "4:00 PM",
                    calories: 150,
                    protein: 6,
                    fat: 8,
                    carbs: 15,
                    recipe: "50g hummus with cucumber, carrot, bell pepper sticks"
                }
            ]
        },
        5: { // Thursday
            isBusinessDay: true,
            meals: [
                {
                    name: "Breakfast Burrito Bowl",
                    type: "Breakfast (10:00 AM)",
                    calories: 420,
                    protein: 32,
                    fat: 18,
                    carbs: 35,
                    recipe: "3 scrambled eggs, 50g black beans, 30g cheese, salsa, spinach, small portion quinoa.",
                    prepNote: "Prep quinoa in advance",
                    fullRecipe: `
**Ingredients:**
• 3 large eggs
• 50g black beans (canned, drained and rinsed)
• 40g cooked quinoa (about 15g dry)
• 30g shredded cheddar or Mexican cheese blend
• 1 cup fresh spinach
• 3 tbsp salsa
• 1 tsp olive oil
• Salt, pepper, cumin to taste
• Optional: diced avocado, cilantro, hot sauce

**Instructions:**
1. Cook quinoa in advance (15g dry quinoa with 45ml water, simmer 15 mins)
2. Heat olive oil in a non-stick pan over medium heat
3. Add spinach, cook for 1 minute until wilted, then push to side of pan
4. Whisk eggs with salt, pepper, and a pinch of cumin
5. Pour eggs into pan, scramble gently for 3-4 minutes until just set
6. Meanwhile, warm black beans in microwave for 30 seconds
7. Assemble bowl: Place quinoa as base, add scrambled eggs with spinach
8. Top with black beans, shredded cheese, and salsa
9. Garnish with optional toppings if desired

**Macros per serving:** 420 cal | 32g protein | 18g fat | 35g carbs
**Prep time:** 10 minutes (quinoa pre-cooked)`
                },
                {
                    name: "Beef Stir-Fry with Rice Noodles (from Wednesday)",
                    type: "Office Lunch (1:00 PM)",
                    calories: 510,
                    protein: 52,
                    fat: 16,
                    carbs: 42,
                    recipe: "Reheated from Wednesday dinner",
                    prepNote: "Already prepped!"
                },
                {
                    name: "Chicken Fajita Bowls",
                    type: "Dinner (6:30 PM) → Lunch Tomorrow",
                    calories: 490,
                    protein: 54,
                    fat: 14,
                    carbs: 40,
                    recipe: "Seasoned chicken breast (250g), sautéed peppers and onions, black beans, small portion rice (50g dry), salsa, 2 tbsp Greek yogurt.",
                    prepNote: "Skip tortillas to save calories",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g chicken breast, sliced into strips
• 100g dry white or brown rice
• 2 bell peppers (different colors), sliced
• 1 large onion, sliced
• 100g black beans (canned, drained)
• 4 tbsp salsa
• 4 tbsp Greek yogurt
• 2 tbsp olive oil
• 2 tsp fajita seasoning (or mix: cumin, chili powder, paprika, garlic powder)
• 1 lime, cut into wedges
• Salt and pepper to taste
• Fresh cilantro (optional)

**Instructions:**
1. Cook rice according to package directions (set aside when done)
2. Season chicken strips with fajita seasoning, salt, and pepper
3. Heat 1 tbsp olive oil in a large skillet over medium-high heat
4. Add chicken strips, cook 5-6 minutes per side until golden and cooked through (internal temp 165°F/75°C)
5. Remove chicken and set aside
6. Add remaining oil to pan, add sliced peppers and onions
7. Sauté vegetables for 6-8 minutes until soft and slightly charred
8. Warm black beans in microwave
9. Assemble bowls: Rice base, top with chicken, sautéed peppers and onions, black beans
10. Add salsa and Greek yogurt on top, squeeze lime over everything
11. Garnish with cilantro if desired, store second portion for tomorrow

**Macros per serving:** 490 cal | 54g protein | 14g fat | 40g carbs
**Prep time:** 10 minutes | **Cook time:** 20 minutes`
                }
            ],
            snacks: [
                {
                    name: "Greek Yogurt + Honey",
                    time: "11:30 AM",
                    calories: 160,
                    protein: 18,
                    fat: 3,
                    carbs: 16,
                    recipe: "150g Greek yogurt with 1 tsp honey"
                },
                {
                    name: "String Cheese + Grapes",
                    time: "3:30 PM",
                    calories: 180,
                    protein: 12,
                    fat: 8,
                    carbs: 16,
                    recipe: "2 string cheese sticks with 100g grapes"
                }
            ]
        },
        6: { // Friday
            isBusinessDay: false,
            meals: [
                {
                    name: "Veggie Omelette",
                    type: "Breakfast (10:00 AM)",
                    calories: 380,
                    protein: 30,
                    fat: 22,
                    carbs: 18,
                    recipe: "3-egg omelette with mushrooms, spinach, tomatoes, feta cheese. Side of fruit.",
                    prepNote: "Weekend breakfast treat",
                    fullRecipe: `
**Ingredients:**
• 3 large eggs
• 1/2 cup mushrooms, sliced
• 1 cup fresh spinach
• 1/2 cup cherry tomatoes, halved
• 30g feta cheese, crumbled
• 1 tbsp olive oil or butter
• Salt and pepper to taste
• 1 small apple or 1 cup berries (side fruit)

**Instructions:**
1. Heat half the oil/butter in a non-stick pan over medium heat
2. Sauté mushrooms for 3-4 minutes until softened and golden
3. Add spinach and cherry tomatoes, cook for 1-2 minutes until spinach wilts
4. Remove vegetables from pan and set aside
5. Whisk eggs with salt and pepper in a bowl
6. Add remaining oil/butter to pan, heat over medium heat
7. Pour in eggs, let cook undisturbed for 1-2 minutes until edges set
8. Add vegetable mixture and feta cheese to one half of the omelette
9. When eggs are mostly set but still slightly runny on top, fold omelette in half
10. Cook for another 1-2 minutes, then slide onto plate
11. Serve with fresh fruit on the side

**Macros per serving:** 380 cal | 30g protein | 22g fat | 18g carbs
**Prep time:** 15 minutes`
                },
                {
                    name: "Chicken Fajita Bowl (from Thursday)",
                    type: "Lunch (1:00 PM)",
                    calories: 490,
                    protein: 54,
                    fat: 14,
                    carbs: 40,
                    recipe: "Reheated from Thursday dinner",
                    prepNote: "Already prepped!"
                },
                {
                    name: "Grilled Pork Chops with Apple Slaw",
                    type: "Dinner (7:00 PM)",
                    calories: 500,
                    protein: 50,
                    fat: 18,
                    carbs: 35,
                    recipe: "200g lean pork chop, apple cabbage slaw (light dressing), roasted Brussels sprouts, 100g roasted potatoes.",
                    prepNote: "Grill pork 4-5 mins per side - no batch cooking needed",
                    fullRecipe: `
**Ingredients:**
• 200g lean pork chop (boneless)
• 100g baby potatoes, halved
• 150g Brussels sprouts, halved
• 1 cup shredded cabbage
• 1 small apple, julienned
• 1 tbsp olive oil
• 1 tbsp apple cider vinegar
• 1 tsp Dijon mustard
• 1 tsp honey
• Salt, pepper, and garlic powder to taste
• Fresh thyme or rosemary (optional)

**Instructions:**
1. Preheat oven to 200°C (400°F) and grill or grill pan to medium-high
2. Toss halved potatoes and Brussels sprouts with half the olive oil, salt, pepper
3. Roast vegetables for 25-30 minutes, turning halfway, until golden and crispy
4. Season pork chop with salt, pepper, and garlic powder
5. Grill pork for 4-5 minutes per side until internal temp reaches 145°F (63°C)
6. Let pork rest for 5 minutes while preparing slaw
7. In a bowl, mix shredded cabbage and julienned apple
8. Whisk together vinegar, mustard, honey, and remaining olive oil for dressing
9. Toss slaw with dressing, season with salt and pepper
10. Plate pork chop with roasted vegetables and apple slaw on the side

**Macros per serving:** 500 cal | 50g protein | 18g fat | 35g carbs
**Prep time:** 10 minutes | **Cook time:** 30 minutes`
                }
            ],
            snacks: [
                {
                    name: "Protein Pancakes",
                    time: "11:00 AM",
                    calories: 220,
                    protein: 24,
                    fat: 6,
                    carbs: 22,
                    recipe: "Made with protein powder, egg whites, banana"
                },
                {
                    name: "Chocolate Milk",
                    time: "4:00 PM",
                    calories: 150,
                    protein: 12,
                    fat: 3,
                    carbs: 20,
                    recipe: "250ml low-fat chocolate milk"
                }
            ]
        },
        7: { // Saturday
            isBusinessDay: false,
            meals: [
                {
                    name: "Protein French Toast",
                    type: "Breakfast (10:30 AM)",
                    calories: 420,
                    protein: 32,
                    fat: 14,
                    carbs: 42,
                    recipe: "2 slices bread dipped in egg whites + protein powder mixture, topped with berries and Greek yogurt.",
                    prepNote: "Weekend special breakfast",
                    fullRecipe: `
**Ingredients:**
• 2 slices wholegrain bread
• 100ml egg whites (about 3 eggs worth)
• 1 scoop (15g) vanilla protein powder
• 1/4 tsp cinnamon
• 1/4 tsp vanilla extract
• 100g Greek yogurt
• 1/2 cup mixed berries (strawberries, blueberries, raspberries)
• 1 tsp honey or maple syrup
• Cooking spray or 1 tsp butter

**Instructions:**
1. In a shallow bowl, whisk together egg whites, protein powder, cinnamon, and vanilla until smooth
2. Heat a non-stick pan over medium heat, add cooking spray or butter
3. Dip each bread slice in the egg mixture, coating both sides thoroughly
4. Place bread in the hot pan, cook for 2-3 minutes per side until golden brown
5. Remove to a plate
6. Top with Greek yogurt and fresh berries
7. Drizzle with honey or maple syrup

**Macros per serving:** 420 cal | 32g protein | 14g fat | 42g carbs
**Prep time:** 10 minutes`
                },
                {
                    name: "Turkey & Avocado Wrap",
                    type: "Lunch (1:30 PM)",
                    calories: 450,
                    protein: 40,
                    fat: 18,
                    carbs: 35,
                    recipe: "Whole wheat wrap, 150g turkey breast, avocado, lettuce, tomato, mustard.",
                    prepNote: "Quick fresh lunch",
                    fullRecipe: `
**Ingredients:**
• 1 large whole wheat tortilla wrap
• 150g sliced turkey breast (deli or leftover roasted)
• 1/4 ripe avocado, sliced
• 2 large lettuce leaves
• 1 medium tomato, sliced
• 1 tbsp Dijon mustard or yellow mustard
• Salt and pepper to taste
• Optional: red onion slices, cucumber

**Instructions:**
1. Lay the tortilla wrap flat on a clean surface
2. Spread mustard evenly across the center of the wrap
3. Layer lettuce leaves on top of the mustard
4. Arrange turkey breast slices on the lettuce
5. Add tomato slices and avocado slices
6. Season with salt and pepper
7. Add optional vegetables if desired
8. Fold in the sides of the wrap, then roll tightly from bottom to top
9. Cut diagonally in half for easier eating
10. Serve immediately or wrap in foil for later

**Macros per serving:** 450 cal | 40g protein | 18g fat | 35g carbs
**Prep time:** 5 minutes`
                },
                {
                    name: "Sheet Pan Chicken & Vegetables",
                    type: "Dinner (7:00 PM) - Meal Prep for Week",
                    calories: 480,
                    protein: 52,
                    fat: 16,
                    carbs: 32,
                    recipe: "Chicken thighs (200g), roasted carrots, green beans, cherry tomatoes, red onion, with herbs and olive oil.",
                    prepNote: "Make extra portions for Sunday dinner prep!",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 400g boneless skinless chicken thighs
• 2 medium carrots, cut into sticks
• 200g green beans, trimmed
• 1 cup cherry tomatoes
• 1 red onion, cut into wedges
• 2 tbsp olive oil
• 2 cloves garlic, minced
• 1 tsp dried thyme
• 1 tsp dried rosemary
• 1 tsp paprika
• Salt and pepper to taste
• Fresh parsley for garnish

**Instructions:**
1. Preheat oven to 200°C (400°F)
2. Line a large baking sheet with parchment paper
3. In a large bowl, toss chicken thighs with 1 tbsp olive oil, garlic, thyme, rosemary, paprika, salt, and pepper
4. Arrange chicken on one half of the baking sheet
5. In the same bowl, toss carrots, green beans, cherry tomatoes, and red onion with remaining olive oil, salt, and pepper
6. Spread vegetables on the other half of the baking sheet
7. Roast for 25-30 minutes until chicken reaches 165°F (75°C) internal temp and vegetables are tender
8. Halfway through cooking, toss vegetables for even roasting
9. Let rest for 5 minutes, garnish with fresh parsley
10. Store second portion for meal prep

**Macros per serving:** 480 cal | 52g protein | 16g fat | 32g carbs
**Prep time:** 15 minutes | **Cook time:** 30 minutes`
                }
            ],
            snacks: [
                {
                    name: "Protein Mug Cake",
                    time: "3:00 PM",
                    calories: 200,
                    protein: 20,
                    fat: 6,
                    carbs: 18,
                    recipe: "2-min microwave protein mug cake"
                },
                {
                    name: "Nut Mix",
                    time: "5:00 PM",
                    calories: 180,
                    protein: 6,
                    fat: 14,
                    carbs: 10,
                    recipe: "30g mixed nuts (almonds, cashews, walnuts)"
                }
            ]
        }
    },
    2: { // Week 2 - Tunisian Focus 🇹🇳
        1: { // Sunday
            isBusinessDay: true,
            meals: [
                {
                    name: "Ojja (Shakshuka with Merguez)",
                    type: "Breakfast (10:00 AM)",
                    calories: 1000,
                    protein: 50,
                    fat: 65,
                    carbs: 45,
                    recipe: "6 eggs, 4-6 Merguez sausages, tomato paste, garlic, harissa, peppers",
                    prepNote: "Fast Tunisian breakfast. Low carb but high fat due to Merguez. Dip bread sparingly.",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 6 large eggs
• 4-6 Merguez sausages (spicy North African lamb/beef sausages)
• 2 tbsp tomato paste
• 1 bell pepper, diced
• 1 small hot pepper (optional, for extra heat)
• 4 cloves garlic, minced
• 2 tbsp harissa paste
• 1 tsp caraway seeds
• 1/2 tsp cumin
• 2 tbsp olive oil
• Salt and pepper to taste
• 100g bread (optional, for dipping - counted in macros)
• Fresh parsley for garnish

**Instructions:**
1. Slice Merguez sausages into rounds
2. Heat olive oil in a large deep skillet or tagine over medium-high heat
3. Add sausage rounds, cook for 5-6 minutes until browned and oil releases
4. Add diced peppers and garlic, sauté for 3-4 minutes
5. Stir in tomato paste, harissa, caraway seeds, and cumin, cook for 1 minute
6. Add 1/4 cup water to create a sauce, simmer for 5 minutes
7. Make 6 wells in the sauce with a spoon
8. Crack an egg into each well
9. Cover and cook for 5-7 minutes until egg whites are set but yolks still runny
10. Season with salt and pepper, garnish with parsley
11. Serve hot with bread for dipping (dip sparingly to control carbs)

**Macros per serving:** 1000 cal | 50g protein | 65g fat | 45g carbs
**Prep time:** 10 minutes | **Cook time:** 20 minutes`
                },
                {
                    name: "Couscous (Standard)",
                    type: "Dinner (6:00 PM) → Lunch Tomorrow",
                    calories: 1400,
                    protein: 70,
                    fat: 45,
                    carbs: 180,
                    recipe: "500g dry couscous, 300g chicken or beef, chickpeas, carrots, zucchini, pumpkin",
                    prepNote: "Steam couscous over the sauce. Divide strictly by the PWA's portion scaler. Tunisian staple!",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g dry couscous (medium grain)
• 600g chicken pieces or beef chunks (bone-in for flavor)
• 200g chickpeas (cooked or canned)
• 2 large carrots, cut into chunks
• 1 medium zucchini, cut into chunks
• 200g pumpkin or butternut squash, cubed
• 1 turnip, quartered (optional but traditional)
• 2 onions, quartered
• 3 tbsp tomato paste
• 1 tbsp harissa
• 2 tsp ras el hanout (Tunisian spice blend)
• 1 tsp caraway seeds
• 4 tbsp olive oil
• 1.5L water or chicken broth
• Salt and pepper to taste
• Fresh coriander for garnish

**Instructions:**
1. In a large pot, heat 2 tbsp olive oil, brown meat on all sides (8-10 minutes)
2. Add onions, tomato paste, harissa, ras el hanout, caraway, salt, pepper
3. Add broth, bring to boil, reduce heat and simmer covered for 30 minutes
4. Add chickpeas, carrots, turnip - cook for 15 minutes
5. Add zucchini and pumpkin - cook for another 15 minutes until all vegetables are tender
6. Meanwhile, prepare couscous: Place dry couscous in a large bowl
7. Pour 500ml boiling water over couscous, add 2 tbsp olive oil and salt, stir
8. Cover with a towel and let steam for 5 minutes, then fluff with a fork
9. Traditionally, steam couscous in a couscoussier over the stew for authentic texture
10. Serve couscous on a large platter, arrange meat and vegetables on top
11. Pour some broth over everything, serve extra broth on the side
12. Divide into portions using app's portion scaler, store second serving for tomorrow

**Macros per serving:** 1400 cal | 70g protein | 45g fat | 180g carbs
**Prep time:** 20 minutes | **Cook time:** 60 minutes`
                }
            ],
            snacks: [
                {
                    name: "Salade Mechouia",
                    time: "2:00 PM",
                    calories: 350,
                    protein: 8,
                    fat: 28,
                    carbs: 18,
                    recipe: "Grilled peppers, tomatoes, garlic, caraway, topped with 1 can tuna and 2 boiled eggs",
                    prepNote: "Side/Starter. Grill and mash vegetables. The olive oil is the caloric driver here; measure it carefully."
                },
                {name: "Apple + Almonds", time: "4:00 PM", calories: 200, protein: 6, fat: 9, carbs: 25, recipe: "Apple + 15 almonds"},
                {name: "Protein Coffee", time: "10:30 AM", calories: 120, protein: 20, fat: 2, carbs: 6, recipe: "Coffee with protein"}
            ]
        },
        2: { // Monday
            isBusinessDay: true,
            meals: [
                {
                    name: "Plat Tunisien",
                    type: "Breakfast (10:00 AM)",
                    calories: 900,
                    protein: 45,
                    fat: 35,
                    carbs: 100,
                    recipe: "Cucumber/tomato salad, olives, 2 eggs, 150g tuna, harissa, and 100g bread per person",
                    prepNote: "Great '5-minute assembly' for the wife. Adjust bread portion to control calories.",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 4 hard-boiled eggs
• 300g canned tuna in olive oil, drained
• 2 medium tomatoes, diced
• 1 cucumber, diced
• 100g mixed olives (green and black)
• 200g crusty bread (Tunisian baguette or French bread)
• 3 tbsp olive oil
• 2 tbsp harissa paste
• 1 tsp caraway seeds
• Salt and pepper to taste
• Optional: capers, preserved lemon

**Instructions:**
1. Hard-boil eggs in advance: Boil for 10 minutes, cool in ice water, peel
2. Dice tomatoes and cucumber, place in separate small bowls
3. Halve or quarter the hard-boiled eggs
4. Drain tuna and break into chunks
5. Arrange on individual plates or large serving platter:
   - Place bread torn into pieces or sliced in center
   - Arrange tuna chunks around bread
   - Add hard-boiled egg halves
   - Place tomato and cucumber salad on the side
   - Scatter olives around the plate
6. Drizzle everything with olive oil
7. Serve harissa in a small bowl on the side for dipping
8. Sprinkle caraway seeds over the plate
9. Season with salt and pepper
10. Eat by assembling bites: bread + tuna + egg + vegetables + harissa

**Macros per serving:** 900 cal | 45g protein | 35g fat | 100g carbs
**Prep time:** 15 minutes (eggs pre-cooked)`
                },
                {name: "Couscous (from Sunday)", type: "Office Lunch (1:00 PM)", calories: 1400, protein: 70, fat: 45, carbs: 180, recipe: "Reheated couscous from Sunday", prepNote: "Already prepped!"},
                {
                    name: "Lablabi",
                    type: "Dinner (7:00 PM) → Lunch Tomorrow",
                    calories: 1300,
                    protein: 55,
                    fat: 40,
                    carbs: 180,
                    recipe: "400g chickpeas (cooked), 2 eggs, 100g stale bread chunks, cumin, harissa, plenty of olive oil",
                    prepNote: "Heavy main. High fiber and very filling. The chickpeas provide a massive carb/protein base.",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 800g cooked chickpeas (or 2 x 400g cans, drained)
• 4 large eggs
• 200g stale bread, torn into chunks
• 6 cloves garlic, crushed
• 3 tbsp cumin powder
• 2 tbsp harissa paste
• 100ml extra virgin olive oil
• 2 tbsp lemon juice
• 1L chickpea cooking liquid or vegetable broth
• Salt to taste
• Optional garnishes: tuna, capers, preserved lemon, extra harissa

**Instructions:**
1. If using dried chickpeas, soak overnight and cook until tender (save cooking liquid)
2. In a large pot, heat half the olive oil over medium heat
3. Add crushed garlic and cumin, sauté for 1-2 minutes until fragrant
4. Add chickpeas and cooking liquid/broth, bring to boil
5. Reduce heat and simmer for 15-20 minutes, partially mash some chickpeas for thickness
6. Meanwhile, hard-boil eggs for 10 minutes, peel and halve
7. Toast or lightly fry bread chunks until crispy
8. To serve: Divide bread chunks between 2 deep bowls
9. Ladle hot chickpea soup over the bread
10. Top each bowl with 2 egg halves
11. Drizzle generously with remaining olive oil (this is key to authentic lablabi!)
12. Add harissa paste on top, squeeze lemon juice over
13. Season with salt, add optional garnishes if desired
14. Mix everything together before eating - bread should soak up the broth
15. Store second portion for tomorrow (bread separate from soup)

**Macros per serving:** 1300 cal | 55g protein | 40g fat | 180g carbs
**Prep time:** 15 minutes | **Cook time:** 25 minutes`
                }
            ],
            snacks: [
                {
                    name: "Brik (Egg & Tuna)",
                    time: "11:00 AM",
                    calories: 500,
                    protein: 24,
                    fat: 32,
                    carbs: 30,
                    recipe: "2 sheets Malsouka, 2 eggs, 50g tuna, parsley, capers, deep-fried",
                    prepNote: "Side Dish. Each Brik is ~250kcal. Air-fry instead of deep-frying to cut fat by 50%."
                },
                {
                    name: "Tunisian Appetizer (Kemia Style)",
                    time: "4:00 PM",
                    calories: 600,
                    protein: 20,
                    fat: 40,
                    carbs: 40,
                    recipe: "Small baguette, 2 tbsp olive oil, 1 tbsp harissa, 50g tuna, olives",
                    prepNote: "Snack/Social. Dangerous for a deficit! Easy to overeat. Log before you start dipping."
                }
            ]
        },
        3: { // Tuesday
            isBusinessDay: true,
            meals: [
                {
                    name: "Breakfast Hash",
                    type: "Breakfast (10:00 AM)",
                    calories: 420,
                    protein: 30,
                    fat: 20,
                    carbs: 32,
                    recipe: "Diced sweet potato, turkey sausage, peppers, onions, 2 eggs on top.",
                    prepNote: "One-pan meal",
                    fullRecipe: `
**Ingredients:**
• 1 medium sweet potato (200g), diced small
• 100g turkey sausage, sliced
• 1 bell pepper, diced
• 1/2 onion, diced
• 2 large eggs
• 1 tbsp olive oil
• 1/2 tsp paprika
• 1/2 tsp garlic powder
• Salt and pepper to taste
• Fresh parsley or green onions for garnish

**Instructions:**
1. Heat olive oil in a large non-stick skillet over medium-high heat
2. Add diced sweet potato, cook for 8-10 minutes, stirring occasionally until starting to soften
3. Add turkey sausage slices, cook for 3-4 minutes until browned
4. Add diced peppers and onions, cook for 4-5 minutes until vegetables are tender
5. Season with paprika, garlic powder, salt, and pepper, stir well
6. Make 2 wells in the hash mixture
7. Crack an egg into each well
8. Cover pan and cook for 4-5 minutes until egg whites are set but yolks still runny (or cook longer for fully set eggs)
9. Garnish with fresh parsley or green onions
10. Serve hot directly from the pan

**Macros per serving:** 420 cal | 30g protein | 20g fat | 32g carbs
**Prep time:** 10 minutes | **Cook time:** 20 minutes`
                },
                {name: "Lablabi (from Monday)", type: "Office Lunch (1:00 PM)", calories: 1300, protein: 55, fat: 40, carbs: 180, recipe: "Reheated from Monday", prepNote: "Already prepped! Tunisian comfort food 🇹🇳"},
                {
                    name: "Turkey Meatballs with Zoodles",
                    type: "Dinner (6:30 PM) → Lunch Tomorrow",
                    calories: 480,
                    protein: 54,
                    fat: 18,
                    carbs: 28,
                    recipe: "Turkey meatballs (280g turkey) with marinara sauce, zucchini noodles, Parmesan cheese (10g).",
                    prepNote: "Bake meatballs 20 mins at 190°C",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 560g lean ground turkey
• 3 medium zucchini, spiralized into noodles
• 400g marinara sauce (low-sugar)
• 20g Parmesan cheese, grated
• 1 egg
• 30g breadcrumbs
• 2 cloves garlic, minced
• 1 tsp Italian seasoning
• 1/2 tsp onion powder
• 2 tbsp olive oil
• Salt and pepper to taste
• Fresh basil for garnish

**Instructions:**
1. Preheat oven to 190°C (375°F), line baking sheet with parchment
2. In a large bowl, combine ground turkey, egg, breadcrumbs, half the garlic, Italian seasoning, onion powder, salt, pepper
3. Mix gently until just combined (don't overmix)
4. Form into 12-14 meatballs (about 40g each)
5. Place on baking sheet, drizzle with 1 tbsp olive oil
6. Bake for 18-20 minutes until internal temp reaches 165°F (75°C)
7. Meanwhile, heat marinara sauce in a large pan with remaining garlic
8. When meatballs are done, add them to the marinara sauce, simmer for 5 minutes
9. In a separate pan, heat remaining olive oil over medium-high heat
10. Add zucchini noodles, sauté for 2-3 minutes until just tender (don't overcook!)
11. Divide zoodles between 2 plates, top with meatballs and sauce
12. Sprinkle with Parmesan cheese and fresh basil
13. Store second portion for tomorrow

**Macros per serving:** 480 cal | 54g protein | 18g fat | 28g carbs
**Prep time:** 15 minutes | **Cook time:** 25 minutes`
                }
            ],
            snacks: [
                {name: "Boiled Eggs + Veggies", time: "11:00 AM", calories: 180, protein: 16, fat: 10, carbs: 8, recipe: "2 eggs, veggies"},
                {name: "Edamame", time: "3:30 PM", calories: 150, protein: 12, fat: 6, carbs: 12, recipe: "150g edamame"}
            ]
        },
        4: { // Wednesday
            isBusinessDay: true,
            meals: [
                {
                    name: "Smoked Salmon Bagel",
                    type: "Breakfast (10:00 AM)",
                    calories: 380,
                    protein: 28,
                    fat: 14,
                    carbs: 35,
                    recipe: "Half bagel, cream cheese (light), smoked salmon (80g), capers, red onion.",
                    prepNote: "Quick protein-packed breakfast",
                    fullRecipe: `
**Ingredients:**
• 1 whole wheat bagel, halved
• 40g light cream cheese
• 80g smoked salmon
• 1 tbsp capers
• 1/4 red onion, thinly sliced
• Fresh dill (optional)
• Lemon wedge
• Black pepper to taste

**Instructions:**
1. Toast bagel halves to desired crispness
2. Spread cream cheese evenly on both halves
3. Layer smoked salmon on top of cream cheese
4. Sprinkle capers over salmon
5. Add red onion slices
6. Top with fresh dill if desired
7. Squeeze lemon juice over everything
8. Season with black pepper
9. Serve immediately or wrap for on-the-go

**Macros per serving:** 380 cal | 28g protein | 14g fat | 35g carbs
**Prep time:** 5 minutes`
                },
                {name: "Turkey Meatballs with Zoodles (from Tuesday)", type: "Office Lunch (1:00 PM)", calories: 480, protein: 54, fat: 18, carbs: 28, recipe: "Reheated from Tuesday", prepNote: "Already prepped!"},
                {
                    name: "Chicken Souvlaki Bowls",
                    type: "Dinner (7:00 PM) → Lunch Tomorrow",
                    calories: 500,
                    protein: 55,
                    fat: 16,
                    carbs: 38,
                    recipe: "Marinated chicken skewers (280g), Greek salad, hummus (30g), pita bread (half).",
                    prepNote: "Marinate chicken in lemon, garlic, oregano",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 560g chicken breast, cut into cubes
• 60g hummus
• 1 whole wheat pita bread
• 2 cups romaine lettuce, chopped
• 1 cucumber, diced
• 1 cup cherry tomatoes, halved
• 1/4 red onion, sliced
• 50g feta cheese, crumbled
• 3 tbsp olive oil
• 3 tbsp lemon juice
• 4 cloves garlic, minced
• 2 tsp dried oregano
• 1 tsp paprika
• Salt and pepper to taste
• Wooden skewers (soaked in water)

**Instructions:**
1. In a bowl, mix 2 tbsp olive oil, lemon juice, garlic, oregano, paprika, salt, pepper
2. Add chicken cubes, toss to coat, marinate for 30 minutes (or up to 4 hours)
3. Thread marinated chicken onto skewers
4. Heat grill or grill pan to medium-high
5. Grill skewers for 5-6 minutes per side until cooked through (165°F/75°C)
6. Meanwhile, prepare Greek salad: toss lettuce, cucumber, tomatoes, onion with remaining olive oil, salt, pepper
7. Warm pita bread on grill for 1 minute per side
8. Assemble bowls: Greek salad base, top with chicken from skewers
9. Add a dollop of hummus, crumbled feta, and half pita on the side
10. Store second portion for tomorrow

**Macros per serving:** 500 cal | 55g protein | 16g fat | 38g carbs
**Prep time:** 40 minutes (includes marinating) | **Cook time:** 15 minutes`
                }
            ],
            snacks: [
                {name: "Protein Shake", time: "11:00 AM", calories: 180, protein: 30, fat: 3, carbs: 8, recipe: "Whey + water"},
                {name: "Hummus + Veggies", time: "4:00 PM", calories: 150, protein: 6, fat: 8, carbs: 15, recipe: "50g hummus, veggies"}
            ]
        },
        5: { // Thursday
            isBusinessDay: true,
            meals: [
                {
                    name: "Breakfast Quesadilla",
                    type: "Breakfast (10:00 AM)",
                    calories: 390,
                    protein: 32,
                    fat: 16,
                    carbs: 32,
                    recipe: "Whole wheat tortilla, scrambled eggs, black beans, cheese, salsa.",
                    prepNote: "5-min griddle cooking",
                    fullRecipe: `
**Ingredients:**
• 1 large whole wheat tortilla
• 3 large eggs, scrambled
• 50g black beans, drained
• 30g shredded cheese
• 2 tbsp salsa
• 1 tsp olive oil
• Salt and pepper to taste

**Instructions:**
1. Scramble eggs with salt and pepper in a pan, set aside
2. Heat tortilla in a dry pan over medium heat
3. On one half, layer scrambled eggs, black beans, and cheese
4. Fold tortilla in half
5. Cook for 2-3 minutes per side until golden and cheese melts
6. Cut into triangles, serve with salsa

**Macros per serving:** 390 cal | 32g protein | 16g fat | 32g carbs
**Prep time:** 10 minutes`
                },
                {name: "Chicken Souvlaki Bowls (from Wednesday)", type: "Office Lunch (1:00 PM)", calories: 500, protein: 55, fat: 16, carbs: 38, recipe: "Reheated from Wednesday", prepNote: "Already prepped!"},
                {
                    name: "Pork Tenderloin with Roasted Veggies",
                    type: "Dinner (6:30 PM) → Lunch Tomorrow",
                    calories: 510,
                    protein: 52,
                    fat: 18,
                    carbs: 35,
                    recipe: "Pork tenderloin (220g), roasted cauliflower, carrots, red onion, small portion wild rice.",
                    prepNote: "Roast pork 20-25 mins at 200°C",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 440g pork tenderloin
• 2 cups cauliflower florets
• 2 large carrots, cut into chunks
• 1 red onion, cut into wedges
• 100g wild rice (dry)
• 2 tbsp olive oil
• 2 tsp dried rosemary
• 1 tsp garlic powder
• Salt and pepper to taste

**Instructions:**
1. Preheat oven to 200°C (400°F)
2. Cook wild rice according to package directions (usually 40-45 minutes)
3. Season pork tenderloin with rosemary, garlic powder, salt, pepper
4. Heat 1 tbsp olive oil in an oven-safe skillet, sear pork for 2 minutes per side
5. Toss vegetables with remaining olive oil, salt, pepper
6. Arrange vegetables around pork in the skillet (or on a baking sheet)
7. Roast for 20-25 minutes until pork reaches 145°F (63°C) internal temp
8. Let pork rest for 5 minutes before slicing
9. Serve sliced pork with roasted vegetables and wild rice
10. Store second portion for tomorrow

**Macros per serving:** 510 cal | 52g protein | 18g fat | 35g carbs
**Prep time:** 10 minutes | **Cook time:** 25 minutes`
                }
            ],
            snacks: [
                {name: "Greek Yogurt + Honey", time: "11:30 AM", calories: 160, protein: 18, fat: 3, carbs: 16, recipe: "150g yogurt, honey"},
                {name: "String Cheese + Grapes", time: "3:30 PM", calories: 180, protein: 12, fat: 8, carbs: 16, recipe: "2 cheese sticks, grapes"}
            ]
        },
        6: { // Friday
            isBusinessDay: false,
            meals: [
                {
                    name: "Breakfast Burrito",
                    type: "Breakfast (10:00 AM)",
                    calories: 440,
                    protein: 34,
                    fat: 18,
                    carbs: 36,
                    recipe: "Large whole wheat tortilla, scrambled eggs, turkey bacon, cheese, avocado, salsa.",
                    prepNote: "Weekend breakfast",
                    fullRecipe: `
**Ingredients:**
• 1 large whole wheat tortilla
• 3 large eggs
• 3 slices turkey bacon
• 30g shredded cheese
• 1/4 avocado, sliced
• 3 tbsp salsa
• 1 tsp olive oil
• Salt and pepper to taste

**Instructions:**
1. Cook turkey bacon in a pan until crispy, set aside
2. Scramble eggs with salt and pepper in the same pan
3. Warm tortilla for 10 seconds in microwave
4. Layer eggs, bacon, cheese, and avocado in center of tortilla
5. Top with salsa
6. Fold in sides, then roll tightly from bottom
7. Optional: Toast burrito in pan for 1-2 minutes for crispy exterior
8. Cut in half and serve

**Macros per serving:** 440 cal | 34g protein | 18g fat | 36g carbs
**Prep time:** 15 minutes`
                },
                {name: "Pork Tenderloin with Roasted Veggies (from Thursday)", type: "Lunch (1:00 PM)", calories: 510, protein: 52, fat: 18, carbs: 35, recipe: "Reheated from Thursday", prepNote: "Already prepped!"},
                {
                    name: "Shrimp Scampi with Zoodles",
                    type: "Dinner (7:00 PM)",
                    calories: 470,
                    protein: 48,
                    fat: 20,
                    carbs: 26,
                    recipe: "Shrimp (250g), zucchini noodles, garlic, white wine, lemon, cherry tomatoes, small portion pasta (30g dry).",
                    prepNote: "Quick 10-min cooking - no batch needed",
                    fullRecipe: `
**Ingredients:**
• 250g large shrimp, peeled and deveined
• 2 medium zucchini, spiralized
• 30g dry angel hair pasta
• 1 cup cherry tomatoes, halved
• 4 cloves garlic, minced
• 60ml dry white wine
• 2 tbsp butter
• 1 tbsp olive oil
• 1 lemon (juice and zest)
• Red pepper flakes to taste
• Salt and pepper
• Fresh parsley for garnish

**Instructions:**
1. Cook pasta according to package directions, drain and set aside
2. Heat olive oil and 1 tbsp butter in a large skillet over medium-high heat
3. Add shrimp, season with salt and pepper, cook 2 minutes per side until pink
4. Remove shrimp and set aside
5. Add remaining butter and garlic to pan, sauté for 30 seconds
6. Add white wine, lemon juice, and red pepper flakes, simmer for 2 minutes
7. Add cherry tomatoes, cook for 2 minutes until softened
8. Add zucchini noodles, toss for 2-3 minutes until just tender
9. Return shrimp to pan with cooked pasta, toss everything together
10. Top with lemon zest and fresh parsley

**Macros per serving:** 470 cal | 48g protein | 20g fat | 26g carbs
**Prep time:** 10 minutes | **Cook time:** 10 minutes`
                }
            ],
            snacks: [
                {name: "Protein Pancakes", time: "11:00 AM", calories: 220, protein: 24, fat: 6, carbs: 22, recipe: "Protein pancakes"},
                {name: "Chocolate Milk", time: "4:00 PM", calories: 150, protein: 12, fat: 3, carbs: 20, recipe: "Low-fat chocolate milk"}
            ]
        },
        7: { // Saturday
            isBusinessDay: false,
            meals: [
                {
                    name: "Protein Waffles",
                    type: "Breakfast (10:30 AM)",
                    calories: 400,
                    protein: 32,
                    fat: 14,
                    carbs: 38,
                    recipe: "Waffles made with protein powder, oat flour, topped with Greek yogurt and berries.",
                    prepNote: "Sunday brunch special",
                    fullRecipe: `
**Ingredients:**
• 50g oat flour
• 1 scoop (30g) protein powder
• 2 eggs
• 100ml almond milk
• 1 tsp baking powder
• 1/2 tsp vanilla extract
• 100g Greek yogurt
• 1/2 cup mixed berries
• 1 tsp honey
• Cooking spray

**Instructions:**
1. Preheat waffle iron
2. Mix oat flour, protein powder, and baking powder in a bowl
3. Whisk eggs, almond milk, and vanilla in another bowl
4. Combine wet and dry ingredients, mix until smooth
5. Spray waffle iron with cooking spray
6. Pour batter and cook according to waffle iron instructions (usually 3-4 minutes)
7. Top with Greek yogurt, berries, and honey

**Macros per serving:** 400 cal | 32g protein | 14g fat | 38g carbs
**Prep time:** 10 minutes | **Cook time:** 5 minutes`
                },
                {
                    name: "Grilled Chicken Caesar Salad",
                    type: "Lunch (1:30 PM)",
                    calories: 420,
                    protein: 45,
                    fat: 18,
                    carbs: 22,
                    recipe: "Grilled chicken breast (200g), romaine lettuce, light Caesar dressing, Parmesan, croutons (small portion).",
                    prepNote: "Fresh weekend lunch",
                    fullRecipe: `
**Ingredients:**
• 200g chicken breast
• 4 cups romaine lettuce, chopped
• 3 tbsp light Caesar dressing
• 20g Parmesan cheese, shaved
• 30g wholegrain croutons
• 1 tbsp olive oil
• 1 tsp lemon juice
• Salt and pepper to taste

**Instructions:**
1. Season chicken with salt, pepper, and olive oil
2. Grill chicken for 6-7 minutes per side until cooked through (165°F/75°C)
3. Let rest 5 minutes, then slice
4. Toss romaine lettuce with Caesar dressing and lemon juice
5. Top with sliced chicken, Parmesan, and croutons
6. Serve immediately

**Macros per serving:** 420 cal | 45g protein | 18g fat | 22g carbs
**Prep time:** 10 minutes | **Cook time:** 15 minutes`
                },
                {
                    name: "Beef & Veggie Kebabs",
                    type: "Dinner (7:00 PM) - Meal Prep",
                    calories: 490,
                    protein: 50,
                    fat: 18,
                    carbs: 32,
                    recipe: "Lean beef cubes (200g), bell peppers, onions, mushrooms, served with couscous (60g dry).",
                    prepNote: "Grill extra for Sunday prep",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 400g lean beef sirloin, cubed
• 2 bell peppers, cut into chunks
• 1 large onion, cut into chunks
• 200g mushrooms, whole or halved
• 120g dry couscous
• 3 tbsp olive oil
• 2 tsp cumin
• 1 tsp paprika
• Salt and pepper to taste
• Wooden skewers (soaked)

**Instructions:**
1. Marinate beef cubes with 1 tbsp olive oil, cumin, paprika, salt, pepper for 30 minutes
2. Thread beef, peppers, onions, and mushrooms onto skewers, alternating
3. Heat grill to medium-high
4. Grill kebabs for 3-4 minutes per side (12-15 minutes total) until beef is cooked to desired doneness
5. Meanwhile, prepare couscous: Pour boiling water over couscous, cover for 5 minutes, fluff with fork, drizzle with remaining olive oil
6. Serve kebabs over couscous
7. Make extra portions for meal prep

**Macros per serving:** 490 cal | 50g protein | 18g fat | 32g carbs
**Prep time:** 40 minutes (includes marinating) | **Cook time:** 15 minutes`
                }
            ],
            snacks: [
                {name: "Tuna Salad Wraps", time: "3:00 PM", calories: 180, protein: 24, fat: 6, carbs: 8, recipe: "Tuna lettuce wraps"},
                {name: "Cottage Cheese + Pineapple", time: "5:00 PM", calories: 160, protein: 18, fat: 3, carbs: 16, recipe: "Cottage cheese, pineapple"}
            ]
        }
    },
    3: { // Week 3
        1: { // Sunday
            isBusinessDay: true,
            meals: [
                {
                    name: "Breakfast Bowl",
                    type: "Breakfast (10:00 AM)",
                    calories: 380,
                    protein: 30,
                    fat: 18,
                    carbs: 28,
                    recipe: "Quinoa, poached egg, avocado, cherry tomatoes, feta.",
                    prepNote: "Prep quinoa ahead",
                    fullRecipe: `
**Ingredients:**
• 50g cooked quinoa
• 2 large eggs
• 1/4 avocado, sliced
• 1/2 cup cherry tomatoes, halved
• 30g feta cheese, crumbled
• 1 tsp white vinegar (for poaching)
• 1 tbsp olive oil
• Salt, pepper, red pepper flakes

**Instructions:**
1. Cook quinoa in advance (or use leftover)
2. Bring a pot of water to gentle simmer, add vinegar
3. Poach eggs for 3-4 minutes
4. Warm quinoa and place in bowl
5. Top with poached eggs, avocado, tomatoes, and feta
6. Drizzle with olive oil, season with salt, pepper, red pepper flakes

**Macros per serving:** 380 cal | 30g protein | 18g fat | 28g carbs
**Prep time:** 10 minutes`
                },
                {
                    name: "Cajun Chicken Pasta",
                    type: "Dinner (6:00 PM) → Lunch Tomorrow",
                    calories: 520,
                    protein: 54,
                    fat: 16,
                    carbs: 42,
                    recipe: "Chicken breast with Cajun spices, whole wheat pasta (60g dry), peppers, light cream sauce.",
                    prepNote: "One-pot pasta dish",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g chicken breast, diced
• 120g dry whole wheat pasta
• 2 bell peppers, sliced
• 1 onion, sliced
• 3 cloves garlic, minced
• 150ml light cream or half-and-half
• 2 tbsp Cajun seasoning
• 2 tbsp olive oil
• 250ml chicken broth
• Salt and pepper
• Fresh parsley

**Instructions:**
1. Season chicken with Cajun seasoning, salt, pepper
2. Heat olive oil in large deep pan, cook chicken 5-6 minutes until golden, remove
3. In same pan, sauté peppers and onions for 5 minutes
4. Add garlic, cook 1 minute
5. Add pasta, chicken broth, bring to boil
6. Reduce heat, simmer covered for 10-12 minutes until pasta is al dente
7. Return chicken to pan, stir in cream
8. Cook 2-3 minutes until sauce thickens
9. Garnish with parsley, divide into 2 portions

**Macros per serving:** 520 cal | 54g protein | 16g fat | 42g carbs
**Prep time:** 10 minutes | **Cook time:** 25 minutes`
                }
            ],
            snacks: [
                {name: "Greek Yogurt + Berries", time: "2:00 PM", calories: 180, protein: 20, fat: 3, carbs: 18, recipe: "200g Greek yogurt, berries"},
                {name: "Apple + Almonds", time: "4:00 PM", calories: 200, protein: 6, fat: 9, carbs: 25, recipe: "Apple + 15 almonds"},
                {name: "Protein Coffee", time: "10:30 AM", calories: 120, protein: 20, fat: 2, carbs: 6, recipe: "Coffee with protein"}
            ]
        },
        2: { // Monday
            isBusinessDay: true,
            meals: [
                {
                    name: "Egg White Wrap",
                    type: "Breakfast (10:00 AM)",
                    calories: 400,
                    protein: 35,
                    fat: 14,
                    carbs: 35,
                    recipe: "Whole wheat wrap, egg whites, turkey, spinach, tomato, cheese.",
                    prepNote: "Grab-and-go option",
                    fullRecipe: `
**Ingredients:**
• 1 large whole wheat wrap
• 150ml egg whites (about 5 eggs worth)
• 80g sliced turkey breast
• 1 cup fresh spinach
• 1 medium tomato, sliced
• 30g shredded cheese
• 1 tsp olive oil
• Salt and pepper

**Instructions:**
1. Heat olive oil in pan over medium heat
2. Pour in egg whites, season with salt and pepper
3. Scramble for 3-4 minutes until cooked through
4. Warm wrap in microwave for 10 seconds
5. Layer turkey, scrambled egg whites, spinach, tomato, and cheese in center
6. Roll tightly, folding in sides
7. Optional: Toast in pan for crispy exterior
8. Cut in half and serve

**Macros per serving:** 400 cal | 35g protein | 14g fat | 35g carbs
**Prep time:** 10 minutes`
                },
                {name: "Cajun Chicken Pasta (from Sunday)", type: "Office Lunch (1:00 PM)", calories: 520, protein: 54, fat: 16, carbs: 42, recipe: "Reheated from Sunday", prepNote: "Already prepped!"},
                {
                    name: "Lemon Garlic Tilapia",
                    type: "Dinner (7:00 PM) → Lunch Tomorrow",
                    calories: 480,
                    protein: 50,
                    fat: 14,
                    carbs: 38,
                    recipe: "Tilapia (250g), roasted Brussels sprouts, sweet potato (150g).",
                    prepNote: "Quick 15-min bake",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g tilapia fillets
• 300g sweet potato, cubed
• 300g Brussels sprouts, halved
• 4 cloves garlic, minced
• 2 lemons (juice and zest)
• 3 tbsp olive oil
• 1 tsp paprika
• Salt and pepper
• Fresh parsley

**Instructions:**
1. Preheat oven to 200°C (400°F)
2. Toss sweet potato with 1 tbsp olive oil, salt, pepper, roast for 15 minutes
3. Add Brussels sprouts to tray, roast another 10 minutes
4. Meanwhile, season tilapia with paprika, salt, pepper
5. Heat remaining olive oil in oven-safe pan, add garlic, cook 30 seconds
6. Add tilapia, cook 2 minutes, flip
7. Add lemon juice and zest, transfer to oven
8. Bake 8-10 minutes until fish flakes easily
9. Serve with roasted vegetables, garnish with parsley
10. Store second portion for tomorrow

**Macros per serving:** 480 cal | 50g protein | 14g fat | 38g carbs
**Prep time:** 10 minutes | **Cook time:** 15 minutes`
                }
            ],
            snacks: [
                {name: "Cottage Cheese Bowl", time: "11:00 AM", calories: 200, protein: 28, fat: 4, carbs: 12, recipe: "200g cottage cheese, veggies"},
                {name: "Protein Bar", time: "4:00 PM", calories: 200, protein: 20, fat: 8, carbs: 18, recipe: "Quality protein bar"}
            ]
        },
        3: { // Tuesday
            isBusinessDay: true,
            meals: [
                {
                    name: "Protein Smoothie Bowl",
                    type: "Breakfast (10:00 AM)",
                    calories: 390,
                    protein: 32,
                    fat: 12,
                    carbs: 42,
                    recipe: "Protein smoothie topped with granola, banana, chia seeds.",
                    prepNote: "Instagram-worthy breakfast",
                    fullRecipe: `
**Ingredients:**
• 1 scoop (30g) protein powder
• 1 frozen banana
• 150ml almond milk
• 1/2 cup frozen berries
• 30g granola
• 1 tbsp chia seeds
• Fresh fruit slices for topping

**Instructions:**
1. Blend protein powder, frozen banana, berries, and almond milk until thick and smooth
2. Pour into a bowl
3. Top with granola, chia seeds, and fresh fruit slices
4. Eat with a spoon like a bowl of ice cream

**Macros per serving:** 390 cal | 32g protein | 12g fat | 42g carbs
**Prep time:** 5 minutes`
                },
                {name: "Lemon Garlic Tilapia (from Monday)", type: "Office Lunch (1:00 PM)", calories: 480, protein: 50, fat: 14, carbs: 38, recipe: "Reheated from Monday", prepNote: "Already prepped!"},
                {
                    name: "Chicken Tikka Masala",
                    type: "Dinner (6:30 PM) → Lunch Tomorrow",
                    calories: 500,
                    protein: 52,
                    fat: 16,
                    carbs: 40,
                    recipe: "Chicken breast in tikka sauce (light coconut milk), basmati rice (60g dry), naan bread (small).",
                    prepNote: "Slow cooker friendly",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g chicken breast, cubed
• 120g dry basmati rice
• 200ml light coconut milk
• 200g canned crushed tomatoes
• 3 tbsp tikka masala paste
• 1 onion, diced
• 3 cloves garlic, minced
• 1 tbsp ginger, grated
• 2 tbsp olive oil
• 1 small naan bread
• Fresh cilantro
• Salt to taste

**Instructions:**
1. Cook basmati rice according to package directions
2. Heat olive oil in large pan, sauté onion for 5 minutes
3. Add garlic, ginger, tikka paste, cook for 1 minute
4. Add chicken, cook for 5 minutes until browned
5. Add crushed tomatoes and coconut milk, bring to simmer
6. Cook for 15-20 minutes until sauce thickens and chicken is cooked through
7. Season with salt, garnish with cilantro
8. Warm naan bread
9. Serve tikka masala over rice with half naan on side
10. Store second portion for tomorrow

**Macros per serving:** 500 cal | 52g protein | 16g fat | 40g carbs
**Prep time:** 10 minutes | **Cook time:** 30 minutes`
                }
            ],
            snacks: [
                {name: "Boiled Eggs + Veggies", time: "11:00 AM", calories: 180, protein: 16, fat: 10, carbs: 8, recipe: "2 eggs, veggies"},
                {name: "Beef Jerky", time: "3:30 PM", calories: 120, protein: 18, fat: 4, carbs: 4, recipe: "30g jerky"}
            ]
        },
        4: { // Wednesday
            isBusinessDay: true,
            meals: [
                {
                    name: "Veggie Frittata",
                    type: "Breakfast (10:00 AM)",
                    calories: 370,
                    protein: 28,
                    fat: 20,
                    carbs: 20,
                    recipe: "Eggs, bell peppers, onions, spinach, goat cheese, side fruit.",
                    prepNote: "Bake or stovetop",
                    fullRecipe: `
**Ingredients:**
• 6 large eggs
• 1 bell pepper, diced
• 1/2 onion, diced
• 1 cup spinach
• 50g goat cheese, crumbled
• 2 tbsp milk
• 1 tbsp olive oil
• 1 small apple or 1 cup berries (side)
• Salt and pepper

**Instructions:**
1. Preheat oven to 180°C (350°F) if baking
2. Heat olive oil in oven-safe skillet over medium heat
3. Sauté peppers and onions for 5 minutes
4. Add spinach, cook until wilted
5. Whisk eggs with milk, salt, pepper
6. Pour eggs over vegetables in pan
7. Sprinkle goat cheese on top
8. Either: Cook on stovetop covered for 10-12 minutes, OR transfer to oven and bake for 15 minutes
9. Slice and serve with fruit on the side

**Macros per serving:** 370 cal | 28g protein | 20g fat | 20g carbs
**Prep time:** 10 minutes | **Cook time:** 15 minutes`
                },
                {name: "Chicken Tikka Masala (from Tuesday)", type: "Office Lunch (1:00 PM)", calories: 500, protein: 52, fat: 16, carbs: 40, recipe: "Reheated from Tuesday", prepNote: "Already prepped!"},
                {
                    name: "Honey Mustard Pork Chops",
                    type: "Dinner (7:00 PM) → Lunch Tomorrow",
                    calories: 510,
                    protein: 54,
                    fat: 18,
                    carbs: 36,
                    recipe: "Pork chops with honey mustard glaze, roasted green beans, mashed cauliflower, small potato.",
                    prepNote: "Bake 18-20 mins",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 2 pork chops (220g each)
• 300g green beans
• 2 cups cauliflower florets
• 1 medium potato (150g), cubed
• 3 tbsp Dijon mustard
• 2 tbsp honey
• 2 tbsp olive oil
• 2 cloves garlic, minced
• Salt and pepper

**Instructions:**
1. Preheat oven to 200°C (400°F)
2. Mix mustard, honey, and 1 tbsp olive oil for glaze
3. Season pork chops with salt and pepper, coat with glaze
4. Place on baking sheet, bake for 18-20 minutes until internal temp 145°F (63°C)
5. Meanwhile, boil cauliflower until tender (10 mins), drain and mash with garlic, salt, pepper
6. Toss green beans and potato cubes with remaining olive oil, roast alongside pork for last 15 minutes
7. Serve pork chop with mashed cauliflower, roasted green beans and potatoes
8. Store second portion for tomorrow

**Macros per serving:** 510 cal | 54g protein | 18g fat | 36g carbs
**Prep time:** 10 minutes | **Cook time:** 20 minutes`
                }
            ],
            snacks: [
                {name: "Protein Shake", time: "11:00 AM", calories: 180, protein: 30, fat: 3, carbs: 8, recipe: "Whey + water"},
                {name: "Hummus + Veggies", time: "4:00 PM", calories: 150, protein: 6, fat: 8, carbs: 15, recipe: "50g hummus, veggies"}
            ]
        },
        5: { // Thursday
            isBusinessDay: true,
            meals: [
                {
                    name: "Breakfast Tacos",
                    type: "Breakfast (10:00 AM)",
                    calories: 390,
                    protein: 30,
                    fat: 16,
                    carbs: 32,
                    recipe: "2 small tortillas, scrambled eggs, black beans, salsa, cheese, avocado.",
                    prepNote: "5-min assembly",
                    fullRecipe: `
**Ingredients:**
• 2 small corn or flour tortillas
• 3 large eggs
• 50g black beans
• 30g shredded cheese
• 1/4 avocado, sliced
• 3 tbsp salsa
• 1 tsp olive oil
• Salt and pepper

**Instructions:**
1. Scramble eggs with salt and pepper in oiled pan
2. Warm tortillas briefly in dry pan or microwave
3. Warm black beans
4. Divide eggs between tortillas
5. Top with black beans, cheese, avocado, and salsa
6. Fold and serve immediately

**Macros per serving:** 390 cal | 30g protein | 16g fat | 32g carbs
**Prep time:** 10 minutes`
                },
                {name: "Honey Mustard Pork Chops (from Wednesday)", type: "Office Lunch (1:00 PM)", calories: 510, protein: 54, fat: 18, carbs: 36, recipe: "Reheated from Wednesday", prepNote: "Already prepped!"},
                {
                    name: "BBQ Chicken Pizza",
                    type: "Dinner (6:30 PM) → Lunch Tomorrow",
                    calories: 520,
                    protein: 56,
                    fat: 16,
                    carbs: 42,
                    recipe: "Thin crust (or tortilla base), BBQ sauce, chicken breast, red onion, cilantro, light cheese.",
                    prepNote: "Homemade pizza night",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 2 thin pizza crusts or large tortillas
• 400g cooked chicken breast, shredded
• 120ml BBQ sauce
• 100g mozzarella cheese, shredded
• 1/2 red onion, thinly sliced
• Fresh cilantro
• 1 tbsp olive oil

**Instructions:**
1. Preheat oven to 220°C (425°F)
2. Place crusts/tortillas on baking sheets
3. Brush with olive oil
4. Spread BBQ sauce evenly on each crust
5. Top with shredded chicken, red onion, and cheese
6. Bake for 10-12 minutes until cheese melts and crust is crispy
7. Remove from oven, top with fresh cilantro
8. Slice each pizza, serve one and store second for tomorrow

**Macros per serving:** 520 cal | 56g protein | 16g fat | 42g carbs
**Prep time:** 10 minutes | **Cook time:** 12 minutes`
                }
            ],
            snacks: [
                {name: "Greek Yogurt + Honey", time: "11:30 AM", calories: 160, protein: 18, fat: 3, carbs: 16, recipe: "150g yogurt, honey"},
                {name: "String Cheese + Grapes", time: "3:30 PM", calories: 180, protein: 12, fat: 8, carbs: 16, recipe: "2 cheese sticks, grapes"}
            ]
        },
        6: { // Friday
            isBusinessDay: false,
            meals: [
                {name: "Protein French Toast", type: "Breakfast (10:00 AM)", calories: 420, protein: 32, fat: 14, carbs: 42, recipe: "Protein French toast with berries and Greek yogurt.", prepNote: "Weekend special"},
                {name: "BBQ Chicken Pizza (from Thursday)", type: "Lunch (1:00 PM)", calories: 520, protein: 56, fat: 16, carbs: 42, recipe: "Reheated from Thursday", prepNote: "Already prepped!"},
                {
                    name: "Garlic Butter Scallops",
                    type: "Dinner (7:00 PM)",
                    calories: 490,
                    protein: 48,
                    fat: 20,
                    carbs: 32,
                    recipe: "Scallops (200g), garlic butter, asparagus, wild rice (60g dry).",
                    prepNote: "Premium weekend meal - 10 min cook",
                    fullRecipe: `
**Ingredients:**
• 200g sea scallops
• 60g wild rice (dry)
• 200g asparagus spears
• 3 tbsp butter
• 4 cloves garlic, minced
• 1 lemon (juice and zest)
• 1 tbsp olive oil
• Salt and pepper
• Fresh parsley

**Instructions:**
1. Cook wild rice according to package directions (40-45 minutes)
2. Pat scallops dry, season with salt and pepper
3. Heat olive oil in large skillet over high heat
4. Sear scallops for 2-3 minutes per side until golden crust forms, remove
5. In same pan, reduce heat to medium, add butter and garlic
6. Cook garlic for 30 seconds, add lemon juice and zest
7. Meanwhile, blanch or grill asparagus for 3-4 minutes
8. Return scallops to pan, coat with garlic butter
9. Serve scallops with asparagus and wild rice, drizzle with garlic butter sauce
10. Garnish with parsley

**Macros per serving:** 490 cal | 48g protein | 20g fat | 32g carbs
**Prep time:** 10 minutes | **Cook time:** 10 minutes (rice separate)`
                }
            ],
            snacks: [
                {name: "Protein Pancakes", time: "11:00 AM", calories: 220, protein: 24, fat: 6, carbs: 22, recipe: "Protein pancakes"},
                {name: "Chocolate Milk", time: "4:00 PM", calories: 150, protein: 12, fat: 3, carbs: 20, recipe: "Low-fat chocolate milk"}
            ]
        },
        7: { // Saturday
            isBusinessDay: false,
            meals: [
                {
                    name: "Breakfast Sandwich",
                    type: "Breakfast (10:30 AM)",
                    calories: 380,
                    protein: 30,
                    fat: 18,
                    carbs: 28,
                    recipe: "English muffin, egg, turkey bacon, cheese, tomato.",
                    prepNote: "Classic Sunday breakfast",
                    fullRecipe: `
**Ingredients:**
• 1 whole wheat English muffin
• 2 large eggs
• 3 slices turkey bacon
• 30g cheese slice
• 1 tomato, sliced
• 1 tsp olive oil
• Salt and pepper

**Instructions:**
1. Cook turkey bacon until crispy, set aside
2. Toast English muffin halves
3. Fry eggs in olive oil (or scramble if preferred)
4. Layer bottom muffin with cheese, turkey bacon, egg, tomato
5. Season with salt and pepper
6. Top with other muffin half
7. Serve immediately

**Macros per serving:** 380 cal | 30g protein | 18g fat | 28g carbs
**Prep time:** 10 minutes`
                },
                {
                    name: "Chicken & Avocado Salad",
                    type: "Lunch (1:30 PM)",
                    calories: 440,
                    protein: 42,
                    fat: 20,
                    carbs: 25,
                    recipe: "Grilled chicken (180g), mixed greens, avocado, cherry tomatoes, balsamic vinaigrette.",
                    prepNote: "Light fresh lunch",
                    fullRecipe: `
**Ingredients:**
• 180g chicken breast
• 3 cups mixed salad greens
• 1/2 avocado, sliced
• 1 cup cherry tomatoes, halved
• 2 tbsp balsamic vinaigrette
• 1 tbsp olive oil
• Salt and pepper

**Instructions:**
1. Season chicken with salt, pepper, and olive oil
2. Grill for 6-7 minutes per side until cooked through
3. Let rest 5 minutes, then slice
4. Toss mixed greens with cherry tomatoes
5. Top with sliced chicken and avocado
6. Drizzle with balsamic vinaigrette
7. Serve immediately

**Macros per serving:** 440 cal | 42g protein | 20g fat | 25g carbs
**Prep time:** 10 minutes | **Cook time:** 15 minutes`
                },
                {
                    name: "Slow Cooker Pot Roast",
                    type: "Dinner (7:00 PM) - Meal Prep",
                    calories: 500,
                    protein: 52,
                    fat: 18,
                    carbs: 32,
                    recipe: "Lean beef roast, carrots, onions, celery, potatoes, herbs.",
                    prepNote: "Set and forget - 6-8 hours",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 400g lean beef roast
• 3 carrots, cut into chunks
• 2 onions, quartered
• 2 celery stalks, cut into chunks
• 2 medium potatoes, cubed
• 500ml beef broth
• 2 tbsp tomato paste
• 3 cloves garlic, minced
• 2 bay leaves
• 1 tsp dried thyme
• 1 tsp dried rosemary
• Salt and pepper

**Instructions:**
1. Season beef with salt and pepper
2. Brown beef in a hot pan for 2-3 minutes per side (optional but recommended)
3. Place beef in slow cooker
4. Add all vegetables around the beef
5. Mix broth with tomato paste, garlic, herbs
6. Pour over beef and vegetables
7. Cook on low for 6-8 hours or high for 4-5 hours
8. Remove bay leaves before serving
9. Shred beef, serve with vegetables and broth
10. Make extra portions for meal prep

**Macros per serving:** 500 cal | 52g protein | 18g fat | 32g carbs
**Prep time:** 15 minutes | **Cook time:** 6-8 hours`
                }
            ],
            snacks: [
                {name: "Protein Mug Cake", time: "3:00 PM", calories: 200, protein: 20, fat: 6, carbs: 18, recipe: "Microwave protein cake"},
                {name: "Nut Mix", time: "5:00 PM", calories: 180, protein: 6, fat: 14, carbs: 10, recipe: "30g mixed nuts"}
            ]
        }
    },
    4: { // Week 4
        1: { // Sunday
            isBusinessDay: true,
            meals: [
                {
                    name: "Power Oatmeal",
                    type: "Breakfast (10:00 AM)",
                    calories: 410,
                    protein: 32,
                    fat: 14,
                    carbs: 42,
                    recipe: "Oats with protein powder, almond butter, banana, chia seeds.",
                    prepNote: "Filling breakfast",
                    fullRecipe: `
**Ingredients:**
• 60g rolled oats
• 1 scoop (30g) protein powder
• 1 tbsp almond butter
• 1 medium banana, sliced
• 1 tbsp chia seeds
• 250ml water or almond milk
• Pinch of cinnamon
• Pinch of salt

**Instructions:**
1. Cook oats with water/milk and salt for 2-3 minutes in microwave or 5 minutes on stovetop
2. Let cool for 1 minute
3. Stir in protein powder thoroughly
4. Top with almond butter, banana slices, and chia seeds
5. Sprinkle with cinnamon
6. Serve warm

**Macros per serving:** 410 cal | 32g protein | 14g fat | 42g carbs
**Prep time:** 5 minutes`
                },
                {
                    name: "Asian Lettuce Wraps",
                    type: "Dinner (6:00 PM) → Lunch Tomorrow",
                    calories: 480,
                    protein: 50,
                    fat: 16,
                    carbs: 36,
                    recipe: "Ground turkey (250g), water chestnuts, hoisin sauce, lettuce cups, small portion rice.",
                    prepNote: "Fun interactive dinner",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g lean ground turkey
• 1 can (200g) water chestnuts, diced
• 100g dry rice (for small portion on side)
• 1 head butter lettuce, leaves separated
• 3 tbsp hoisin sauce
• 2 tbsp low-sodium soy sauce
• 2 cloves garlic, minced
• 1 tbsp ginger, grated
• 2 green onions, sliced
• 1 tbsp sesame oil
• 1 tsp sriracha (optional)

**Instructions:**
1. Cook rice according to package directions
2. Heat sesame oil in large skillet over medium-high heat
3. Add ground turkey, break apart and cook for 6-7 minutes until browned
4. Add garlic and ginger, cook for 1 minute
5. Add water chestnuts, hoisin sauce, soy sauce, and sriracha
6. Cook for 3-4 minutes until sauce thickens
7. Stir in green onions
8. Serve turkey mixture in lettuce cups with small portion of rice on the side
9. Store second portion for tomorrow (store filling and lettuce separately)

**Macros per serving:** 480 cal | 50g protein | 16g fat | 36g carbs
**Prep time:** 10 minutes | **Cook time:** 15 minutes`
                }
            ],
            snacks: [
                {name: "Greek Yogurt + Berries", time: "2:00 PM", calories: 180, protein: 20, fat: 3, carbs: 18, recipe: "200g Greek yogurt, berries"},
                {name: "Apple + Almonds", time: "4:00 PM", calories: 200, protein: 6, fat: 9, carbs: 25, recipe: "Apple + 15 almonds"},
                {name: "Protein Coffee", time: "10:30 AM", calories: 120, protein: 20, fat: 2, carbs: 6, recipe: "Coffee with protein"}
            ]
        },
        2: { // Monday
            isBusinessDay: true,
            meals: [
                {
                    name: "Breakfast Salad",
                    type: "Breakfast (10:00 AM)",
                    calories: 390,
                    protein: 30,
                    fat: 18,
                    carbs: 28,
                    recipe: "Mixed greens, poached eggs, avocado, turkey bacon, cherry tomatoes.",
                    prepNote: "Savory breakfast option",
                    fullRecipe: `
**Ingredients:**
• 2 cups mixed greens
• 2 large eggs
• 3 slices turkey bacon
• 1/4 avocado, sliced
• 1/2 cup cherry tomatoes, halved
• 1 tbsp olive oil
• 1 tsp white vinegar (for poaching)
• Salt and pepper
• Balsamic glaze (optional)

**Instructions:**
1. Cook turkey bacon until crispy, chop into pieces
2. Bring pot of water to simmer, add vinegar
3. Poach eggs for 3-4 minutes
4. Meanwhile, toss mixed greens with cherry tomatoes
5. Top with bacon pieces, poached eggs, and avocado
6. Drizzle with olive oil and balsamic glaze if desired
7. Season with salt and pepper

**Macros per serving:** 390 cal | 30g protein | 18g fat | 28g carbs
**Prep time:** 15 minutes`
                },
                {name: "Asian Lettuce Wraps (from Sunday)", type: "Office Lunch (1:00 PM)", calories: 480, protein: 50, fat: 16, carbs: 36, recipe: "Reheated from Sunday", prepNote: "Already prepped!"},
                {
                    name: "Balsamic Chicken & Veggies",
                    type: "Dinner (7:00 PM) → Lunch Tomorrow",
                    calories: 500,
                    protein: 54,
                    fat: 16,
                    carbs: 38,
                    recipe: "Chicken breast with balsamic glaze, roasted zucchini, bell peppers, quinoa.",
                    prepNote: "Sheet pan meal",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g chicken breast
• 2 medium zucchini, sliced
• 2 bell peppers, cut into chunks
• 100g dry quinoa
• 3 tbsp balsamic vinegar
• 2 tbsp honey
• 3 tbsp olive oil
• 2 cloves garlic, minced
• 1 tsp dried Italian herbs
• Salt and pepper

**Instructions:**
1. Cook quinoa according to package directions
2. Preheat oven to 200°C (400°F)
3. Mix balsamic vinegar, honey, 1 tbsp olive oil, and garlic for glaze
4. Season chicken with salt, pepper, Italian herbs
5. Toss zucchini and peppers with remaining olive oil, salt, pepper
6. Place vegetables on baking sheet, roast for 10 minutes
7. Add chicken to sheet, brush with balsamic glaze
8. Roast for 20 minutes, brushing chicken with more glaze halfway through
9. Serve chicken and vegetables over quinoa
10. Store second portion for tomorrow

**Macros per serving:** 500 cal | 54g protein | 16g fat | 38g carbs
**Prep time:** 10 minutes | **Cook time:** 30 minutes`
                }
            ],
            snacks: [
                {name: "Cottage Cheese Bowl", time: "11:00 AM", calories: 200, protein: 28, fat: 4, carbs: 12, recipe: "200g cottage cheese, veggies"},
                {name: "Protein Bar", time: "4:00 PM", calories: 200, protein: 20, fat: 8, carbs: 18, recipe: "Quality protein bar"}
            ]
        },
        3: { // Tuesday
            isBusinessDay: true,
            meals: [
                {
                    name: "Protein Crepes",
                    type: "Breakfast (10:00 AM)",
                    calories: 380,
                    protein: 32,
                    fat: 14,
                    carbs: 32,
                    recipe: "Protein powder crepes with berries and Greek yogurt.",
                    prepNote: "Special breakfast",
                    fullRecipe: `
**Ingredients:**
• 2 eggs
• 1 scoop (30g) protein powder
• 50ml almond milk
• 1/2 tsp vanilla extract
• 100g Greek yogurt
• 1/2 cup mixed berries
• Cooking spray

**Instructions:**
1. Whisk eggs, protein powder, almond milk, and vanilla until smooth
2. Heat non-stick pan over medium, spray with cooking spray
3. Pour thin layer of batter, swirl to coat pan
4. Cook for 1-2 minutes per side until golden
5. Repeat with remaining batter (makes 3-4 crepes)
6. Top with Greek yogurt and berries
7. Fold or roll crepes

**Macros per serving:** 380 cal | 32g protein | 14g fat | 32g carbs
**Prep time:** 15 minutes`
                },
                {name: "Balsamic Chicken & Veggies (from Monday)", type: "Office Lunch (1:00 PM)", calories: 500, protein: 54, fat: 16, carbs: 38, recipe: "Reheated from Monday", prepNote: "Already prepped!"},
                {
                    name: "Sesame Ginger Salmon",
                    type: "Dinner (6:30 PM) → Lunch Tomorrow",
                    calories: 510,
                    protein: 50,
                    fat: 20,
                    carbs: 36,
                    recipe: "Salmon with sesame ginger marinade, bok choy, brown rice (65g dry).",
                    prepNote: "Omega-3 boost",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g salmon fillets
• 130g dry brown rice
• 2 heads bok choy, halved
• 3 tbsp soy sauce
• 2 tbsp sesame oil
• 1 tbsp honey
• 2 tbsp fresh ginger, grated
• 2 cloves garlic, minced
• 1 tbsp sesame seeds
• 2 green onions, sliced

**Instructions:**
1. Cook brown rice according to package directions
2. Mix soy sauce, 1 tbsp sesame oil, honey, ginger, garlic for marinade
3. Marinate salmon for 15-20 minutes
4. Preheat oven to 190°C (375°F)
5. Place salmon on baking sheet, bake for 15 minutes
6. Meanwhile, heat remaining sesame oil in pan, sauté bok choy for 5 minutes
7. Serve salmon over brown rice with bok choy on side
8. Sprinkle with sesame seeds and green onions
9. Store second portion for tomorrow

**Macros per serving:** 510 cal | 50g protein | 20g fat | 36g carbs
**Prep time:** 25 minutes (includes marinating) | **Cook time:** 15 minutes`
                }
            ],
            snacks: [
                {name: "Boiled Eggs + Veggies", time: "11:00 AM", calories: 180, protein: 16, fat: 10, carbs: 8, recipe: "2 eggs, veggies"},
                {name: "Edamame", time: "3:30 PM", calories: 150, protein: 12, fat: 6, carbs: 12, recipe: "150g edamame"}
            ]
        },
        4: { // Wednesday
            isBusinessDay: true,
            meals: [
                {
                    name: "Breakfast Skillet",
                    type: "Breakfast (10:00 AM)",
                    calories: 400,
                    protein: 30,
                    fat: 18,
                    carbs: 32,
                    recipe: "Diced potatoes, turkey sausage, eggs, peppers, onions.",
                    prepNote: "One-pan breakfast",
                    fullRecipe: `
**Ingredients:**
• 1 medium potato (150g), diced
• 100g turkey sausage, sliced
• 2 large eggs
• 1 bell pepper, diced
• 1/2 onion, diced
• 1 tbsp olive oil
• 1/2 tsp paprika
• Salt and pepper

**Instructions:**
1. Heat olive oil in large skillet over medium-high heat
2. Add diced potatoes, cook for 8-10 minutes until starting to soften
3. Add turkey sausage and cook for 3-4 minutes
4. Add peppers and onions, cook for 4-5 minutes
5. Season with paprika, salt, pepper
6. Make 2 wells, crack eggs into wells
7. Cover and cook for 4-5 minutes until eggs set
8. Serve hot from pan

**Macros per serving:** 400 cal | 30g protein | 18g fat | 32g carbs
**Prep time:** 10 minutes | **Cook time:** 20 minutes`
                },
                {name: "Sesame Ginger Salmon (from Tuesday)", type: "Office Lunch (1:00 PM)", calories: 510, protein: 50, fat: 20, carbs: 36, recipe: "Reheated from Tuesday", prepNote: "Already prepped!"},
                {
                    name: "Stuffed Bell Peppers",
                    type: "Dinner (7:00 PM) → Lunch Tomorrow",
                    calories: 490,
                    protein: 52,
                    fat: 14,
                    carbs: 42,
                    recipe: "Bell peppers stuffed with lean ground beef, quinoa, tomatoes, cheese.",
                    prepNote: "Bake 30 mins at 180°C",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 4 large bell peppers
• 400g lean ground beef
• 100g cooked quinoa
• 1 can (400g) diced tomatoes, drained
• 100g mozzarella cheese, shredded
• 1 onion, diced
• 2 cloves garlic, minced
• 1 tbsp olive oil
• 1 tsp Italian seasoning
• Salt and pepper

**Instructions:**
1. Preheat oven to 180°C (350°F)
2. Cut tops off peppers, remove seeds and membranes
3. Heat olive oil in pan, sauté onion and garlic for 3 minutes
4. Add ground beef, cook until browned (6-7 minutes)
5. Stir in quinoa, tomatoes, Italian seasoning, salt, pepper
6. Stuff each pepper with beef mixture
7. Place in baking dish, top with cheese
8. Cover with foil, bake for 25 minutes
9. Remove foil, bake 5 more minutes until cheese melts
10. Serve 2 peppers per portion, store remainder for tomorrow

**Macros per serving:** 490 cal | 52g protein | 14g fat | 42g carbs
**Prep time:** 15 minutes | **Cook time:** 30 minutes`
                }
            ],
            snacks: [
                {name: "Protein Shake", time: "11:00 AM", calories: 180, protein: 30, fat: 3, carbs: 8, recipe: "Whey + water"},
                {name: "Hummus + Veggies", time: "4:00 PM", calories: 150, protein: 6, fat: 8, carbs: 15, recipe: "50g hummus, veggies"}
            ]
        },
        5: { // Thursday
            isBusinessDay: true,
            meals: [
                {
                    name: "Breakfast Wrap",
                    type: "Breakfast (10:00 AM)",
                    calories: 390,
                    protein: 32,
                    fat: 16,
                    carbs: 32,
                    recipe: "Large tortilla, scrambled eggs, cheese, spinach, salsa, beans.",
                    prepNote: "Portable breakfast",
                    fullRecipe: `
**Ingredients:**
• 1 large whole wheat tortilla
• 3 large eggs
• 30g shredded cheese
• 1 cup spinach
• 50g black beans
• 3 tbsp salsa
• 1 tsp olive oil
• Salt and pepper

**Instructions:**
1. Scramble eggs with salt and pepper in oiled pan
2. Warm tortilla
3. Warm black beans
4. Layer spinach, eggs, beans, cheese, and salsa in center of tortilla
5. Fold sides in, roll tightly
6. Optional: Toast in pan for crispy exterior
7. Cut in half and serve

**Macros per serving:** 390 cal | 32g protein | 16g fat | 32g carbs
**Prep time:** 10 minutes`
                },
                {name: "Stuffed Bell Peppers (from Wednesday)", type: "Office Lunch (1:00 PM)", calories: 490, protein: 52, fat: 14, carbs: 42, recipe: "Reheated from Wednesday", prepNote: "Already prepped!"},
                {
                    name: "Lemon Herb Chicken Thighs",
                    type: "Dinner (6:30 PM) → Lunch Tomorrow",
                    calories: 510,
                    protein: 54,
                    fat: 18,
                    carbs: 34,
                    recipe: "Chicken thighs, lemon herb marinade, roasted root vegetables, couscous.",
                    prepNote: "Budget-friendly option",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 600g chicken thighs (bone-in, skin removed)
• 120g dry couscous
• 2 carrots, cut into chunks
• 2 parsnips, cut into chunks
• 1 onion, quartered
• 3 tbsp olive oil
• 2 lemons (juice and zest)
• 2 tsp dried mixed herbs
• 2 cloves garlic, minced
• Salt and pepper

**Instructions:**
1. Mix 2 tbsp olive oil, lemon juice, zest, herbs, garlic for marinade
2. Marinate chicken for 20 minutes
3. Preheat oven to 190°C (375°F)
4. Toss root vegetables with remaining olive oil, salt, pepper
5. Place vegetables on baking sheet, add chicken on top
6. Roast for 35-40 minutes until chicken reaches 165°F (75°C)
7. Meanwhile, prepare couscous with boiling water
8. Serve chicken with vegetables and couscous
9. Store second portion for tomorrow

**Macros per serving:** 510 cal | 54g protein | 18g fat | 34g carbs
**Prep time:** 25 minutes (includes marinating) | **Cook time:** 40 minutes`
                }
            ],
            snacks: [
                {name: "Greek Yogurt + Honey", time: "11:30 AM", calories: 160, protein: 18, fat: 3, carbs: 16, recipe: "150g yogurt, honey"},
                {name: "String Cheese + Grapes", time: "3:30 PM", calories: 180, protein: 12, fat: 8, carbs: 16, recipe: "2 cheese sticks, grapes"}
            ]
        },
        6: { // Friday
            isBusinessDay: false,
            meals: [
                {
                    name: "Egg Muffins",
                    type: "Breakfast (10:00 AM)",
                    calories: 380,
                    protein: 30,
                    fat: 20,
                    carbs: 20,
                    recipe: "Baked egg muffins with veggies, cheese, turkey sausage. Make 6-8.",
                    prepNote: "Meal prep breakfast",
                    fullRecipe: `
**Ingredients (makes 6 muffins, 3 per serving):**
• 6 large eggs
• 100g turkey sausage, cooked and crumbled
• 1/2 cup bell peppers, diced
• 1/2 cup spinach, chopped
• 50g shredded cheese
• 1/4 cup milk
• Salt and pepper
• Cooking spray

**Instructions:**
1. Preheat oven to 180°C (350°F)
2. Spray muffin tin with cooking spray
3. Cook turkey sausage, crumble and set aside
4. Whisk eggs with milk, salt, and pepper
5. Divide sausage, peppers, spinach, and cheese among 6 muffin cups
6. Pour egg mixture over fillings
7. Bake for 20-25 minutes until set and lightly golden
8. Let cool, store in fridge for up to 4 days
9. Reheat in microwave for 30-45 seconds

**Macros per serving (3 muffins):** 380 cal | 30g protein | 20g fat | 20g carbs
**Prep time:** 15 minutes | **Cook time:** 25 minutes`
                },
                {name: "Lemon Herb Chicken Thighs (from Thursday)", type: "Lunch (1:00 PM)", calories: 510, protein: 54, fat: 18, carbs: 34, recipe: "Reheated from Thursday", prepNote: "Already prepped!"},
                {
                    name: "Fish Tacos",
                    type: "Dinner (7:00 PM)",
                    calories: 500,
                    protein: 48,
                    fat: 18,
                    carbs: 40,
                    recipe: "Grilled white fish, corn tortillas, cabbage slaw, avocado, lime crema.",
                    prepNote: "Light weekend dinner - no batch needed",
                    fullRecipe: `
**Ingredients:**
• 250g white fish (cod, tilapia, or mahi-mahi)
• 4 small corn tortillas
• 1 cup cabbage, shredded
• 1/4 avocado, sliced
• 3 tbsp Greek yogurt
• 1 lime (juice and zest)
• 1 tbsp olive oil
• 1 tsp chili powder
• 1/2 tsp cumin
• Salt and pepper
• Fresh cilantro

**Instructions:**
1. Mix yogurt with lime juice to make crema, set aside
2. Season fish with chili powder, cumin, salt, pepper
3. Heat olive oil in pan, cook fish 3-4 minutes per side until flaky
4. Meanwhile, toss cabbage with lime zest, salt
5. Warm tortillas in dry pan
6. Break fish into chunks
7. Fill tortillas with fish, cabbage slaw, avocado
8. Drizzle with lime crema, top with cilantro
9. Serve immediately

**Macros per serving:** 500 cal | 48g protein | 18g fat | 40g carbs
**Prep time:** 10 minutes | **Cook time:** 10 minutes`
                }
            ],
            snacks: [
                {name: "Protein Pancakes", time: "11:00 AM", calories: 220, protein: 24, fat: 6, carbs: 22, recipe: "Protein pancakes"},
                {name: "Chocolate Milk", time: "4:00 PM", calories: 150, protein: 12, fat: 3, carbs: 20, recipe: "Low-fat chocolate milk"}
            ]
        },
        7: { // Saturday
            isBusinessDay: false,
            meals: [
                {
                    name: "Full English (Lighter)",
                    type: "Breakfast (10:30 AM)",
                    calories: 420,
                    protein: 34,
                    fat: 20,
                    carbs: 28,
                    recipe: "Eggs, turkey bacon, baked beans, mushrooms, tomatoes, 1 toast.",
                    prepNote: "Weekend treat",
                    fullRecipe: `
**Ingredients:**
• 2 large eggs
• 3 slices turkey bacon
• 100g baked beans (canned)
• 4 mushrooms, halved
• 1 tomato, halved
• 1 slice wholegrain toast
• 1 tbsp olive oil
• Salt and pepper

**Instructions:**
1. Cook turkey bacon in pan until crispy, set aside
2. In same pan, cook mushrooms for 5 minutes
3. Add tomato halves, cook cut-side down for 3 minutes
4. Warm baked beans in microwave
5. Fry or poach eggs in olive oil
6. Toast bread
7. Plate all components together: eggs, bacon, beans, mushrooms, tomato, toast
8. Season with salt and pepper

**Macros per serving:** 420 cal | 34g protein | 20g fat | 28g carbs
**Prep time:** 15 minutes`
                },
                {
                    name: "Tuna Nicoise Salad",
                    type: "Lunch (1:30 PM)",
                    calories: 450,
                    protein: 40,
                    fat: 20,
                    carbs: 28,
                    recipe: "Tuna (150g), mixed greens, boiled egg, green beans, potatoes, olives, vinaigrette.",
                    prepNote: "Classic fresh salad",
                    fullRecipe: `
**Ingredients:**
• 150g canned tuna in water, drained
• 3 cups mixed salad greens
• 1 hard-boiled egg, quartered
• 100g green beans, blanched
• 100g baby potatoes, boiled and halved
• 10 black olives
• 1/2 cup cherry tomatoes, halved
• 2 tbsp olive oil
• 1 tbsp red wine vinegar
• 1 tsp Dijon mustard
• Salt and pepper

**Instructions:**
1. Boil potatoes until tender (10-12 minutes), halve when cool
2. Hard-boil egg (10 minutes), cool and quarter
3. Blanch green beans in boiling water for 3 minutes
4. Mix olive oil, vinegar, mustard, salt, pepper for vinaigrette
5. Arrange greens on plate
6. Top with tuna, egg, green beans, potatoes, olives, tomatoes
7. Drizzle with vinaigrette
8. Serve immediately

**Macros per serving:** 450 cal | 40g protein | 20g fat | 28g carbs
**Prep time:** 20 minutes`
                },
                {
                    name: "Sunday Roast Chicken",
                    type: "Dinner (7:00 PM) - Meal Prep",
                    calories: 490,
                    protein: 54,
                    fat: 16,
                    carbs: 32,
                    recipe: "Roast chicken breast, roasted vegetables medley, stuffing (small portion).",
                    prepNote: "Classic Sunday dinner - use leftovers for week",
                    fullRecipe: `
**Ingredients (for 2 servings):**
• 500g chicken breast
• 2 carrots, cut into chunks
• 1 parsnip, cut into chunks
• 100g Brussels sprouts, halved
• 1 red onion, quartered
• 100g prepared stuffing mix
• 3 tbsp olive oil
• 2 tsp dried thyme
• 1 tsp garlic powder
• Salt and pepper
• Fresh rosemary

**Instructions:**
1. Preheat oven to 190°C (375°F)
2. Season chicken with thyme, garlic powder, salt, pepper, 1 tbsp olive oil
3. Toss all vegetables with remaining olive oil, salt, pepper
4. Place vegetables on baking sheet, add chicken on top
5. Roast for 30-35 minutes until chicken reaches 165°F (75°C)
6. Meanwhile, prepare stuffing according to package directions
7. Let chicken rest 5 minutes, then slice
8. Serve chicken with roasted vegetables and small portion of stuffing
9. Make extra portions for meal prep

**Macros per serving:** 490 cal | 54g protein | 16g fat | 32g carbs
**Prep time:** 15 minutes | **Cook time:** 35 minutes`
                }
            ],
            snacks: [
                {name: "Protein Mug Cake", time: "3:00 PM", calories: 200, protein: 20, fat: 6, carbs: 18, recipe: "Microwave protein cake"},
                {name: "Cottage Cheese + Pineapple", time: "5:00 PM", calories: 160, protein: 18, fat: 3, carbs: 16, recipe: "Cottage cheese, pineapple"}
            ]
        }
    }
};

// Program Start Date
const PROGRAM_START_DATE = new Date('2025-03-16');

// Timeline
const TIMELINE = {
    husband: {
        weeks: 12,
        endDate: new Date('2025-06-08')
    },
    wife: {
        weeks: 8,
        endDate: new Date('2025-05-11')
    }
};

// State Management
let currentDate = new Date();
let preppedMeals = JSON.parse(localStorage.getItem('preppedMeals') || '{}');

// Helper function to get week and day from date
function getWeekAndDayFromDate(date) {
    const daysSinceStart = Math.floor((date - PROGRAM_START_DATE) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysSinceStart / 7) % 4 + 1; // Cycle through 4 weeks
    const dayOfWeek = date.getDay() + 1; // 1 = Sunday, 7 = Saturday

    return { week: weekNumber, day: dayOfWeek };
}

// Helper function to format date
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateShort(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Calorie Bank Management
function getDayKey() {
    const dateStr = currentDate.toISOString().split('T')[0];
    return `${currentUser}-day-${dateStr}`;
}

function getDayData() {
    const key = getDayKey();
    const stored = localStorage.getItem(key);
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        eatenMeals: {},
        eatenSnacks: {},
        customItems: [],
        totalConsumed: 0
    };
}

function saveDayData(data) {
    const key = getDayKey();
    localStorage.setItem(key, JSON.stringify(data));
}

function resetDay() {
    if (confirm('Are you sure you want to reset today\'s tracking? This will clear all eaten items.')) {
        const key = getDayKey();
        localStorage.removeItem(key);
        updateDailyView();
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    loadWeeklyMenu();
    updateDailyView();

    // Event Listeners
    document.getElementById('date-selector').addEventListener('change', (e) => {
        if (e.target.value) {
            currentDate = new Date(e.target.value + 'T00:00:00');
            updateDailyView();
        }
    });

    document.getElementById('today-btn').addEventListener('click', () => {
        const today = new Date();
        currentDate = today;
        const dateStr = today.toISOString().split('T')[0];
        document.getElementById('date-selector').value = dateStr;
        updateDailyView();
    });

    // Initialize with today's date
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('date-selector').value = todayStr;

    // Update timeline info based on current user
    function updateTimelineInfo() {
        const timeline = TIMELINE[currentUser];
        document.getElementById('timeline-label').textContent = `Target Date (${timeline.weeks} weeks)`;
        document.getElementById('target-date').textContent = formatDateShort(timeline.endDate);
    }
    updateTimelineInfo();

    document.getElementById('reset-day-btn').addEventListener('click', resetDay);

    document.getElementById('add-custom-btn').addEventListener('click', addCustomFood);

    document.getElementById('save-weight-btn').addEventListener('click', saveWeight);

    document.getElementById('clear-history-btn').addEventListener('click', clearWeightHistory);

    // User switcher is now handled by confirmUserSwitch() function

    // Dark mode toggle
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);

    // Initialize UI for current user
    switchUser(currentUser);

    // Update weight display on load
    updateWeightDisplay();

    // Update auto-detect label
    updateAutoDetectLabel();

    // Copy dining and macros content to footer
    copyContentToFooter();
});

// Copy tab content to footer expandable sections
function copyContentToFooter() {
    const diningTab = document.getElementById('dining-tab');
    const macrosTab = document.getElementById('macros-tab');
    const diningFooter = document.getElementById('dining-content-footer');
    const macrosFooter = document.getElementById('macros-content-footer');

    if (diningTab && diningFooter) {
        // Clone the content to avoid moving DOM elements
        const diningContent = diningTab.querySelector('.space-y-6');
        if (diningContent) {
            diningFooter.innerHTML = diningContent.innerHTML;
        }
    }

    if (macrosTab && macrosFooter) {
        // Clone the content to avoid moving DOM elements
        const macrosContent = macrosTab.querySelector('.space-y-6');
        if (macrosContent) {
            macrosFooter.innerHTML = macrosContent.innerHTML;
        }
    }
}

// Tab Navigation
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // Update active states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show/hide content
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`${tabName}-tab`).classList.remove('hidden');

            // Initialize progress tab when opened
            if (tabName === 'progress') {
                renderWeightChart();
                renderWeightHistory();
            }
        });
    });
}

// Update Daily View
function updateDailyView() {
    // Get week and day from current date
    const { week, day } = getWeekAndDayFromDate(currentDate);
    const dayData = MEAL_PLAN[week][day];

    if (!dayData) return;

    // Update selected date info
    const dateInfo = document.getElementById('selected-date-info');
    if (dateInfo) {
        const daysSinceStart = Math.floor((currentDate - PROGRAM_START_DATE) / (1000 * 60 * 60 * 24));
        const weeksComplete = Math.floor(daysSinceStart / 7);
        const daysInWeek = daysSinceStart % 7;

        dateInfo.textContent = `${formatDate(currentDate)} • Week ${weeksComplete + 1}, Day ${daysInWeek + 1} of program`;
    }

    const trackingData = getDayData();

    // Calculate totals (planned) - scaled for current user
    let totalCals = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;

    dayData.meals.forEach(meal => {
        const mealType = getMealType(meal);
        const userPortion = scaleNutrition(meal, currentUser, mealType, dayData.isBusinessDay);
        totalCals += userPortion.calories;
        totalProtein += userPortion.protein;
        totalFat += userPortion.fat;
        totalCarbs += userPortion.carbs;
    });

    // Add snacks - NOT scaled (individual portions)
    dayData.snacks.forEach(snack => {
        totalCals += snack.calories;
        totalProtein += snack.protein;
        totalFat += snack.fat;
        totalCarbs += snack.carbs;
    });

    // Calculate consumed calories - scaled for current user
    let consumedCals = 0;
    dayData.meals.forEach((meal, idx) => {
        if (trackingData.eatenMeals[idx]) {
            const mealType = getMealType(meal);
            const userPortion = scaleNutrition(meal, currentUser, mealType, dayData.isBusinessDay);
            consumedCals += userPortion.calories;
        }
    });
    // Snacks are individual portions - use full values
    dayData.snacks.forEach((snack, idx) => {
        if (trackingData.eatenSnacks[idx]) {
            consumedCals += snack.calories;
        }
    });
    trackingData.customItems.forEach(item => {
        consumedCals += item.calories;
    });

    // Update calorie bank
    const targets = getCurrentTargets();
    const remaining = targets.calories - consumedCals;
    const percentage = Math.max(0, (remaining / targets.calories) * 100);

    document.getElementById('bank-remaining').textContent = remaining;
    document.getElementById('bank-consumed').textContent = consumedCals;
    document.getElementById('bank-progress').style.width = percentage + '%';

    // Change color based on status
    const bankRemaining = document.getElementById('bank-remaining');
    if (remaining < 0) {
        bankRemaining.classList.add('text-red-200');
        bankRemaining.classList.remove('text-white');
    } else if (remaining < 200) {
        bankRemaining.classList.add('text-yellow-200');
        bankRemaining.classList.remove('text-white', 'text-red-200');
    } else {
        bankRemaining.classList.add('text-white');
        bankRemaining.classList.remove('text-red-200', 'text-yellow-200');
    }

    // Update summary
    document.getElementById('total-cals').textContent = totalCals;
    document.getElementById('total-protein').textContent = totalProtein + 'g';
    document.getElementById('total-fat').textContent = totalFat + 'g';
    document.getElementById('total-carbs').textContent = totalCarbs + 'g';

    // Update progress bars
    updateProgressBar('protein', totalProtein, targets.protein);
    updateProgressBar('fat', totalFat, targets.fat);
    updateProgressBar('carbs', totalCarbs, targets.carbs);

    // Render meals and custom items
    renderCustomItems(trackingData);
    renderMeals(dayData, trackingData);
}

function updateProgressBar(macro, current, target) {
    const percentage = Math.min((current / target) * 100, 100);
    document.getElementById(`${macro}-bar`).style.width = percentage + '%';
    document.getElementById(`${macro}-percent`).textContent = Math.round(percentage) + '%';
}

function renderMeals(dayData, trackingData) {
    const container = document.getElementById('meals-container');
    container.innerHTML = '';

    // Add eating window notice
    const windowNotice = document.createElement('div');
    windowNotice.className = 'bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded';
    windowNotice.innerHTML = `
        <div class="flex items-center">
            <span class="text-2xl mr-3">⏰</span>
            <div>
                <p class="font-bold text-green-900">Eating Window: ${EATING_WINDOW.start} - ${EATING_WINDOW.end}</p>
                <p class="text-sm text-green-700">${EATING_WINDOW.description}</p>
                <p class="text-xs text-green-600 mt-1">Only water allowed outside this window</p>
            </div>
        </div>
    `;
    container.appendChild(windowNotice);

    // Get week and day for meal key
    const { week, day } = getWeekAndDayFromDate(currentDate);

    // Render main meals
    dayData.meals.forEach((meal, index) => {
        const mealKey = `w${week}-d${day}-m${index}`;
        const isPrepped = preppedMeals[mealKey] || false;
        const isEaten = trackingData.eatenMeals[index] || false;
        const mealType = getMealType(meal);

        // Calculate portions for both users with meal type and business day context
        const husbandPortion = scaleNutrition(meal, 'husband', mealType, dayData.isBusinessDay);
        const wifePortion = scaleNutrition(meal, 'wife', mealType, dayData.isBusinessDay);

        // Skip rendering breakfast for wife on business days
        if (currentUser === 'wife' && dayData.isBusinessDay && mealType === 'breakfast') {
            return; // Don't render this meal
        }

        const userPortion = currentUser === 'husband' ? husbandPortion : wifePortion;

        // Calculate total household quantities
        const totalCals = husbandPortion.calories + wifePortion.calories;
        const totalProtein = husbandPortion.protein + wifePortion.protein;
        const totalFat = husbandPortion.fat + wifePortion.fat;
        const totalCarbs = husbandPortion.carbs + wifePortion.carbs;

        // Check if wife gets bonus on this meal
        const wifeBonusNote = (currentUser === 'wife' && dayData.isBusinessDay && (mealType === 'lunch' || mealType === 'dinner'))
            ? '<span class="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">+25% Portion (No Breakfast)</span>'
            : '';

        const mealCard = document.createElement('div');
        mealCard.className = `meal-card rounded-lg shadow-md p-5 ${isPrepped ? 'prepped' : ''} ${isEaten ? 'opacity-60' : ''}`;
        mealCard.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <h3 class="font-bold text-lg" style="color: var(--text-primary);">${meal.name} ${isEaten ? '<span class="text-green-600">✓</span>' : ''} ${wifeBonusNote}</h3>
                    <p class="text-sm" style="color: var(--text-secondary);">${meal.type}</p>
                </div>
                <div class="flex gap-2">
                    ${meal.type.includes('Tomorrow') || meal.type.includes('Meal Prep') ? `
                    <button class="prep-toggle px-3 py-1 rounded-full text-sm font-medium ${isPrepped ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}" data-meal="${mealKey}">
                        ${isPrepped ? '✓ Prepped' : 'Prep'}
                    </button>
                    ` : ''}
                    <button class="eaten-toggle px-3 py-1 rounded-full text-sm font-medium ${isEaten ? 'bg-purple-100 text-purple-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}" data-meal-index="${index}">
                        ${isEaten ? 'Eaten ✓' : 'Mark Eaten'}
                    </button>
                </div>
            </div>

            <!-- Household Portions Info -->
            <div class="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <p class="text-xs font-semibold text-orange-900">🍳 Cook Total (Household)</p>
                    <p class="text-xs text-orange-700">${totalCals} cal</p>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-white/50 rounded p-2">
                        <p class="font-medium text-gray-700">👨 Husband: <span class="text-blue-600">${Math.round(HOUSEHOLD_PORTIONS.husband.percentage)}%</span></p>
                        <p class="text-gray-600">${husbandPortion.calories} cal</p>
                    </div>
                    <div class="bg-white/50 rounded p-2">
                        <p class="font-medium text-gray-700">👩 Wife: <span class="text-pink-600">${Math.round(HOUSEHOLD_PORTIONS.wife.percentage)}%</span></p>
                        <p class="text-gray-600">${wifePortion.calories} cal</p>
                    </div>
                </div>
            </div>

            <!-- Your Portion -->
            <div class="bg-${currentUser === 'husband' ? 'blue' : 'pink'}-50 border border-${currentUser === 'husband' ? 'blue' : 'pink'}-200 rounded-lg p-3 mb-3">
                <p class="text-sm font-semibold mb-2" style="color: var(--text-primary);">Your Portion (${Math.round(HOUSEHOLD_PORTIONS[currentUser].percentage)}%)</p>
                <div class="grid grid-cols-4 gap-2 text-center text-sm">
                    <div>
                        <p class="font-bold" style="color: var(--text-primary);">${userPortion.calories}</p>
                        <p class="text-xs" style="color: var(--text-secondary);">Cal</p>
                    </div>
                    <div>
                        <p class="font-bold text-green-600">${userPortion.protein}g</p>
                        <p class="text-xs" style="color: var(--text-secondary);">P</p>
                    </div>
                    <div>
                        <p class="font-bold text-yellow-600">${userPortion.fat}g</p>
                        <p class="text-xs" style="color: var(--text-secondary);">F</p>
                    </div>
                    <div>
                        <p class="font-bold text-blue-600">${userPortion.carbs}g</p>
                        <p class="text-xs" style="color: var(--text-secondary);">C</p>
                    </div>
                </div>
            </div>

            <div class="border-t pt-3 space-y-2" style="border-color: var(--border-color);">
                <button class="w-full text-left bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg p-3 transition-all cursor-pointer recipe-button" data-meal-name="${meal.name}">
                    <div class="flex items-center justify-between">
                        <span class="font-semibold">📖 Click for Full Recipe & Instructions</span>
                        <span class="text-xl">→</span>
                    </div>
                    <p class="text-xs mt-1 text-blue-100">Quick preview: ${meal.recipe.substring(0, 80)}${meal.recipe.length > 80 ? '...' : ''}</p>
                </button>
                <div class="bg-slate-700 border border-slate-600 rounded p-3">
                    <p class="text-xs font-medium text-slate-100">💡 Prep Tip: ${meal.prepNote}</p>
                </div>
            </div>
        `;

        container.appendChild(mealCard);
    });

    // Render snacks section
    const snacksCard = document.createElement('div');
    snacksCard.className = 'meal-card rounded-lg shadow-md p-5';
    snacksCard.innerHTML = `
        <h3 class="font-bold text-lg mb-3" style="color: var(--text-primary);">Snacks (Within Eating Window)</h3>
        <div class="space-y-2" id="snacks-list">
            ${dayData.snacks.map((snack, idx) => {
                const isEaten = trackingData.eatenSnacks[idx] || false;
                // Snacks are individual portions - use full macros, not scaled
                return `
                <div class="flex justify-between items-center p-3 rounded-lg ${isEaten ? 'opacity-60' : ''}" style="background-color: var(--bg-tertiary);">
                    <div class="flex-1">
                        <p class="font-medium text-sm" style="color: var(--text-primary);">${snack.name} ${isEaten ? '<span class="text-green-600">✓</span>' : ''}</p>
                        <p class="text-xs" style="color: var(--text-secondary);">${snack.recipe}</p>
                        ${snack.time ? `<p class="text-xs text-green-600 mt-1">Suggested: ${snack.time}</p>` : ''}
                        <p class="text-xs text-blue-400 mt-1">✓ Individual portion (eat the full amount)</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-right text-xs">
                            <p class="font-bold" style="color: var(--text-primary);">${snack.calories} cal</p>
                            <p style="color: var(--text-secondary);">${snack.protein}P ${snack.fat}F ${snack.carbs}C</p>
                        </div>
                        <button class="snack-eaten-toggle px-3 py-1 rounded-full text-xs font-medium ${isEaten ? 'bg-purple-100 text-purple-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}" data-snack-index="${idx}">
                            ${isEaten ? 'Eaten' : 'Eat'}
                        </button>
                    </div>
                </div>
            `;
            }).join('')}
        </div>
    `;

    container.appendChild(snacksCard);

    // Add event listeners
    document.querySelectorAll('.prep-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            const mealKey = e.target.dataset.meal;
            togglePrepStatus(mealKey);
        });
    });

    document.querySelectorAll('.eaten-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            const mealIndex = parseInt(e.target.dataset.mealIndex);
            toggleEatenMeal(mealIndex);
        });
    });

    document.querySelectorAll('.snack-eaten-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            const snackIndex = parseInt(e.target.dataset.snackIndex);
            toggleEatenSnack(snackIndex);
        });
    });

    // Add recipe button listeners
    document.querySelectorAll('.recipe-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const mealName = e.currentTarget.dataset.mealName;
            const meal = dayData.meals.find(m => m.name === mealName);
            if (meal) {
                showRecipeModal(meal);
            }
        });
    });
}

// Show recipe modal with full instructions
function showRecipeModal(meal) {
    // Remove existing modal if any
    const existingModal = document.getElementById('recipe-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'recipe-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';

    const fullRecipe = meal.fullRecipe || `
**Recipe:** ${meal.recipe}

**Prep Note:** ${meal.prepNote}

**Macros:** ${meal.calories} cal | ${meal.protein}g protein | ${meal.fat}g fat | ${meal.carbs}g carbs

*Full recipe details coming soon...*`;

    modal.innerHTML = `
        <div class="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl" style="background-color: var(--bg-primary);">
            <div class="sticky top-0 z-10 flex items-center justify-between p-6 border-b" style="background-color: var(--bg-secondary); border-color: var(--border-color);">
                <h2 class="text-2xl font-bold" style="color: var(--text-primary);">${meal.name}</h2>
                <button class="close-modal text-3xl hover:opacity-70 transition-opacity" style="color: var(--text-primary);">&times;</button>
            </div>
            <div class="p-6">
                <div class="mb-4 inline-block px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                    ${meal.type}
                </div>
                <div class="prose prose-sm max-w-none recipe-content" style="color: var(--text-secondary);">
                    ${fullRecipe.split('\n').map(line => {
                        if (line.startsWith('**') && line.endsWith('**')) {
                            return `<h3 class="text-lg font-bold mt-4 mb-2" style="color: var(--text-primary);">${line.replace(/\*\*/g, '')}</h3>`;
                        } else if (line.startsWith('•')) {
                            return `<li class="ml-4">${line.substring(1).trim()}</li>`;
                        } else if (line.match(/^\d+\./)) {
                            return `<li class="ml-4 mb-2">${line.replace(/^\d+\.\s*/, '')}</li>`;
                        } else if (line.trim()) {
                            return `<p class="mb-2">${line}</p>`;
                        }
                        return '';
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add close handlers
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Close on Escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function togglePrepStatus(mealKey) {
    preppedMeals[mealKey] = !preppedMeals[mealKey];
    localStorage.setItem('preppedMeals', JSON.stringify(preppedMeals));
    updateDailyView();
}

function toggleEatenMeal(mealIndex) {
    const data = getDayData();
    data.eatenMeals[mealIndex] = !data.eatenMeals[mealIndex];
    saveDayData(data);
    updateDailyView();
}

function toggleEatenSnack(snackIndex) {
    const data = getDayData();
    data.eatenSnacks[snackIndex] = !data.eatenSnacks[snackIndex];
    saveDayData(data);
    updateDailyView();
}

function addCustomFood() {
    const name = document.getElementById('custom-food-name').value.trim();
    const calories = parseInt(document.getElementById('custom-calories').value) || 0;
    const protein = parseInt(document.getElementById('custom-protein').value) || 0;
    const fat = parseInt(document.getElementById('custom-fat').value) || 0;
    const carbs = parseInt(document.getElementById('custom-carbs').value) || 0;

    if (!name || calories === 0) {
        alert('Please enter a food name and calorie amount.');
        return;
    }

    const data = getDayData();
    data.customItems.push({
        id: Date.now(),
        name,
        calories,
        protein,
        fat,
        carbs
    });
    saveDayData(data);

    // Clear form
    document.getElementById('custom-food-name').value = '';
    document.getElementById('custom-calories').value = '';
    document.getElementById('custom-protein').value = '';
    document.getElementById('custom-fat').value = '';
    document.getElementById('custom-carbs').value = '';

    updateDailyView();
}

function removeCustomItem(itemId) {
    const data = getDayData();
    data.customItems = data.customItems.filter(item => item.id !== itemId);
    saveDayData(data);
    updateDailyView();
}

function renderCustomItems(trackingData) {
    const container = document.getElementById('custom-items-container');

    if (!trackingData.customItems || trackingData.customItems.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="meal-card rounded-lg shadow-md p-5">
            <h3 class="font-bold text-lg mb-3" style="color: var(--text-primary);">Custom Items Added Today</h3>
            <div class="space-y-2">
                ${trackingData.customItems.map(item => `
                    <div class="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div class="flex-1">
                            <p class="font-medium text-sm" style="color: var(--text-primary);">${item.name}</p>
                            <p class="text-xs" style="color: var(--text-secondary);">Custom entry</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="text-right text-xs">
                                <p class="font-bold" style="color: var(--text-primary);">${item.calories} cal</p>
                                <p style="color: var(--text-secondary);">${item.protein}P ${item.fat}F ${item.carbs}C</p>
                            </div>
                            <button class="remove-custom-btn px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200" data-item-id="${item.id}">
                                Remove
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Add event listeners
    document.querySelectorAll('.remove-custom-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = parseInt(e.target.dataset.itemId);
            removeCustomItem(itemId);
        });
    });
}

// Load Weekly Menu
function loadWeeklyMenu() {
    const container = document.getElementById('weekly-menu-container');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let week = 1; week <= 4; week++) {
        const weekSection = document.createElement('div');
        weekSection.className = 'mb-6';
        weekSection.innerHTML = `
            <h3 class="font-bold text-lg mb-3 text-green-600">Week ${week}</h3>
            <div class="space-y-2">
                ${days.map((day, idx) => {
                    const dayData = MEAL_PLAN[week][idx + 1];
                    const dayLabel = dayData.isBusinessDay ? `${day} (Work Day)` : `${day} (Weekend)`;

                    // Filter meals based on user
                    const mealsToShow = dayData.meals.filter(meal => {
                        // Wife skips breakfast on business days
                        if (currentUser === 'wife' && dayData.isBusinessDay) {
                            const mealType = getMealType(meal);
                            return mealType !== 'breakfast';
                        }
                        return true;
                    });

                    return `
                        <div class="border-l-4 ${dayData.isBusinessDay ? 'border-blue-500' : 'border-green-500'} pl-3 py-2">
                            <p class="font-semibold text-sm" style="color: var(--text-primary);">${dayLabel}</p>
                            ${mealsToShow.map(meal => {
                                const mealType = getMealType(meal);
                                const portionNote = (currentUser === 'wife' && dayData.isBusinessDay && (mealType === 'lunch' || mealType === 'dinner'))
                                    ? ' <span style="color: #60a5fa;">+25%</span>'
                                    : '';
                                return `<p class="text-xs" style="color: var(--text-secondary);">• ${meal.name}${portionNote} <span style="color: var(--text-tertiary);">(${meal.type})</span></p>`;
                            }).join('')}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(weekSection);
    }
}

// Weight Tracking Functions
function getWeightData() {
    const stored = localStorage.getItem(`${currentUser}-weightHistory`);
    if (stored) {
        return JSON.parse(stored);
    }
    return [];
}

function saveWeightData(data) {
    localStorage.setItem(`${currentUser}-weightHistory`, JSON.stringify(data));
}

function saveWeight() {
    const weightInput = document.getElementById('weight-input');
    const weight = parseFloat(weightInput.value);

    if (!weight || weight <= 0 || weight > 300) {
        alert('Please enter a valid weight between 0 and 300 kg.');
        return;
    }

    const weightHistory = getWeightData();
    const today = new Date().toISOString().split('T')[0];

    // Check if weight already exists for today
    const existingIndex = weightHistory.findIndex(entry => entry.date === today);

    if (existingIndex !== -1) {
        if (confirm('You already logged a weight today. Do you want to update it?')) {
            weightHistory[existingIndex].weight = weight;
        } else {
            return;
        }
    } else {
        weightHistory.push({
            date: today,
            weight: weight,
            timestamp: Date.now()
        });
    }

    // Sort by date (most recent first)
    weightHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveWeightData(weightHistory);
    weightInput.value = '';

    updateWeightDisplay();
    renderWeightChart();
    renderWeightHistory();

    alert('Weight saved successfully!');
}

function updateWeightDisplay() {
    const weightGoals = getCurrentWeightGoals();
    const weightHistory = getWeightData();

    if (weightHistory.length === 0) {
        document.getElementById('current-weight').textContent = '--';
        document.getElementById('weight-date').textContent = 'No data yet';
        document.getElementById('weight-to-go').textContent = '--';
        return;
    }

    const latest = weightHistory[0];
    const currentWeight = latest.weight;
    const toGo = (currentWeight - weightGoals.target).toFixed(1);

    document.getElementById('current-weight').textContent = currentWeight + ' kg';
    document.getElementById('weight-date').textContent = new Date(latest.date).toLocaleDateString();
    document.getElementById('weight-to-go').textContent = toGo + ' kg';

    // Update stats in progress tab
    document.getElementById('stats-start-weight').textContent = weightGoals.start + ' kg';
    document.getElementById('stats-target-weight').textContent = weightGoals.target + ' kg';
    document.getElementById('stats-current-weight').textContent = currentWeight + ' kg';
    const totalLost = (weightGoals.start - currentWeight).toFixed(1);
    document.getElementById('stats-total-lost').textContent = totalLost + ' kg';
    document.getElementById('stats-remaining').textContent = toGo + ' kg';
}

function renderWeightChart() {
    const canvas = document.getElementById('weight-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const weightHistory = getWeightData();
    const weightGoals = getCurrentWeightGoals();

    // Get theme colors from CSS variables
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#d1d5db' : '#6b7280';
    const gridColor = isDark ? '#4b5563' : '#e5e7eb';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (weightHistory.length === 0) {
        ctx.fillStyle = textColor;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No weight data yet. Start tracking!', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Reverse to show oldest first
    const data = [...weightHistory].reverse();

    // Graph dimensions
    const padding = 40;
    const graphWidth = canvas.width - padding * 2;
    const graphHeight = canvas.height - padding * 2;

    // Find min and max weights
    const weights = data.map(d => d.weight);
    const maxWeight = Math.max(...weights, weightGoals.start, weightGoals.target);
    const minWeight = Math.min(...weights, weightGoals.start, weightGoals.target);
    const weightRange = maxWeight - minWeight || 10;

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (graphHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();

        // Y-axis labels
        const weight = maxWeight - (weightRange / 5) * i;
        ctx.fillStyle = textColor;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(weight.toFixed(1) + ' kg', padding - 5, y + 4);
    }

    // Draw target line
    const targetY = padding + ((maxWeight - weightGoals.target) / weightRange) * graphHeight;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, targetY);
    ctx.lineTo(canvas.width - padding, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target label
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Target: ${weightGoals.target}kg`, canvas.width - padding - 80, targetY - 5);

    // Draw weight line
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((entry, index) => {
        const x = padding + (graphWidth / (data.length - 1 || 1)) * index;
        const y = padding + ((maxWeight - entry.weight) / weightRange) * graphHeight;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw data points
    data.forEach((entry, index) => {
        const x = padding + (graphWidth / (data.length - 1 || 1)) * index;
        const y = padding + ((maxWeight - entry.weight) / weightRange) * graphHeight;

        // Point
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // Date label (every few points to avoid clutter)
        if (data.length <= 7 || index % Math.ceil(data.length / 7) === 0 || index === data.length - 1) {
            ctx.fillStyle = textColor;
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            const date = new Date(entry.date);
            const dateStr = (date.getMonth() + 1) + '/' + date.getDate();
            ctx.fillText(dateStr, x, canvas.height - padding + 15);
        }
    });
}

function renderWeightHistory() {
    const container = document.getElementById('weight-history');
    const weightHistory = getWeightData();

    if (weightHistory.length === 0) {
        container.innerHTML = '<p class="text-center py-8" style="color: var(--text-secondary);">No weight entries yet. Add your first weight above!</p>';
        return;
    }

    container.innerHTML = weightHistory.map((entry, index) => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

        let change = '';
        if (index < weightHistory.length - 1) {
            const diff = entry.weight - weightHistory[index + 1].weight;
            if (diff !== 0) {
                const color = diff < 0 ? 'text-green-600' : 'text-red-600';
                const arrow = diff < 0 ? '↓' : '↑';
                change = `<span class="${color} text-sm font-medium">${arrow} ${Math.abs(diff).toFixed(1)} kg</span>`;
            }
        }

        return `
            <div class="flex justify-between items-center p-3 rounded-lg" style="background-color: var(--bg-tertiary); border: 1px solid var(--border-color);">
                <div>
                    <p class="font-medium" style="color: var(--text-primary);">${entry.weight} kg</p>
                    <p class="text-xs" style="color: var(--text-secondary);">${dateStr}</p>
                </div>
                <div class="flex items-center gap-3">
                    ${change}
                    <button class="delete-weight-btn text-xs text-red-600 hover:text-red-700" data-date="${entry.date}">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add delete event listeners
    document.querySelectorAll('.delete-weight-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const date = e.target.dataset.date;
            deleteWeightEntry(date);
        });
    });
}

function deleteWeightEntry(date) {
    if (!confirm('Are you sure you want to delete this weight entry?')) {
        return;
    }

    let weightHistory = getWeightData();
    weightHistory = weightHistory.filter(entry => entry.date !== date);
    saveWeightData(weightHistory);

    updateWeightDisplay();
    renderWeightChart();
    renderWeightHistory();
}

function clearWeightHistory() {
    if (!confirm('Are you sure you want to clear ALL weight history? This cannot be undone!')) {
        return;
    }

    localStorage.removeItem(`${currentUser}-weightHistory`);
    updateWeightDisplay();
    renderWeightChart();
    renderWeightHistory();
}
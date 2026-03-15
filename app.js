// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed'));
    });
}

// Dark Mode Management
function initDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 'light';
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

// Current active user
let currentUser = localStorage.getItem('currentUser') || 'husband';

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

function scaleNutrition(baseNutrition, user) {
    const multiplier = HOUSEHOLD_PORTIONS[user].multiplier;
    return {
        calories: Math.round(baseNutrition.calories * multiplier),
        protein: Math.round(baseNutrition.protein * multiplier),
        fat: Math.round(baseNutrition.fat * multiplier),
        carbs: Math.round(baseNutrition.carbs * multiplier)
    };
}

function switchUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', user);

    // Update UI
    document.querySelectorAll('.user-switch-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-user="${user}"]`).classList.add('active');

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
                    prepNote: "Quick 10-min cook"
                },
                {
                    name: "Greek Chicken Bowl",
                    type: "Dinner (6:00 PM) → Lunch Tomorrow",
                    calories: 520,
                    protein: 55,
                    fat: 18,
                    carbs: 38,
                    recipe: "Marinated chicken breast (300g) with tzatziki, cucumber, tomatoes, red onion, and quinoa (100g dry). Season with oregano, lemon, garlic.",
                    prepNote: "Batch cook 600g chicken for 2 servings"
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
                    prepNote: "5-min microwave option"
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
                    prepNote: "Makes 2-3 servings easily"
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
                    prepNote: "Blend and go"
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
                    prepNote: "Bake everything on one tray - 25 mins at 200°C"
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
                    prepNote: "Quick 10-min breakfast"
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
                    prepNote: "High heat wok cooking - 15 mins total"
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
                    prepNote: "Prep quinoa in advance"
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
                    prepNote: "Skip tortillas to save calories"
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
                    prepNote: "Weekend breakfast treat"
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
                    prepNote: "Grill pork 4-5 mins per side - no batch cooking needed"
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
                    prepNote: "Weekend special breakfast"
                },
                {
                    name: "Turkey & Avocado Wrap",
                    type: "Lunch (1:30 PM)",
                    calories: 450,
                    protein: 40,
                    fat: 18,
                    carbs: 35,
                    recipe: "Whole wheat wrap, 150g turkey breast, avocado, lettuce, tomato, mustard.",
                    prepNote: "Quick fresh lunch"
                },
                {
                    name: "Sheet Pan Chicken & Vegetables",
                    type: "Dinner (7:00 PM) - Meal Prep for Week",
                    calories: 480,
                    protein: 52,
                    fat: 16,
                    carbs: 32,
                    recipe: "Chicken thighs (200g), roasted carrots, green beans, cherry tomatoes, red onion, with herbs and olive oil.",
                    prepNote: "Make extra portions for Sunday dinner prep!"
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
    2: { // Week 2
        1: { // Sunday
            isBusinessDay: true,
            meals: [
                {
                    name: "Shakshuka",
                    type: "Breakfast (10:00 AM)",
                    calories: 360,
                    protein: 28,
                    fat: 18,
                    carbs: 22,
                    recipe: "3 eggs poached in spiced tomato sauce with peppers, onions. Serve with 1 slice bread.",
                    prepNote: "One-pan breakfast, 20 mins"
                },
                {
                    name: "Teriyaki Chicken with Broccoli",
                    type: "Dinner (6:00 PM) → Lunch Tomorrow",
                    calories: 510,
                    protein: 56,
                    fat: 14,
                    carbs: 42,
                    recipe: "Chicken breast (280g) with homemade teriyaki sauce (low sugar), steamed broccoli, brown rice (70g dry).",
                    prepNote: "Make teriyaki: soy sauce, ginger, garlic, honey (1 tsp)"
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
                {name: "Protein Pancakes", type: "Breakfast (10:00 AM)", calories: 400, protein: 35, fat: 12, carbs: 38, recipe: "Pancakes from protein powder, oats, egg whites, banana. Top with berries.", prepNote: "Can batch cook and freeze"},
                {name: "Teriyaki Chicken with Broccoli (from Sunday)", type: "Office Lunch (1:00 PM)", calories: 510, protein: 56, fat: 14, carbs: 42, recipe: "Reheated from Sunday", prepNote: "Already prepped!"},
                {name: "Lemon Herb Cod with Quinoa", type: "Dinner (7:00 PM) → Lunch Tomorrow", calories: 490, protein: 50, fat: 16, carbs: 38, recipe: "Cod fillet (250g) with lemon and herbs, roasted asparagus, quinoa (80g dry), cherry tomatoes.", prepNote: "Fish cooks in 12-15 mins at 180°C"}
            ],
            snacks: [
                {name: "Cottage Cheese Bowl", time: "11:00 AM", calories: 200, protein: 28, fat: 4, carbs: 12, recipe: "200g cottage cheese, veggies"},
                {name: "Protein Bar", time: "4:00 PM", calories: 200, protein: 20, fat: 8, carbs: 18, recipe: "Quality protein bar"}
            ]
        },
        3: { // Tuesday
            isBusinessDay: true,
            meals: [
                {name: "Breakfast Hash", type: "Breakfast (10:00 AM)", calories: 420, protein: 30, fat: 20, carbs: 32, recipe: "Diced sweet potato, turkey sausage, peppers, onions, 2 eggs on top.", prepNote: "One-pan meal"},
                {name: "Lemon Herb Cod with Quinoa (from Monday)", type: "Office Lunch (1:00 PM)", calories: 490, protein: 50, fat: 16, carbs: 38, recipe: "Reheated from Monday", prepNote: "Already prepped!"},
                {name: "Turkey Meatballs with Zoodles", type: "Dinner (6:30 PM) → Lunch Tomorrow", calories: 480, protein: 54, fat: 18, carbs: 28, recipe: "Turkey meatballs (280g turkey) with marinara sauce, zucchini noodles, Parmesan cheese (10g).", prepNote: "Bake meatballs 20 mins at 190°C"}
            ],
            snacks: [
                {name: "Boiled Eggs + Veggies", time: "11:00 AM", calories: 180, protein: 16, fat: 10, carbs: 8, recipe: "2 eggs, veggies"},
                {name: "Edamame", time: "3:30 PM", calories: 150, protein: 12, fat: 6, carbs: 12, recipe: "150g edamame"}
            ]
        },
        4: { // Wednesday
            isBusinessDay: true,
            meals: [
                {name: "Smoked Salmon Bagel", type: "Breakfast (10:00 AM)", calories: 380, protein: 28, fat: 14, carbs: 35, recipe: "Half bagel, cream cheese (light), smoked salmon (80g), capers, red onion.", prepNote: "Quick protein-packed breakfast"},
                {name: "Turkey Meatballs with Zoodles (from Tuesday)", type: "Office Lunch (1:00 PM)", calories: 480, protein: 54, fat: 18, carbs: 28, recipe: "Reheated from Tuesday", prepNote: "Already prepped!"},
                {name: "Chicken Souvlaki Bowls", type: "Dinner (7:00 PM) → Lunch Tomorrow", calories: 500, protein: 55, fat: 16, carbs: 38, recipe: "Marinated chicken skewers (280g), Greek salad, hummus (30g), pita bread (half).", prepNote: "Marinate chicken in lemon, garlic, oregano"}
            ],
            snacks: [
                {name: "Protein Shake", time: "11:00 AM", calories: 180, protein: 30, fat: 3, carbs: 8, recipe: "Whey + water"},
                {name: "Hummus + Veggies", time: "4:00 PM", calories: 150, protein: 6, fat: 8, carbs: 15, recipe: "50g hummus, veggies"}
            ]
        },
        5: { // Thursday
            isBusinessDay: true,
            meals: [
                {name: "Breakfast Quesadilla", type: "Breakfast (10:00 AM)", calories: 390, protein: 32, fat: 16, carbs: 32, recipe: "Whole wheat tortilla, scrambled eggs, black beans, cheese, salsa.", prepNote: "5-min griddle cooking"},
                {name: "Chicken Souvlaki Bowls (from Wednesday)", type: "Office Lunch (1:00 PM)", calories: 500, protein: 55, fat: 16, carbs: 38, recipe: "Reheated from Wednesday", prepNote: "Already prepped!"},
                {name: "Pork Tenderloin with Roasted Veggies", type: "Dinner (6:30 PM) → Lunch Tomorrow", calories: 510, protein: 52, fat: 18, carbs: 35, recipe: "Pork tenderloin (220g), roasted cauliflower, carrots, red onion, small portion wild rice.", prepNote: "Roast pork 20-25 mins at 200°C"}
            ],
            snacks: [
                {name: "Greek Yogurt + Honey", time: "11:30 AM", calories: 160, protein: 18, fat: 3, carbs: 16, recipe: "150g yogurt, honey"},
                {name: "String Cheese + Grapes", time: "3:30 PM", calories: 180, protein: 12, fat: 8, carbs: 16, recipe: "2 cheese sticks, grapes"}
            ]
        },
        6: { // Friday
            isBusinessDay: false,
            meals: [
                {name: "Breakfast Burrito", type: "Breakfast (10:00 AM)", calories: 440, protein: 34, fat: 18, carbs: 36, recipe: "Large whole wheat tortilla, scrambled eggs, turkey bacon, cheese, avocado, salsa.", prepNote: "Weekend breakfast"},
                {name: "Pork Tenderloin with Roasted Veggies (from Thursday)", type: "Lunch (1:00 PM)", calories: 510, protein: 52, fat: 18, carbs: 35, recipe: "Reheated from Thursday", prepNote: "Already prepped!"},
                {name: "Shrimp Scampi with Zoodles", type: "Dinner (7:00 PM)", calories: 470, protein: 48, fat: 20, carbs: 26, recipe: "Shrimp (250g), zucchini noodles, garlic, white wine, lemon, cherry tomatoes, small portion pasta (30g dry).", prepNote: "Quick 10-min cooking - no batch needed"}
            ],
            snacks: [
                {name: "Protein Pancakes", time: "11:00 AM", calories: 220, protein: 24, fat: 6, carbs: 22, recipe: "Protein pancakes"},
                {name: "Chocolate Milk", time: "4:00 PM", calories: 150, protein: 12, fat: 3, carbs: 20, recipe: "Low-fat chocolate milk"}
            ]
        },
        7: { // Saturday
            isBusinessDay: false,
            meals: [
                {name: "Protein Waffles", type: "Breakfast (10:30 AM)", calories: 400, protein: 32, fat: 14, carbs: 38, recipe: "Waffles made with protein powder, oat flour, topped with Greek yogurt and berries.", prepNote: "Sunday brunch special"},
                {name: "Grilled Chicken Caesar Salad", type: "Lunch (1:30 PM)", calories: 420, protein: 45, fat: 18, carbs: 22, recipe: "Grilled chicken breast (200g), romaine lettuce, light Caesar dressing, Parmesan, croutons (small portion).", prepNote: "Fresh weekend lunch"},
                {name: "Beef & Veggie Kebabs", type: "Dinner (7:00 PM) - Meal Prep", calories: 490, protein: 50, fat: 18, carbs: 32, recipe: "Lean beef cubes (200g), bell peppers, onions, mushrooms, served with couscous (60g dry).", prepNote: "Grill extra for Sunday prep"}
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
                {name: "Breakfast Bowl", type: "Breakfast (10:00 AM)", calories: 380, protein: 30, fat: 18, carbs: 28, recipe: "Quinoa, poached egg, avocado, cherry tomatoes, feta.", prepNote: "Prep quinoa ahead"},
                {name: "Cajun Chicken Pasta", type: "Dinner (6:00 PM) → Lunch Tomorrow", calories: 520, protein: 54, fat: 16, carbs: 42, recipe: "Chicken breast with Cajun spices, whole wheat pasta (60g dry), peppers, light cream sauce.", prepNote: "One-pot pasta dish"}
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
                {name: "Egg White Wrap", type: "Breakfast (10:00 AM)", calories: 400, protein: 35, fat: 14, carbs: 35, recipe: "Whole wheat wrap, egg whites, turkey, spinach, tomato, cheese.", prepNote: "Grab-and-go option"},
                {name: "Cajun Chicken Pasta (from Sunday)", type: "Office Lunch (1:00 PM)", calories: 520, protein: 54, fat: 16, carbs: 42, recipe: "Reheated from Sunday", prepNote: "Already prepped!"},
                {name: "Lemon Garlic Tilapia", type: "Dinner (7:00 PM) → Lunch Tomorrow", calories: 480, protein: 50, fat: 14, carbs: 38, recipe: "Tilapia (250g), roasted Brussels sprouts, sweet potato (150g).", prepNote: "Quick 15-min bake"}
            ],
            snacks: [
                {name: "Cottage Cheese Bowl", time: "11:00 AM", calories: 200, protein: 28, fat: 4, carbs: 12, recipe: "200g cottage cheese, veggies"},
                {name: "Protein Bar", time: "4:00 PM", calories: 200, protein: 20, fat: 8, carbs: 18, recipe: "Quality protein bar"}
            ]
        },
        3: { // Tuesday
            isBusinessDay: true,
            meals: [
                {name: "Protein Smoothie Bowl", type: "Breakfast (10:00 AM)", calories: 390, protein: 32, fat: 12, carbs: 42, recipe: "Protein smoothie topped with granola, banana, chia seeds.", prepNote: "Instagram-worthy breakfast"},
                {name: "Lemon Garlic Tilapia (from Monday)", type: "Office Lunch (1:00 PM)", calories: 480, protein: 50, fat: 14, carbs: 38, recipe: "Reheated from Monday", prepNote: "Already prepped!"},
                {name: "Chicken Tikka Masala", type: "Dinner (6:30 PM) → Lunch Tomorrow", calories: 500, protein: 52, fat: 16, carbs: 40, recipe: "Chicken breast in tikka sauce (light coconut milk), basmati rice (60g dry), naan bread (small).", prepNote: "Slow cooker friendly"}
            ],
            snacks: [
                {name: "Boiled Eggs + Veggies", time: "11:00 AM", calories: 180, protein: 16, fat: 10, carbs: 8, recipe: "2 eggs, veggies"},
                {name: "Beef Jerky", time: "3:30 PM", calories: 120, protein: 18, fat: 4, carbs: 4, recipe: "30g jerky"}
            ]
        },
        4: { // Wednesday
            isBusinessDay: true,
            meals: [
                {name: "Veggie Frittata", type: "Breakfast (10:00 AM)", calories: 370, protein: 28, fat: 20, carbs: 20, recipe: "Eggs, bell peppers, onions, spinach, goat cheese, side fruit.", prepNote: "Bake or stovetop"},
                {name: "Chicken Tikka Masala (from Tuesday)", type: "Office Lunch (1:00 PM)", calories: 500, protein: 52, fat: 16, carbs: 40, recipe: "Reheated from Tuesday", prepNote: "Already prepped!"},
                {name: "Honey Mustard Pork Chops", type: "Dinner (7:00 PM) → Lunch Tomorrow", calories: 510, protein: 54, fat: 18, carbs: 36, recipe: "Pork chops with honey mustard glaze, roasted green beans, mashed cauliflower, small potato.", prepNote: "Bake 18-20 mins"}
            ],
            snacks: [
                {name: "Protein Shake", time: "11:00 AM", calories: 180, protein: 30, fat: 3, carbs: 8, recipe: "Whey + water"},
                {name: "Hummus + Veggies", time: "4:00 PM", calories: 150, protein: 6, fat: 8, carbs: 15, recipe: "50g hummus, veggies"}
            ]
        },
        5: { // Thursday
            isBusinessDay: true,
            meals: [
                {name: "Breakfast Tacos", type: "Breakfast (10:00 AM)", calories: 390, protein: 30, fat: 16, carbs: 32, recipe: "2 small tortillas, scrambled eggs, black beans, salsa, cheese, avocado.", prepNote: "5-min assembly"},
                {name: "Honey Mustard Pork Chops (from Wednesday)", type: "Office Lunch (1:00 PM)", calories: 510, protein: 54, fat: 18, carbs: 36, recipe: "Reheated from Wednesday", prepNote: "Already prepped!"},
                {name: "BBQ Chicken Pizza", type: "Dinner (6:30 PM) → Lunch Tomorrow", calories: 520, protein: 56, fat: 16, carbs: 42, recipe: "Thin crust (or tortilla base), BBQ sauce, chicken breast, red onion, cilantro, light cheese.", prepNote: "Homemade pizza night"}
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
                {name: "Garlic Butter Scallops", type: "Dinner (7:00 PM)", calories: 490, protein: 48, fat: 20, carbs: 32, recipe: "Scallops (200g), garlic butter, asparagus, wild rice (60g dry).", prepNote: "Premium weekend meal - 10 min cook"}
            ],
            snacks: [
                {name: "Protein Pancakes", time: "11:00 AM", calories: 220, protein: 24, fat: 6, carbs: 22, recipe: "Protein pancakes"},
                {name: "Chocolate Milk", time: "4:00 PM", calories: 150, protein: 12, fat: 3, carbs: 20, recipe: "Low-fat chocolate milk"}
            ]
        },
        7: { // Saturday
            isBusinessDay: false,
            meals: [
                {name: "Breakfast Sandwich", type: "Breakfast (10:30 AM)", calories: 380, protein: 30, fat: 18, carbs: 28, recipe: "English muffin, egg, turkey bacon, cheese, tomato.", prepNote: "Classic Sunday breakfast"},
                {name: "Chicken & Avocado Salad", type: "Lunch (1:30 PM)", calories: 440, protein: 42, fat: 20, carbs: 25, recipe: "Grilled chicken (180g), mixed greens, avocado, cherry tomatoes, balsamic vinaigrette.", prepNote: "Light fresh lunch"},
                {name: "Slow Cooker Pot Roast", type: "Dinner (7:00 PM) - Meal Prep", calories: 500, protein: 52, fat: 18, carbs: 32, recipe: "Lean beef roast, carrots, onions, celery, potatoes, herbs.", prepNote: "Set and forget - 6-8 hours"}
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
                {name: "Power Oatmeal", type: "Breakfast (10:00 AM)", calories: 410, protein: 32, fat: 14, carbs: 42, recipe: "Oats with protein powder, almond butter, banana, chia seeds.", prepNote: "Filling breakfast"},
                {name: "Asian Lettuce Wraps", type: "Dinner (6:00 PM) → Lunch Tomorrow", calories: 480, protein: 50, fat: 16, carbs: 36, recipe: "Ground turkey (250g), water chestnuts, hoisin sauce, lettuce cups, small portion rice.", prepNote: "Fun interactive dinner"}
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
                {name: "Breakfast Salad", type: "Breakfast (10:00 AM)", calories: 390, protein: 30, fat: 18, carbs: 28, recipe: "Mixed greens, poached eggs, avocado, turkey bacon, cherry tomatoes.", prepNote: "Savory breakfast option"},
                {name: "Asian Lettuce Wraps (from Sunday)", type: "Office Lunch (1:00 PM)", calories: 480, protein: 50, fat: 16, carbs: 36, recipe: "Reheated from Sunday", prepNote: "Already prepped!"},
                {name: "Balsamic Chicken & Veggies", type: "Dinner (7:00 PM) → Lunch Tomorrow", calories: 500, protein: 54, fat: 16, carbs: 38, recipe: "Chicken breast with balsamic glaze, roasted zucchini, bell peppers, quinoa.", prepNote: "Sheet pan meal"}
            ],
            snacks: [
                {name: "Cottage Cheese Bowl", time: "11:00 AM", calories: 200, protein: 28, fat: 4, carbs: 12, recipe: "200g cottage cheese, veggies"},
                {name: "Protein Bar", time: "4:00 PM", calories: 200, protein: 20, fat: 8, carbs: 18, recipe: "Quality protein bar"}
            ]
        },
        3: { // Tuesday
            isBusinessDay: true,
            meals: [
                {name: "Protein Crepes", type: "Breakfast (10:00 AM)", calories: 380, protein: 32, fat: 14, carbs: 32, recipe: "Protein powder crepes with berries and Greek yogurt.", prepNote: "Special breakfast"},
                {name: "Balsamic Chicken & Veggies (from Monday)", type: "Office Lunch (1:00 PM)", calories: 500, protein: 54, fat: 16, carbs: 38, recipe: "Reheated from Monday", prepNote: "Already prepped!"},
                {name: "Sesame Ginger Salmon", type: "Dinner (6:30 PM) → Lunch Tomorrow", calories: 510, protein: 50, fat: 20, carbs: 36, recipe: "Salmon with sesame ginger marinade, bok choy, brown rice (65g dry).", prepNote: "Omega-3 boost"}
            ],
            snacks: [
                {name: "Boiled Eggs + Veggies", time: "11:00 AM", calories: 180, protein: 16, fat: 10, carbs: 8, recipe: "2 eggs, veggies"},
                {name: "Edamame", time: "3:30 PM", calories: 150, protein: 12, fat: 6, carbs: 12, recipe: "150g edamame"}
            ]
        },
        4: { // Wednesday
            isBusinessDay: true,
            meals: [
                {name: "Breakfast Skillet", type: "Breakfast (10:00 AM)", calories: 400, protein: 30, fat: 18, carbs: 32, recipe: "Diced potatoes, turkey sausage, eggs, peppers, onions.", prepNote: "One-pan breakfast"},
                {name: "Sesame Ginger Salmon (from Tuesday)", type: "Office Lunch (1:00 PM)", calories: 510, protein: 50, fat: 20, carbs: 36, recipe: "Reheated from Tuesday", prepNote: "Already prepped!"},
                {name: "Stuffed Bell Peppers", type: "Dinner (7:00 PM) → Lunch Tomorrow", calories: 490, protein: 52, fat: 14, carbs: 42, recipe: "Bell peppers stuffed with lean ground beef, quinoa, tomatoes, cheese.", prepNote: "Bake 30 mins at 180°C"}
            ],
            snacks: [
                {name: "Protein Shake", time: "11:00 AM", calories: 180, protein: 30, fat: 3, carbs: 8, recipe: "Whey + water"},
                {name: "Hummus + Veggies", time: "4:00 PM", calories: 150, protein: 6, fat: 8, carbs: 15, recipe: "50g hummus, veggies"}
            ]
        },
        5: { // Thursday
            isBusinessDay: true,
            meals: [
                {name: "Breakfast Wrap", type: "Breakfast (10:00 AM)", calories: 390, protein: 32, fat: 16, carbs: 32, recipe: "Large tortilla, scrambled eggs, cheese, spinach, salsa, beans.", prepNote: "Portable breakfast"},
                {name: "Stuffed Bell Peppers (from Wednesday)", type: "Office Lunch (1:00 PM)", calories: 490, protein: 52, fat: 14, carbs: 42, recipe: "Reheated from Wednesday", prepNote: "Already prepped!"},
                {name: "Lemon Herb Chicken Thighs", type: "Dinner (6:30 PM) → Lunch Tomorrow", calories: 510, protein: 54, fat: 18, carbs: 34, recipe: "Chicken thighs, lemon herb marinade, roasted root vegetables, couscous.", prepNote: "Budget-friendly option"}
            ],
            snacks: [
                {name: "Greek Yogurt + Honey", time: "11:30 AM", calories: 160, protein: 18, fat: 3, carbs: 16, recipe: "150g yogurt, honey"},
                {name: "String Cheese + Grapes", time: "3:30 PM", calories: 180, protein: 12, fat: 8, carbs: 16, recipe: "2 cheese sticks, grapes"}
            ]
        },
        6: { // Friday
            isBusinessDay: false,
            meals: [
                {name: "Egg Muffins", type: "Breakfast (10:00 AM)", calories: 380, protein: 30, fat: 20, carbs: 20, recipe: "Baked egg muffins with veggies, cheese, turkey sausage. Make 6-8.", prepNote: "Meal prep breakfast"},
                {name: "Lemon Herb Chicken Thighs (from Thursday)", type: "Lunch (1:00 PM)", calories: 510, protein: 54, fat: 18, carbs: 34, recipe: "Reheated from Thursday", prepNote: "Already prepped!"},
                {name: "Fish Tacos", type: "Dinner (7:00 PM)", calories: 500, protein: 48, fat: 18, carbs: 40, recipe: "Grilled white fish, corn tortillas, cabbage slaw, avocado, lime crema.", prepNote: "Light weekend dinner - no batch needed"}
            ],
            snacks: [
                {name: "Protein Pancakes", time: "11:00 AM", calories: 220, protein: 24, fat: 6, carbs: 22, recipe: "Protein pancakes"},
                {name: "Chocolate Milk", time: "4:00 PM", calories: 150, protein: 12, fat: 3, carbs: 20, recipe: "Low-fat chocolate milk"}
            ]
        },
        7: { // Saturday
            isBusinessDay: false,
            meals: [
                {name: "Full English (Lighter)", type: "Breakfast (10:30 AM)", calories: 420, protein: 34, fat: 20, carbs: 28, recipe: "Eggs, turkey bacon, baked beans, mushrooms, tomatoes, 1 toast.", prepNote: "Weekend treat"},
                {name: "Tuna Nicoise Salad", type: "Lunch (1:30 PM)", calories: 450, protein: 40, fat: 20, carbs: 28, recipe: "Tuna (150g), mixed greens, boiled egg, green beans, potatoes, olives, vinaigrette.", prepNote: "Classic fresh salad"},
                {name: "Sunday Roast Chicken", type: "Dinner (7:00 PM) - Meal Prep", calories: 490, protein: 54, fat: 16, carbs: 32, recipe: "Roast chicken breast, roasted vegetables medley, stuffing (small portion).", prepNote: "Classic Sunday dinner - use leftovers for week"}
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

    // User switcher
    document.querySelectorAll('.user-switch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const user = e.target.dataset.user;
            switchUser(user);
        });
    });

    // Dark mode toggle
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);

    // Initialize UI for current user
    switchUser(currentUser);

    // Update weight display on load
    updateWeightDisplay();
});

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
        const userPortion = scaleNutrition(meal, currentUser);
        totalCals += userPortion.calories;
        totalProtein += userPortion.protein;
        totalFat += userPortion.fat;
        totalCarbs += userPortion.carbs;
    });

    // Add selected snacks - scaled for current user
    dayData.snacks.forEach(snack => {
        const userPortion = scaleNutrition(snack, currentUser);
        totalCals += userPortion.calories;
        totalProtein += userPortion.protein;
        totalFat += userPortion.fat;
        totalCarbs += userPortion.carbs;
    });

    // Calculate consumed calories - scaled for current user
    let consumedCals = 0;
    dayData.meals.forEach((meal, idx) => {
        if (trackingData.eatenMeals[idx]) {
            const userPortion = scaleNutrition(meal, currentUser);
            consumedCals += userPortion.calories;
        }
    });
    dayData.snacks.forEach((snack, idx) => {
        if (trackingData.eatenSnacks[idx]) {
            const userPortion = scaleNutrition(snack, currentUser);
            consumedCals += userPortion.calories;
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

        // Calculate portions for both users
        const husbandPortion = scaleNutrition(meal, 'husband');
        const wifePortion = scaleNutrition(meal, 'wife');
        const userPortion = currentUser === 'husband' ? husbandPortion : wifePortion;
        const otherUser = currentUser === 'husband' ? 'wife' : 'husband';
        const otherPortion = currentUser === 'husband' ? wifePortion : husbandPortion;

        // Calculate total household quantities
        const totalCals = husbandPortion.calories + wifePortion.calories;
        const totalProtein = husbandPortion.protein + wifePortion.protein;
        const totalFat = husbandPortion.fat + wifePortion.fat;
        const totalCarbs = husbandPortion.carbs + wifePortion.carbs;

        const mealCard = document.createElement('div');
        mealCard.className = `meal-card rounded-lg shadow-md p-5 ${isPrepped ? 'prepped' : ''} ${isEaten ? 'opacity-60' : ''}`;
        mealCard.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <h3 class="font-bold text-lg" style="color: var(--text-primary);">${meal.name} ${isEaten ? '<span class="text-green-600">✓</span>' : ''}</h3>
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
                <div>
                    <p class="text-sm font-medium" style="color: var(--text-primary);">Recipe (Total Quantity):</p>
                    <p class="text-sm" style="color: var(--text-secondary);">${meal.recipe}</p>
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded p-2">
                    <p class="text-xs font-medium text-blue-900">💡 ${meal.prepNote}</p>
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
                const userPortion = scaleNutrition(snack, currentUser);
                return `
                <div class="flex justify-between items-center p-3 rounded-lg ${isEaten ? 'opacity-60' : ''}" style="background-color: var(--bg-tertiary);">
                    <div class="flex-1">
                        <p class="font-medium text-sm" style="color: var(--text-primary);">${snack.name} ${isEaten ? '<span class="text-green-600">✓</span>' : ''}</p>
                        <p class="text-xs" style="color: var(--text-secondary);">${snack.recipe}</p>
                        ${snack.time ? `<p class="text-xs text-green-600 mt-1">Suggested: ${snack.time}</p>` : ''}
                        <p class="text-xs text-orange-600 mt-1">Your portion: ${Math.round(HOUSEHOLD_PORTIONS[currentUser].percentage)}% of recipe</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-right text-xs">
                            <p class="font-bold" style="color: var(--text-primary);">${userPortion.calories} cal</p>
                            <p style="color: var(--text-secondary);">${userPortion.protein}P ${userPortion.fat}F ${userPortion.carbs}C</p>
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
                    return `
                        <div class="border-l-4 ${dayData.isBusinessDay ? 'border-blue-500' : 'border-green-500'} pl-3 py-2">
                            <p class="font-semibold text-sm" style="color: var(--text-primary);">${dayLabel}</p>
                            ${dayData.meals.map(meal => `
                                <p class="text-xs" style="color: var(--text-secondary);">• ${meal.name} <span style="color: var(--text-tertiary);">(${meal.type})</span></p>
                            `).join('')}
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
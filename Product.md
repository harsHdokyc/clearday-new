# ClearDay – Skincare Habit & AI Gamification App PRD

## Product Overview
**ClearDay** is a daily skincare habit-tracking app with AI-powered insights and gamified streaks.  
It helps users stay consistent with their routines, measure improvement, and gain motivation through small real-world gestures.

**Vision:**  
Help users create consistent skincare habits, track progress meaningfully, and make positive impact streak-by-streak.

---

## Problem Statement

1. **Low adherence to skincare routines**
   - Users frequently start routines but quit early
   - Progress is slow and visually misleading, leading to frustration

2. **Lack of accountability**
   - Skipping days has no consequence
   - Users forget or lose interest quickly

3. **Distrust in product recommendations**
   - Marketing-driven reviews
   - Inconsistent results across skin types

4. **Missing motivational framework**
   - No emotional or rational reward for consistency

---

## Target Users

**Primary Persona**
- Age: 18–30  
- Mindset: Wants better skin but struggles with routine  
- Pain: “I don’t know if this is working or if I should continue”

**Secondary Persona**
- Age: 25–35  
- Mindset: Already invested in skincare  
- Pain: Wants clarity, data, and validation

---

## Value Proposition

- **Consistency Tracking:** Daily check-ins with photo + routine confirmation  
- **Progress Insights:** AI shows measurable improvement over time  
- **Product Fit:** AI evaluates product efficacy based on real user data  
- **Gamification & Impact:** Streaks unlock small real-world gestures (donations, tree planting, etc.)  
- **Data Protection:** Skipped days warn users; dataset resets preserve accuracy

---

## Key Features

### 1. Daily Photo Tracking
- User uploads one photo daily  
- AI analyzes skin trends (acne, redness, texture)  
- Progress is visualized against baseline  

**Example Insight:**  
> “Inflammation reduced by 7% over 4 days. You’re on track with your routine.”

---

### 2. Routine Completion Tracking
- Toggle or confirm daily routine completion  
- Partial completion is allowed  
- Completion impacts streaks  

**Example:**  
> “You completed 2 of 3 steps. Keep going!”

---

### 3. AI Progress Insights
- Contextual, personalized insights for user’s skin  
- Detects purging, regression, or improvement trends  
- Forecasts expected improvement timelines  

**Example:**  
> “Most users with similar routines see visible improvement between day 16–20.”

---

### 4. Product Fit Evaluation
- User inputs product used  
- AI cross-checks against real user feedback (Reddit, Instagram, forums)  
- Provides fit score and insight  

**Example:**  
> “Effective for acne reduction. 21% of similar users reported dryness after week two.”

---

### 5. Gamified Streaks & Real-World Gestures
- Streak milestones:
  - 3 days → Proof Builder  
  - 7 days → Consistency Mode  
  - 14 days → Identity Lock  
  - 30 days → Ritual Master
- Streak milestones unlock optional real-world actions:
  - Donate a meal  
  - Plant a tree  
  - Blanket donation  

**UX Copy:**  
> “You showed up for yourself. Want to pass that forward?”

---

### 6. Dataset Continuity & Reset System
- Warn users when skipping days:
  - Day 1 → gentle reminder  
  - Day 2 → warning  
  - Day 3 → final warning  
  - Day 4+ → reset analytics (photos preserved)  
- Reset ensures **AI insights remain accurate**  
- Old photos are never deleted

---

## Database Models (MVP)

#### User
```js
{
  userId,
  skinGoal,     // acne, glow, healthy skin
  skinType,     // oily, dry, combination, sensitive
  createdAt
}
```

#### DailyLog
```js
{
  userId,
  date,
  photoUrl,
  routineCompleted: Boolean,
  createdAt
}
```

#### Analytics
```js
{
  userId,
  baselineDate,
  totalDaysTracked,
  skippedDays,
  isReset,
  progressMetrics: [
    { date, acneTrend, rednessTrend, insightMessage }
  ],
  productEvaluations: [
    { date, productName, fitScore, insightMessage }
  ]
}
```

## Frontend Pages

### Login / Signup
- Account creation and onboarding

### Onboarding
- Skin goal, skin type, consent

### Dashboard
- Daily photo upload, routine toggle, streaks, dataset warning, AI insight card

### History
- Last 30 days of photos + AI insights

### Product Evaluation
- Input product and view AI recommendation

## UX Principles

- Calm, neutral messaging
- AI outputs informational, not prescriptive
- Dataset reset messages are educational
- Minimal UI for MVP

## MVP Definition (Done When)

- User can register/login
- Daily photo upload
- Routine completion toggle
- Streak system implemented
- Dataset continuity + reset logic
- AI provides basic progress insights
- AI provides product evaluation
- Dashboard + History pages functional

## Success Metrics

- D7 & D14 retention
- Daily check-in completion rate
- Average streak length
- Dataset continuity length
- Product evaluation usage
- Good deed participation rate

## Exclusions (MVP)

- Social sharing / comparison
- Payments
- Dermatologist features
- Advanced ML models (AI can be stubbed initially)
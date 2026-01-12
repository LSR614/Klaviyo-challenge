# Demo Script (5 minutes)

## Setup Before Recording

1. Have the app running: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Have Klaviyo dashboard open in another tab (Profiles section)
4. Clear any test data if needed (delete `data/preferences.db`)

---

## Demo Flow

### Part 1: The Problem (30 seconds)

> "Marketing teams face two challenges: scattered preferences that never reach the marketing platform, and difficulty connecting preferences to actual purchase behavior. Let me show you how we solve both."

### Part 2: The Preference Center (1 minute)

> "Here's our solution - a preference center that integrates directly with Klaviyo."

**Actions:**
1. Enter an email: `demo@example.com`
2. Select 2-3 interests (e.g., Tech, Travel, Fitness)
3. Choose frequency: Weekly
4. Click "Save Preferences"

> "When I save, three things happen simultaneously:"
> 1. "The preferences are stored locally in SQLite for analytics"
> 2. "A 'Preference Updated' EVENT is sent to Klaviyo - this is trackable, triggerable"
> 3. "The PROFILE is updated with preference properties - this is segmentable"

**Show the success message.**

### Part 3: Purchase Simulator (1 minute)

**Click "Purchase Simulator" link or navigate to `/checkout`**

> "Now let's connect preferences to revenue. This simulates a purchase flow."

**Actions:**
1. Enter same email: `demo@example.com`
2. Slide amount to $150
3. Select category: "Electronics" (matches Tech interest)
4. Click "Complete Purchase"

> "This sends TWO Klaviyo events:"
> - "Checkout Started - for cart abandonment tracking"
> - "Order Completed - with full revenue attribution"
>
> "It also updates the profile with purchase metrics: total spent, order count, last category."

**Show the success message with order ID.**

### Part 4: Verify in Klaviyo (1 minute)

**Switch to Klaviyo dashboard:**

1. Go to Profiles, search for `demo@example.com`
2. Show the profile properties:
   - `pref_interests`: ["Tech", "Travel", "Fitness"]
   - `pref_frequency`: "weekly"
   - `total_spent`: 150
   - `order_count`: 1
   - `last_purchase_category`: "Electronics"

> "All this data is on the profile. I can segment on high-value customers, target by purchase category, or combine preferences with purchase behavior."

3. Show the Activity tab - find the events:
   - "Preference Updated"
   - "Checkout Started"
   - "Order Completed" (with $value property)

> "Revenue is properly attributed. This enables RFM segmentation and revenue reporting."

### Part 5: Analytics Dashboard (1.5 minutes)

**Navigate to `/dashboard`**

> "Now let's see how all this data powers marketing decisions."

**Walk through each section:**

1. **Preference Metrics**
> "Total updates, unique subscribers, most popular interest and frequency."

2. **Revenue Metrics** (NEW)
> "Total revenue, order count, average order value, unique customers - all calculated from our local data."

3. **AI Recommendations** (NEW)
> "Here's where it gets impressive. Our recommendation engine uses a co-occurrence matrix to find patterns between interests and purchase categories."

Point to the recommendations:
> "It noticed that users with Tech interest tend to buy Electronics. This is extracted using a min-heap for efficient top-K selection - O(n log k) complexity."

4. **Segment Opportunities** (NEW)
> "Using an Apriori-lite algorithm, we discover frequent itemsets - combinations of interests that appear together. These become high-value segment ideas."

5. **Interest Centrality** (NEW)
> "Graph centrality analysis shows which interests are most connected. Tech has the highest centrality - it's the hub of our preference network."

6. **Revenue Attribution**
> "A clear explanation of which Klaviyo events track revenue and how to report on them."

### Part 6: Technical Highlights (30 seconds)

> "Technical notes:"
> - "Uses BOTH Klaviyo APIs - Events for tracking, Profiles for segmentation"
> - "Revenue events follow Klaviyo's standard schema with proper $value attribution"
> - "DSA-heavy recommendation engine: co-occurrence matrix, min-heap, Apriori-lite, graph centrality"
> - "All algorithms have documented Big-O complexity"
> - "SQLite persistence enables analytics without API rate limits"
> - "TypeScript throughout, proper error handling, graceful degradation"

### Closing (15 seconds)

> "This isn't just a preference center - it's a full revenue attribution and AI recommendation system. Preferences flow to Klaviyo, purchases are tracked, and our algorithms find patterns that drive personalization. Setup is just: clone, add your API key, npm run dev."

---

## Quick Demo Commands

```bash
# Start the app
npm run dev

# Test preference save
curl -X POST http://localhost:3000/api/preferences \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","interests":["Tech","Fashion"],"frequency":"weekly"}'

# Simulate a purchase
curl -X POST http://localhost:3000/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","action":"complete","amountCents":15000,"category":"Electronics"}'

# Get AI recommendations
curl "http://localhost:3000/api/recommend?email=test@example.com"

# Get segment opportunities
curl "http://localhost:3000/api/recommend?type=segments"

# Check stats
curl http://localhost:3000/api/stats
```

---

## Backup Demo Points

If Klaviyo API is slow or unavailable:
- Show that local persistence still works
- Show the API responses in Network tab
- Emphasize graceful degradation

If asked about the recommendation algorithm:
- Co-occurrence matrix: O(P * I + O) where P=preferences, I=interests, O=orders
- Min-heap top-K: O(N log K) for extracting top results
- Apriori-lite: O(P * I^2) for pair counting
- Graph centrality: O(V + E) for degree calculation

If asked about scaling:
- SQLite handles thousands of records easily
- Could swap to Postgres/MySQL for production
- Klaviyo APIs are async, don't block the UI

If asked about security:
- API key is server-side only (never exposed to client)
- Email validation on both client and server
- No PII stored beyond email

# Klaviyo Preference Center + Revenue Tracking

A full-featured preference center with purchase simulation, AI-powered recommendations, and analytics dashboard - demonstrating meaningful integration with Klaviyo's Events and Profiles APIs.

## What Makes This Unique

1. **Dual API Integration**: Uses both Klaviyo Events API (for tracking) AND Profiles API (for persistent profile properties)
2. **Revenue Tracking**: Purchase simulator sends "Checkout Started" and "Order Completed" events with proper value attribution
3. **DSA-Heavy Recommendation Engine**: Co-occurrence matrix, min-heap top-K, Apriori-lite frequent itemsets, graph centrality
4. **Real Analytics Dashboard**: Live preference + revenue metrics, AI recommendations, segment opportunities
5. **Local Persistence**: SQLite for preferences AND orders - enables analytics without API rate limits
6. **Production-Ready**: Proper error handling, typed responses, graceful degradation

## Problem Statement

Marketing teams face two key challenges:

1. **Preference Management**: User preferences are fragmented across systems, not synced in real-time
2. **Revenue Attribution**: Hard to connect customer preferences to actual purchase behavior

## Solution

This project provides:

1. **Preference Center** (`/`) - Users manage email preferences (interests + frequency)
2. **Purchase Simulator** (`/checkout`) - Simulates purchases to test revenue tracking
3. **Analytics Dashboard** (`/dashboard`) - Visualizes preferences, revenue, and AI insights
4. **Recommendation API** (`/api/recommend`) - DSA-powered category recommendations

## How Klaviyo APIs Are Used

### Events API
Tracks three event types:

| Event | Trigger | Properties |
|-------|---------|------------|
| `Preference Updated` | User saves preferences | interests, frequency, source |
| `Checkout Started` | User begins purchase | amount, category, currency |
| `Order Completed` | Purchase completes | order_id, amount, category, value |

### Profiles API
Upserts profile properties for segmentation:

| Property | Description |
|----------|-------------|
| `pref_interests` | Array of selected interests |
| `pref_frequency` | Email frequency preference |
| `total_spent` | Cumulative purchase total |
| `order_count` | Number of orders |
| `last_purchase_category` | Most recent category |

## DSA Recommendation Engine

The recommendation engine (`src/lib/recommend.ts`) implements:

### 1. Co-occurrence Matrix
Tracks which interests correlate with which purchase categories.
- **Time**: O(P * I + O) where P=preferences, I=interests, O=orders
- **Space**: O(I * C) for the matrix

### 2. Min-Heap Top-K
Efficiently extracts top-K recommendations using a priority queue.
- **Time**: O(N log K) for N scores, K results

### 3. Apriori-Lite Frequent Itemsets
Discovers frequent interest pairs and interest-category combinations.
- **Time**: O(P * I^2) for pair counting
- Used for segment opportunity discovery

### 4. Graph Centrality
Identifies most-connected interests based on user and category connections.
- **Time**: O(V + E) for degree calculation

## Dashboard Features

### Preference Metrics
- Total updates, unique emails, top interest, top frequency

### Revenue Metrics
- Total revenue, order count, AOV, unique customers

### AI Recommendations
- Personalized category recommendations for most recent user
- Shows algorithm used (co-occurrence + min-heap)

### Segment Opportunities (Apriori-lite)
- Discovers high-value segments from data patterns
- Shows estimated segment sizes

### Interest Centrality (Graph Analysis)
- Visualizes which interests have most connections

### Revenue Attribution Explainer
- Documents which Klaviyo events track revenue

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **APIs**: Klaviyo Events + Profiles API

## Setup Instructions

### Prerequisites

- Node.js 18+
- Klaviyo account with Private API Key

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/klaviyo-hackathon.git
cd klaviyo-hackathon
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
```

### Environment Variables

```
KLAVIYO_PRIVATE_KEY=pk_xxxxxxxxxxxxxxxxxxxxx
KLAVIYO_REVISION=2024-10-15
STRIPE_SECRET_KEY=sk_test_xxxxx  # Optional
```

## API Reference

### POST /api/preferences
Save preferences (Klaviyo Events + Profiles + SQLite)

### POST /api/purchase
Simulate purchase (action: "start" | "complete")

### GET /api/updates?limit=10
Recent preference updates

### GET /api/stats
Preference analytics

### GET /api/recommend?email=...
AI recommendations for user (or general insights if no email)

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Preference center
│   ├── checkout/page.tsx     # Purchase simulator
│   ├── dashboard/page.tsx    # Analytics dashboard
│   └── api/
│       ├── preferences/      # Preference save
│       ├── purchase/         # Purchase simulation
│       ├── updates/          # Recent updates
│       ├── stats/            # Analytics
│       └── recommend/        # AI recommendations
└── lib/
    ├── klaviyo.ts            # Klaviyo API integration
    ├── db.ts                 # SQLite (preferences + orders)
    └── recommend.ts          # DSA recommendation engine
```

## AI Usage Disclosure

Built with Claude (Anthropic). Claude helped with:
- Architecture and API integration
- DSA algorithm implementations
- TypeScript types
- Documentation

All code reviewed and tested by developer.

## License

MIT

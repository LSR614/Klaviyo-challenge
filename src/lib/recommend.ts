/**
 * DSA-Heavy Recommendation Engine
 *
 * This module implements recommendation algorithms using classical data structures:
 * 1. Co-occurrence Matrix: Tracks which interests appear with which categories
 * 2. Min-Heap (Priority Queue): Efficiently finds top-K recommendations
 * 3. Apriori-lite: Finds frequent itemsets for segment suggestions
 * 4. Graph Centrality: Identifies most connected interests/categories
 *
 * Time Complexities:
 * - Building co-occurrence: O(P * I * C) where P=preferences, I=interests, C=categories
 * - Top-K recommendations: O(N log K) using min-heap
 * - Apriori frequent pairs: O(I^2 * P) for pair counting
 * - Graph centrality: O(V + E) for degree calculation
 */

import { getAllPreferences, getAllOrders, type PreferenceUpdate, type Order } from "./db";

// ============ TYPES ============

export interface Recommendation {
  category: string;
  score: number;
  reason: string;
}

export interface SegmentOpportunity {
  name: string;
  criteria: string[];
  estimatedSize: number;
  confidence: number;
}

export interface FrequentItemset {
  items: string[];
  support: number;
  type: "interest" | "interest-category" | "category";
}

// ============ MIN-HEAP IMPLEMENTATION ============

/**
 * MinHeap for efficient top-K extraction
 * Time: O(log n) for insert/extract, O(n log k) for top-k of n items
 */
class MinHeap<T> {
  private heap: { value: T; priority: number }[] = [];

  get size(): number {
    return this.heap.length;
  }

  peek(): { value: T; priority: number } | undefined {
    return this.heap[0];
  }

  insert(value: T, priority: number): void {
    this.heap.push({ value, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  extractMin(): { value: T; priority: number } | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return min;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild].priority < this.heap[smallest].priority) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].priority < this.heap[smallest].priority) {
        smallest = rightChild;
      }

      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

// ============ CO-OCCURRENCE MATRIX ============

/**
 * Build a co-occurrence matrix between interests and categories
 * Matrix[interest][category] = count of users with that interest who bought that category
 *
 * Time: O(P * I + O * C) where P=preferences, I=avg interests, O=orders, C=1
 * Space: O(I * C) for the matrix
 */
function buildCoOccurrenceMatrix(
  preferences: PreferenceUpdate[],
  orders: Order[]
): Map<string, Map<string, number>> {
  // Create email -> interests lookup for O(1) access
  const emailToInterests = new Map<string, Set<string>>();
  for (const pref of preferences) {
    const existing = emailToInterests.get(pref.email) || new Set();
    for (const interest of pref.interests) {
      existing.add(interest);
    }
    emailToInterests.set(pref.email, existing);
  }

  // Build co-occurrence: interest -> category -> count
  const matrix = new Map<string, Map<string, number>>();

  for (const order of orders) {
    const interests = emailToInterests.get(order.email);
    if (!interests) continue;

    for (const interest of interests) {
      if (!matrix.has(interest)) {
        matrix.set(interest, new Map());
      }
      const categoryMap = matrix.get(interest)!;
      categoryMap.set(order.category, (categoryMap.get(order.category) || 0) + 1);
    }
  }

  return matrix;
}

// ============ TOP-K RECOMMENDATIONS ============

/**
 * Get top-K category recommendations for a user using a min-heap
 *
 * Algorithm:
 * 1. Get user's interests
 * 2. For each interest, look up co-occurring categories
 * 3. Aggregate scores across all interests
 * 4. Use min-heap to efficiently maintain top-K
 *
 * Time: O(I * C + N log K) where I=interests, C=categories, N=total scores, K=result size
 */
export function getRecommendations(email: string, k: number = 5): Recommendation[] {
  const preferences = getAllPreferences();
  const orders = getAllOrders();

  // Get user's interests
  const userPrefs = preferences.filter((p) => p.email === email);
  if (userPrefs.length === 0) {
    return getPopularCategories(orders, k);
  }

  const userInterests = new Set<string>();
  for (const pref of userPrefs) {
    for (const interest of pref.interests) {
      userInterests.add(interest);
    }
  }

  // Build co-occurrence matrix
  const matrix = buildCoOccurrenceMatrix(preferences, orders);

  // Aggregate scores for each category
  const categoryScores = new Map<string, { score: number; reasons: string[] }>();

  for (const interest of userInterests) {
    const categoryMap = matrix.get(interest);
    if (!categoryMap) continue;

    for (const [category, count] of categoryMap) {
      const existing = categoryScores.get(category) || { score: 0, reasons: [] };
      existing.score += count;
      existing.reasons.push(`${interest} buyers often purchase ${category}`);
      categoryScores.set(category, existing);
    }
  }

  // Filter out categories user already bought (optional - keep for now)
  const userCategories = new Set(
    orders.filter((o) => o.email === email).map((o) => o.category)
  );

  // Use min-heap to get top-K
  const heap = new MinHeap<{ category: string; reasons: string[] }>();

  for (const [category, data] of categoryScores) {
    // Boost score if user hasn't bought this category yet
    const score = userCategories.has(category) ? data.score : data.score * 1.5;

    if (heap.size < k) {
      heap.insert({ category, reasons: data.reasons }, score);
    } else if (heap.peek()!.priority < score) {
      heap.extractMin();
      heap.insert({ category, reasons: data.reasons }, score);
    }
  }

  // Extract results (in reverse order since it's a min-heap)
  const results: Recommendation[] = [];
  while (heap.size > 0) {
    const item = heap.extractMin()!;
    results.unshift({
      category: item.value.category,
      score: Math.round(item.priority * 100) / 100,
      reason: item.value.reasons[0] || "Based on similar users",
    });
  }

  // If not enough recommendations, fill with popular categories
  if (results.length < k) {
    const popular = getPopularCategories(orders, k - results.length);
    const existingCategories = new Set(results.map((r) => r.category));
    for (const rec of popular) {
      if (!existingCategories.has(rec.category)) {
        results.push(rec);
      }
    }
  }

  return results.slice(0, k);
}

/**
 * Fallback: Get most popular categories by order count
 */
function getPopularCategories(orders: Order[], k: number): Recommendation[] {
  const categoryCounts = new Map<string, number>();
  for (const order of orders) {
    categoryCounts.set(order.category, (categoryCounts.get(order.category) || 0) + 1);
  }

  return Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([category, count]) => ({
      category,
      score: count,
      reason: "Popular category",
    }));
}

// ============ APRIORI-LITE: FREQUENT ITEMSETS ============

/**
 * Find frequent pairs/triples of interests using Apriori-inspired algorithm
 *
 * Algorithm:
 * 1. Count individual item frequencies
 * 2. Generate candidate pairs from frequent items
 * 3. Count pair frequencies
 * 4. Return pairs above minimum support threshold
 *
 * Time: O(P * I^2) for pair counting
 * Space: O(I^2) for pair counts
 */
export function findFrequentItemsets(minSupport: number = 0.1): FrequentItemset[] {
  const preferences = getAllPreferences();
  const orders = getAllOrders();
  const totalTransactions = preferences.length + orders.length;

  if (totalTransactions === 0) return [];

  // Count individual items
  const interestCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const pref of preferences) {
    for (const interest of pref.interests) {
      interestCounts.set(interest, (interestCounts.get(interest) || 0) + 1);
    }
  }

  for (const order of orders) {
    categoryCounts.set(order.category, (categoryCounts.get(order.category) || 0) + 1);
  }

  const results: FrequentItemset[] = [];
  const minCount = Math.max(1, Math.floor(totalTransactions * minSupport));

  // Add frequent single items
  for (const [interest, count] of interestCounts) {
    if (count >= minCount) {
      results.push({
        items: [interest],
        support: count / totalTransactions,
        type: "interest",
      });
    }
  }

  // Count interest pairs
  const pairCounts = new Map<string, number>();

  for (const pref of preferences) {
    const interests = pref.interests;
    // Generate all pairs
    for (let i = 0; i < interests.length; i++) {
      for (let j = i + 1; j < interests.length; j++) {
        const pair = [interests[i], interests[j]].sort().join("|");
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      }
    }
  }

  // Add frequent pairs
  for (const [pair, count] of pairCounts) {
    if (count >= minCount) {
      results.push({
        items: pair.split("|"),
        support: count / preferences.length,
        type: "interest",
      });
    }
  }

  // Count interest-category co-occurrences
  const emailToInterests = new Map<string, string[]>();
  for (const pref of preferences) {
    emailToInterests.set(pref.email, pref.interests);
  }

  const crossCounts = new Map<string, number>();
  for (const order of orders) {
    const interests = emailToInterests.get(order.email);
    if (!interests) continue;

    for (const interest of interests) {
      const key = `${interest}|${order.category}`;
      crossCounts.set(key, (crossCounts.get(key) || 0) + 1);
    }
  }

  for (const [key, count] of crossCounts) {
    if (count >= minCount) {
      const [interest, category] = key.split("|");
      results.push({
        items: [interest, category],
        support: count / orders.length,
        type: "interest-category",
      });
    }
  }

  // Sort by support descending
  return results.sort((a, b) => b.support - a.support);
}

// ============ SEGMENT OPPORTUNITIES ============

/**
 * Generate segment opportunities based on frequent patterns
 * Uses graph-like analysis of connections between interests and behaviors
 *
 * Time: O(F) where F = number of frequent itemsets
 */
export function getSegmentOpportunities(): SegmentOpportunity[] {
  const preferences = getAllPreferences();
  const orders = getAllOrders();
  const frequentItems = findFrequentItemsets(0.05);

  const opportunities: SegmentOpportunity[] = [];

  // Build email -> data lookup
  const emailData = new Map<string, { interests: Set<string>; categories: Set<string>; spent: number }>();

  for (const pref of preferences) {
    const data = emailData.get(pref.email) || { interests: new Set(), categories: new Set(), spent: 0 };
    for (const i of pref.interests) data.interests.add(i);
    emailData.set(pref.email, data);
  }

  for (const order of orders) {
    const data = emailData.get(order.email) || { interests: new Set(), categories: new Set(), spent: 0 };
    data.categories.add(order.category);
    data.spent += order.amountCents;
    emailData.set(order.email, data);
  }

  const totalUsers = emailData.size;

  // Generate segments from frequent interest pairs
  for (const itemset of frequentItems) {
    if (itemset.type === "interest" && itemset.items.length === 2) {
      const [i1, i2] = itemset.items;
      const matchCount = Array.from(emailData.values()).filter(
        (d) => d.interests.has(i1) && d.interests.has(i2)
      ).length;

      opportunities.push({
        name: `${i1} + ${i2} Enthusiasts`,
        criteria: [`pref_interests contains "${i1}"`, `pref_interests contains "${i2}"`],
        estimatedSize: matchCount,
        confidence: itemset.support,
      });
    }

    if (itemset.type === "interest-category" && itemset.items.length === 2) {
      const [interest, category] = itemset.items;
      const matchCount = Array.from(emailData.values()).filter(
        (d) => d.interests.has(interest) && d.categories.has(category)
      ).length;

      opportunities.push({
        name: `${interest} Fans who buy ${category}`,
        criteria: [
          `pref_interests contains "${interest}"`,
          `last_purchase_category = "${category}"`,
        ],
        estimatedSize: matchCount,
        confidence: itemset.support,
      });
    }
  }

  // High-value segment
  const highValueThreshold = 10000; // $100+
  const highValueCount = Array.from(emailData.values()).filter(
    (d) => d.spent >= highValueThreshold
  ).length;

  if (highValueCount > 0) {
    opportunities.push({
      name: "High-Value Customers",
      criteria: ["total_spent >= 100"],
      estimatedSize: highValueCount,
      confidence: highValueCount / Math.max(1, totalUsers),
    });
  }

  // Multi-interest segment
  const multiInterestCount = Array.from(emailData.values()).filter(
    (d) => d.interests.size >= 3
  ).length;

  if (multiInterestCount > 0) {
    opportunities.push({
      name: "Diverse Interest Profile",
      criteria: ["pref_interests.length >= 3"],
      estimatedSize: multiInterestCount,
      confidence: multiInterestCount / Math.max(1, totalUsers),
    });
  }

  // Sort by estimated size
  return opportunities.sort((a, b) => b.estimatedSize - a.estimatedSize).slice(0, 10);
}

// ============ GRAPH CENTRALITY ============

/**
 * Calculate "centrality" scores for interests based on their connections
 * Uses degree centrality: interests connected to more categories/users are more central
 *
 * Time: O(P * I + O) for building adjacency
 */
export function getInterestCentrality(): { interest: string; centrality: number; connections: number }[] {
  const preferences = getAllPreferences();
  const orders = getAllOrders();

  // Build adjacency: interest -> set of connected emails and categories
  const adjacency = new Map<string, Set<string>>();

  for (const pref of preferences) {
    for (const interest of pref.interests) {
      const connections = adjacency.get(interest) || new Set();
      connections.add(`email:${pref.email}`);
      adjacency.set(interest, connections);
    }
  }

  // Add category connections via orders
  const emailToInterests = new Map<string, string[]>();
  for (const pref of preferences) {
    emailToInterests.set(pref.email, pref.interests);
  }

  for (const order of orders) {
    const interests = emailToInterests.get(order.email);
    if (!interests) continue;

    for (const interest of interests) {
      const connections = adjacency.get(interest) || new Set();
      connections.add(`category:${order.category}`);
      adjacency.set(interest, connections);
    }
  }

  // Calculate centrality (normalized degree)
  const maxConnections = Math.max(1, ...Array.from(adjacency.values()).map((s) => s.size));

  return Array.from(adjacency.entries())
    .map(([interest, connections]) => ({
      interest,
      centrality: connections.size / maxConnections,
      connections: connections.size,
    }))
    .sort((a, b) => b.centrality - a.centrality);
}

// ============ MAIN EXPORT ============

export interface RecommendationResult {
  email: string;
  recommendations: Recommendation[];
  segmentOpportunities: SegmentOpportunity[];
  frequentPatterns: FrequentItemset[];
  interestCentrality: { interest: string; centrality: number; connections: number }[];
}

export function getFullRecommendations(email: string): RecommendationResult {
  return {
    email,
    recommendations: getRecommendations(email, 5),
    segmentOpportunities: getSegmentOpportunities(),
    frequentPatterns: findFrequentItemsets(0.05).slice(0, 10),
    interestCentrality: getInterestCentrality().slice(0, 5),
  };
}

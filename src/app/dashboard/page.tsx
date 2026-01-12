import Link from "next/link";
import {
  getRecentUpdates,
  getStats,
  getRecentOrders,
  getOrderStats,
  type PreferenceUpdate,
} from "@/lib/db";
import {
  getSegmentOpportunities,
  getRecommendations,
  getInterestCentrality,
} from "@/lib/recommend";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Generate personalization preview
function generatePersonalizationPreview(update: PreferenceUpdate) {
  const { email, interests, frequency } = update;
  const firstName = email.split("@")[0].split(/[._]/)[0];
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const frequencyText = {
    daily: "daily dose",
    weekly: "weekly roundup",
    monthly: "monthly digest",
  }[frequency] || "updates";

  const interestText = interests.length > 0
    ? interests.slice(0, 2).join(" and ")
    : "your interests";

  return {
    subject: `${capitalizedName}, your ${frequencyText} of ${interestText} is here!`,
    preheader: `Curated ${interestText} content just for you`,
    greeting: `Hi ${capitalizedName},`,
    body: `Based on your preferences, we've curated the best ${interestText} content for your ${frequencyText}. ${
      interests.length > 2
        ? `Plus ${interests.length - 2} more topics you love!`
        : ""
    }`,
  };
}

export default function Dashboard() {
  const updates = getRecentUpdates(10);
  const stats = getStats();
  const orders = getRecentOrders(10);
  const orderStats = getOrderStats();
  const segmentOpportunities = getSegmentOpportunities();
  const centralInterests = getInterestCentrality().slice(0, 5);

  // Get recommendations for most recent user
  const recentEmail = updates[0]?.email;
  const recommendations = recentEmail ? getRecommendations(recentEmail, 3) : [];

  return (
    <main className="max-w-7xl mx-auto p-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Preferences, revenue, and AI-powered insights</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/checkout"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Purchase Simulator
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Preference Center
          </Link>
        </div>
      </div>

      {/* Preference Stats */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Preference Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-3xl font-bold text-blue-600">{stats.totalUpdates}</div>
            <div className="text-gray-600 text-sm mt-1">Total Updates</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-3xl font-bold text-indigo-600">{stats.uniqueEmails}</div>
            <div className="text-gray-600 text-sm mt-1">Unique Emails</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(stats.interestCounts).length > 0
                ? Object.entries(stats.interestCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"
                : "N/A"}
            </div>
            <div className="text-gray-600 text-sm mt-1">Top Interest</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-2xl font-bold text-orange-600 capitalize">
              {Object.keys(stats.frequencyCounts).length > 0
                ? Object.entries(stats.frequencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"
                : "N/A"}
            </div>
            <div className="text-gray-600 text-sm mt-1">Top Frequency</div>
          </div>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Revenue Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow p-5 text-white">
            <div className="text-3xl font-bold">{formatCurrency(orderStats.totalRevenueCents)}</div>
            <div className="text-green-100 text-sm mt-1">Total Revenue</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-3xl font-bold text-green-600">{orderStats.totalOrders}</div>
            <div className="text-gray-600 text-sm mt-1">Total Orders</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-3xl font-bold text-teal-600">{formatCurrency(orderStats.avgOrderValueCents)}</div>
            <div className="text-gray-600 text-sm mt-1">Avg Order Value</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-3xl font-bold text-cyan-600">{orderStats.uniqueCustomers}</div>
            <div className="text-gray-600 text-sm mt-1">Customers</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Updates */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Preferences</h2>
          {updates.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No preferences yet</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {updates.slice(0, 5).map((update) => (
                <div key={update.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900 truncate max-w-[150px] text-sm">
                      {update.email}
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(update.createdAt)}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {update.interests.slice(0, 3).map((interest) => (
                      <span
                        key={interest}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No orders yet</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="font-mono text-xs text-gray-600">{order.orderId}</div>
                    <div className="text-sm font-bold text-green-600">
                      {formatCurrency(order.amountCents)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                      {order.category}
                    </span>
                    <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            AI Recommendations
            {recentEmail && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                for {recentEmail.split("@")[0]}
              </span>
            )}
          </h2>
          {recommendations.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Submit preferences to see recommendations</p>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{rec.category}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      Score: {rec.score}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{rec.reason}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600">
              <strong>Algorithm:</strong> Co-occurrence matrix + Min-heap top-K
            </div>
          </div>
        </div>
      </div>

      {/* Segment Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Segment Opportunities
            <span className="text-sm font-normal text-gray-500 ml-2">(Apriori-lite)</span>
          </h2>
          {segmentOpportunities.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Add more data to discover segments</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {segmentOpportunities.slice(0, 5).map((seg, idx) => (
                <div key={idx} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900">{seg.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      ~{seg.estimatedSize} users
                    </span>
                  </div>
                  <div className="space-y-1">
                    {seg.criteria.map((c, cidx) => (
                      <div key={cidx} className="flex items-center gap-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          {cidx === 0 ? "WHERE" : "AND"}
                        </span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{c}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interest Centrality */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Interest Centrality
            <span className="text-sm font-normal text-gray-500 ml-2">(Graph Analysis)</span>
          </h2>
          {centralInterests.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Add preferences to analyze</p>
          ) : (
            <div className="space-y-3">
              {centralInterests.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-20 font-medium text-gray-700">{item.interest}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
                      style={{ width: `${item.centrality * 100}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm text-gray-600">
                    {item.connections} conn.
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600">
                  <strong>Centrality:</strong> Interests with more connections to users and purchase categories
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revenue by Category */}
      {Object.keys(orderStats.categoryRevenue).length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(orderStats.categoryRevenue)
              .sort((a, b) => b[1] - a[1])
              .map(([category, revenue]) => (
                <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{formatCurrency(revenue)}</div>
                  <div className="text-sm text-gray-600">{category}</div>
                  <div className="text-xs text-gray-400">
                    {orderStats.categoryCounts[category]} orders
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Personalization Preview */}
      {updates.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personalization Preview</h2>
          {(() => {
            const preview = generatePersonalizationPreview(updates[0]);
            return (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="text-sm text-gray-600">
                    <strong>To:</strong> {updates[0].email}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    <strong>Subject:</strong> {preview.subject}
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <p className="font-medium text-gray-900">{preview.greeting}</p>
                  <p className="text-gray-700 mt-2">{preview.body}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Revenue Attribution Explainer */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Revenue Attribution via Klaviyo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <div className="font-medium text-blue-700 mb-1">Checkout Started</div>
            <p className="text-gray-600">Tracks when customers begin checkout with amount & category</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="font-medium text-green-700 mb-1">Order Completed</div>
            <p className="text-gray-600">Records successful purchases with order_id and revenue value</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="font-medium text-purple-700 mb-1">Profile Properties</div>
            <p className="text-gray-600">Updates total_spent, order_count, last_purchase_category</p>
          </div>
        </div>
      </div>

      {/* Interest Distribution */}
      {Object.keys(stats.interestCounts).length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interest Distribution</h2>
          <div className="space-y-3">
            {Object.entries(stats.interestCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([interest, count]) => {
                const percentage = stats.totalUpdates > 0
                  ? Math.round((count / stats.totalUpdates) * 100)
                  : 0;
                return (
                  <div key={interest} className="flex items-center gap-4">
                    <div className="w-24 font-medium text-gray-700">{interest}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-sm text-gray-600">
                      {count} ({percentage}%)
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-500">
        Data refreshes on page load | Powered by Klaviyo Events + Profiles API
      </div>
    </main>
  );
}

const KLAVIYO_EVENTS_API = "https://a.klaviyo.com/api/events/";
const KLAVIYO_PROFILES_API = "https://a.klaviyo.com/api/profiles/";

function getHeaders() {
  return {
    Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`,
    accept: "application/vnd.api+json",
    "content-type": "application/vnd.api+json",
    revision: process.env.KLAVIYO_REVISION!,
  };
}

// Generic event sender
async function sendEvent(params: {
  email: string;
  metricName: string;
  properties: Record<string, unknown>;
  value?: number;
}) {
  const { email, metricName, properties, value } = params;

  const eventAttributes: Record<string, unknown> = {
    metric: {
      data: {
        type: "metric",
        attributes: { name: metricName },
      },
    },
    profile: {
      data: {
        type: "profile",
        attributes: { email },
      },
    },
    properties,
  };

  // Add value for revenue tracking
  if (value !== undefined) {
    eventAttributes.value = value;
  }

  const res = await fetch(KLAVIYO_EVENTS_API, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: eventAttributes,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Klaviyo Events API error: ${res.status}`);
  }

  return { success: true };
}

// ============ PREFERENCE EVENTS ============

export async function sendPreferenceEvent(params: {
  email: string;
  interests: string[];
  frequency: string;
}) {
  return sendEvent({
    email: params.email,
    metricName: "Preference Updated",
    properties: {
      interests: params.interests,
      frequency: params.frequency,
      source: "preference_center",
    },
  });
}

// ============ ORDER EVENTS ============

export async function sendCheckoutStartedEvent(params: {
  email: string;
  amountCents: number;
  currency: string;
  category: string;
}) {
  return sendEvent({
    email: params.email,
    metricName: "Checkout Started",
    properties: {
      amount: params.amountCents / 100,
      amount_cents: params.amountCents,
      currency: params.currency,
      category: params.category,
      source: "purchase_simulator",
    },
    value: params.amountCents / 100,
  });
}

export async function sendOrderCompletedEvent(params: {
  email: string;
  orderId: string;
  amountCents: number;
  currency: string;
  category: string;
}) {
  return sendEvent({
    email: params.email,
    metricName: "Order Completed",
    properties: {
      order_id: params.orderId,
      amount: params.amountCents / 100,
      amount_cents: params.amountCents,
      currency: params.currency,
      category: params.category,
      source: "purchase_simulator",
    },
    value: params.amountCents / 100,
  });
}

// ============ PROFILE FUNCTIONS ============

export async function upsertProfile(params: {
  email: string;
  interests: string[];
  frequency: string;
}) {
  const { email, interests, frequency } = params;
  const now = new Date().toISOString();

  const res = await fetch(KLAVIYO_PROFILES_API, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: "profile",
        attributes: {
          email,
          properties: {
            pref_interests: interests,
            pref_frequency: frequency,
            pref_updated_at: now,
          },
        },
      },
    }),
  });

  if (res.status === 409) {
    const profileId = await getProfileIdByEmail(email);
    if (profileId) {
      return updateProfile(profileId, { interests, frequency });
    }
  }

  if (!res.ok && res.status !== 201) {
    const text = await res.text();
    throw new Error(text || `Klaviyo Profiles API error: ${res.status}`);
  }

  return { success: true, action: "created" };
}

export async function updateProfileWithPurchase(params: {
  email: string;
  totalSpentCents: number;
  orderCount: number;
  lastCategory: string;
}) {
  const profileId = await getProfileIdByEmail(params.email);
  if (!profileId) {
    // Create profile with purchase data
    const res = await fetch(KLAVIYO_PROFILES_API, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email: params.email,
            properties: {
              total_spent: params.totalSpentCents / 100,
              order_count: params.orderCount,
              last_purchase_category: params.lastCategory,
              last_purchase_at: new Date().toISOString(),
            },
          },
        },
      }),
    });

    if (!res.ok && res.status !== 201 && res.status !== 409) {
      const text = await res.text();
      throw new Error(text || `Klaviyo Profiles API error: ${res.status}`);
    }

    return { success: true, action: "created" };
  }

  const res = await fetch(`${KLAVIYO_PROFILES_API}${profileId}/`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: "profile",
        id: profileId,
        attributes: {
          properties: {
            total_spent: params.totalSpentCents / 100,
            order_count: params.orderCount,
            last_purchase_category: params.lastCategory,
            last_purchase_at: new Date().toISOString(),
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Klaviyo Profile update error: ${res.status}`);
  }

  return { success: true, action: "updated" };
}

async function getProfileIdByEmail(email: string): Promise<string | null> {
  const encodedEmail = encodeURIComponent(email);
  const res = await fetch(
    `${KLAVIYO_PROFILES_API}?filter=equals(email,"${encodedEmail}")`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  if (data.data && data.data.length > 0) {
    return data.data[0].id;
  }
  return null;
}

async function updateProfile(
  profileId: string,
  params: { interests: string[]; frequency: string }
) {
  const now = new Date().toISOString();

  const res = await fetch(`${KLAVIYO_PROFILES_API}${profileId}/`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: "profile",
        id: profileId,
        attributes: {
          properties: {
            pref_interests: params.interests,
            pref_frequency: params.frequency,
            pref_updated_at: now,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Klaviyo Profile update error: ${res.status}`);
  }

  return { success: true, action: "updated" };
}

// Combined function for the preference center
export async function savePreferencesToKlaviyo(params: {
  email: string;
  interests: string[];
  frequency: string;
}) {
  const [eventResult, profileResult] = await Promise.all([
    sendPreferenceEvent(params),
    upsertProfile(params),
  ]);

  return {
    event: eventResult,
    profile: profileResult,
  };
}

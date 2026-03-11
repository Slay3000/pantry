// scripts/send-expiration-alerts.mjs

import webpush from 'web-push'
import fetch from 'node-fetch'

// 1. Load env variables
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase URL or service role key.')
    process.exit(1)
}
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('❌ Missing VAPID keys.')
    process.exit(1)
}

// Configure WebPush
webpush.setVapidDetails(
    'mailto:notifications@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
)

// 2. Fetch subscriptions via REST API
async function fetchSubscriptions() {
    const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?select=subscription`

    const resp = await fetch(url, {
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
    })

    if (!resp.ok) {
        console.error('❌ Error fetching subscriptions:', await resp.text())
        return []
    }

    const rows = await resp.json()

    // Validate keys (must be correct length)
    return rows
        .map((r) => r.subscription)
        .filter((sub) => {
            try {
                const p = sub.keys?.p256dh
                const a = sub.keys?.auth
                return p && a
            } catch {
                return false
            }
        })
}

// 3. Fetch pantry items
async function fetchPantryItems() {
    const url = `${SUPABASE_URL}/rest/v1/pantry_items?select=name,expiration_date`

    const resp = await fetch(url, {
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
    })

    if (!resp.ok) {
        console.error('❌ Error fetching items:', await resp.text())
        return []
    }

    return await resp.json()
}

// 4. Determine expiration status
function calculateExpirations(items) {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const soon = new Date(today)
    soon.setDate(today.getDate() + 3)

    const toIso = (d) => d.toISOString().slice(0, 10)
    const isoToday = toIso(today)
    const isoTomorrow = toIso(tomorrow)
    const isoSoon = toIso(soon)

    const expired = items.filter((i) => i.expiration_date < isoToday)
    const expiringToday = items.filter((i) => i.expiration_date === isoToday)
    const expiringTomorrow = items.filter(
        (i) => i.expiration_date === isoTomorrow,
    )
    const expiringSoon = items.filter(
        (i) => i.expiration_date > isoTomorrow && i.expiration_date <= isoSoon,
    )

    // 🔥 Build message with names
    let lines = []

    if (expired.length > 0) {
        lines.push(
            `❗ EXPIRED (${expired.length}): ` +
                expired.map((i) => i.name).join(', '),
        )
    }

    if (expiringToday.length > 0) {
        lines.push(
            `⚠️ Today (${expiringToday.length}): ` +
                expiringToday.map((i) => i.name).join(', '),
        )
    }

    if (expiringTomorrow.length > 0) {
        lines.push(
            `📅 Tomorrow (${expiringTomorrow.length}): ` +
                expiringTomorrow.map((i) => i.name).join(', '),
        )
    }

    if (expiringSoon.length > 0) {
        lines.push(
            `⏳ Soon (${expiringSoon.length}): ` +
                expiringSoon.map((i) => i.name).join(', '),
        )
    }

    if (lines.length === 0) return null

    // Join into notification body
    return lines.join('\n')
}
// 5. MAIN SEND FUNCTION
async function send() {
    console.log('⏳ Fetching subscriptions...')
    const subs = await fetchSubscriptions()

    if (subs.length === 0) {
        console.log('ℹ️ No valid subscriptions.')
        return
    }

    console.log('⏳ Fetching pantry items...')
    const items = await fetchPantryItems()
    console.log(items)
    const message = calculateExpirations(items)
    if (!message) {
        console.log('ℹ️ No items expiring soon.')
        return
    }

    const payload = JSON.stringify({
        title: 'Pantry Expiration Alert',
        body: message,
    })

    console.log(`📢 Sending notifications to ${subs.length} subscriber(s)...`)

    for (const sub of subs) {
        try {
            await webpush.sendNotification(sub, payload)
            console.log(
                '✓ Notification sent:',
                sub.endpoint.slice(0, 60) + '...',
            )
        } catch (err) {
            console.error('❌ Failed:', err.body || err)
        }
    }
}

send()

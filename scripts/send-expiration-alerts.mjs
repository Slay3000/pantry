// scripts/send-expiration-alerts.mjs

import fetch from 'node-fetch'

// 1. Load env variables
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase URL or service role key.')
    process.exit(1)
}

// 2. Helper to fetch data
async function supabaseFetch(endpoint, method = 'GET', body = null) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`
    const options = {
        method,
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
        },
    }
    if (body) options.body = JSON.stringify(body)

    const resp = await fetch(url, options)
    if (!resp.ok) {
        throw new Error(`Error ${method} ${endpoint}: ${await resp.text()}`)
    }
    return method === 'GET' ? await resp.json() : null
}

// 3. Fetch all users and their pantries
async function fetchUserPantries() {
    // Join pantry_users to get mapping of User -> Pantry
    return await supabaseFetch('pantry_users?select=user_id,pantry_id')
}

// 4. Fetch all items
async function fetchPantryItems() {
    return await supabaseFetch(
        'pantry_items?select=name,expiration_date,pantry_id',
    )
}

// 5. Insert Notification
async function insertNotification(userId, body) {
    await supabaseFetch('notifications', 'POST', {
        user_id: userId,
        title: 'Pantry Alert',
        body: body,
    })
}

// 6. Determine expiration status
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

// 7. MAIN SEND FUNCTION
async function send() {
    console.log('⏳ Fetching data...')
    const userPantries = await fetchUserPantries()
    const items = await fetchPantryItems()

    // Group items by pantry_id for faster lookup
    const itemsByPantry = {}
    items.forEach((item) => {
        if (!itemsByPantry[item.pantry_id]) itemsByPantry[item.pantry_id] = []
        itemsByPantry[item.pantry_id].push(item)
    })

    console.log(`📢 Processing ${userPantries.length} users...`)

    for (const entry of userPantries) {
        const userItems = itemsByPantry[entry.pantry_id] || []
        const message = calculateExpirations(userItems)

        if (!message) continue

        try {
            await insertNotification(entry.user_id, message)
            console.log(`✓ Alert stored for user ${entry.user_id}`)
        } catch (err) {
            console.error('❌ Failed to save notification:', err.message)
        }
    }
}

send()

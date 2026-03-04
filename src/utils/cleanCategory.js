export function cleanCategory(raw, availableCategories) {
    if (!raw) return null

    // split by comma
    const parts = raw
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)

    // try exact match
    for (const p of parts) {
        if (availableCategories.includes(p)) {
            return p
        }
    }

    // try case-insensitive match
    const lower = availableCategories.map((c) => c.toLowerCase())

    for (const p of parts) {
        const idx = lower.indexOf(p.toLowerCase())
        if (idx !== -1) {
            return availableCategories[idx]
        }
    }

    // nothing matches -> no autofill
    return null
}

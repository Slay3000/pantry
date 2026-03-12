export function getExpirationColor(expirationDate) {
    if (!expirationDate) return ''

    const today = new Date()
    const exp = new Date(expirationDate)

    const diffMs = exp - today
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (diffDays < 0) return 'expired' // red
    if (diffDays <= 30) return 'one-month' // orange
    if (diffDays <= 60) return 'two-month' // yellow

    return ''
}

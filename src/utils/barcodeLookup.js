export async function lookupBarcode(barcode) {
    try {
        const res = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        )
        const data = await res.json()

        if (data.status === 1) {
            const p = data.product

            const name =
                `[${p.brands || ''}] ` +
                (p.product_name || p.product_name_en || p.product_name_fr || '')

            const image =
                p.image_front_url ||
                p.image_url ||
                p.selected_images?.front?.display?.en ||
                p.selected_images?.front?.display?.fr ||
                null
            const category =
                p.categories || p.category_properties_tags?.join(', ') || null
            return {
                name,
                image,
                category,
            }
        }

        return null
    } catch (err) {
        console.error('Barcode lookup error:', err)
        return null
    }
}

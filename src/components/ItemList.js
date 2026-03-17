import ItemCard from './ItemCard'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
export default function ItemList({
    items,
    onSave,
    onDelete,
    onAddToShoppingList,
}) {
    // Group items by product using barcode or name fallback
    const [categories, setCategories] = useState([])

    useEffect(() => {
        async function fetchCategories() {
            const { data } = await supabase
                .from('categories')
                .select('*')
                .order('name')

            if (data) setCategories(data)
        }
        fetchCategories()
    }, [])
    const groups = {}

    for (const item of items) {
        const key = item.barcode || item.name.trim()

        if (!groups[key]) {
            groups[key] = { product: item, units: [] }
        }

        groups[key].units.push(item)
    }

    const grouped = Object.values(groups)

    // Sort groups by soonest expiration date
    grouped.sort((a, b) => {
        const getSoonest = (units) => {
            const dates = units.map((u) => u.expiration_date).filter(Boolean)
            if (dates.length === 0) return Infinity
            return Math.min(...dates.map((d) => new Date(d).getTime()))
        }

        return getSoonest(a.units) - getSoonest(b.units)
    })

    return (
        <ul>
            {grouped.map(({ product, units }) => (
                <ItemCard
                    key={product.id}
                    product={product}
                    units={units}
                    onSave={onSave}
                    onDelete={onDelete}
                    onAddToShoppingList={onAddToShoppingList}
                />
            ))}
        </ul>
    )
}

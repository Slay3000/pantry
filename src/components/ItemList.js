import ItemCard from './ItemCard'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
export default function ItemList({
    items,
    onSave,
    onDelete,
    onAddToShoppingList,
    onUpdateMasterItem,
}) {
    // Group items by product using barcode or name fallback
    const [categories, setCategories] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState([]) // Changed to array for multi-select
    const [isAuditMode, setIsAuditMode] = useState(false)
    const [auditProductIds, setAuditProductIds] = useState([])
    const [auditIndex, setAuditIndex] = useState(0)

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
        const key =
            item.master_item?.name ||
            item.master_item_name ||
            item.barcode ||
            item.name.trim()

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

    // Filter logic
    const filteredGroups = grouped.filter(({ product }) => {
        if (isAuditMode) {
            return auditProductIds.includes(product.id)
        }
        const matchesSearch = (product.master_item?.name || product.name || '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        const matchesCategory =
            selectedCategory.length === 0 ||
            selectedCategory.includes(product.category) // Updated for multi-select
        return matchesSearch && matchesCategory
    })

    return (
        <div className="item-list-container">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%', // Ensure it takes full width to allow wrapping
                    flexWrap: 'wrap',
                    marginBottom: '10px',
                }}
            >
                {isAuditMode && (
                    <div className="audit-progress">
                        {filteredGroups.length > 0
                            ? `Audit: ${auditIndex + 1} of ${filteredGroups.length}`
                            : 'Audit Complete! 🎉'}
                    </div>
                )}
                <button
                    className="btn-audit-toggle"
                    onClick={() => {
                        if (!isAuditMode) {
                            // Lock the list of items that need audit right now
                            const sevenDaysAgo = new Date()
                            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
                            const ids = grouped
                                .filter((g) =>
                                    g.units.some((u) => {
                                        const lastAudited = u.last_audited_at
                                            ? new Date(u.last_audited_at)
                                            : new Date(0)
                                        return lastAudited <= sevenDaysAgo
                                    }),
                                )
                                .map((g) => g.product.id)
                            setAuditProductIds(ids)
                            setAuditIndex(0)
                        }
                        setIsAuditMode(!isAuditMode)
                    }}
                >
                    {isAuditMode ? 'Exit Audit' : '📋 Pantry Audit'}
                </button>
            </div>
            {!isAuditMode && (
                <div
                    className="list-controls"
                    style={{
                        marginBottom: '20px',
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                    }}
                >
                    <input
                        type="text"
                        placeholder="Search pantry..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                        }}
                    />
                    <select
                        multiple // Added multiple attribute
                        value={selectedCategory} // Value is now an array
                        onChange={(e) => {
                            const options = Array.from(e.target.options)
                            const values = options
                                .filter((option) => option.selected)
                                .map((option) => option.value)
                            setSelectedCategory(values)
                        }}
                        className="category-select-filter" // Added class for styling
                    >
                        {categories.map((c) => (
                            <option key={c.id} value={c.name}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <ul>
                {isAuditMode ? (
                    filteredGroups.length > 0 &&
                    auditIndex < filteredGroups.length ? (
                        <ItemCard
                            key={filteredGroups[auditIndex].product.id}
                            product={filteredGroups[auditIndex].product}
                            units={filteredGroups[auditIndex].units}
                            isAuditMode={isAuditMode}
                            categories={categories}
                            onSave={onSave}
                            onDelete={onDelete}
                            onAuditSuccess={() =>
                                setAuditIndex((prev) => prev + 1)
                            }
                            // Pass the onExitAudit callback to ItemCard
                            onExitAudit={() => setIsAuditMode(false)}
                        />
                    ) : (
                        isAuditMode && (
                            <p style={{ textAlign: 'center', padding: '40px' }}>
                                Nothing else to audit this week!
                            </p>
                        )
                    )
                ) : (
                    filteredGroups.map(({ product, units }) => (
                        <ItemCard
                            key={product.id}
                            product={product}
                            units={units}
                            isAuditMode={isAuditMode}
                            categories={categories}
                            onSave={onSave}
                            onDelete={onDelete}
                            onAddToShoppingList={onAddToShoppingList}
                            onUpdateMasterItem={onUpdateMasterItem}
                        />
                    ))
                )}
            </ul>
        </div>
    )
}

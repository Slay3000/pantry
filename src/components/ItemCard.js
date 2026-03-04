import './ItemCard.css'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function isoToDisplay(iso) {
    if (!iso) return 'No date'
    const [y, m, d] = iso.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
}

function getStatus(iso) {
    if (!iso) return 'fresh'

    const today = new Date()
    const exp = new Date(iso)
    const diffDays = Math.floor((exp - today) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'expired' // 🔴
    if (diffDays <= 2) return 'soon' // 🟠
    if (diffDays <= 7) return 'week' // 🟡
    return 'fresh' // 🟢
}

export default function ItemCard({ product, units, onSave, onDelete }) {
    const [editingUnitId, setEditingUnitId] = useState(null)
    const [editingExpiration, setEditingExpiration] = useState(null)
    const [open, setOpen] = useState(true)
    const [editingCategory, setEditingCategory] = useState(false)
    const [categories, setCategories] = useState([])
    const [newCategoryName, setNewCategoryName] = useState('')
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
    const startEditUnit = (unit) => {
        setEditingUnitId(unit.id)
        setEditingExpiration(unit.expiration_date || '')
    }

    const cancelEdit = () => {
        setEditingUnitId(null)
        setEditingExpiration(null)
    }

    const saveUnit = () => {
        onSave(editingUnitId, {
            expiration_date: editingExpiration || null,
        })
        cancelEdit()
    }

    return (
        <li className="item-card grouped">
            {product.image_url ? (
                <img
                    src={product.image_url}
                    alt={product.name}
                    className="item-image"
                />
            ) : (
                <div className="item-image placeholder">No Image</div>
            )}

            <div className="item-info">
                <div className="item-name">
                    {product.name || 'Unnamed item'}
                </div>

                <div className="item-category">
                    <strong>Category:</strong>

                    {!editingCategory ? (
                        <>
                            <span style={{ marginLeft: 6 }}>
                                {product.category || 'None'}
                            </span>
                            <button
                                onClick={() => setEditingCategory(true)}
                                style={{ marginLeft: 12 }}
                            >
                                Edit
                            </button>
                        </>
                    ) : (
                        <div style={{ marginTop: 6 }}>
                            <select
                                value={product.category || ''}
                                onChange={(e) => {
                                    units.forEach((unit) => {
                                        onSave(unit.id, {
                                            category: e.target.value,
                                        })
                                    })
                                    setEditingCategory(false)
                                }}
                                style={{ marginBottom: 8, padding: 6 }}
                            >
                                <option value="">Select category…</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>

                            <div style={{ marginBottom: 8 }}>
                                <input
                                    type="text"
                                    placeholder="New category"
                                    value={newCategoryName}
                                    onChange={(e) =>
                                        setNewCategoryName(e.target.value)
                                    }
                                    style={{ marginRight: 8 }}
                                />

                                <button
                                    onClick={async () => {
                                        const trimmed = newCategoryName.trim()
                                        if (!trimmed) return

                                        const { data, error } = await supabase
                                            .from('categories')
                                            .insert({ name: trimmed })
                                            .select()
                                            .single()

                                        if (error) {
                                            alert(error.message)
                                            return
                                        }

                                        setCategories((prev) => [...prev, data])
                                        units.forEach((unit) => {
                                            onSave(unit.id, {
                                                category: data.name,
                                            })
                                        })
                                        setNewCategoryName('')
                                        setEditingCategory(false)
                                    }}
                                >
                                    Add
                                </button>
                            </div>

                            <button
                                onClick={() => setEditingCategory(false)}
                                style={{ marginTop: 4 }}
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>

                <div className="item-qty">Units: {units.length}</div>

                <div
                    className="exp-title collapsible"
                    onClick={() => setOpen((o) => !o)}
                >
                    Expirations {open ? '▼' : '►'}
                </div>

                {open && (
                    <div className="exp-group">
                        {units.map((unit) => {
                            const status = getStatus(unit.expiration_date)

                            return (
                                <div
                                    key={unit.id}
                                    className={`exp-row ${status}`}
                                >
                                    {editingUnitId === unit.id ? (
                                        <>
                                            <input
                                                type="date"
                                                value={editingExpiration}
                                                onChange={(e) =>
                                                    setEditingExpiration(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <button onClick={saveUnit}>
                                                Save
                                            </button>
                                            <button onClick={cancelEdit}>
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() =>
                                                    onDelete(unit.id)
                                                }
                                            >
                                                Delete
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span>
                                                {isoToDisplay(
                                                    unit.expiration_date,
                                                )}
                                            </span>

                                            <button
                                                onClick={() =>
                                                    startEditUnit(unit)
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                onClick={() =>
                                                    onDelete(unit.id)
                                                }
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </li>
    )
}

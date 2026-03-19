import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { getExpirationColor } from '../utils/expirationColor'
import Modal from './Modal'
import './ItemCard.css'
import '../styles/expiration.css'

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

export default function ItemCard({
    product,
    units,
    onSave,
    onDelete,
    onAddToShoppingList,
}) {
    const [showDetails, setShowDetails] = useState(false)
    const [editingUnitId, setEditingUnitId] = useState(null)
    const [editingExpiration, setEditingExpiration] = useState(null)
    const [editingCategory, setEditingCategory] = useState(false)
    const [categories, setCategories] = useState([])
    const [newCategoryName, setNewCategoryName] = useState('')
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [pendingDeleteId, setPendingDeleteId] = useState(null)
    const [editingName, setEditingName] = useState(false)
    const [newName, setNewName] = useState('')
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

    const expirationDates = units
        .map((u) => u.expiration_date)
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b))

    const nearestExpiration = expirationDates[0] || null

    return (
        <li
            className={`item-card grouped ${getExpirationColor(nearestExpiration)}`}
            onClick={() => setShowDetails(true)}
            style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '15px',
                padding: '10px',
                background: '#fff',
            }}
        >
            {product.image_url ? (
                <img
                    src={product.image_url}
                    alt={product.name}
                    className="item-image"
                    style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        flexShrink: 0,
                    }}
                />
            ) : (
                <div
                    className="item-image placeholder"
                    style={{
                        width: '60px',
                        height: '60px',
                        fontSize: '0.7rem',
                        flexShrink: 0,
                    }}
                >
                    No Image
                </div>
            )}

            <div className="item-info" style={{ flexGrow: 1, minWidth: 0 }}>
                <div
                    className="item-name"
                    style={{
                        marginBottom: '4px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {product.name || 'Unnamed item'}
                </div>
                <div
                    className="item-desc"
                    style={{ fontSize: '0.9rem', color: '#555' }}
                >
                    {units.length} unit{units.length !== 1 && 's'} •{' '}
                    {product.category || 'No category'}
                    {units[0]?.location && ` • ${units[0].location}`}
                </div>
            </div>

            {showDetails && (
                <Modal
                    title={product.name}
                    onCancel={(e) => {
                        if (e) e.stopPropagation()
                        setShowDetails(false)
                    }}
                    cancelText="Close"
                >
                    <div
                        className="item-details-view"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {product.image_url && (
                            <div
                                style={{
                                    textAlign: 'center',
                                    marginBottom: '15px',
                                }}
                            >
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '40vh',
                                        borderRadius: '8px',
                                        objectFit: 'contain',
                                    }}
                                />
                            </div>
                        )}
                        <div className="item-name">
                            {!editingName ? (
                                <>
                                    <strong>
                                        {product.name || 'Unnamed item'}
                                    </strong>
                                    <button
                                        className="btn btn-edit"
                                        onClick={() => {
                                            setNewName(product.name || '')
                                            setEditingName(true)
                                        }}
                                        style={{ marginLeft: 8 }}
                                    >
                                        ✏️
                                    </button>
                                </>
                            ) : (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        width: '100%',
                                    }}
                                >
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) =>
                                            setNewName(e.target.value)
                                        }
                                        style={{
                                            fontSize: '1rem',
                                            padding: '8px',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                        }}
                                    />
                                    <div
                                        style={{ display: 'flex', gap: '8px' }}
                                    >
                                        <button
                                            style={{
                                                padding: '8px 16px',
                                                flex: 1,
                                            }}
                                            onClick={() => {
                                                const trimmed = newName.trim()
                                                if (trimmed) {
                                                    units.forEach((u) =>
                                                        onSave(u.id, {
                                                            name: trimmed,
                                                        }),
                                                    )
                                                    setEditingName(false)
                                                }
                                            }}
                                        >
                                            💾
                                        </button>
                                        <button
                                            style={{
                                                padding: '8px 16px',
                                                flex: 1,
                                            }}
                                            onClick={() =>
                                                setEditingName(false)
                                            }
                                        >
                                            ❌
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="item-location">
                            <strong>Location:</strong>
                            <select
                                value={units[0].location}
                                onChange={(e) =>
                                    units.forEach((u) =>
                                        onSave(u.id, {
                                            location: e.target.value,
                                        }),
                                    )
                                }
                                style={{ marginLeft: 8, padding: '4px' }}
                            >
                                <option value="pantry">Pantry</option>
                                <option value="fridge">Fridge</option>
                                <option value="freezer">Freezer</option>
                            </select>
                        </div>
                        <div className="item-category">
                            <strong>Category:</strong>

                            {!editingCategory ? (
                                <>
                                    <span style={{ marginLeft: 6 }}>
                                        {product.category || 'None'}
                                    </span>
                                    <button
                                        className="btn btn-edit"
                                        onClick={() => setEditingCategory(true)}
                                        style={{ marginLeft: 12 }}
                                    >
                                        ✏️
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
                                        style={{
                                            marginBottom: 8,
                                            padding: '8px',
                                            width: '100%',
                                        }}
                                    >
                                        <option value="">
                                            Select category…
                                        </option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.name}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>

                                    <div
                                        style={{
                                            marginBottom: 8,
                                            display: 'flex',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <input
                                            type="text"
                                            placeholder="New category"
                                            value={newCategoryName}
                                            onChange={(e) =>
                                                setNewCategoryName(
                                                    e.target.value,
                                                )
                                            }
                                            style={{
                                                flexGrow: 1,
                                                padding: '8px',
                                            }}
                                        />

                                        <button
                                            style={{ padding: '8px 12px' }}
                                            onClick={async () => {
                                                const trimmed =
                                                    newCategoryName.trim()
                                                if (!trimmed) return

                                                const { data, error } =
                                                    await supabase
                                                        .from('categories')
                                                        .insert({
                                                            name: trimmed,
                                                        })
                                                        .select()
                                                        .single()

                                                if (error) {
                                                    alert(error.message)
                                                    return
                                                }

                                                setCategories((prev) => [
                                                    ...prev,
                                                    data,
                                                ])
                                                units.forEach((unit) => {
                                                    onSave(unit.id, {
                                                        category: data.name,
                                                    })
                                                })
                                                setNewCategoryName('')
                                                setEditingCategory(false)
                                            }}
                                        >
                                            ➕
                                        </button>
                                    </div>

                                    <button
                                        className="btn btn-edit"
                                        onClick={() =>
                                            setEditingCategory(false)
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                        }}
                                    >
                                        ✔
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="item-qty">Units: {units.length}</div>

                        <div className="exp-title">Expirations</div>
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

                                                <div className="exp-row-actions">
                                                    <button onClick={saveUnit}>
                                                        💾
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                    >
                                                        ❌
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            onDelete(unit.id)
                                                        }
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span>
                                                    {isoToDisplay(
                                                        unit.expiration_date,
                                                    )}
                                                </span>

                                                <div className="exp-row-actions">
                                                    <button
                                                        onClick={() =>
                                                            startEditUnit(unit)
                                                        }
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setPendingDeleteId(
                                                                unit.id,
                                                            )
                                                            setShowDeleteModal(
                                                                true,
                                                            )
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </Modal>
            )}

            {showDeleteModal && (
                <Modal
                    title="Delete Item?"
                    onConfirm={() => {
                        onDelete(pendingDeleteId)
                        setShowDeleteModal(false)
                        if (units.length === 1) {
                            if (
                                window.confirm(
                                    `Add "${product.name}" to your shopping list?`,
                                )
                            ) {
                                onAddToShoppingList(product.name)
                            }
                        }
                        setPendingDeleteId(null)
                    }}
                    onCancel={() => {
                        setShowDeleteModal(false)
                        setPendingDeleteId(null)
                    }}
                    confirmText="Delete"
                    cancelText="Cancel"
                >
                    This action cannot be undone.
                </Modal>
            )}
        </li>
    )
}

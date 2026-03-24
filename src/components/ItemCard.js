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
    onUpdateMasterItem,
}) {
    const [showDetails, setShowDetails] = useState(false)
    const [editingUnitId, setEditingUnitId] = useState(null)
    const [editingExpiration, setEditingExpiration] = useState(null)
    const [categories, setCategories] = useState([])
    const [newCategoryName, setNewCategoryName] = useState('')
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [pendingDeleteId, setPendingDeleteId] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [editBrand, setEditBrand] = useState('')
    const [editCategory, setEditCategory] = useState('')
    const [editSubcategory, setEditSubcategory] = useState('')
    const [editTags, setEditTags] = useState([])
    const [editStorageZone, setEditStorageZone] = useState('pantry')
    const [suggestions, setSuggestions] = useState([])
    const [tagInput, setTagInput] = useState('')

    // Fetch suggestions when entering edit mode
    useEffect(() => {
        if (isEditing && suggestions.length === 0) {
            async function fetchSuggestions() {
                const { data } = await supabase
                    .from('master_items')
                    .select('name, category, subcategory, tags')
                    .order('name')
                if (data) setSuggestions(data)
            }
            fetchSuggestions()
        }
    }, [isEditing, suggestions.length])

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

    const startEditing = () => {
        setEditName(product.master_item_name || product.name || 'Unnamed item')
        setEditBrand(product.brand || product.master_item?.brand || '')
        setEditCategory(product.category || '')
        setEditSubcategory(product.master_item?.subcategory || '')
        setEditTags(
            Array.isArray(product.master_item?.tags)
                ? product.master_item.tags
                : [],
        )
        setEditStorageZone(
            units[0]?.storage_zone || units[0]?.location || 'pantry',
        )
        setTagInput('')
        setIsEditing(true)
    }

    const saveChanges = async () => {
        const trimmedName = editName.trim()
        if (!trimmedName) return

        // 1. Check for name change/merge
        let targetMasterId = product.master_item?.id
        const currentMasterName = product.master_item?.name || product.name

        if (trimmedName !== currentMasterName || !targetMasterId) {
            const { data: existingMaster } = await supabase
                .from('master_items')
                .select('id')
                .eq('name', trimmedName)
                .single()

            if (existingMaster) {
                if (existingMaster.id !== targetMasterId) {
                    targetMasterId = existingMaster.id
                    // Re-link units
                    await Promise.all(
                        units.map((u) =>
                            onSave(u.id, { master_item_id: targetMasterId }),
                        ),
                    )
                }
            } else {
                if (targetMasterId) {
                    await onUpdateMasterItem(targetMasterId, {
                        name: trimmedName,
                    })
                } else {
                    // Create new master item
                    const { data: newMaster, error } = await supabase
                        .from('master_items')
                        .insert([
                            {
                                name: trimmedName,
                                category: editCategory || null,
                                subcategory: editSubcategory.trim() || null,
                                tags: editTags,
                                brand: editBrand.trim() || null,
                            },
                        ])
                        .select()
                        .single()

                    if (!error && newMaster) {
                        targetMasterId = newMaster.id
                        // Link units
                        await Promise.all(
                            units.map((u) =>
                                onSave(u.id, {
                                    master_item_id: targetMasterId,
                                }),
                            ),
                        )
                    }
                }
            }
        }

        // 2. Update Master Item metadata
        if (targetMasterId) {
            await onUpdateMasterItem(targetMasterId, {
                category: editCategory || null,
                subcategory: editSubcategory.trim() || null,
                tags: editTags,
                brand: editBrand.trim() || null,
            })
        }

        // 3. Update Units (Storage Zone & redundant category)
        await Promise.all(
            units.map((u) =>
                onSave(u.id, {
                    storage_zone: editStorageZone,
                    location: editStorageZone,
                    category: editCategory || null,
                    brand: editBrand.trim() || null,
                }),
            ),
        )

        setIsEditing(false)
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
        >
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
                    {product.master_item?.name ||
                        product.master_item_name ||
                        product.name ||
                        'Unnamed item'}
                </div>
                {product.brand && (
                    <div className="item-desc" style={{ fontWeight: '500' }}>
                        {product.brand}
                    </div>
                )}
                {(product.api_name ||
                    (product.master_item_name &&
                        product.name !== product.master_item_name)) && (
                    <div className="item-desc" style={{ fontSize: '0.8rem' }}>
                        {product.api_name || product.name}
                    </div>
                )}
                <div className="item-desc">
                    {units.length} unit{units.length !== 1 && 's'} •{' '}
                    {product.category || 'No category'}
                    {(units[0]?.storage_zone || units[0]?.location) &&
                        ` • ${units[0].storage_zone || units[0].location}`}
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
                        className="item-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {product.image_url && (
                            <div className="modal-image-container">
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="modal-product-image"
                                />
                            </div>
                        )}
                        {!isEditing ? (
                            <div className="item-details-view">
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <div>
                                        <div className="item-name">
                                            <strong>
                                                {product.master_item?.name ||
                                                    product.master_item_name ||
                                                    product.name ||
                                                    'Unnamed item'}
                                            </strong>
                                        </div>
                                        {(product.api_name ||
                                            (product.master_item_name &&
                                                product.name !==
                                                    product.master_item_name)) && (
                                            <div className="item-desc">
                                                {product.api_name ||
                                                    product.name}
                                            </div>
                                        )}
                                        {(product.brand ||
                                            product.master_item?.brand) && (
                                            <div className="item-desc">
                                                Brand:{' '}
                                                {product.brand ||
                                                    product.master_item?.brand}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-edit btn-icon-medium"
                                        onClick={startEditing}
                                        style={{ fontSize: '1.2rem' }}
                                    >
                                        ✏️ Edit
                                    </button>
                                </div>

                                <div
                                    className="item-location"
                                    style={{ marginTop: '10px' }}
                                >
                                    <strong>Storage Zone:</strong>{' '}
                                    {units[0].storage_zone ||
                                        units[0].location ||
                                        'Pantry'}
                                </div>

                                <div className="item-category">
                                    <strong>Category:</strong>{' '}
                                    {product.category || 'None'}
                                </div>

                                <div
                                    className="item-extra-details"
                                    style={{ marginTop: 5 }}
                                >
                                    <div>
                                        <strong>Subcategory: </strong>
                                        {product.master_item?.subcategory ||
                                            '-'}
                                    </div>
                                    <div>
                                        <strong>Tags: </strong>
                                        {Array.isArray(
                                            product.master_item?.tags,
                                        )
                                            ? product.master_item.tags.join(
                                                  ', ',
                                              )
                                            : '-'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="item-details-edit">
                                <label>Name:</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) =>
                                        setEditName(e.target.value)
                                    }
                                    list={`suggestions-${product.id}`}
                                    className="edit-input"
                                    style={{
                                        width: '100%',
                                        marginBottom: '10px',
                                    }}
                                />
                                <datalist id={`suggestions-${product.id}`}>
                                    {suggestions.map((s) => (
                                        <option key={s.name} value={s.name} />
                                    ))}
                                </datalist>

                                <label>Brand:</label>
                                <input
                                    type="text"
                                    value={editBrand}
                                    onChange={(e) =>
                                        setEditBrand(e.target.value)
                                    }
                                    className="edit-input"
                                    style={{
                                        width: '100%',
                                        marginBottom: '10px',
                                    }}
                                />

                                <label>Storage Zone:</label>
                                <select
                                    value={editStorageZone}
                                    onChange={(e) =>
                                        setEditStorageZone(e.target.value)
                                    }
                                    className="location-select"
                                    style={{
                                        width: '100%',
                                        marginBottom: '10px',
                                    }}
                                >
                                    <option value="pantry">Pantry</option>
                                    <option value="fridge">Fridge</option>
                                    <option value="freezer">Freezer</option>
                                </select>

                                <label>Category:</label>
                                <select
                                    className="category-select"
                                    value={editCategory}
                                    onChange={(e) =>
                                        setEditCategory(e.target.value)
                                    }
                                    style={{
                                        width: '100%',
                                        marginBottom: '5px',
                                    }}
                                >
                                    <option value="">Select category…</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.name}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>

                                <div
                                    className="new-category-row"
                                    style={{ marginBottom: '10px' }}
                                >
                                    <input
                                        type="text"
                                        placeholder="New category"
                                        value={newCategoryName}
                                        onChange={(e) =>
                                            setNewCategoryName(e.target.value)
                                        }
                                        className="new-category-input"
                                    />
                                    <button
                                        className="btn-add"
                                        onClick={async () => {
                                            const trimmed =
                                                newCategoryName.trim()
                                            if (!trimmed) return
                                            const { data, error } =
                                                await supabase
                                                    .from('categories')
                                                    .insert({ name: trimmed })
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
                                            setEditCategory(data.name)
                                            setNewCategoryName('')
                                        }}
                                    >
                                        ➕
                                    </button>
                                </div>

                                <label>Subcategory:</label>
                                <input
                                    className="edit-input"
                                    value={editSubcategory}
                                    onChange={(e) =>
                                        setEditSubcategory(e.target.value)
                                    }
                                    list={`subcat-suggestions-${product.id}`}
                                    style={{
                                        width: '100%',
                                        marginBottom: '10px',
                                    }}
                                />
                                <datalist
                                    id={`subcat-suggestions-${product.id}`}
                                >
                                    {[
                                        ...new Set(
                                            suggestions
                                                .filter(
                                                    (s) =>
                                                        !editCategory ||
                                                        (
                                                            s.category || ''
                                                        ).toLowerCase() ===
                                                            editCategory.toLowerCase(),
                                                )
                                                .map((s) => s.subcategory)
                                                .filter(Boolean),
                                        ),
                                    ]
                                        .sort()
                                        .map((s) => (
                                            <option key={s} value={s} />
                                        ))}
                                </datalist>

                                <label>Tags:</label>
                                <div
                                    style={{
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        padding: '8px',
                                        marginBottom: '10px',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '5px',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        {editTags.map((tag) => (
                                            <span
                                                key={tag}
                                                style={{
                                                    background: '#e0e0e0',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    fontSize: '0.9rem',
                                                }}
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditTags(
                                                            editTags.filter(
                                                                (t) =>
                                                                    t !== tag,
                                                            ),
                                                        )
                                                    }
                                                    style={{
                                                        marginLeft: '6px',
                                                        border: 'none',
                                                        background: 'none',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        padding: 0,
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) =>
                                                setTagInput(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    const val = tagInput.trim()
                                                    if (
                                                        val &&
                                                        !editTags.includes(val)
                                                    ) {
                                                        setEditTags([
                                                            ...editTags,
                                                            val,
                                                        ])
                                                    }
                                                    setTagInput('')
                                                }
                                            }}
                                            placeholder="Add tag..."
                                            style={{
                                                border: 'none',
                                                outline: 'none',
                                                flexGrow: 1,
                                                minWidth: '80px',
                                                background: 'transparent',
                                            }}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.8rem',
                                            color: '#666',
                                        }}
                                    >
                                        Suggested:
                                        {[
                                            ...new Set(
                                                suggestions
                                                    .filter(
                                                        (s) =>
                                                            !editCategory ||
                                                            (
                                                                s.category || ''
                                                            ).toLowerCase() ===
                                                                editCategory.toLowerCase(),
                                                    )
                                                    .flatMap((s) =>
                                                        Array.isArray(s.tags)
                                                            ? s.tags
                                                            : [],
                                                    )
                                                    .filter(Boolean),
                                            ),
                                        ]
                                            .filter(
                                                (t) => !editTags.includes(t),
                                            )
                                            .slice(0, 10)
                                            .map((t) => (
                                                <span
                                                    key={t}
                                                    onClick={() =>
                                                        setEditTags([
                                                            ...editTags,
                                                            t,
                                                        ])
                                                    }
                                                    style={{
                                                        marginLeft: '6px',
                                                        textDecoration:
                                                            'underline',
                                                        cursor: 'pointer',
                                                        color: '#007bff',
                                                    }}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                    </div>
                                </div>

                                <div className="edit-actions">
                                    <button
                                        className="btn-action"
                                        onClick={saveChanges}
                                    >
                                        💾 Save
                                    </button>
                                    <button
                                        className="btn-action"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        ❌ Cancel
                                    </button>
                                </div>
                            </div>
                        )}

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

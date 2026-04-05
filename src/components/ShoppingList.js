import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import './ShoppingList.css'

export default function ShoppingList({ pantryId }) {
    const [items, setItems] = useState([])
    const [newItemName, setNewItemName] = useState('')
    const [newSupermarket, setNewSupermarket] = useState('')
    const [selectedSupermarket, setSelectedSupermarket] = useState('')
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [draggedItemId, setDraggedItemId] = useState(null)

    async function fetchItems() {
        if (!pantryId) return
        setLoading(true)
        const { data, error } = await supabase
            .from('shopping_list')
            .select('*')
            .eq('pantry_id', pantryId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching shopping list items:', error)
        } else {
            setItems(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        if (pantryId) {
            fetchItems()
        }
    }, [pantryId])

    async function handleAddItem(e) {
        e.preventDefault()
        if (!newItemName.trim()) return

        const smValue =
            selectedSupermarket === 'NEW' ? newSupermarket : selectedSupermarket

        const { data, error } = await supabase
            .from('shopping_list')
            .insert([
                {
                    name: newItemName.trim(),
                    pantry_id: pantryId,
                    supermarket: smValue.trim() || null,
                },
            ])
            .select()
            .single()

        if (error) {
            alert(error.message)
        } else if (data) {
            setItems((prevItems) => [...prevItems, data])
            setNewItemName('')
            setNewSupermarket('')
            setSelectedSupermarket('')
        }
    }

    async function handleToggleItem(item) {
        const updates = { completed: !item.completed }
        const { data, error } = await supabase
            .from('shopping_list')
            .update(updates)
            .eq('id', item.id)
            .select()

        if (error) {
            alert(error.message)
        } else if (data && data.length > 0) {
            setItems(items.map((i) => (i.id === item.id ? data[0] : i)))
        }
    }

    function handleDeleteClick(item) {
        setItemToDelete(item)
        setShowDeleteModal(true)
    }

    async function confirmDelete() {
        if (!itemToDelete) return
        const { error } = await supabase
            .from('shopping_list')
            .delete()
            .eq('id', itemToDelete.id)

        if (error) {
            alert(error.message)
        } else {
            setItems(items.filter((item) => item.id !== itemToDelete.id))
        }
        setShowDeleteModal(false)
        setItemToDelete(null)
    }

    function handleDragStart(e, id) {
        setDraggedItemId(id)
        e.dataTransfer.effectAllowed = 'move'
    }

    function handleDragOver(e) {
        e.preventDefault() // Required to allow dropping
    }

    function handleDrop(e, targetId) {
        e.preventDefault()
        if (!draggedItemId || draggedItemId === targetId) return

        const newItems = [...items]
        const draggedIndex = newItems.findIndex((i) => i.id === draggedItemId)
        const targetIndex = newItems.findIndex((i) => i.id === targetId)

        const [removed] = newItems.splice(draggedIndex, 1)
        newItems.splice(targetIndex, 0, removed)

        setItems(newItems)
        setDraggedItemId(null)
    }

    const activeItems = items.filter((i) => !i.completed)
    const completedItems = items.filter((i) => i.completed)

    const uniqueSupermarkets = items
        .map((i) => i.supermarket?.trim())
        .filter(Boolean)
        .reduce((acc, curr) => {
            if (!acc.some((s) => s.toLowerCase() === curr.toLowerCase())) {
                acc.push(curr)
            }
            return acc
        }, [])
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

    const itemsWithSupermarket = activeItems.filter((i) => i.supermarket)
    const itemsWithoutSupermarket = activeItems.filter((i) => !i.supermarket)

    const groupedActive = itemsWithSupermarket.reduce((acc, item) => {
        const smName = item.supermarket.trim()
        const key =
            Object.keys(acc).find(
                (k) => k.toLowerCase() === smName.toLowerCase(),
            ) || smName
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
    }, {})

    return (
        <div className="shopping-list-container">
            <form onSubmit={handleAddItem} className="shopping-list-form">
                <input
                    type="text"
                    placeholder="Item name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                />
                <select
                    value={selectedSupermarket}
                    onChange={(e) => setSelectedSupermarket(e.target.value)}
                    className="supermarket-select"
                >
                    <option value="">No Supermarket</option>
                    {uniqueSupermarkets.map((sm) => (
                        <option key={sm} value={sm}>
                            {sm}
                        </option>
                    ))}
                    <option value="NEW">-- Add New --</option>
                </select>
                {selectedSupermarket === 'NEW' && (
                    <input
                        type="text"
                        placeholder="New supermarket name"
                        value={newSupermarket}
                        onChange={(e) => setNewSupermarket(e.target.value)}
                    />
                )}
                <button type="submit">Add</button>
            </form>
            {loading && <p>Loading...</p>}

            {Object.keys(groupedActive)
                .sort()
                .map((sm) => (
                    <div key={sm} className="supermarket-group">
                        <h4 className="supermarket-name">{sm}</h4>
                        <ul className="shopping-list">
                            {groupedActive[sm].map((item) => (
                                <li
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) =>
                                        handleDragStart(e, item.id)
                                    }
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, item.id)}
                                    className="draggable-item"
                                >
                                    <span>{item.name}</span>
                                    <div className="item-actions">
                                        <button
                                            onClick={() =>
                                                handleToggleItem(item)
                                            }
                                        >
                                            ✓
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDeleteClick(item)
                                            }
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

            {itemsWithoutSupermarket.length > 0 && (
                <div className="supermarket-group no-assignment">
                    <h4 className="supermarket-name">General</h4>
                    <ul className="shopping-list">
                        {itemsWithoutSupermarket.map((item) => (
                            <li
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, item.id)}
                                className="draggable-item"
                            >
                                <span>{item.name}</span>
                                <div className="item-actions">
                                    <button
                                        onClick={() => handleToggleItem(item)}
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(item)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {completedItems.length > 0 && (
                <>
                    <h3>Completed</h3>
                    <ul className="shopping-list completed">
                        {completedItems.map((item) => (
                            <li key={item.id}>
                                <div className="item-actions">
                                    <button
                                        onClick={() => handleToggleItem(item)}
                                    >
                                        ↑
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(item)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                                <span>{item.name}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {showDeleteModal && (
                <Modal
                    title="Delete Item?"
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowDeleteModal(false)
                        setItemToDelete(null)
                    }}
                    confirmText="Delete"
                    cancelText="Cancel"
                >
                    Are you sure you want to delete "{itemToDelete?.name}"?
                </Modal>
            )}
        </div>
    )
}

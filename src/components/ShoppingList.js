import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import './ShoppingList.css'

export default function ShoppingList({ pantryId }) {
    const [items, setItems] = useState([])
    const [newItemName, setNewItemName] = useState('')
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)

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

        const { data, error } = await supabase
            .from('shopping_list')
            .insert([{ name: newItemName.trim(), pantry_id: pantryId }])
            .select()
            .single()

        if (error) {
            alert(error.message)
        } else if (data) {
            setItems((prevItems) => [...prevItems, data])
            setNewItemName('')
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

    const activeItems = items.filter((i) => !i.completed)
    const completedItems = items.filter((i) => i.completed)

    return (
        <div className="shopping-list-container">
            <form onSubmit={handleAddItem} className="shopping-list-form">
                <input
                    type="text"
                    placeholder="Add item to shopping list"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                />
                <button type="submit">Add</button>
            </form>
            {loading && <p>Loading...</p>}

            <ul className="shopping-list">
                {activeItems.map((item) => (
                    <li key={item.id}>
                        <span>{item.name}</span>
                        <div className="item-actions">
                            <button onClick={() => handleToggleItem(item)}>
                                ✓
                            </button>
                            <button onClick={() => handleDeleteClick(item)}>
                                🗑️
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

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

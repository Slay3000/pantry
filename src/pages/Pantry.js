import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import AddItemForm from '../components/AddItemForm'
import ItemList from '../components/ItemList'
import { subscribeToPush, isSubscribed } from '../utils/notifications'
import './Pantry.css'

export default function Pantry({ user }) {
    const [pantryId, setPantryId] = useState(null)
    const [items, setItems] = useState([])
    const [mode, setMode] = useState('add') // add | remove
    const [lastScanned, setLastScanned] = useState(null)
    const [activeTab, setActiveTab] = useState('actions') // actions | list
    const [subscribed, setSubscribed] = useState(false)
    useEffect(() => {
        async function loadPantry() {
            const { data } = await supabase
                .from('pantry_users')
                .select('pantry_id')
                .eq('user_id', user.id)
                .single()

            if (data) setPantryId(data.pantry_id)
        }
        loadPantry()
    }, [user.id])

    async function loadItems() {
        if (!pantryId) return

        const { data } = await supabase
            .from('pantry_items')
            .select('*')
            .eq('pantry_id', pantryId)
            .order('expiration_date', { ascending: true })

        if (data) setItems(data)
    }

    useEffect(() => {
        if (pantryId) loadItems()
    }, [pantryId])
    useEffect(() => {
        isSubscribed().then(setSubscribed)
    }, [])

    async function logout() {
        await supabase.auth.signOut()
    }

    async function handleRemoveByBarcode(barcode) {
        if (!barcode) return
        setLastScanned(barcode)

        const matches = items.filter((i) => i.barcode === barcode)
        if (matches.length === 0) {
            alert('No matching product found.')
            return
        }

        const first = matches[0]

        await supabase.from('pantry_items').delete().eq('id', first.id)
        loadItems()
    }

    async function handleDeleteItem(id) {
        await supabase.from('pantry_items').delete().eq('id', id)
        loadItems()
    }

    async function handleUpdateItem(id, updates) {
        await supabase.from('pantry_items').update(updates).eq('id', id)
        loadItems()
    }

    return (
        <div className="pantry-container">
            <div className="pantry-header">
                <h1>My Pantry</h1>
                {!subscribed && (
                    <button
                        className="enable-notify-btn"
                        onClick={() => subscribeToPush(user)}
                    >
                        🔔
                    </button>
                )}
                <button onClick={logout} className="logout-btn">
                    Logout
                </button>
            </div>

            <div className="pantry-tabs">
                <button
                    className={activeTab === 'actions' ? 'active' : ''}
                    onClick={() => setActiveTab('actions')}
                >
                    Add / Remove
                </button>
                <button
                    className={activeTab === 'list' ? 'active' : ''}
                    onClick={() => setActiveTab('list')}
                >
                    Pantry List
                </button>
            </div>

            {activeTab === 'actions' && (
                <div className="tab-section">
                    <div className="mode-toggle">
                        <button
                            onClick={() => setMode('add')}
                            className={
                                mode === 'add' ? 'mode-btn active' : 'mode-btn'
                            }
                        >
                            Add Mode
                        </button>

                        <button
                            onClick={() => setMode('remove')}
                            className={
                                mode === 'remove'
                                    ? 'mode-btn remove active'
                                    : 'mode-btn remove'
                            }
                        >
                            Remove Mode
                        </button>
                    </div>

                    <AddItemForm
                        pantryId={pantryId}
                        onItemAdded={loadItems}
                        mode={mode}
                        onRemoveBarcode={handleRemoveByBarcode}
                        lastRemoved={lastScanned}
                    />
                </div>
            )}

            {activeTab === 'list' && (
                <div className="tab-section">
                    <h2>Pantry Items</h2>
                    <ItemList
                        items={items}
                        mode={mode}
                        onSave={handleUpdateItem}
                        onDelete={handleDeleteItem}
                    />
                </div>
            )}
        </div>
    )
}

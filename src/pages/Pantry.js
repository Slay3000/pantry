import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import AddItemForm from '../components/AddItemForm'
import ItemList from '../components/ItemList'
import ShoppingList from '../components/ShoppingList'
import NotificationCenter from '../components/NotificationCenter'
import './Pantry.css'

export default function Pantry({ user }) {
    const [pantryId, setPantryId] = useState(null)
    const [items, setItems] = useState([])
    const [mode, setMode] = useState('add')
    const [lastScanned, setLastScanned] = useState(null)
    const [activeTab, setActiveTab] = useState('actions')
    const [searchTerm, setSearchTerm] = useState('')
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

    async function handleAddToShoppingList(itemName) {
        if (!itemName.trim() || !pantryId) return

        const { error } = await supabase
            .from('shopping_list')
            .insert([{ name: itemName.trim(), pantry_id: pantryId }])

        if (error) {
            alert(error.message)
        }
        // You could add a success notification here
    }

    const filteredItems = items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    return (
        <div className="pantry-container">
            <div className="pantry-header">
                <h1>My Pantry</h1>
                <NotificationCenter user={user} />
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
                <button
                    className={activeTab === 'shopping' ? 'active' : ''}
                    onClick={() => setActiveTab('shopping')}
                >
                    Shopping List
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
                    <div
                        style={{
                            display: 'flex',
                            gap: '10px',
                            marginBottom: '15px',
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                flexGrow: 1,
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                            }}
                        />
                    </div>
                    <ItemList
                        items={filteredItems}
                        mode={mode}
                        onSave={handleUpdateItem}
                        onDelete={handleDeleteItem}
                        onAddToShoppingList={handleAddToShoppingList}
                    />
                </div>
            )}

            {activeTab === 'shopping' && (
                <div className="tab-section">
                    <ShoppingList pantryId={pantryId} />
                </div>
            )}
        </div>
    )
}

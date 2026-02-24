import { useState } from 'react'

export default function EditItemForm({ item, onSave, onCancel }) {
    const [form, setForm] = useState({
        name: item.name,
        quantity: item.quantity,
        expiration_date: item.expiration_date,
    })

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    function handleSubmit(e) {
        e.preventDefault()
        onSave({ ...item, ...form })
    }

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                padding: 20,
                margin: '20px 0',
                border: '1px solid #ddd',
                borderRadius: 8,
            }}
        >
            <h3>Edit Item</h3>

            <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                style={{ display: 'block', marginBottom: 10 }}
            />

            <input
                name="quantity"
                type="number"
                value={form.quantity}
                onChange={handleChange}
                style={{ display: 'block', marginBottom: 10 }}
            />

            <input
                name="expiration_date"
                type="date"
                value={form.expiration_date}
                onChange={handleChange}
                style={{ display: 'block', marginBottom: 10 }}
            />

            <button type="submit">Save</button>
            <button type="button" onClick={onCancel} style={{ marginLeft: 10 }}>
                Cancel
            </button>
        </form>
    )
}

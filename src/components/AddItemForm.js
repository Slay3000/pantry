import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { uploadToImgBB } from '../utils/uploadToImgBB'
import BarcodeScanner from './BarcodeScanner'
import { lookupBarcode } from '../utils/barcodeLookup'
import { cleanCategory } from '../utils/cleanCategory'
import Modal from './Modal'
import './AddItemForm.css'

async function findProductInDB(barcode) {
    const { data, error } = await supabase
        .from('pantry_items')
        .select('name, image_url, category')
        .eq('barcode', barcode)
        .limit(1)

    if (error || !data || data.length === 0) return null
    return data[0]
}

export default function AddItemForm({
    pantryId,
    onItemAdded,
    mode,
    onRemoveBarcode,
    lastRemoved,
}) {
    const [name, setName] = useState('')
    const [unitsCount, setUnitsCount] = useState(1)
    const [expirationDates, setExpirationDates] = useState([''])
    const [image, setImage] = useState(null)
    const [imageUrlFromScan, setImageUrlFromScan] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [barcode, setBarcode] = useState('')
    const [imagePreview, setImagePreview] = useState(null)
    const [category, setCategory] = useState('')
    const [categories, setCategories] = useState([])
    const [newCategoryName, setNewCategoryName] = useState('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [addedName, setAddedName] = useState('')
    const [location, setLocation] = useState('pantry')
    // Auto-fill using existing DB OR external API
    useEffect(() => {
        if (barcode.length < 8) return

        const timeout = setTimeout(async () => {
            // 1) CHECK SUPABASE FIRST
            const localProduct = await findProductInDB(barcode)

            if (localProduct) {
                // Fill from your own database (FASTER & CONSISTENT)
                setName(localProduct.name || '')

                if (localProduct.image_url) {
                    setImageUrlFromScan(localProduct.image_url)
                    setImagePreview(localProduct.image_url)
                    setImage(null)
                }
                if (localProduct.category) {
                    const cleaned = cleanCategory(
                        localProduct.category,
                        categories.map((c) => c.name),
                    )
                    if (cleaned) setCategory(cleaned)
                }
                return
            }

            // 2) FALL BACK TO EXTERNAL API
            const product = await lookupBarcode(barcode)

            if (product) {
                if (product.name) setName(product.name)
                if (product.category) {
                    const cleaned = cleanCategory(
                        product.category,
                        categories.map((c) => c.name),
                    )
                    if (cleaned) setCategory(cleaned)
                }
                if (product.image) {
                    setImageUrlFromScan(product.image)
                    setImagePreview(product.image)
                    setImage(null)
                }
            }
        }, 500)

        return () => clearTimeout(timeout)
    }, [barcode])
    useEffect(() => {
        async function fetchCategories() {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name')

            if (data) setCategories(data)
        }
        fetchCategories()
    }, [])
    // Update number of expiration inputs
    function handleUnitsCountChange(value) {
        const count = parseInt(value, 10)
        setUnitsCount(count)

        const newExp = [...expirationDates]

        while (newExp.length < count) {
            // Auto-fill new fields with first date if available
            newExp.push(newExp[0] || '')
        }
        while (newExp.length > count) newExp.pop()

        setExpirationDates(newExp)
    }

    function handleExpirationChange(index, value) {
        const updated = [...expirationDates]
        updated[index] = value

        // UX improvement:
        // If the FIRST date is changed → fill all empty dates with same value
        if (index === 0 && value) {
            updated.forEach((d, i) => {
                if (i !== 0 && !d) updated[i] = value
            })
        }

        setExpirationDates(updated)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)

        // Determine final image URL
        let imageUrl = null
        let uploadResult = null

        if (imageUrlFromScan) {
            imageUrl = imageUrlFromScan
        } else if (image) {
            uploadResult = await uploadToImgBB(image)
            imageUrl = uploadResult?.url || null
        }

        // Insert each expiration as a separate pantry_items row
        for (const exp of expirationDates) {
            const itemRow = {
                pantry_id: pantryId,
                name,
                image_url: imageUrl,
                barcode,
                quantity: 1,
                expiration_date: exp || null,
                category: category || null,
                delete_url: uploadResult?.deleteUrl || null,
                image_id: uploadResult?.imageId || null,
                location,
            }

            const { error } = await supabase
                .from('pantry_items')
                .insert(itemRow)

            if (error) {
                alert(error.message)
                setLoading(false)
                return
            }
        }

        // Refresh parent list
        await onItemAdded()
        setAddedName(name)
        setShowSuccessModal(true)

        // Reset form completely
        setName('')
        setBarcode('')
        setUnitsCount(1)
        setExpirationDates([''])
        setImage(null)
        setImageUrlFromScan(null)
        setCategory('')
        setImagePreview(null)
        setShowScanner(false)
        setLocation('pantry')

        setLoading(false)
    }
    useEffect(() => {
        // If barcode is empty or changed significantly → reset name + image
        setName('')
        setImage(null)
        setImagePreview(null)
        setCategory('')
        setImageUrlFromScan(null)
        setLocation('pantry')
    }, [barcode])

    useEffect(() => {
        if (showSuccessModal) {
            const t = setTimeout(() => setShowSuccessModal(false), 3000)
            return () => clearTimeout(t)
        }
    }, [showSuccessModal])
    if (mode === 'remove') {
        return (
            <div>
                <h3>Remove Product</h3>

                {showScanner && (
                    <BarcodeScanner
                        onDetected={(code) => {
                            setShowScanner(false)
                            onRemoveBarcode(code)
                        }}
                    />
                )}

                <button
                    type="button"
                    className="action-btn"
                    onClick={() => setShowScanner(true)}
                >
                    Scan Barcode to Remove
                </button>

                {lastRemoved && <p>Removed: {lastRemoved}</p>}
            </div>
        )
    }

    return (
        <>
            <form className="add-form" onSubmit={handleSubmit}>
                <h3>Add New Pantry Item</h3>

                {/* Scanner modal */}
                {showScanner && (
                    <BarcodeScanner
                        onDetected={async (code) => {
                            setBarcode(code)
                            setShowScanner(false)
                            if (mode === 'remove') {
                                onRemoveBarcode(code) // call pantry function
                                return
                            }
                            const product = await lookupBarcode(code)

                            if (product) {
                                if (product.name) setName(product.name)
                                if (product.category) {
                                    const cleaned = cleanCategory(
                                        product.category,
                                        categories.map((c) => c.name),
                                    )
                                    if (cleaned) setCategory(cleaned)
                                }
                                if (product.image)
                                    setImageUrlFromScan(product.image)
                            }
                        }}
                    />
                )}

                <div>
                    <button
                        type="button"
                        className="action-btn"
                        onClick={() => setShowScanner(true)}
                    >
                        Scan Barcode
                    </button>
                </div>

                <label>Barcode (manual entry allowed):</label>
                <input
                    type="text"
                    value={barcode}
                    placeholder="Enter barcode manually"
                    onChange={(e) => setBarcode(e.target.value)}
                />

                <label>Name:</label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <label>Location:</label>
                <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                >
                    <option value="pantry">Pantry</option>
                    <option value="fridge">Fridge</option>
                    <option value="freezer">Freezer</option>
                </select>
                <label>Category:</label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <div>
                    <input
                        type="text"
                        placeholder="New category"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button
                        type="button"
                        className="action-btn"
                        onClick={async () => {
                            const trimmed = newCategoryName.trim()
                            if (!trimmed) return alert('Enter category name')

                            const { data, error } = await supabase
                                .from('categories')
                                .insert({ name: trimmed })
                                .select()
                                .single()

                            if (error) {
                                alert(error.message)
                                return
                            }

                            // add to dropdown list
                            setCategories((prev) => [...prev, data])

                            // auto‑select it
                            setCategory(data.name)

                            setNewCategoryName('')
                        }}
                    >
                        Add
                    </button>
                </div>
                {imagePreview && (
                    <div>
                        <img src={imagePreview} alt="Preview" />
                        <br />
                        <button
                            type="button"
                            className="action-btn"
                            onClick={() => {
                                setImage(null)
                                setImagePreview(null)
                                setImageUrlFromScan(null)
                            }}
                        >
                            Remove Image
                        </button>
                    </div>
                )}
                <label>Upload Image:</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files[0]
                        setImage(file)

                        if (file) {
                            const url = URL.createObjectURL(file)
                            setImagePreview(url)
                            setImageUrlFromScan(null) // remove scanned image
                        }
                    }}
                />

                <label>How many units?</label>
                <input
                    type="number"
                    min="1"
                    value={unitsCount}
                    onChange={(e) => handleUnitsCountChange(e.target.value)}
                />

                <h4>Expiration dates for each unit</h4>
                {expirationDates.map((exp, index) => (
                    <input
                        key={index}
                        type="date"
                        value={exp}
                        required
                        onChange={(e) =>
                            handleExpirationChange(index, e.target.value)
                        }
                    />
                ))}

                <button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Add Item'}
                </button>
            </form>
            {showSuccessModal && (
                <Modal
                    title="Success"
                    onCancel={() => setShowSuccessModal(false)}
                    cancelText="Close"
                >
                    Product <strong>{addedName}</strong> added!
                </Modal>
            )}
        </>
    )
}

export async function uploadToImgBB(file) {
    const apiKey = process.env.REACT_APP_IMGBB_API_KEY

    const formData = new FormData()
    formData.append('image', file)

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
    })

    const data = await res.json()

    if (!data.success) {
        throw new Error('Failed to upload image')
    }

    return {
        url: data.data.url,
        deleteUrl: data.data.delete_url,
        imageId: data.data.id,
    }
}

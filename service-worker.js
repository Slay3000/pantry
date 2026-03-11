self.addEventListener('push', (event) => {
    let data = {}

    try {
        data = event.data.json()
    } catch {
        data = { title: 'Notification', body: event.data.text() }
    }

    self.registration.showNotification(data.title || 'Pantry Update', {
        body: data.body || '',
        icon: '/icon.png', // Optional
        badge: '/icon.png',
        vibrate: [100, 50, 100],
        data: data,
    })
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    event.waitUntil(clients.openWindow('/'))
})

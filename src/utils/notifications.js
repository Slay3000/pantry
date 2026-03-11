import { supabase } from '../supabaseClient'

// Base64URL → Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map((ch) => ch.charCodeAt(0)))
}

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY

export async function subscribeToPush(user) {
    try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
            alert('Notifications blocked.')
            return
        }

        // WAIT for the existing registered SW!
        const registration = await navigator.serviceWorker.ready

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        await supabase.from('push_subscriptions').insert({
            user_id: user.id,
            subscription: subscription,
        })

        alert('Notifications enabled!')
    } catch (err) {
        console.error('Push subscription failed:', err)
        alert('Failed to enable notifications. Check console.')
    }
}

export async function isSubscribed() {
    if (!('serviceWorker' in navigator)) return false

    try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        return !!subscription
    } catch (err) {
        console.error('isSubscribed failed:', err)
        return false
    }
}

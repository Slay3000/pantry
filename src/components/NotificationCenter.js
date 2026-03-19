import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import './NotificationCenter.css'

export default function NotificationCenter({ user }) {
    const [notifications, setNotifications] = useState([])
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [toasts, setToasts] = useState([])

    const menuRef = useRef(null)

    // Fetch initial notifications
    useEffect(() => {
        async function fetchNotifications() {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (data) {
                setNotifications(data)
                setUnreadCount(data.filter((n) => !n.is_read).length)
            }
        }
        fetchNotifications()

        const showToast = (notification) => {
            const id = Date.now()
            setToasts((prev) => [...prev, { ...notification, id }])
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id))
            }, 5000) // Toast disappears after 5 seconds
        }
        // Subscribe to real-time additions (INSERT)
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setNotifications((prev) => [payload.new, ...prev])
                    setUnreadCount((prev) => prev + 1)
                    showToast(payload.new)

                    // Play notification sound
                    const audio = new Audio(
                        'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
                    )
                    audio.volume = 0.5
                    audio
                        .play()
                        .catch((e) => console.error('Audio play error:', e))
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user.id])

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () =>
            document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    async function markAsRead() {
        if (unreadCount === 0) return

        // Optimistic update
        setUnreadCount(0)
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
    }

    async function deleteNotification(id) {
        const notifToRemove = notifications.find((n) => n.id === id)
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        if (notifToRemove && !notifToRemove.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
        }

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)

        if (error) console.error('Error deleting notification:', error)
    }

    return (
        <>
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div key={toast.id} className="toast-item">
                        <strong>{toast.title}</strong>
                        <p>{toast.body}</p>
                    </div>
                ))}
            </div>
            <div className="notification-center" ref={menuRef}>
                <button
                    className="bell-btn"
                    onClick={() => {
                        setIsOpen(!isOpen)
                        if (!isOpen) markAsRead()
                    }}
                >
                    🔔
                    {unreadCount > 0 && (
                        <span className="badge">{unreadCount}</span>
                    )}
                </button>

                {isOpen && (
                    <div className="notification-dropdown">
                        {notifications.length === 0 ? (
                            <p className="empty-msg">No notifications</p>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className="notif-item"
                                    onClick={() => deleteNotification(n.id)}
                                >
                                    <strong>{n.title}</strong>
                                    <p>{n.body}</p>
                                    <span className="time">
                                        {new Date(
                                            n.created_at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </>
    )
}

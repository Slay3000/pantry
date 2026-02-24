import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Pantry from './pages/Pantry'

function App() {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    // Load stored session on startup
    useEffect(() => {
        async function loadSession() {
            const { data } = await supabase.auth.getSession()
            setSession(data.session)
            setLoading(false)
        }

        loadSession()

        // Listen for login/logout events
        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
            },
        )

        return () => listener.subscription.unsubscribe()
    }, [])

    if (loading) return <p>Loading...</p>

    return session ? <Pantry user={session.user} /> : <Login />
}

export default App

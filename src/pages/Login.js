import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    async function handleLogin(e) {
        e.preventDefault()

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            alert(error.message)
        }
    }

    return (
        <div style={{ padding: 20, maxWidth: 300 }}>
            <h2>Login</h2>

            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', marginBottom: 10, padding: 8 }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', marginBottom: 10, padding: 8 }}
                />

                <button
                    type="submit"
                    style={{ padding: 8, width: '100%', marginTop: 10 }}
                >
                    Login
                </button>
            </form>
        </div>
    )
}

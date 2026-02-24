import { useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

export default function BarcodeScanner({ onDetected }) {
    const videoRef = useRef(null)
    const readerRef = useRef(null)
    const detectedRef = useRef(false)
    const recentDetections = useRef([])

    useEffect(() => {
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        reader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
            if (!result || detectedRef.current) return

            const code = result.getText()

            // Keep last 5 readings
            recentDetections.current.push(code)
            if (recentDetections.current.length > 5) {
                recentDetections.current.shift()
            }

            // Check if SAME CODE detected at least 3 times
            const count = recentDetections.current.filter(
                (x) => x === code,
            ).length

            if (count >= 3) {
                detectedRef.current = true

                // Stop scanning immediately
                try {
                    reader.stopContinuousDecode?.()
                    reader.stopStreams?.()
                } catch (err) {
                    console.warn('Failed to stop scanner:', err)
                }

                onDetected(code)
            }
        })

        return () => {
            try {
                readerRef.current?.stopContinuousDecode?.()
                readerRef.current?.stopStreams?.()
            } catch (err) {
                console.warn('Cleanup failed:', err)
            }
        }
    }, [onDetected])

    return (
        <div>
            <h3>Scan Barcode</h3>
            <video
                ref={videoRef}
                style={{ width: '100%', maxWidth: 400, borderRadius: 8 }}
            />
        </div>
    )
}

import React from 'react'
import './Modal.css'

export default function Modal({
    title,
    children,
    onConfirm,
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancel',
}) {
    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                {title && <h3>{title}</h3>}

                <div className="modal-body">{children}</div>

                <div className="modal-actions">
                    {onCancel && (
                        <button className="modal-btn cancel" onClick={onCancel}>
                            {cancelText}
                        </button>
                    )}
                    {onConfirm && (
                        <button
                            className="modal-btn confirm"
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

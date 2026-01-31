// client/src/pages/AdminPage.jsx
import React, { useState } from 'react';
import { styles } from '../styles';

// Simple API helper for file upload
const uploadFile = async (file, category) => {
    const formData = new FormData();
    formData.append('category', category); // Must be before file for Multer to read body
    formData.append('file', file);

    const response = await fetch('http://localhost:5000/api/admin/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const errData = await response.json();
            errorMsg = errData.message || errData.error || response.statusText;
            if (errData.details) errorMsg += ` (${errData.details})`;
        } catch (e) {
            // Ignore json parse error
        }
        throw new Error(`Upload failed: ${errorMsg}`);
    }

    return response.json();
};

const triggerProcess = async () => {
    const response = await fetch('http://localhost:5000/api/admin/process', {
        method: 'POST'
    });

    // Process script might fail but return JSON with error, checking ok first
    if (!response.ok) {
        // Try to get error message
        try {
            const err = await response.json();
            throw new Error(err.details || err.error || 'Process failed');
        } catch (e) {
            throw new Error(`Process failed: ${response.statusText}`);
        }
    }

    return response.json();
};

function AdminPage() {
    const categories = [
        { id: 'superflex', label: 'Superflex Dynasty Rankings', desc: 'Upload .xlsx file' },
        { id: '1qb_dynasty', label: '1QB Dynasty Rankings', desc: 'Upload .xlsx file' },
        { id: 'redraft', label: 'Redraft Rankings', desc: 'Upload .xlsx file' }
    ];

    const [status, setStatus] = useState({});
    const [processLog, setProcessLog] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileUpload = async (e, category) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus(prev => ({ ...prev, [category]: 'Uploading...' }));

        try {
            await uploadFile(file, category);
            setStatus(prev => ({ ...prev, [category]: '✅ Uploaded' }));
        } catch (err) {
            console.error(err);
            setStatus(prev => ({ ...prev, [category]: `❌ Error: ${err.message}` }));
        }
    };

    const handleProcess = async () => {
        if (!window.confirm("This will trigger the Python server to re-process all data. The site might be slow for a few seconds. Continue?")) {
            return;
        }

        setIsProcessing(true);
        setProcessLog('Starting data processing...\n');

        try {
            const result = await triggerProcess();
            setProcessLog(prev => prev + result.output + '\n\n✅ DONE! Data updated.');
        } catch (err) {
            console.error(err);
            setProcessLog(prev => prev + `\n❌ FATAL ERROR: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={styles.pageContainer}>
            <h1 style={styles.h1}>Admin Dashboard</h1>
            <p style={styles.p}>Upload new ranking files here. The system will automatically detect the newest file in each category.</p>

            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '3rem' }}>
                {categories.map(cat => (
                    // Changed to use styles.landingCard (White background, light theme)
                    <div key={cat.id} style={{ ...styles.landingCard, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h3 style={{ ...styles.h2, fontSize: '1.5rem', margin: 0 }}>{cat.label}</h3>
                        <p style={{ ...styles.p, fontSize: '0.9rem', margin: 0 }}>{cat.desc}</p>

                        <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={(e) => handleFileUpload(e, cat.id)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: '#f1f3f5',
                                    borderRadius: '4px',
                                    border: '1px solid #dee2e6'
                                }}
                            />
                        </div>

                        <div style={{
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            minHeight: '24px',
                            color: status[cat.id]?.startsWith('✅') ? '#28a745' : status[cat.id]?.startsWith('❌') ? '#dc3545' : '#6c757d'
                        }}>
                            {status[cat.id] || 'No file uploaded yet'}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ borderTop: `2px solid #e9ecef`, paddingTop: '2rem' }}>
                <h2 style={styles.h2}>Process Data</h2>
                <p style={styles.p}>Once you have uploaded all necessary files, click below to update the app data.</p>

                <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    style={{
                        ...styles.button,
                        width: '100%',
                        padding: '1.5rem',
                        fontSize: '1.2rem',
                        background: isProcessing ? '#6c757d' : '#007bff',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        maxWidth: '400px'
                    }}
                >
                    {isProcessing ? 'Processing Data...' : 'Run Data Update Script'}
                </button>

                {processLog && (
                    <div style={{
                        marginTop: '2rem',
                        background: '#212529',
                        color: '#f8f9fa',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'Consolas, monospace',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        border: '1px solid #343a40'
                    }}>
                        {processLog}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminPage;

// client/src/styles.js

// --- Color Palette: Gray and Red Theme ---
const colors = {
    primary: '#c82333', // A strong red for interactive elements
    primaryMuted: 'rgba(200, 35, 51, 0.1)', // For hover states on tables
    background: '#f8f9fa', // A very light gray for the main background
    surface: '#ffffff', // White for cards, tables, etc.
    text: '#212529', // A dark, near-black for primary text
    textMuted: '#6c757d', // A softer gray for secondary text
    border: '#dee2e6', // A light gray for borders
    accent: '#5a6268', // A dark gray for highlighting values or secondary buttons
    error: '#dc3545', // A standard red for error messages
};

// --- Base Styles ---
export const styles = {
    // Main application container
    appContainer: {
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        minHeight: '100vh',
        lineHeight: 1.6,
    },
    // General page layout
    pageContainer: {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
    },
    // Headings
    h1: {
        fontSize: '2.5rem',
        color: colors.text,
        marginBottom: '1rem',
        borderBottom: `2px solid ${colors.primary}`,
        paddingBottom: '0.5rem',
    },
    h2: {
        fontSize: '2rem',
        color: colors.text,
        marginBottom: '1rem',
    },
    // Paragraphs and other text
    p: {
        color: colors.textMuted,
        marginBottom: '1rem',
    },
    // Links
    link: {
        color: colors.primary,
        textDecoration: 'none',
        fontWeight: 'bold',
    },
    // Buttons
    button: {
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: colors.primary,
        color: 'white',
        textDecoration: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
    },
    // Forms
    formContainer: {
        backgroundColor: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        border: `1px solid ${colors.border}`,
    },
    input: {
        padding: '10px',
        borderRadius: '5px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.background,
        color: colors.text,
        fontSize: '1rem',
    },
    // Tables
    tableContainer: {
        overflowX: 'auto', // Ensures table is scrollable on small screens
        backgroundColor: colors.surface,
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
    },
    table: {
        borderCollapse: 'collapse',
        width: '100%',
        whiteSpace: 'nowrap',
    },
    th: {
        borderBottom: `2px solid ${colors.border}`,
        padding: '12px 15px',
        textAlign: 'left',
        fontWeight: 'bold',
        color: colors.text,
        backgroundColor: colors.background,
    },
    td: {
        borderBottom: `1px solid ${colors.border}`,
        padding: '12px 15px',
        color: colors.textMuted,
    },
    trHover: {
        backgroundColor: colors.primaryMuted, // Style for hovering over table rows
    },
    // Style for a "checked" or "completed" table row
    trChecked: {
        backgroundColor: colors.text, // Use the dark text color for the background
        color: colors.surface, // Use the light surface color for the text
        textDecoration: 'line-through',
    },
    // Specific cell styles
    valueCell: {
        fontWeight: 'bold',
        color: colors.primary, // Use the primary red for emphasis
    },
    notesButton: {
        padding: '6px 12px',
        border: `1px solid ${colors.border}`,
        borderRadius: '4px',
        backgroundColor: colors.surface,
        color: colors.primary,
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    // Modal styles
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: colors.surface,
        padding: '30px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '80vh',
        overflowY: 'auto',
        position: 'relative',
        border: `1px solid ${colors.border}`,
    },
    modalBody: {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: colors.textMuted,
    },
    closeButton: {
        position: 'absolute',
        top: '15px',
        right: '15px',
        border: 'none',
        background: 'transparent',
        fontSize: '28px',
        color: colors.textMuted,
        cursor: 'pointer',
    },
    // Landing Page specific styles
    landingCard: {
        padding: '30px',
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        backgroundColor: colors.surface,
        textAlign: 'center',
        boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
    },
    // Utility classes
    errorText: {
        padding: '20px',
        color: colors.error,
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        border: `1px solid ${colors.error}`,
        borderRadius: '8px',
    },
};

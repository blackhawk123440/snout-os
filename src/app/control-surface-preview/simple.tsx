/**
 * Simple diagnostic version - minimal to test routing
 */

export default function SimplePreview() {
  return (
    <div style={{ 
      padding: '40px', 
      backgroundColor: '#ff0000',  // Red so it's obvious if it renders
      color: '#ffffff', 
      minHeight: '100vh',
      fontSize: '24px'
    }}>
      <h1>✅ Simple Test Page Works!</h1>
      <p>If you see this red background, routing works.</p>
      <p>Now check the main preview page again.</p>
    </div>
  );
}


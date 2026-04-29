import React, { useState } from 'react';

const BackendSelector = () => {
  const [selected, setSelected] = useState(
    localStorage.getItem("selectedBackend") || "fastapi"
  );

  const backends = [
    { id: "fastapi", name: "FastAPI", desc: "Python High Performance", icon: "⚡" },
    { id: "nodejs", name: "Node.js", desc: "Event-driven Runtime", icon: "🟢" },
    { id: "django", name: "Django", desc: "Python Full-Stack", icon: "🎸" },
    { id: "dotnet", name: ".NET Core", desc: "Enterprise WebAPI", icon: "🔷" },
  ];

  const handleSelect = (id) => {
    localStorage.setItem("selectedBackend", id);
    setSelected(id);
    window.location.reload();
  };

  return (
    <div style={styles.headerWrapper}>
      <div style={styles.container}>
        <div style={styles.brand}>
          <span style={styles.brandText}>NETWORK<span style={styles.blueText}>ROUTING</span></span>
        </div>
        
        <div style={styles.cardContainer}>
          {backends.map((b) => (
            <div 
              key={b.id} 
              onClick={() => handleSelect(b.id)}
              style={{
                ...styles.card,
                ...(selected === b.id ? styles.activeCard : {})
              }}
            >
              <div style={styles.icon}>{b.icon}</div>
              <div>
                <div style={styles.cardTitle}>{b.name}</div>
                <div style={styles.cardDesc}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  headerWrapper: {
    background: '#050505',
    borderBottom: '1px solid #1a1a1a',
    padding: '15px 0',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    zIndex: 1000,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: '18px',
    fontWeight: '900',
    color: '#fff',
    letterSpacing: '2px',
  },
  blueText: {
    color: '#00d2ff',
  },
  cardContainer: {
    display: 'flex',
    gap: '15px',
  },
  card: {
    background: '#111',
    border: '1px solid #222',
    borderRadius: '10px',
    padding: '10px 15px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    minWidth: '160px',
  },
  activeCard: {
    background: 'linear-gradient(145deg, #0f0c29, #302b63)',
    borderColor: '#00d2ff',
    boxShadow: '0 0 15px rgba(0, 210, 255, 0.4)',
    transform: 'translateY(-2px)',
  },
  icon: { fontSize: '20px' },
  cardTitle: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  cardDesc: {
    color: '#666',
    fontSize: '10px',
    textTransform: 'uppercase',
  }
};

export default BackendSelector;
"use client";

const ORDER = ['All', 'Web', 'Crypto', 'Reverse', 'Forensics', 'Stegano', 'OSINT', 'Pwn', 'Misc'];

export default function CategoryTabs({ value = 'All', counts = {}, onChange }) {
  return (
    <div className="category-tabs">
      {ORDER.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`tab-pill ${value === tab ? 'tab-pill-active' : ''}`}
          onClick={() => onChange?.(tab)}
        >
          <span>{tab}</span>
          <span className="tab-count">{counts[tab] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

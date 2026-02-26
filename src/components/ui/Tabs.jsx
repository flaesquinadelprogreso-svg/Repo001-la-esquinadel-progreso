import React from 'react';

export default function Tabs({ tabs, active, onChange }) {
    return (
        <div className="flex border-b border-border">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px cursor-pointer transition-all duration-150 ${active === tab.id ? 'border-navy text-navy' : 'border-transparent text-txt-secondary hover:text-txt hover:border-border'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

import React, { useState, useMemo } from 'react';
import type { CSGOInventoryItem, InventoryItem, CSGOItemRarity } from '../types.ts';

const RARITY_COLORS: Record<CSGOItemRarity, string> = {
    'Mil-Spec': '#3b82f6', 'Restricted': '#8b5cf6', 'Classified': '#ec4899',
    'Covert': '#ef4444', 'Contraband': '#f97316', 'Extraordinary': '#f59e0b',
    'Consumer': '#d1d5db', 'Industrial': '#60a5fa',
};

interface CSGOItemCardProps {
    item: CSGOInventoryItem;
    onSell: (instanceId: string, price: number) => void;
}
const CSGOItemCard: React.FC<CSGOItemCardProps> = ({ item, onSell }) => (
    <div className="inventory-item-card relative" style={{'--rarity-color': RARITY_COLORS[item.rarity]} as React.CSSProperties}>
        <div className="h-24 flex items-center justify-center p-2">
            <img src={item.imageUrl} alt={item.skin} className={`max-w-full max-h-full object-contain rarity-glow-${item.rarity}`} />
        </div>
        <div className="mt-2 text-center">
            <p className="text-xs text-gray-300 truncate">{item.weapon}</p>
            <p className={`text-xs font-bold text-rarity-${item.rarity} truncate`}>{item.skin}</p>
            <p className="text-sm font-bold text-green-400 mt-1">${item.price.toFixed(2)}</p>
        </div>
        <button onClick={() => onSell(item.instanceId, item.price)} className="w-full mt-2 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs font-bold">Sell</button>
    </div>
);

interface MysteryItemCardProps {
    item: InventoryItem;
    onSell: (itemId: number, price: number) => void;
}
const MysteryItemCard: React.FC<MysteryItemCardProps> = ({ item, onSell }) => (
     <div className="inventory-item-card relative">
        {item.quantity > 1 && <div className="absolute top-1 right-1 text-xs font-bold bg-purple-600/80 text-white rounded-full w-5 h-5 flex items-center justify-center z-10">x{item.quantity}</div>}
        <div className="h-24 flex items-center justify-center p-2">
            <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
        </div>
        <div className="mt-2 text-center">
            <p className="text-xs text-gray-300 truncate">{item.brand}</p>
            <p className="text-xs font-bold text-white truncate h-8">{item.name}</p>
            <p className="text-sm font-bold text-green-400 mt-1">${item.price.toFixed(2)}</p>
        </div>
        <button onClick={() => onSell(item.id, item.price)} className="w-full mt-2 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs font-bold">Sell</button>
    </div>
);


interface InventoryPageProps {
    csgoInventory: CSGOInventoryItem[];
    mysteryBoxInventory: InventoryItem[];
    sellFromCsgoInventory: (instanceId: string, price: number) => void;
    sellFromMysteryBoxInventory: (itemId: number, price: number) => void;
}

type Tab = 'csgo' | 'mystery';

const InventoryPage: React.FC<InventoryPageProps> = ({ csgoInventory, mysteryBoxInventory, sellFromCsgoInventory, sellFromMysteryBoxInventory }) => {
    const [activeTab, setActiveTab] = useState<Tab>('csgo');

    const csgoTotalValue = useMemo(() => csgoInventory.reduce((sum, item) => sum + item.price, 0), [csgoInventory]);
    const mysteryTotalValue = useMemo(() => mysteryBoxInventory.reduce((sum, item) => sum + (item.price * item.quantity), 0), [mysteryBoxInventory]);

    return (
        <div className="inventory-page min-h-screen">
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <nav className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 mb-6 bg-slate-800/80 backdrop-blur-sm">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-700">
                        <div className="-mb-px flex space-x-6">
                            <button onClick={() => setActiveTab('csgo')} className={`inventory-tab ${activeTab === 'csgo' ? 'active' : ''}`}>
                                CS:GO Skins ({csgoInventory.length}) - ${csgoTotalValue.toFixed(2)}
                            </button>
                            <button onClick={() => setActiveTab('mystery')} className={`inventory-tab ${activeTab === 'mystery' ? 'active' : ''}`}>
                                Mystery Items ({mysteryBoxInventory.reduce((sum, item) => sum + item.quantity, 0)}) - ${mysteryTotalValue.toFixed(2)}
                            </button>
                        </div>
                    </div>
                </nav>

                {activeTab === 'csgo' && (
                    csgoInventory.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
                            {csgoInventory.map(item => <CSGOItemCard key={item.instanceId} item={item} onSell={sellFromCsgoInventory} />)}
                        </div>
                    ) : <p className="text-center text-slate-400 py-12">Your CS:GO inventory is empty.</p>
                )}

                {activeTab === 'mystery' && (
                     mysteryBoxInventory.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
                            {mysteryBoxInventory.map(item => <MysteryItemCard key={`${item.id}-${item.quantity}`} item={item} onSell={sellFromMysteryBoxInventory} />)}
                        </div>
                    ) : <p className="text-center text-slate-400 py-12">Your Mystery Box inventory is empty.</p>
                )}
            </main>
        </div>
    );
};

export default InventoryPage;
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Page } from '../../../App.tsx';
import { useAuth } from '../../../contexts/AuthContext.tsx';
import { allCSGOCases } from './data.ts';
import type { CSGOItem, CSGOInventoryItem, CSGOItemRarity } from '../../../types.ts';
import CheckIcon from '../../icons/CheckIcon.tsx';
import { useSound } from '../../../hooks/useSound.ts';
import useAnimatedBalance from '../../../hooks/useAnimatedBalance.tsx';
import PlusIcon from '../../icons/PlusIcon.tsx';
import RefreshCwIcon from '../../icons/RefreshCwIcon.tsx';

const RARITY_COLORS: Record<CSGOItemRarity, string> = {
    'Mil-Spec': '#3b82f6', 'Restricted': '#8b5cf6', 'Classified': '#ec4899',
    'Covert': '#ef4444', 'Contraband': '#f97316', 'Extraordinary': '#f59e0b',
    'Consumer': '#d1d5db', 'Industrial': '#60a5fa',
};

const getChanceLabel = (chance: number): { text: string; color: string } => {
    if (chance >= 95) return { text: "Guaranteed", color: 'text-green-400' };
    if (chance > 80) return { text: "Very High", color: 'text-green-300' };
    if (chance > 60) return { text: "High", color: 'text-yellow-300' };
    if (chance > 40) return { text: "Medium", color: 'text-orange-400' };
    if (chance > 20) return { text: "Low", color: 'text-red-400' };
    return { text: "Very Low", color: 'text-red-500' };
};

const SkinCard: React.FC<{ item: CSGOItem | CSGOInventoryItem; onSelect: () => void; isSelected: boolean; isDisabled?: boolean; }> = ({ item, onSelect, isSelected, isDisabled }) => (
    <div
        onClick={isDisabled ? undefined : onSelect}
        className={`upgrader-v6-item-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
    >
        {isSelected && <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center z-10"><CheckIcon className="w-3 h-3 text-white" /></div>}
        <div className="upgrader-v6-item-image">
             <img src={item.imageUrl} alt={item.skin} className={`rarity-glow-${item.rarity}`} />
        </div>
        <p className="upgrader-v6-item-price">${item.price.toFixed(2)}</p>
    </div>
);

interface CSGOUpgraderProps {
  setPage: (page: Page) => void;
  inventory: CSGOInventoryItem[];
  addToInventory: (items: CSGOItem[]) => void;
  removeFromInventory: (instanceIds: string[]) => void;
}

const CSGOUpgrader: React.FC<CSGOUpgraderProps> = ({ setPage, inventory, addToInventory, removeFromInventory }) => {
    const { profile, adjustBalance } = useAuth();
    const animatedBalance = useAnimatedBalance(profile?.balance ?? 0);
    const { playSound } = useSound();
    
    const allSkins = useMemo(() => Array.from(new Map(allCSGOCases.flatMap(c => c.items).map(item => [item.id, item])).values()).sort((a, b) => a.price - b.price), []);
    
    const [selectedUserItems, setSelectedUserItems] = useState<CSGOInventoryItem[]>([]);
    const [selectedTargetItem, setSelectedTargetItem] = useState<CSGOItem | null>(null);
    const [gameState, setGameState] = useState<'idle' | 'upgrading' | 'success' | 'failure'>('idle');
    const [arrowPosition, setArrowPosition] = useState(0);
    const [search, setSearch] = useState('');
    
    const totalUserValue = useMemo(() => selectedUserItems.reduce((sum, item) => sum + item.price, 0), [selectedUserItems]);
    
    useEffect(() => { setSelectedTargetItem(null); }, [selectedUserItems]);

    const { chance, chanceLabel } = useMemo(() => {
        if (!selectedTargetItem || totalUserValue <= 0) return { chance: 0, chanceLabel: { text: 'N/A', color: 'text-slate-400' } };
        const calculatedChance = Math.min(95, (totalUserValue / selectedTargetItem.price) * 95);
        return { chance: calculatedChance, chanceLabel: getChanceLabel(calculatedChance) };
    }, [selectedTargetItem, totalUserValue]);
    
    const handleUserItemSelect = (item: CSGOInventoryItem) => {
        if (gameState !== 'idle') return;
        setSelectedUserItems(prev => {
            const isSelected = prev.some(i => i.instanceId === item.instanceId);
            if(isSelected) return prev.filter(i => i.instanceId !== item.instanceId);
            if (prev.length >= 4) return prev; // Max 4 items
            return [...prev, item];
        });
    };
    
    const resetGame = useCallback(() => {
        setSelectedUserItems([]); setSelectedTargetItem(null); setGameState('idle'); setArrowPosition(0);
    }, []);

    const handleUpgrade = async () => {
        if (gameState !== 'idle' || selectedUserItems.length === 0 || !selectedTargetItem) return;
        setGameState('upgrading');
        playSound('bet');

        removeFromInventory(selectedUserItems.map(i => i.instanceId));
        const isWin = Math.random() * 100 < chance;
        
        // Random position within the win/loss zone
        const winZoneEnd = chance;
        const targetPosition = isWin 
            ? Math.random() * (winZoneEnd * 0.95) // Land somewhere within 95% of the win zone
            : winZoneEnd + (Math.random() * (100 - winZoneEnd) * 0.95); // Land somewhere within 95% of the loss zone

        setArrowPosition(targetPosition);
        
        setTimeout(() => {
            setGameState(isWin ? 'success' : 'failure');
            playSound(isWin ? 'win' : 'lose');
            if (isWin) {
                addToInventory([{...selectedTargetItem, id: `upgraded-${selectedTargetItem.id}-${Date.now()}` }]);
            }
        }, 6100);
    };

    const targetableSkins = useMemo(() => {
        return allSkins.filter(skin => 
            skin.price > totalUserValue * 1.05 && 
            (`${skin.weapon} | ${skin.skin}`).toLowerCase().includes(search.toLowerCase())
        );
    }, [allSkins, totalUserValue, search]);

    return (
        <div className="csgo-page upgrader-v6-wrapper">
            <div className="csgo-sub-nav sticky top-16 z-20">
                <div className="container mx-auto flex items-center justify-between">
                     <div className="flex items-center">
                        <button className="csgo-sub-nav-item" onClick={() => setPage({ name: 'csgo-lobby' })}>Cases</button>
                        <button className="csgo-sub-nav-item active">Upgrader</button>
                        <button className="csgo-sub-nav-item" onClick={() => setPage({ name: 'csgo-battles-lobby' })}>Case Battles</button>
                    </div>
                     {profile && (
                        <div className="flex items-center bg-black/30 rounded-md px-4 py-1">
                            <span className="text-base font-bold text-white">{animatedBalance.toFixed(2)}</span>
                            <span className="text-sm text-gray-400 ml-2">EUR</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="upgrader-v6-main">
                <div className="upgrader-v6-panel">
                    <div className="upgrader-v6-panel-header flex justify-between items-center">
                        <h3 className="font-bold">Your Inventory (${totalUserValue.toFixed(2)})</h3>
                        {selectedUserItems.length > 0 && <button onClick={() => setSelectedUserItems([])} className="text-xs text-slate-400 hover:text-white">Clear</button>}
                    </div>
                    <div className="upgrader-v6-item-grid">
                        {inventory.map(item => <SkinCard key={item.instanceId} item={item} onSelect={() => handleUserItemSelect(item)} isSelected={selectedUserItems.some(i => i.instanceId === item.instanceId)} /> )}
                        {inventory.length === 0 && <p className="text-sm text-center text-slate-500 col-span-full">Your inventory is empty.</p>}
                    </div>
                </div>

                <div className="upgrader-v6-panel">
                    <div className="upgrade-core">
                        <div className="upgrade-slots-container">
                             <div className="upgrade-slot">
                                {selectedUserItems.length > 0 ? <img src={selectedUserItems[0].imageUrl} alt={selectedUserItems[0].skin} className="upgrade-slot-item-image"/> : <span className="text-xs text-slate-500">Your Item(s)</span>}
                             </div>
                             <PlusIcon className="upgrade-arrow-icon"/>
                             <div className="upgrade-slot">
                                 {selectedTargetItem ? <img src={selectedTargetItem.imageUrl} alt={selectedTargetItem.skin} className="upgrade-slot-item-image"/> : <span className="text-xs text-slate-500">Target Item</span>}
                             </div>
                        </div>
                        
                        <div className="upgrade-animation-area">
                             {gameState !== 'idle' && (
                                <div className="upgrade-arrow" style={{left: `${arrowPosition}%`}}><div className="w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-yellow-400"></div></div>
                            )}
                            <p className={`upgrade-chance-text font-bold ${chanceLabel.color}`}>{chance.toFixed(2)}%</p>
                            <div className="upgrade-bar-bg">
                                <div className="upgrade-success-zone" style={{width: `${chance}%`}}></div>
                            </div>
                        </div>

                        <button onClick={handleUpgrade} disabled={gameState !== 'idle' || selectedUserItems.length === 0 || !selectedTargetItem} className="px-12 py-3 text-xl font-bold bg-purple-600 hover:bg-purple-700 rounded-md text-white transition-all disabled:bg-slate-700 disabled:cursor-not-allowed">
                            Upgrade
                        </button>
                    </div>

                    <div className="upgrader-v6-panel-header flex items-center gap-4">
                        <h3 className="font-bold">Choose Target</h3>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skin..." className="filter-input text-sm" />
                    </div>
                    <div className="upgrader-v6-item-grid">
                       {targetableSkins.map(item => <SkinCard key={item.id} item={item} onSelect={() => gameState === 'idle' && setSelectedTargetItem(item)} isSelected={selectedTargetItem?.id === item.id} isDisabled={selectedUserItems.length === 0} /> )}
                       {selectedUserItems.length > 0 && targetableSkins.length === 0 && <p className="text-sm text-center text-slate-500 col-span-full">No available upgrades for this value.</p>}
                       {selectedUserItems.length === 0 && <p className="text-sm text-center text-slate-500 col-span-full">Select items from your inventory first.</p>}
                    </div>

                    {(gameState === 'success' || gameState === 'failure') && (
                        <div className="upgrade-result-overlay">
                            <h2 className={`upgrade-result-text ${gameState === 'success' ? 'text-green-400' : 'text-red-500'}`}>{gameState === 'success' ? 'Upgrade Successful!' : 'Upgrade Failed'}</h2>
                            {gameState === 'success' && selectedTargetItem && (
                                <div className="upgrade-result-item upgrade-slot" style={{'--rarity-color': RARITY_COLORS[selectedTargetItem.rarity]} as React.CSSProperties}>
                                    <img src={selectedTargetItem.imageUrl} alt={selectedTargetItem.skin} className="upgrade-slot-item-image"/>
                                    <p className="font-bold text-green-400">${selectedTargetItem.price.toFixed(2)}</p>
                                </div>
                            )}
                            <button onClick={resetGame} className="px-8 py-3 bg-slate-600 hover:bg-slate-500 rounded-md font-bold flex items-center gap-2"><RefreshCwIcon className="w-5 h-5"/>Try Again</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CSGOUpgrader;
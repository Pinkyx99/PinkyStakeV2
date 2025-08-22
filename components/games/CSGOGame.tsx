import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Page } from '../../App.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import useAnimatedBalance from '../../hooks/useAnimatedBalance.tsx';
import type { CSGOCase, CSGOItem, CSGOItemRarity } from '../../types.ts';
import { useSound } from '../../hooks/useSound.ts';
import CloseIcon from '../icons/CloseIcon.tsx';

const RARITY_COLORS: Record<CSGOItemRarity, string> = {
    'Mil-Spec': '#3b82f6', 'Restricted': '#8b5cf6', 'Classified': '#ec4899',
    'Covert': '#ef4444', 'Contraband': '#f97316', 'Extraordinary': '#f59e0b',
    'Consumer': '#d1d5db', 'Industrial': '#60a5fa',
};

const shuffle = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// --- START: Self-contained Animation Component ---
const CSGOUnboxingAnimation: React.FC<{
    caseData: CSGOCase;
    winningItem: CSGOItem;
    onAnimationEnd: (item: CSGOItem) => void;
}> = ({ caseData, winningItem, onAnimationEnd }) => {
    const reelRef = useRef<HTMLDivElement>(null);
    const itemCardRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ transition: 'none', transform: 'translateX(0px)', opacity: 0 });
    const { playSound } = useSound();
    const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { reelItems, winnerIndex, baseReelLength } = useMemo(() => {
        const BASE_REEL_LENGTH = 100;
        const allOtherItems = caseData.items.filter(i => i.id !== winningItem.id);
        let baseReel: CSGOItem[] = [];
        if (allOtherItems.length > 0) {
            while (baseReel.length < BASE_REEL_LENGTH) {
                baseReel.push(...shuffle(allOtherItems));
            }
        } else {
            baseReel = Array(BASE_REEL_LENGTH).fill(winningItem);
        }
        baseReel = baseReel.slice(0, BASE_REEL_LENGTH);
        const winnerPosInBase = 80;
        baseReel[winnerPosInBase] = winningItem;
        const displayReel = [...baseReel, ...baseReel, ...baseReel, ...baseReel];
        const finalWinnerIndex = (BASE_REEL_LENGTH * 2) + winnerPosInBase;
        return { reelItems: displayReel, winnerIndex: finalWinnerIndex, baseReelLength: BASE_REEL_LENGTH };
    }, [caseData.items, winningItem]);

    useEffect(() => {
        const startTimeout = setTimeout(() => {
            const reelElement = reelRef.current;
            const cardElement = itemCardRef.current;
            if (!reelElement || !cardElement) return;

            const computedStyle = getComputedStyle(reelElement);
            const gap = parseFloat(computedStyle.gap);
            const cardWidth = cardElement.offsetWidth;
            const itemWidth = cardWidth + gap;
            const containerWidth = window.innerWidth;
            const animationDuration = 7000;

            const finalPosition = (winnerIndex * itemWidth) + (cardWidth / 2) - (containerWidth / 2);
            const finalOffset = -finalPosition;
            const startWinnerIndex = winnerIndex - baseReelLength;
            const startPosition = (startWinnerIndex * itemWidth) + (cardWidth / 2) - (containerWidth / 2);
            const startOffset = -startPosition;

            setStyle({ transform: `translateX(${startOffset}px)`, transition: 'none', opacity: 1 });

            const startTime = performance.now();
            const playTickingSound = () => {
                const elapsedTime = performance.now() - startTime;
                if (elapsedTime >= animationDuration) { if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current); return; }
                playSound('csgo_spinner_tick_v2');
                const progress = elapsedTime / animationDuration;
                const nextInterval = 80 + (420 * progress);
                soundTimeoutRef.current = setTimeout(playTickingSound, nextInterval);
            };
            playTickingSound();
            
            requestAnimationFrame(() => {
                setStyle({ transform: `translateX(${finalOffset}px)`, transition: `transform ${animationDuration}ms cubic-bezier(0.25, 1, 0.5, 1)`, opacity: 1 });
            });
            setTimeout(() => onAnimationEnd(winningItem), animationDuration);
        }, 50);

        return () => { clearTimeout(startTimeout); if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current); };
    }, [reelItems, winnerIndex, baseReelLength, playSound, onAnimationEnd, winningItem]);

    return (
        <div className="csgo-unboxing-container">
            <div className="csgo-unboxing-marker"></div>
            <div className="csgo-unboxing-reel-wrapper">
                <div ref={reelRef} className="csgo-unboxing-reel" style={style}>
                    {reelItems.map((item, index) => (
                        <div key={`${item.id}-${index}`} ref={index === 0 ? itemCardRef : null} className="csgo-unboxing-item-card" style={{'--rarity-color': RARITY_COLORS[item.rarity]} as React.CSSProperties}>
                           <img src={item.imageUrl} alt={item.skin} className={`csgo-unboxing-item-card-image rarity-glow-${item.rarity}`}/>
                           <div className="csgo-unboxing-item-card-name text-center">
                                <p className={`text-rarity-${item.rarity}`}>{item.skin}</p>
                                <p className="text-slate-400">{item.weapon}</p>
                           </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
// --- END: Self-contained Animation Component ---


// --- START: Self-contained Win Modals ---
const CSGOWinModal: React.FC<{ item: CSGOItem; onClose: () => void; addToCsgoInventory: (items: CSGOItem[]) => void; adjustBalance: (amount: number) => Promise<void> }> = ({ item, onClose, addToCsgoInventory, adjustBalance }) => {
    const { playSound } = useSound();
    const handleSell = () => { playSound('cashout'); adjustBalance(item.price); onClose(); };
    const handleKeep = () => { playSound('click'); addToCsgoInventory([item]); onClose(); };

    return (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center font-poppins animate-win-item-modal-fade-in" onClick={onClose}>
            <div className="bg-slate-900/90 border border-slate-700 w-full max-w-sm rounded-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-yellow-400">You Won!</h2>
                <div className="my-6 flex flex-col items-center">
                    <div className="w-48 h-48 p-4 bg-slate-800 rounded-lg flex items-center justify-center">
                        <img src={item.imageUrl} alt={item.skin} className={`max-w-full max-h-full object-contain rarity-glow-${item.rarity}`} />
                    </div>
                    <p className={`text-xl font-semibold text-rarity-${item.rarity} mt-4`}>{item.skin}</p>
                    <p className="text-lg text-white">{item.weapon}</p>
                    <p className="text-lg font-bold text-green-400">${item.price.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleKeep} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors">Keep Item</button>
                    <button onClick={handleSell} className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors">Sell for ${item.price.toFixed(2)}</button>
                </div>
            </div>
        </div>
    );
};

const MultiWinCSGOModal: React.FC<{ items: CSGOItem[], onClose: () => void, addToCsgoInventory: (items: CSGOItem[]) => void, adjustBalance: (amount: number) => Promise<void> }> = ({ items, onClose, addToCsgoInventory, adjustBalance }) => {
    const { playSound } = useSound();
    const totalValue = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items]);
    const handleSellAll = () => { playSound('cashout'); adjustBalance(totalValue); onClose(); };
    const handleKeepAll = () => { playSound('click'); addToCsgoInventory(items); onClose(); };

    return (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center font-poppins p-4" onClick={onClose}>
            <div className="bg-slate-900/90 border border-slate-700 w-full max-w-4xl h-auto max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-multi-win-fade-in" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700 text-center relative"><h2 className="text-2xl font-bold text-yellow-400">You Won {items.length} Item{items.length > 1 ? 's' : ''}!</h2><p className="text-sm text-gray-400">Total Value: ${totalValue.toFixed(2)}</p><button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6"/></button></header>
                <main className="flex-grow overflow-y-auto p-4"><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{items.map((item, index) => (<div key={`${item.id}-${index}`} className="case-item-card-v2" style={{'--rarity-color': RARITY_COLORS[item.rarity]} as React.CSSProperties}><div className="h-28 flex items-center justify-center p-2"><img src={item.imageUrl} alt={item.skin} className={`max-w-full max-h-full object-contain rarity-glow-${item.rarity}`}/></div><div className="mt-auto text-center"><p className="text-sm text-gray-300 truncate">{item.weapon}</p><p className={`text-sm font-bold text-rarity-${item.rarity} truncate`}>{item.skin}</p></div></div>))}</div></main>
                <footer className="p-4 border-t border-slate-700 grid grid-cols-2 gap-4"><button onClick={handleKeepAll} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors">Keep All</button><button onClick={handleSellAll} className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors">Sell All for ${totalValue.toFixed(2)}</button></footer>
            </div>
        </div>
    );
};
// --- END: Self-contained Win Modals ---

interface CSGOGameProps { setPage: (page: Page) => void; case: CSGOCase; addToCsgoInventory: (items: CSGOItem[]) => void; }

const CSGOGame: React.FC<CSGOGameProps> = ({ setPage, case: currentCase, addToCsgoInventory }) => {
    const { profile, adjustBalance } = useAuth();
    const animatedBalance = useAnimatedBalance(profile?.balance ?? 0);
    const { playSound } = useSound();
    const isMounted = useRef(true);
    
    const [caseCount, setCaseCount] = useState(1);
    const [isSpinning, setIsSpinning] = useState(false);
    const [quickSpin, setQuickSpin] = useState(false);
    
    const [isUnboxing, setIsUnboxing] = useState(false);
    const [winningItem, setWinningItem] = useState<CSGOItem | null>(null);
    const [showWinModal, setShowWinModal] = useState(false);
    
    const [multiWonItems, setMultiWonItems] = useState<CSGOItem[] | null>(null);

    useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

    const pickWinningItem = useCallback((): CSGOItem => {
        let random = Math.random() * 100;
        for (const item of currentCase.items) { if (random < item.odds) return item; random -= item.odds; }
        return currentCase.items[currentCase.items.length - 1];
    }, [currentCase.items]);

    const handleSpin = useCallback(async (isDemo: boolean) => {
        const totalCost = currentCase.price * caseCount;
        if (isSpinning || (!isDemo && (!profile || profile.balance < totalCost))) return;

        if (!isDemo) { await adjustBalance(-totalCost); if (!isMounted.current) return; }
        
        playSound('bet');
        setIsSpinning(true);

        if (caseCount > 1 || quickSpin) {
            const winners = Array.from({ length: caseCount }, () => pickWinningItem());
            if (isDemo) { playSound('click'); setIsSpinning(false); } 
            else { setMultiWonItems(winners); playSound('win'); }
        } else {
            const winner = pickWinningItem();
            setWinningItem(winner);
            setIsUnboxing(true);
        }
    }, [profile, caseCount, currentCase, isSpinning, adjustBalance, playSound, pickWinningItem, quickSpin]);
    
    const handleAnimationEnd = useCallback((item: CSGOItem) => {
        if (!isMounted.current) return;
        setIsUnboxing(false);
        setWinningItem(item);
        setShowWinModal(true);
        playSound('win');
    }, [playSound]);

    const handleWinModalClose = () => {
        setShowWinModal(false);
        setWinningItem(null);
        setIsSpinning(false);
    };

    const handleMultiWinModalClose = () => {
        setMultiWonItems(null);
        setIsSpinning(false);
    };
    
    const sortedCaseItems = useMemo(() => [...currentCase.items].sort((a,b) => b.price - a.price), [currentCase.items]);
    const totalCost = currentCase.price * caseCount;

    return (
        <div className="csgo-page-v2 min-h-screen flex flex-col font-poppins select-none overflow-hidden">
            {isUnboxing && winningItem && <CSGOUnboxingAnimation caseData={currentCase} winningItem={winningItem} onAnimationEnd={handleAnimationEnd} />}
            {showWinModal && winningItem && <CSGOWinModal item={winningItem} onClose={handleWinModalClose} addToCsgoInventory={addToCsgoInventory} adjustBalance={adjustBalance} />}
            {multiWonItems && <MultiWinCSGOModal items={multiWonItems} onClose={handleMultiWinModalClose} addToCsgoInventory={addToCsgoInventory} adjustBalance={adjustBalance} />}

            <div className="csgo-sub-nav sticky top-16 z-20"><div className="container mx-auto flex items-center justify-between"><div className="flex items-center"><button className="csgo-sub-nav-item" onClick={() => setPage({ name: 'csgo-lobby' })}>Cases</button><button className="csgo-sub-nav-item" onClick={() => setPage({ name: 'csgo-upgrader' })}>Upgrader</button><button className="csgo-sub-nav-item" onClick={() => setPage({ name: 'csgo-battles-lobby' })}>Case Battles</button></div>{profile && (<div className="flex items-center bg-black/30 rounded-md px-4 py-1"><span className="text-base font-bold text-white">{animatedBalance.toFixed(2)}</span><span className="text-sm text-gray-400 ml-2">EUR</span></div>)}</div></div>
            
            <div className="csgo-case-open-v5-main container mx-auto my-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <img src={currentCase.imageUrl} alt={currentCase.name} className="w-56 h-56 object-contain"/>
                    <div className="flex-grow flex flex-col items-center md:items-start gap-4">
                        <h1 className="text-4xl font-bold">{currentCase.name}</h1>
                        <div className="flex gap-2 p-1 bg-slate-800 rounded-lg">{[1, 2, 3, 4, 5].map(num => <button key={num} onClick={() => !isSpinning && setCaseCount(num)} className={`px-5 py-2 text-sm font-bold rounded-md transition-colors ${caseCount === num ? 'bg-yellow-400 text-black' : 'hover:bg-slate-700'}`}>{num}</button>)}</div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                           <button onClick={() => handleSpin(false)} disabled={isSpinning || (profile && profile.balance < totalCost)} className="csgo-open-button-v5">Open ({caseCount}) For ${totalCost.toFixed(2)}</button>
                            <button onClick={() => handleSpin(true)} disabled={isSpinning} className="px-6 py-3 text-sm font-bold bg-slate-700 hover:bg-slate-600 rounded-md">Demo Spin</button>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-white"><input type="checkbox" checked={quickSpin} onChange={e => setQuickSpin(e.target.checked)} disabled={isSpinning} className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-yellow-400 focus:ring-yellow-500"/>Quick Spin</label>
                    </div>
                </div>
            </div>
            
            <section className="container mx-auto px-4 py-8"><h2 className="text-2xl font-bold text-center mb-6">Case Contents</h2><div className="case-contents-grid-v2">{sortedCaseItems.map(item => (<div key={item.id} className="case-item-card-v2" style={{'--rarity-color': RARITY_COLORS[item.rarity]} as React.CSSProperties}><div className="absolute top-1 right-1 text-xs font-bold text-gray-400 bg-black/50 px-1.5 py-0.5 rounded">{item.odds.toFixed(2)}%</div><div className="h-28 flex items-center justify-center p-2"><img src={item.imageUrl} alt={item.skin} className={`max-w-full max-h-full object-contain rarity-glow-${item.rarity}`} /></div><div className="mt-auto text-center"><p className="text-sm text-gray-300 truncate">{item.weapon}</p><p className={`text-sm font-bold text-rarity-${item.rarity} truncate`}>{item.skin}</p><p className="text-sm font-bold text-green-400">${item.price.toFixed(2)}</p></div></div>))}</div></section>
        </div>
    );
};

export default CSGOGame;

import React, { useMemo, useState } from 'react';
import type { Page } from '../../../App.tsx';
import { allCSGOCases } from './data.ts';
import { useAuth } from '../../../contexts/AuthContext.tsx';
import useAnimatedBalance from '../../../hooks/useAnimatedBalance.tsx';
import CoinIcon from '../../icons/CoinIcon.tsx';
import type { CSGOItem, CSGOItemRarity } from '../../../types.ts';
import { useGiveaway } from '../../../hooks/useGiveaways.ts';
import GiveawayCard from './GiveawayCard.tsx';

const RARITY_COLORS: Record<CSGOItemRarity, string> = {
    'Mil-Spec': '#3b82f6', 'Restricted': '#8b5cf6', 'Classified': '#ec4899',
    'Covert': '#ef4444', 'Contraband': '#f97316', 'Extraordinary': '#f59e0b',
    'Consumer': '#d1d5db', 'Industrial': '#60a5fa',
};

const hourlyPrize: CSGOItem = {
    id: 'fn-glock-franklin',
    weapon: 'Glock-18', skin: 'Franklin', rarity: 'Classified', condition: 'FN', statTrak: false, price: 93.73,
    imageUrl: 'https://csgo-oss.funcs2.com/e/steam/item/730/R2xvY2stMTggfCBGcmFua2xpbiAoRmFjdG9yeSBOZXcp.png',
    odds: 0,
};

const weeklyPrize: CSGOItem = {
    id: 'mo-ak47-fireserpent-bs',
    weapon: 'AK-47', skin: 'Fire Serpent', rarity: 'Covert', condition: 'BS', statTrak: false, price: 808.33,
    imageUrl: 'https://csgo-oss.funcs2.com/e/steam/item/730/QUstNDcgfCBGaXJlIFNlcnBlbnQgKEJhdHRsZS1TY2FycmVkKQ==.png',
    odds: 0,
};

const LiveDropItem: React.FC<{item: CSGOItem}> = ({ item }) => (
    <div className="live-drop-item">
        <img src={item.imageUrl} alt={item.skin} style={{ borderBottom: `3px solid ${RARITY_COLORS[item.rarity]}` }}/>
        <div className="live-drop-item-info">
            <p className={`font-bold text-rarity-${item.rarity}`}>{item.skin}</p>
            <p className="text-slate-400">{item.weapon}</p>
        </div>
    </div>
);

interface CSGOCaseLobbyProps {
    setPage: (page: Page) => void;
    addToCsgoInventory: (items: CSGOItem[]) => void;
}

const CSGOCaseLobby: React.FC<CSGOCaseLobbyProps> = ({ setPage, addToCsgoInventory }) => {
    const { profile, adjustBalance } = useAuth();
    const animatedBalance = useAnimatedBalance(profile?.balance ?? 0);
    const [claimMessage, setClaimMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [maxPrice, setMaxPrice] = useState(25000);

    const filteredCases = useMemo(() => {
        return allCSGOCases.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
            const priceMatch = c.price <= maxPrice;
            return nameMatch && priceMatch;
        });
    }, [searchTerm, maxPrice]);

    const allItems = useMemo(() => allCSGOCases.flatMap(c => c.items), []);
    const liveDrops = useMemo(() => {
        return Array.from({ length: 30 }).map(() => allItems[Math.floor(Math.random() * allItems.length)]);
    }, [allItems]);

    const { timeLeft: hourlyTimeLeft, canClaim: canClaimHourly, hasMetAgeRequirement: hasMetHourlyAge, claim: claimHourly } = useGiveaway('hourly');
    const { timeLeft: dailyTimeLeft, canClaim: canClaimDaily, hasMetAgeRequirement: hasMetDailyAge, claim: claimDaily } = useGiveaway('daily');
    const { timeLeft: weeklyTimeLeft, canClaim: canClaimWeekly, hasMetAgeRequirement: hasMetWeeklyAge, claim: claimWeekly } = useGiveaway('weekly');

    const showClaimMessage = (msg: string) => {
        setClaimMessage(msg);
        setTimeout(() => setClaimMessage(null), 3000);
    };

    const handleClaimHourly = () => {
        if (claimHourly()) {
            addToCsgoInventory([hourlyPrize]);
            showClaimMessage(`Claimed ${hourlyPrize.skin}!`);
        }
    }
    const handleClaimDaily = () => {
        if (claimDaily()) {
            adjustBalance(200);
            showClaimMessage(`Claimed $200.00!`);
        }
    }
    const handleClaimWeekly = () => {
        if (claimWeekly()) {
            addToCsgoInventory([weeklyPrize]);
            showClaimMessage(`Claimed ${weeklyPrize.skin}!`);
        }
    }

    return (
        <div className="csgo-page-v2 min-h-screen">
            <div className="csgo-sub-nav sticky top-16 z-20">
                <div className="container mx-auto flex items-center">
                    <button className="csgo-sub-nav-item active" onClick={() => setPage({ name: 'csgo-lobby' })}>Cases</button>
                    <button className="csgo-sub-nav-item" onClick={() => setPage({ name: 'csgo-upgrader' })}>Upgrader</button>
                    <button className="csgo-sub-nav-item" onClick={() => setPage({ name: 'csgo-battles-lobby' })}>Case Battles</button>
                </div>
            </div>
            
            <div className="live-drop-reel-wrapper">
                <div className="live-drop-reel">
                    {liveDrops.map((item, i) => <LiveDropItem key={i} item={item} />)}
                    {liveDrops.map((item, i) => <LiveDropItem key={`dup-${i}`} item={item} />)}
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                {claimMessage && <div className="text-center mb-4 p-3 bg-green-500/20 text-green-300 rounded-md font-bold">{claimMessage}</div>}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <GiveawayCard
                        title="HOURLY GIVEAWAY"
                        description={<><span className="font-bold text-white">{hourlyPrize.weapon} | {hourlyPrize.skin}</span> <span className="text-green-400">(${hourlyPrize.price.toFixed(2)})</span></>}
                        imageUrl={hourlyPrize.imageUrl}
                        requirementText="Req: Account older than 1 hour."
                        timeLeft={hourlyTimeLeft}
                        canClaim={canClaimHourly}
                        hasMetAgeRequirement={hasMetHourlyAge}
                        onClaim={handleClaimHourly}
                        glowColor={RARITY_COLORS[hourlyPrize.rarity]}
                    />
                    <GiveawayCard
                        title="DAILY GIVEAWAY"
                        description={<><span className="font-bold text-white">Cash Prize</span> <span className="text-green-400">($200.00)</span></>}
                        imageUrl="https://i.imgur.com/sOf8X4s.png"
                        requirementText="Req: Account older than 24 hours."
                        timeLeft={dailyTimeLeft}
                        canClaim={canClaimDaily}
                        hasMetAgeRequirement={hasMetDailyAge}
                        onClaim={handleClaimDaily}
                        glowColor="#22c55e"
                    />
                    <GiveawayCard
                        title="WEEKLY GIVEAWAY"
                        description={<><span className="font-bold text-white">{weeklyPrize.weapon} | {weeklyPrize.skin}</span> <span className="text-green-400">(${weeklyPrize.price.toFixed(2)})</span></>}
                        imageUrl={weeklyPrize.imageUrl}
                        requirementText="Req: Account older than 24 hours."
                        timeLeft={weeklyTimeLeft}
                        canClaim={canClaimWeekly}
                        hasMetAgeRequirement={hasMetWeeklyAge}
                        onClaim={handleClaimWeekly}
                        glowColor={RARITY_COLORS[weeklyPrize.rarity]}
                    />
                </div>

                <div className="case-filters-bar mb-8">
                    <input type="text" placeholder="Search for a case..." className="filter-input flex-grow" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span>${maxPrice.toFixed(0)}</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="25000" 
                          step="10" 
                          value={maxPrice} 
                          onChange={e => setMaxPrice(Number(e.target.value))}
                          className="w-48 price-slider-input"
                        />
                    </div>
                    <button onClick={() => { setSearchTerm(''); setMaxPrice(25000); }} className="text-sm text-slate-400 hover:text-white">Clear</button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredCases.map((box, idx) => (
                        <div key={box.id} onClick={() => setPage({ name: 'csgo-case', id: box.id })} className="csgo-case-card-v4">
                            {idx < 2 && <div className="csgo-case-card-v4-tag">NEW</div>}
                            <div className="csgo-case-card-v4-image-wrapper">
                                <img src={box.imageUrl} alt={box.name} />
                            </div>
                            <h3 className="csgo-case-card-v4-name">{box.name}</h3>
                            <div className="csgo-case-card-v4-price">
                                <CoinIcon className="w-5 h-5" />
                                <span>{box.price.toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default CSGOCaseLobby;
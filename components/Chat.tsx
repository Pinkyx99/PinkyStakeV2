import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import type { Message, Profile } from '../types.ts';
import SendIcon from './icons/SendIcon.tsx';
import CloseIcon from './icons/CloseIcon.tsx';

interface ChatProps {
    isVisible: boolean;
    onClose: () => void;
    onProfileClick: (profile: Profile) => void;
}

const Chat: React.FC<ChatProps> = ({ isVisible, onClose, onProfileClick }) => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [profilesCache, setProfilesCache] = useState<Record<string, Profile>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isMuted = profile?.muted_until && new Date(profile.muted_until) > new Date();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchInitialMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select(`*, profile:profiles(is_admin)`)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) {
                console.error('Error fetching messages:', error);
            } else if (data) {
                setMessages(data.reverse() as unknown as Message[]);
            }
        };
        fetchInitialMessages();
    }, []);

    useEffect(() => {
        if(isVisible) {
            scrollToBottom();
        }
    }, [isVisible, messages]);
    
    useEffect(() => {
        const channel = supabase.channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
            async (payload) => {
                const msg = payload.new as Message;
                
                const { data } = await supabase.from('profiles').select('is_admin').eq('id', msg.user_id).single();
                msg.profile = { is_admin: !!data?.is_admin };
                
                setMessages(prev => [...prev, msg]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !profile || isMuted) return;

        const content = newMessage.trim();
        setNewMessage('');

        const { error } = await supabase.from('messages').insert({
            content,
            user_id: profile.id, // Set user_id
            username: profile.username,
        });

        if (error) {
            console.error('Error sending message:', error);
            setNewMessage(content); // Re-add message to input if sending failed
        }
    };
    
    const handleUsernameClick = async (userId: string) => {
        if (profilesCache[userId]) {
            onProfileClick(profilesCache[userId]);
            return;
        }
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (error) {
            console.error("Error fetching user profile:", error);
            return;
        }
        if (data) {
            const fetchedProfile = data as Profile;
            setProfilesCache(p => ({...p, [userId]: fetchedProfile }));
            onProfileClick(fetchedProfile);
        }
    };

    return (
        <div className={`chat-container ${isVisible ? 'visible' : ''}`}>
            <div className="chat-header flex justify-between items-center text-white">
                <span>Global Chat</span>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6"/></button>
            </div>
            <div className="chat-messages">
                <div className="chat-messages-inner">
                    {messages.map(msg => {
                         const isAdmin = msg.profile?.is_admin || msg.username === 'Admin';
                        return (
                          <div key={msg.id} className="chat-message">
                            <span 
                                className={`username ${isAdmin ? 'admin' : ''}`}
                                onClick={() => handleUsernameClick(msg.user_id)}
                                role="button"
                                tabIndex={0}
                            >
                                {msg.username}:
                            </span>
                            <span className="content ml-1.5">{msg.content}</span>
                          </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="chat-input-area">
                <form onSubmit={handleSendMessage} className="chat-input-wrapper">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isMuted ? "You are muted." : "Type a message..."}
                        disabled={!profile || isMuted}
                        className="chat-input"
                        maxLength={280}
                    />
                    <button type="submit" disabled={!newMessage.trim() || !profile || isMuted} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-md disabled:bg-slate-600 disabled:cursor-not-allowed">
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
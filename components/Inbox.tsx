
import React, { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, Paperclip, Send, Smile, Phone, Video, Bot, Loader2, CheckCheck, MessageSquare, AlertCircle, Facebook, Image as ImageIcon, Workflow, FileText, MapPin, MousePointerClick, UserPlus, Filter, Mic, ChevronDown, X, Clock } from 'lucide-react';
import { io } from 'socket.io-client';
import { Conversation, Message, MessageType, Flow, MessageStatus, Agent } from '../types';
import { mockWhatsappService } from '../services/mockWhatsappService';
import { whatsappApiService } from '../services/whatsappApiService';
import { messengerApiService } from '../services/messengerApiService';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/apiConfig';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const Inbox: React.FC = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [chatSummary, setChatSummary] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showAttachments, setShowAttachments] = useState(false);
    const [showFlowModal, setShowFlowModal] = useState(false);
    const [availableFlows, setAvailableFlows] = useState<Flow[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

    const [chatFilter, setChatFilter] = useState<'ALL' | 'MINE' | 'UNASSIGNED'>('ALL');
    const [agents, setAgents] = useState<Agent[]>([]);
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 24H Window Logic
    const [isSessionExpired, setIsSessionExpired] = useState(false);

    useEffect(() => {
        const socketUrl = API_BASE_URL;

        const socket: any = io(socketUrl, {
            transports: ['polling', 'websocket'], // Try polling first or fallback gracefully
            withCredentials: true
        });

        socket.on('connect', () => console.log('Connected to WebSocket'));
        socket.on('new_message', (msg: any) => {
            console.log('WS: New Message', msg);
            const incomingMsg: Message = {
                id: msg.id || Math.random().toString(),
                text: msg.text || '',
                sender: 'them',
                timestamp: msg.timestamp || new Date().toISOString(),
                status: MessageStatus.DELIVERED,
                type: msg.type === 'image' ? MessageType.IMAGE : msg.type === 'document' ? MessageType.DOCUMENT : MessageType.TEXT,
                mediaUrl: msg.mediaUrl
            };
            const contacts = storageService.getContacts();
            let contact = contacts.find(c => c.phoneNumber === msg.senderPhone);
            if (!contact && msg.senderPhone) {
                contact = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: msg.senderName || msg.senderPhone,
                    phoneNumber: msg.senderPhone,
                    avatar: 'https://ui-avatars.com/api/?background=random&name=' + (msg.senderName || 'Unknown'),
                    tags: ['Incoming']
                };
                storageService.saveContact(contact);
            }
            if (contact) {
                const conv = storageService.ensureConversation(contact);
                // Update lastMessageAt for 24h window calculation
                conv.lastMessageAt = incomingMsg.timestamp;
                storageService.addMessage(conv.id, incomingMsg);

                fetchChats();
                if (selectedChat && selectedChat.id === conv.id) {
                    const updatedConv = storageService.getConversation(conv.id);
                    if (updatedConv) setSelectedChat(updatedConv);
                }
            }
        });
        return () => { socket.disconnect(); };
    }, [selectedChat]);

    const fetchChats = () => {
        const data = storageService.getConversations();
        setConversations(data);
        if (selectedChat) {
            const updated = data.find(c => c.id === selectedChat.id);
            if (updated) setSelectedChat(updated);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchChats();
        setAgents(storageService.getAgents());
        const loadFlows = async () => {
            const creds = whatsappApiService.getCredentials();
            if (creds?.businessAccountId) {
                try {
                    const flows = await whatsappApiService.getFlows(creds);
                    setAvailableFlows(flows.filter(f => f.status === 'PUBLISHED'));
                } catch (e) { }
            } else {
                setAvailableFlows((await mockWhatsappService.getFlows()).filter(f => f.status === 'PUBLISHED'));
            }
        };
        loadFlows();
    }, []);

    useEffect(() => {
        let filtered = conversations;
        if (chatFilter === 'MINE') {
            filtered = conversations.filter(c => c.assignedTo === 'me');
        } else if (chatFilter === 'UNASSIGNED') {
            filtered = conversations.filter(c => !c.assignedTo);
        }
        setFilteredConversations(filtered);
    }, [conversations, chatFilter]);

    // Check 24h Window whenever chat changes
    useEffect(() => {
        if (selectedChat) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            setSuggestions([]);
            setChatSummary(null);
            setErrorMsg(null);
            setShowAttachments(false);
            setShowFlowModal(false);
            setShowAssignDropdown(false);

            // Calculate Session Expiry
            if (selectedChat.platform === 'whatsapp') {
                const lastCustomerMsg = [...selectedChat.messages].reverse().find(m => m.sender === 'them');
                if (lastCustomerMsg) {
                    const lastMsgTime = new Date(lastCustomerMsg.timestamp).getTime();
                    const now = Date.now();
                    const diffHours = (now - lastMsgTime) / (1000 * 60 * 60);
                    setIsSessionExpired(diffHours > 24);
                } else {
                    // No customer message ever? Assume expired (must start with template)
                    setIsSessionExpired(true);
                }
            } else {
                setIsSessionExpired(false); // Messenger has different rules, simplified here
            }
        }
    }, [selectedChat?.id, selectedChat?.messages]); // Re-run if messages update

    useEffect(() => {
        if (selectedChat) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedChat?.messages.length]);

    const handleAssignAgent = (agentId: string) => {
        if (!selectedChat) return;
        selectedChat.assignedTo = agentId;
        storageService.saveConversation(selectedChat);
        fetchChats();
        setShowAssignDropdown(false);
    };

    const handleSendMessage = async (text: string = inputMessage, type: 'text' | 'image' | 'flow' = 'text', additionalData?: any) => {
        if ((!text.trim() && type === 'text') || !selectedChat) return;

        // Prevent sending text if session expired
        if (isSessionExpired && type === 'text') {
            setErrorMsg("Session Expired. Please send a Template Message.");
            return;
        }

        const credentials = whatsappApiService.getCredentials();
        let apiMessage: Message | null = null;

        try {
            if (selectedChat.platform === 'messenger') {
                apiMessage = await messengerApiService.sendMessage(credentials!, selectedChat.contact.phoneNumber, text);
            } else {
                if (type === 'text') {
                    apiMessage = await whatsappApiService.sendMessage(credentials!, selectedChat.contact.phoneNumber, text);
                } else if (type === 'flow' && additionalData) {
                    apiMessage = await whatsappApiService.sendFlowMessage(
                        credentials!,
                        selectedChat.contact.phoneNumber,
                        additionalData.id,
                        "SIGN_UP", // default screen
                        "Open " + additionalData.name
                    );
                }
            }

            const newMessage: Message = apiMessage || {
                id: Math.random().toString(36).substr(2, 9),
                text: type === 'flow' ? `[FLOW SENT: ${text}]` : text,
                sender: 'me',
                timestamp: new Date().toISOString(),
                status: MessageStatus.SENT,
                type: type === 'flow' ? MessageType.FLOW : (type === 'image' ? MessageType.IMAGE : MessageType.TEXT),
                mediaUrl: type === 'image' ? text : undefined
            };

            storageService.addMessage(selectedChat.id, newMessage);
            fetchChats();

            setInputMessage('');
            setSuggestions([]);
            setErrorMsg(null);
            setShowFlowModal(false);
            setShowAttachments(false);
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to send message");
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && selectedChat) {
            if (isSessionExpired) {
                setErrorMsg("Cannot send media. Session expired.");
                return;
            }

            const file = e.target.files[0];
            setIsUploading(true);
            setErrorMsg(null);
            setShowAttachments(false);

            try {
                const credentials = whatsappApiService.getCredentials();

                if (selectedChat.platform === 'whatsapp') {
                    const uploadResult = await whatsappApiService.uploadMedia(credentials!, file);
                    const type = file.type.startsWith('image/') ? 'image' : 'document';
                    const apiMessage = await whatsappApiService.sendMediaMessage(
                        credentials!,
                        selectedChat.contact.phoneNumber,
                        type as any,
                        uploadResult.id,
                        file.name,
                        file.name
                    );

                    const localDisplayUrl = URL.createObjectURL(file);
                    const newMessage: Message = {
                        ...apiMessage,
                        mediaUrl: localDisplayUrl,
                        type: type === 'image' ? MessageType.IMAGE : MessageType.DOCUMENT
                    };

                    storageService.addMessage(selectedChat.id, newMessage);
                    fetchChats();
                } else {
                    setErrorMsg("Messenger uploads not implemented in this demo.");
                }
            } catch (e: any) {
                setErrorMsg(e.message || "Failed to upload/send media");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleGenerateAI = async () => {
        if (!selectedChat) return;
        setIsGenerating(true);
        const replies = await geminiService.generateSmartReplies(selectedChat.messages);
        setSuggestions(replies);
        setIsGenerating(false);
    };

    const handleSummarize = async () => {
        if (!selectedChat) return;
        setIsGenerating(true);
        const summary = await geminiService.summarizeChat(selectedChat.messages);
        setChatSummary(summary);
        setIsGenerating(false);
    };

    const MessageBubble: React.FC<{ msg: Message }> = ({ msg }) => {
        const isMe = msg.sender === 'me';
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <div className={`flex w-full mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm text-sm group ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'
                    }`}>
                    {/* Tail CSS would be handled here in a real app or with specific SVG overlays */}
                    {isMe && <div className="absolute top-0 -right-2 w-3 h-3 bg-[#d9fdd3] clip-path-polygon-[0_0,0_100%,100%_0]"></div>}
                    {!isMe && <div className="absolute top-0 -left-2 w-3 h-3 bg-white clip-path-polygon-[0_0,100%_0,100%_100%]"></div>}

                    {msg.type === MessageType.FLOW && (
                        <div className="italic bg-white/50 p-2 rounded mb-1 border-l-4 border-wa text-xs text-gray-600 flex items-center gap-1.5">
                            <Workflow className="w-3.5 h-3.5 text-wa" /> Flow Interaction
                        </div>
                    )}

                    {msg.type === MessageType.IMAGE ? (
                        <img src={msg.mediaUrl} alt="Media" className="rounded-lg max-h-64 object-cover mt-1 cursor-pointer" />
                    ) : msg.type === MessageType.DOCUMENT ? (
                        <div className="flex items-center gap-3 bg-black/5 p-3 rounded-lg border border-black/5 my-1 min-w-[200px]">
                            <div className="bg-red-100 text-red-500 p-2 rounded"><FileText className="w-6 h-6" /></div>
                            <div className="overflow-hidden">
                                <p className="font-medium truncate text-gray-800">{msg.text.replace('Sent file: ', '')}</p>
                                <span className="text-[10px] text-gray-500 uppercase font-bold">PDF • 1 page</span>
                            </div>
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap leading-relaxed text-gray-900 pb-2">{msg.text}</p>
                    )}

                    <div className={`flex items-center justify-end gap-1 select-none float-right -mt-2 ml-2 ${isMe ? 'text-[#6fb094]' : 'text-gray-400'}`}>
                        <span className="text-[10px]">{time}</span>
                        {isMe && (
                            <span title={msg.status}>
                                {msg.status === MessageStatus.READ ? (
                                    <div className="flex"><CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /></div>
                                ) : msg.status === MessageStatus.DELIVERED ? (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                ) : (
                                    <CheckCheck className="w-3.5 h-3.5 opacity-60" />
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading && conversations.length === 0) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-wa h-10 w-10" /></div>;

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

            {/* Sidebar - Chat List */}
            <div className="w-full md:w-[350px] border-r border-gray-200 flex flex-col bg-white z-10">
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2 h-16">
                    <img
                        src="https://ui-avatars.com/api/?background=25D366&color=fff&name=Me"
                        className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                        alt="My Profile"
                    />
                    <div className="flex gap-3 text-gray-500">
                        <button title="Status"><div className="w-5 h-5 border-2 border-gray-500 rounded-full border-dashed"></div></button>
                        <button title="New Chat"><MessageSquare className="w-5 h-5" /></button>
                        <button title="Menu"><MoreVertical className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="px-3 py-2 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search or start new chat"
                            className="w-full pl-10 pr-4 py-1.5 text-sm bg-gray-100 border-none rounded-lg focus:ring-0 focus:bg-white transition-colors"
                        />
                    </div>
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
                        {['ALL', 'MINE', 'UNASSIGNED'].map((filter) => (
                            <button key={filter} onClick={() => setChatFilter(filter as any)} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all whitespace-nowrap ${chatFilter === filter ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3"><Filter className="w-6 h-6 opacity-30" /></div>
                            <p className="text-sm font-medium">No chats found.</p>
                        </div>
                    ) : (
                        filteredConversations.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex gap-3 group relative ${selectedChat?.id === chat.id ? 'bg-[#f0f2f5]' : ''}`}
                            >
                                <div className="relative shrink-0">
                                    <img src={chat.contact.avatar} alt={chat.contact.name} className="w-12 h-12 rounded-full object-cover bg-gray-200" />
                                    {chat.platform === 'messenger' && (
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                            <Facebook className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 border-b border-gray-100 pb-3 group-hover:border-transparent">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-[15px] font-medium text-gray-900 truncate">{chat.contact.name}</h3>
                                        <span className={`text-[11px] ${chat.unreadCount > 0 ? 'text-green-500 font-bold' : 'text-gray-400'}`}>
                                            {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[13px] text-gray-500 truncate max-w-[85%] flex items-center gap-1">
                                            {chat.messages.length > 0 && chat.messages[chat.messages.length - 1].sender === 'me' && (
                                                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                            )}
                                            {chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : 'Start chatting'}
                                        </p>
                                        {chat.unreadCount > 0 && (
                                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    {/* Agent Label */}
                                    {chat.assignedTo && (
                                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                                            {agents.find(a => a.id === chat.assignedTo)?.name || 'Agent'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedChat ? (
                <div className="hidden md:flex flex-1 flex-col bg-[#efe7dd] relative">
                    {/* Header */}
                    <div className="h-16 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-20">
                        <div className="flex items-center gap-3 cursor-pointer">
                            <img src={selectedChat.contact.avatar} alt="Profile" className="w-10 h-10 rounded-full bg-gray-300" />
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">{selectedChat.contact.name}</h3>
                                <span className="text-xs text-gray-500 truncate block max-w-[200px]">
                                    {selectedChat.contact.phoneNumber} {selectedChat.platform === 'messenger' && '• Messenger'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-gray-600">
                            {/* Agent Assignment */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors flex items-center gap-2 text-xs font-medium"
                                    title="Assign Agent"
                                >
                                    <UserPlus className="w-5 h-5" />
                                </button>
                                {showAssignDropdown && (
                                    <div className="absolute top-12 right-0 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 animate-in zoom-in-95">
                                        <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-50">Assign to Agent</div>
                                        {agents.map(agent => (
                                            <button key={agent.id} onClick={() => handleAssignAgent(agent.id)} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3">
                                                <img src={agent.avatar} className="w-6 h-6 rounded-full" />
                                                <span className="flex-1 truncate">{agent.name}</span>
                                                {selectedChat.assignedTo === agent.id && <CheckCheck className="w-4 h-4 text-green-500 ml-auto" />}
                                            </button>
                                        ))}
                                        <button onClick={() => handleAssignAgent('')} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 border-t border-gray-50">Unassign</button>
                                    </div>
                                )}
                            </div>

                            <button onClick={handleSummarize} className="p-2 hover:bg-gray-200 rounded-full transition-colors" title="AI Summary"><Bot className="w-5 h-5 text-purple-600" /></button>
                            <button className="p-2 hover:bg-gray-200 rounded-full"><Search className="w-5 h-5" /></button>
                            <button className="p-2 hover:bg-gray-200 rounded-full"><MoreVertical className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {errorMsg && <div className="absolute top-16 w-full z-10 bg-red-100 text-red-800 text-xs py-2 px-4 flex items-center justify-center gap-2 shadow-sm"><AlertCircle className="w-3 h-3" />{errorMsg}</div>}
                    {isUploading && <div className="absolute top-16 w-full z-10 bg-blue-100 text-blue-800 text-xs py-2 px-4 flex items-center justify-center gap-2 shadow-sm"><Loader2 className="w-3 h-3 animate-spin" /> Uploading media...</div>}

                    {/* AI Summary Banner */}
                    {chatSummary && (
                        <div className="absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-purple-100 z-20 shadow-lg animate-in slide-in-from-top-2">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="bg-purple-100 p-2 rounded-full h-fit"><Bot className="w-4 h-4 text-purple-600" /></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Conversation Summary</h4>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{chatSummary}</p>
                                    </div>
                                </div>
                                <button onClick={() => setChatSummary(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}

                    {/* Chat Area - WhatsApp Doodle Background */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-100">
                        {/* Encryption Notice Mock */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-[#ffeecd] text-[#54656f] text-[10px] px-3 py-1.5 rounded-lg shadow-sm text-center max-w-sm">
                                🔒 Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
                            </div>
                        </div>

                        {selectedChat.messages.map((msg) => (
                            <MessageBubble key={msg.id} msg={msg} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Smart Reply Suggestions */}
                    {suggestions.length > 0 && !isSessionExpired && (
                        <div className="bg-[#f0f2f5] border-t border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar items-center">
                            <div className="flex items-center gap-1.5 text-[10px] text-purple-600 font-bold uppercase tracking-wider bg-purple-50 px-2 py-1 rounded border border-purple-100 shrink-0">
                                <Bot className="w-3 h-3" /> AI Suggests
                            </div>
                            {suggestions.map((sug, i) => (
                                <button key={i} onClick={() => handleSendMessage(sug)} className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50 shadow-sm transition-colors whitespace-nowrap">
                                    {sug}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Attachment Menu */}
                    {showAttachments && (
                        <div className="absolute bottom-20 left-4 bg-white rounded-xl shadow-xl border border-gray-100 p-2 flex flex-col gap-1 z-30 w-52 animate-in slide-in-from-bottom-4 duration-200 origin-bottom-left">
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg text-gray-700 text-sm font-medium w-full text-left transition-colors">
                                <div className="bg-purple-100 p-2 rounded-full text-purple-600"><ImageIcon className="w-4 h-4" /></div> Photos & Videos
                            </button>
                            <button className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg text-gray-700 text-sm font-medium w-full text-left transition-colors">
                                <div className="bg-blue-100 p-2 rounded-full text-blue-600"><FileText className="w-4 h-4" /></div> Document
                            </button>
                            {selectedChat.platform === 'whatsapp' && (
                                <button onClick={() => setShowFlowModal(true)} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg text-gray-700 text-sm font-medium w-full text-left transition-colors">
                                    <div className="bg-green-100 p-2 rounded-full text-green-600"><Workflow className="w-4 h-4" /></div> WhatsApp Flow
                                </button>
                            )}
                        </div>
                    )}

                    {/* Flow Selection Modal */}
                    {showFlowModal && (
                        <div className="absolute bottom-20 left-4 bg-white rounded-xl shadow-2xl border border-gray-100 z-40 w-72 p-4 animate-in zoom-in-95 duration-200">
                            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                                Send a Flow
                                <button onClick={() => setShowFlowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </h4>
                            <div className="space-y-1 max-h-56 overflow-y-auto">
                                {availableFlows.length > 0 ? availableFlows.map(flow => (
                                    <button key={flow.id} onClick={() => handleSendMessage(flow.name, 'flow', flow)} className="w-full text-left p-2.5 hover:bg-green-50 rounded-lg text-sm text-gray-700 font-medium flex items-center gap-2 transition-colors">
                                        <Workflow className="w-4 h-4 text-green-600" />
                                        {flow.name}
                                    </button>
                                )) : <p className="text-xs text-gray-500 text-center py-4 bg-gray-50 rounded">No published flows found.</p>}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="bg-[#f0f2f5] px-4 py-3 border-t border-gray-200">
                        {isSessionExpired ? (
                            <div className="flex flex-col items-center justify-center p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                                <div className="flex items-center gap-2 text-yellow-800 font-bold text-sm mb-1">
                                    <Clock className="w-4 h-4" /> 24h Session Window Closed
                                </div>
                                <p className="text-xs text-yellow-700 mb-3">You can only reply with a Template Message to re-open the window.</p>
                                <button
                                    onClick={() => navigate('/campaigns')} // Send them to campaigns/templates to pick one
                                    className="bg-wa text-white px-4 py-2 rounded-full text-sm font-bold shadow-md hover:bg-wa-dark flex items-center gap-2"
                                >
                                    <Send className="w-4 h-4" /> Send Template Message
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-end gap-2">
                                <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors mb-1"><Smile className="w-6 h-6" /></button>
                                <button onClick={() => setShowAttachments(!showAttachments)} className={`p-2 text-gray-500 hover:text-gray-700 transition-colors mb-1 ${showAttachments ? 'bg-gray-200 rounded-full rotate-45' : ''}`}><Paperclip className="w-6 h-6" /></button>

                                <div className="flex-1 bg-white rounded-lg border border-white focus-within:border-white focus-within:ring-1 focus-within:ring-white flex items-center px-4 py-1.5 shadow-sm">
                                    <textarea
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Type a message"
                                        className="w-full max-h-32 py-2 text-[15px] text-gray-800 placeholder-gray-500 focus:outline-none resize-none bg-transparent"
                                        rows={1}
                                        style={{ minHeight: '24px' }}
                                    />
                                    <button
                                        onClick={handleGenerateAI}
                                        disabled={isGenerating}
                                        className="ml-2 p-1.5 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                        title="Generate AI Reply"
                                    >
                                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                                    </button>
                                </div>

                                {inputMessage.trim() ? (
                                    <button onClick={() => handleSendMessage()} className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] shadow-sm transition-transform active:scale-95 mb-1">
                                        <Send className="w-5 h-5 pl-0.5" />
                                    </button>
                                ) : (
                                    <button className="p-3 text-gray-500 hover:bg-gray-200 rounded-full transition-colors mb-1">
                                        <Mic className="w-6 h-6" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#f0f2f5] text-gray-500 border-l border-gray-200">
                    <div className="max-w-md text-center">
                        <div className="w-64 h-64 bg-[url('https://static.whatsapp.net/rsrc.php/v3/y6/r/wa669ae.svg')] bg-contain bg-no-repeat bg-center mx-auto opacity-60 mb-8"></div>
                        <h2 className="text-2xl font-light text-gray-700 mb-4">WatiClone Web</h2>
                        <p className="text-sm text-gray-500">Send and receive messages without keeping your phone online.<br />Use WhatsApp on up to 4 linked devices and 1 phone.</p>
                        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                            <div className="w-3 h-3 bg-gray-400 rounded-full"></div> End-to-end encrypted
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

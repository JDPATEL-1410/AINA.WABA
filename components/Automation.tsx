
import React, { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, Search, Zap, CheckCircle, XCircle, Save, Loader2, MessageSquare } from 'lucide-react';
import { authService } from '../services/authService';
import { API_BASE_URL } from '../services/apiConfig';
import { AutomationRule } from '../types';

export const Automation: React.FC = () => {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Partial<AutomationRule>>({
        name: '', trigger_type: 'KEYWORD_MATCH', keywords: [], response_type: 'TEXT', response_content: '', is_active: true
    });
    const [keywordInput, setKeywordInput] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/automations`);
            if (res.ok) setRules(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await fetch(`${API_BASE_URL}/api/automations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingRule)
            });
            setIsModalOpen(false);
            setEditingRule({ name: '', trigger_type: 'KEYWORD_MATCH', keywords: [], response_type: 'TEXT', response_content: '', is_active: true });
            setKeywordInput('');
            loadRules();
        } catch (e) { alert("Failed to save rule"); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this automation?")) return;
        try {
            await fetch(`${API_BASE_URL}/api/automations/${id}`, { method: 'DELETE' });
            loadRules();
        } catch (e) { alert("Failed to delete"); }
    };

    const addKeyword = () => {
        if (keywordInput && editingRule.keywords) {
            setEditingRule({ ...editingRule, keywords: [...editingRule.keywords, keywordInput.toLowerCase()] });
            setKeywordInput('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Automation & Chatbot</h1>
                    <p className="text-gray-500">Set up keyword-based auto-replies</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-wa text-white px-4 py-2 rounded-lg hover:bg-wa-dark font-medium shadow-sm">
                    <Plus className="w-4 h-4" /> New Rule
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? <div className="col-span-3 text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-wa mx-auto" /></div> :
                    rules.length === 0 ? <div className="col-span-3 text-center py-12 text-gray-500">No automation rules found. Create one to get started.</div> :
                        rules.map(rule => (
                            <div key={rule.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-gray-900">{rule.name}</h3>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {rule.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Trigger Keywords</p>
                                        <div className="flex flex-wrap gap-1">
                                            {rule.keywords.map(k => (
                                                <span key={k} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200">{k}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Response</p>
                                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 line-clamp-2">
                                            {rule.response_content}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(rule.id)}
                                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-900">Create Automation Rule</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                                <input required type="text" value={editingRule.name} onChange={e => setEditingRule({ ...editingRule, name: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" placeholder="e.g. Pricing Query" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Match Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="radio" name="type" checked={editingRule.trigger_type === 'KEYWORD_MATCH'} onChange={() => setEditingRule({ ...editingRule, trigger_type: 'KEYWORD_MATCH' })} className="text-wa focus:ring-wa" />
                                        Contains Keyword
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="radio" name="type" checked={editingRule.trigger_type === 'EXACT_MATCH'} onChange={() => setEditingRule({ ...editingRule, trigger_type: 'EXACT_MATCH' })} className="text-wa focus:ring-wa" />
                                        Exact Match
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={keywordInput}
                                        onChange={e => setKeywordInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                        className="flex-1 border rounded-lg p-2 text-sm"
                                        placeholder="Type keyword and press Enter"
                                    />
                                    <button type="button" onClick={addKeyword} className="bg-gray-100 text-gray-600 px-3 rounded-lg border border-gray-200 hover:bg-gray-200">Add</button>
                                </div>
                                <div className="flex flex-wrap gap-1 min-h-[2rem]">
                                    {editingRule.keywords?.map(k => (
                                        <span key={k} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                                            {k}
                                            <button type="button" onClick={() => setEditingRule({ ...editingRule, keywords: editingRule.keywords?.filter(wk => wk !== k) })}><XCircle className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Reply Message</label>
                                <textarea
                                    required
                                    value={editingRule.response_content}
                                    onChange={e => setEditingRule({ ...editingRule, response_content: e.target.value })}
                                    className="w-full border rounded-lg p-2.5 text-sm h-24"
                                    placeholder="Type the message to send back..."
                                />
                            </div>

                            <div className="pt-2">
                                <button type="submit" disabled={saving} className="w-full bg-wa text-white py-2.5 rounded-lg hover:bg-wa-dark font-medium flex items-center justify-center gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Automation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

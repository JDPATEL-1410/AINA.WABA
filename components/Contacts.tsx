import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Tag, MoreHorizontal, Plus, Search, Trash2, X, Save, Edit2, Upload } from 'lucide-react';
import { storageService } from '../services/storageService';
import { User } from '../types';

export const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<User>>({});
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    setContacts(storageService.getContacts());
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phoneNumber.includes(searchTerm)
  );

  const handleSave = () => {
    if (!editingContact.name || !editingContact.phoneNumber) return;

    const newContact: User = {
      id: editingContact.id || Math.random().toString(36).substr(2, 9),
      name: editingContact.name,
      phoneNumber: editingContact.phoneNumber,
      avatar: editingContact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(editingContact.name)}&background=random`,
      tags: editingContact.tags || []
    };

    storageService.saveContact(newContact);
    loadContacts();
    setIsModalOpen(false);
    setEditingContact({});
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      storageService.deleteContact(id);
      loadContacts();
    }
  };

  const openModal = (contact?: User) => {
    setEditingContact(contact || { tags: [] });
    setIsModalOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      const reader = new FileReader();
      
      reader.onload = (e) => {
          const text = e.target?.result as string;
          if (!text) {
              setIsImporting(false);
              return;
          }

          const lines = text.split('\n');
          // Assuming Header: Name,Phone,Tags
          let addedCount = 0;

          // Start from index 1 to skip header if it exists, simple check
          const startIdx = lines[0].toLowerCase().includes('phone') ? 1 : 0;

          for (let i = startIdx; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              const parts = line.split(',');
              if (parts.length >= 2) {
                  const name = parts[0].trim();
                  const phone = parts[1].trim();
                  const tags = parts.length > 2 ? parts[2].split('|').map(t => t.trim()) : [];

                  if (name && phone) {
                      const newContact: User = {
                          id: Math.random().toString(36).substr(2, 9),
                          name: name,
                          phoneNumber: phone,
                          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                          tags: tags
                      };
                      storageService.saveContact(newContact);
                      addedCount++;
                  }
              }
          }
          
          alert(`Successfully imported ${addedCount} contacts.`);
          loadContacts();
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      };

      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contacts CRM</h2>
          <p className="text-gray-500">Manage your WhatsApp audience and leads</p>
        </div>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileUpload} 
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
            >
                <Upload className="w-4 h-4" />
                {isImporting ? 'Importing...' : 'Import CSV'}
            </button>
            <button 
                onClick={() => openModal()}
                className="flex items-center gap-2 bg-wa text-white px-4 py-2 rounded-lg hover:bg-wa-dark transition-colors shadow-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                Add Contact
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-wa focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No contacts found. Add one manually or import via CSV.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                       <img src={contact.avatar} alt={contact.name} className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
                       {contact.name}
                    </td>
                    <td className="px-6 py-4 font-mono">{contact.phoneNumber}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {contact.tags.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(contact)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(contact.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between">
           <span>{filteredContacts.length} contacts</span>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">{editingContact.id ? 'Edit Contact' : 'Add New Contact'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={editingContact.name || ''}
                  onChange={e => setEditingContact({...editingContact, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-wa focus:border-transparent"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (with Country Code)</label>
                <input 
                  type="text" 
                  value={editingContact.phoneNumber || ''}
                  onChange={e => setEditingContact({...editingContact, phoneNumber: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-wa focus:border-transparent font-mono"
                  placeholder="e.g. 15551234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={editingContact.tags?.join(', ') || ''}
                  onChange={e => setEditingContact({...editingContact, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-wa focus:border-transparent"
                  placeholder="e.g. VIP, Lead, 2024"
                />
              </div>
              <div className="pt-2">
                <button 
                  onClick={handleSave}
                  className="w-full bg-wa text-white py-2.5 rounded-lg hover:bg-wa-dark font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
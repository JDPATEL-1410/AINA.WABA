
import React, { useState, useEffect } from 'react';
import { 
    Workflow, Plus, Save, UploadCloud, ArrowLeft, Loader2, 
    Type, AlignLeft, CheckSquare, List, MousePointerClick, 
    Trash2, GripVertical, Smartphone, Code, MoveUp, MoveDown,
    X
} from 'lucide-react';
import { mockWhatsappService } from '../services/mockWhatsappService';
import { whatsappApiService } from '../services/whatsappApiService';
import { Flow } from '../types';

// --- Builder Types ---
type ComponentType = 'TextHeading' | 'Body' | 'TextInput' | 'TextArea' | 'Checkbox' | 'Radio' | 'Dropdown' | 'Footer';

interface BuilderComponent {
  id: string;
  type: ComponentType;
  label: string;
  name: string; // Key for data
  required: boolean;
  options: string[]; // For Radio/Dropdown/Checkbox
  text?: string; // For static text
}

interface BuilderScreen {
  id: string;
  title: string;
  children: BuilderComponent[];
}

// --- Default State ---
const DEFAULT_SCREEN: BuilderScreen = {
    id: "SIGN_UP",
    title: "Sign Up Form",
    children: [
        { id: '1', type: 'TextHeading', label: 'Welcome', name: '', required: false, options: [], text: 'Welcome to our Service' },
        { id: '2', type: 'TextInput', label: 'Full Name', name: 'full_name', required: true, options: [] },
        { id: '3', type: 'Footer', label: 'Submit', name: 'submit', required: false, options: [] }
    ]
};

export const Flows: React.FC = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowCategories, setNewFlowCategories] = useState<string[]>(['OTHER']);
  const [isCreating, setIsCreating] = useState(false);
  
  // Editor State
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [activeScreen, setActiveScreen] = useState<BuilderScreen>(DEFAULT_SCREEN);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'DESIGN' | 'JSON'>('DESIGN');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const FLOW_CATEGORIES = ['SIGN_UP', 'SIGN_IN', 'APPOINTMENT_BOOKING', 'LEAD_GENERATION', 'CONTACT_US', 'CUSTOMER_SUPPORT', 'SURVEY', 'OTHER'];

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
      setLoading(true);
      const credentials = whatsappApiService.getCredentials();
      let data: Flow[] = [];
      if (credentials?.businessAccountId) {
         try { data = await whatsappApiService.getFlows(credentials); } catch (e) { console.error(e); }
      }
      if (data.length === 0) data = await mockWhatsappService.getFlows();
      setFlows(data);
      setLoading(false);
  };

  const handleCreateFlow = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newFlowName) return;
      setIsCreating(true);
      try {
          const credentials = whatsappApiService.getCredentials();
          let newFlow: Flow;
          if (credentials?.businessAccountId) {
              newFlow = await whatsappApiService.createFlow(credentials, newFlowName, newFlowCategories);
          } else {
              newFlow = await mockWhatsappService.createFlow(newFlowName, newFlowCategories);
          }
          setFlows(prev => [...prev, newFlow]);
          setIsModalOpen(false);
          setNewFlowName('');
          handleOpenEditor(newFlow);
      } catch (err: any) {
          alert(err.message);
      } finally {
          setIsCreating(false);
      }
  };

  const handleOpenEditor = (flow: Flow) => {
      setEditingFlow(flow);
      // Reset builder state
      setActiveScreen(DEFAULT_SCREEN);
      setSelectedCompId(null);
      setViewMode('DESIGN');
  };

  // --- Drag & Drop Logic ---
  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
      e.dataTransfer.setData('componentType', type);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('componentType') as ComponentType;
      if(!type) return;

      const newComp: BuilderComponent = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          label: type === 'Footer' ? 'Continue' : `New ${type}`,
          name: `${type.toLowerCase()}_${Math.floor(Math.random()*1000)}`,
          required: false,
          options: (type === 'Radio' || type === 'Dropdown' || type === 'Checkbox') ? ['Option 1', 'Option 2'] : [],
          text: type === 'TextHeading' ? 'Heading Text' : (type === 'Body' ? 'Body text goes here...' : '')
      };

      const newChildren = [...activeScreen.children];
      // If Footer, always ensure it's at the end or replace existing footer? 
      // For simplicity, just append. User can reorder.
      newChildren.push(newComp);

      setActiveScreen(prev => ({ ...prev, children: newChildren }));
      setSelectedCompId(newComp.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  // --- Component Management ---
  const updateComponent = (id: string, updates: Partial<BuilderComponent>) => {
      setActiveScreen(prev => ({
          ...prev,
          children: prev.children.map(c => c.id === id ? { ...c, ...updates } : c)
      }));
  };

  const deleteComponent = (id: string) => {
      setActiveScreen(prev => ({
          ...prev,
          children: prev.children.filter(c => c.id !== id)
      }));
      if (selectedCompId === id) setSelectedCompId(null);
  };

  const moveComponent = (id: string, direction: 'UP' | 'DOWN') => {
      const index = activeScreen.children.findIndex(c => c.id === id);
      if (index < 0) return;
      if (direction === 'UP' && index === 0) return;
      if (direction === 'DOWN' && index === activeScreen.children.length - 1) return;

      const newChildren = [...activeScreen.children];
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      [newChildren[index], newChildren[targetIndex]] = [newChildren[targetIndex], newChildren[index]];
      
      setActiveScreen(prev => ({ ...prev, children: newChildren }));
  };

  // --- JSON Conversion ---
  const generateFlowJSON = () => {
      return {
          "version": "3.1",
          "screens": [
              {
                  "id": activeScreen.id,
                  "title": activeScreen.title,
                  "data": {},
                  "terminal": true,
                  "layout": {
                      "type": "SingleColumnLayout",
                      "children": activeScreen.children.map(comp => {
                          switch (comp.type) {
                              case 'TextHeading': return { type: "TextHeading", text: comp.text };
                              case 'Body': return { type: "TextBody", text: comp.text };
                              case 'TextInput': return { type: "TextInput", label: comp.label, name: comp.name, required: comp.required, "input-type": "text" };
                              case 'TextArea': return { type: "TextArea", label: comp.label, name: comp.name, required: comp.required };
                              case 'Dropdown': return { 
                                  type: "Dropdown", 
                                  label: comp.label, 
                                  name: comp.name, 
                                  required: comp.required,
                                  "data-source": comp.options.map(o => ({ id: o, title: o }))
                              };
                              case 'Radio': return {
                                  type: "RadioButtons",
                                  label: comp.label,
                                  name: comp.name,
                                  required: comp.required,
                                  "data-source": comp.options.map(o => ({ id: o, title: o }))
                              };
                              case 'Checkbox': return {
                                  type: "CheckboxGroup",
                                  label: comp.label,
                                  name: comp.name,
                                  required: comp.required,
                                  "data-source": comp.options.map(o => ({ id: o, title: o }))
                              };
                              case 'Footer': return {
                                  type: "Footer",
                                  label: comp.label,
                                  "on-click-action": {
                                      name: "complete",
                                      payload: activeScreen.children
                                          .filter(c => c.type !== 'Footer' && c.type !== 'TextHeading' && c.type !== 'Body')
                                          .reduce((acc, curr) => ({ ...acc, [curr.name]: `\${form.${curr.name}}` }), {})
                                  }
                              };
                              default: return {};
                          }
                      })
                  }
              }
          ]
      };
  };

  const handleSaveFlow = async () => {
      if(!editingFlow) return;
      setIsSaving(true);
      try {
          const credentials = whatsappApiService.getCredentials();
          const json = generateFlowJSON();
          
          if (credentials?.businessAccountId) {
              await whatsappApiService.updateFlowJson(credentials, editingFlow.id, json);
          } else {
              await new Promise(r => setTimeout(r, 500)); // Mock
          }
          alert("Flow Saved Successfully!");
      } catch (e: any) {
          alert("Error: " + e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handlePublish = async () => {
      if(!editingFlow) return;
      if(!window.confirm("Publishing will make this flow live.")) return;
      setIsPublishing(true);
      try {
           const credentials = whatsappApiService.getCredentials();
           if (credentials?.businessAccountId) {
              await whatsappApiService.publishFlow(credentials, editingFlow.id);
           } else {
              editingFlow.status = 'PUBLISHED';
              setFlows(prev => prev.map(f => f.id === editingFlow.id ? {...editingFlow} : f));
              await new Promise(r => setTimeout(r, 1000));
           }
           alert("Flow Published!");
           handleOpenEditor(editingFlow); // Refresh
      } catch (e: any) {
          alert("Error: " + e.message);
      } finally {
          setIsPublishing(false);
      }
  };

  // --- Toolbox Item ---
  const ToolboxItem = ({ type, label, icon: Icon }: { type: ComponentType, label: string, icon: any }) => (
      <div 
        draggable 
        onDragStart={(e) => handleDragStart(e, type)}
        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:bg-gray-50 hover:border-wa hover:shadow-sm transition-all"
      >
          <Icon className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
  );

  const selectedComponent = activeScreen.children.find(c => c.id === selectedCompId);

  // --- RENDER EDITOR ---
  if (editingFlow) {
      return (
          <div className="h-[calc(100vh-6rem)] flex flex-col bg-gray-50 -m-4 lg:-m-8">
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setEditingFlow(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                          <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                          <h2 className="font-bold text-gray-900 text-lg">{editingFlow.name}</h2>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                             <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">v3.1</span>
                             <span>•</span>
                             <span>{activeScreen.children.length} Components</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                       <button onClick={() => setViewMode('DESIGN')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'DESIGN' ? 'bg-white shadow text-wa' : 'text-gray-500 hover:text-gray-700'}`}>Design</button>
                       <button onClick={() => setViewMode('JSON')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'JSON' ? 'bg-white shadow text-wa' : 'text-gray-500 hover:text-gray-700'}`}>JSON</button>
                  </div>
                  <div className="flex gap-2">
                      <button 
                        onClick={handleSaveFlow}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                      >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                          Save
                      </button>
                      <button 
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="flex items-center gap-2 bg-wa text-white px-4 py-2 rounded-lg hover:bg-wa-dark text-sm font-medium transition-colors"
                      >
                          {isPublishing ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4" />}
                          Publish
                      </button>
                  </div>
              </div>

              {viewMode === 'JSON' ? (
                   <div className="flex-1 p-6 overflow-hidden">
                       <div className="h-full bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-700 flex flex-col">
                           <div className="bg-slate-800 px-4 py-2 text-xs text-slate-400 font-mono border-b border-slate-700 flex justify-between">
                               <span>flow.json</span>
                               <span>Read-only Preview</span>
                           </div>
                           <pre className="flex-1 p-4 text-xs font-mono text-green-400 overflow-auto">
                               {JSON.stringify(generateFlowJSON(), null, 2)}
                           </pre>
                       </div>
                   </div>
              ) : (
                  <div className="flex-1 flex overflow-hidden">
                      {/* Left Sidebar - Toolbox */}
                      <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shadow-sm z-10">
                          <div className="p-4 border-b border-gray-200">
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Components</h3>
                          </div>
                          <div className="p-4 space-y-3">
                              <ToolboxItem type="TextHeading" label="Heading" icon={Type} />
                              <ToolboxItem type="Body" label="Text Body" icon={AlignLeft} />
                              <ToolboxItem type="TextInput" label="Text Input" icon={Type} />
                              <ToolboxItem type="TextArea" label="Text Area" icon={AlignLeft} />
                              <ToolboxItem type="Dropdown" label="Dropdown" icon={List} />
                              <ToolboxItem type="Radio" label="Radio Buttons" icon={CheckSquare} />
                              <ToolboxItem type="Checkbox" label="Checkboxes" icon={CheckSquare} />
                              <div className="border-t border-gray-100 my-2 pt-2">
                                  <ToolboxItem type="Footer" label="Footer / Button" icon={MousePointerClick} />
                              </div>
                          </div>
                      </div>

                      {/* Center - Canvas */}
                      <div 
                        className="flex-1 flex items-center justify-center p-8 overflow-y-auto relative"
                        style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                      >
                           <div className="w-[375px] h-[750px] bg-white rounded-[3rem] border-8 border-gray-800 shadow-2xl flex flex-col overflow-hidden relative">
                               {/* Phone Notch */}
                               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-gray-800 rounded-b-xl z-20"></div>
                               
                               {/* Status Bar Mock */}
                               <div className="h-10 bg-wa-dark w-full shrink-0"></div>
                               <div className="h-12 bg-wa flex items-center px-4 text-white font-medium shadow-md shrink-0 z-10">
                                   <ArrowLeft className="w-5 h-5 mr-4" />
                                   {activeScreen.title}
                               </div>

                               {/* Droppable Area */}
                               <div 
                                  onDrop={handleDrop}
                                  onDragOver={handleDragOver}
                                  className="flex-1 overflow-y-auto bg-[#efe7dd] p-4 space-y-3 pb-20 scrollbar-hide"
                               >
                                  {activeScreen.children.length === 0 && (
                                      <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-white/50">
                                          <Smartphone className="w-8 h-8 mb-2 opacity-50" />
                                          <span className="text-sm">Drag components here</span>
                                      </div>
                                  )}

                                  {activeScreen.children.map((comp) => (
                                      <div 
                                        key={comp.id}
                                        onClick={() => setSelectedCompId(comp.id)}
                                        className={`relative group bg-white rounded-lg p-3 shadow-sm border-2 transition-all cursor-pointer ${selectedCompId === comp.id ? 'border-wa ring-2 ring-wa/20 z-10' : 'border-transparent hover:border-gray-300'}`}
                                      >
                                          {/* Component Rendering Simulation */}
                                          {comp.type === 'TextHeading' && <h3 className="font-bold text-gray-900 text-lg">{comp.text}</h3>}
                                          {comp.type === 'Body' && <p className="text-sm text-gray-600 whitespace-pre-wrap">{comp.text}</p>}
                                          
                                          {(comp.type === 'TextInput' || comp.type === 'TextArea') && (
                                              <div className="space-y-1">
                                                  <label className="text-xs font-bold text-gray-700 flex gap-1">
                                                      {comp.label} {comp.required && <span className="text-red-500">*</span>}
                                                  </label>
                                                  <div className={`w-full bg-white border border-gray-200 rounded p-2 text-sm text-gray-400 ${comp.type === 'TextArea' ? 'h-20' : 'h-10 flex items-center'}`}>
                                                      {comp.label} placeholder...
                                                  </div>
                                              </div>
                                          )}

                                          {(comp.type === 'Dropdown') && (
                                              <div className="space-y-1">
                                                  <label className="text-xs font-bold text-gray-700 flex gap-1">
                                                      {comp.label} {comp.required && <span className="text-red-500">*</span>}
                                                  </label>
                                                  <div className="w-full bg-white border border-gray-200 rounded p-2 text-sm text-gray-500 flex justify-between items-center h-10">
                                                      Select option... <MoveDown className="w-3 h-3" />
                                                  </div>
                                              </div>
                                          )}

                                          {(comp.type === 'Radio' || comp.type === 'Checkbox') && (
                                              <div className="space-y-2">
                                                  <label className="text-xs font-bold text-gray-700 flex gap-1">
                                                      {comp.label} {comp.required && <span className="text-red-500">*</span>}
                                                  </label>
                                                  {comp.options.map((opt, i) => (
                                                      <div key={i} className="flex items-center gap-2">
                                                          <div className={`w-4 h-4 border border-gray-300 ${comp.type === 'Radio' ? 'rounded-full' : 'rounded'}`}></div>
                                                          <span className="text-sm text-gray-800">{opt}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}

                                          {comp.type === 'Footer' && (
                                              <button className="w-full bg-wa text-white py-2.5 rounded-full font-bold text-sm shadow-md">
                                                  {comp.label}
                                              </button>
                                          )}

                                          {/* Hover Actions */}
                                          {selectedCompId === comp.id && (
                                            <div className="absolute -right-12 top-0 flex flex-col gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); moveComponent(comp.id, 'UP') }} className="p-1.5 bg-white shadow rounded hover:bg-gray-50 text-gray-600"><MoveUp className="w-4 h-4"/></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveComponent(comp.id, 'DOWN') }} className="p-1.5 bg-white shadow rounded hover:bg-gray-50 text-gray-600"><MoveDown className="w-4 h-4"/></button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id) }} className="p-1.5 bg-white shadow rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                          )}
                                      </div>
                                  ))}
                               </div>
                           </div>
                      </div>

                      {/* Right Sidebar - Properties */}
                      <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shadow-sm z-10">
                          <div className="p-4 border-b border-gray-200">
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Properties</h3>
                          </div>
                          
                          {selectedComponent ? (
                              <div className="p-4 space-y-4">
                                  <div className="text-xs text-gray-400 font-mono mb-2 uppercase flex justify-between">
                                      <span>ID: {selectedComponent.id.substring(0,6)}...</span>
                                      <span className="bg-gray-100 px-1 rounded">{selectedComponent.type}</span>
                                  </div>
                                  
                                  {/* Label / Text */}
                                  <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                          {(selectedComponent.type === 'TextHeading' || selectedComponent.type === 'Body') ? 'Text Content' : 'Label'}
                                      </label>
                                      {(selectedComponent.type === 'TextHeading' || selectedComponent.type === 'Body') ? (
                                           <textarea 
                                             value={selectedComponent.text}
                                             onChange={(e) => updateComponent(selectedComponent.id, { text: e.target.value })}
                                             className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                             rows={3}
                                           />
                                      ) : (
                                          <input 
                                             type="text"
                                             value={selectedComponent.label}
                                             onChange={(e) => updateComponent(selectedComponent.id, { label: e.target.value })}
                                             className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                          />
                                      )}
                                  </div>

                                  {/* Field Name (Data Key) */}
                                  {selectedComponent.type !== 'TextHeading' && selectedComponent.type !== 'Body' && selectedComponent.type !== 'Footer' && (
                                      <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Field Name (JSON Key)</label>
                                          <input 
                                             type="text"
                                             value={selectedComponent.name}
                                             onChange={(e) => updateComponent(selectedComponent.id, { name: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                                             className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono bg-gray-50"
                                          />
                                      </div>
                                  )}

                                  {/* Required Checkbox */}
                                  {selectedComponent.type !== 'TextHeading' && selectedComponent.type !== 'Body' && selectedComponent.type !== 'Footer' && (
                                      <div className="flex items-center gap-2 pt-1">
                                          <input 
                                              type="checkbox" 
                                              checked={selectedComponent.required}
                                              onChange={(e) => updateComponent(selectedComponent.id, { required: e.target.checked })}
                                              className="rounded text-wa focus:ring-wa"
                                          />
                                          <label className="text-sm text-gray-700">Required Field</label>
                                      </div>
                                  )}

                                  {/* Options Editor */}
                                  {(selectedComponent.type === 'Radio' || selectedComponent.type === 'Checkbox' || selectedComponent.type === 'Dropdown') && (
                                      <div className="border-t border-gray-100 pt-3">
                                          <label className="block text-xs font-medium text-gray-700 mb-2">Options</label>
                                          <div className="space-y-2">
                                              {selectedComponent.options.map((opt, idx) => (
                                                  <div key={idx} className="flex gap-2">
                                                      <input 
                                                          value={opt}
                                                          onChange={(e) => {
                                                              const newOpts = [...selectedComponent.options];
                                                              newOpts[idx] = e.target.value;
                                                              updateComponent(selectedComponent.id, { options: newOpts });
                                                          }}
                                                          className="flex-1 border border-gray-300 rounded p-1.5 text-sm"
                                                      />
                                                      <button 
                                                        onClick={() => {
                                                            const newOpts = selectedComponent.options.filter((_, i) => i !== idx);
                                                            updateComponent(selectedComponent.id, { options: newOpts });
                                                        }}
                                                        className="text-red-400 hover:text-red-600"
                                                      ><Trash2 className="w-4 h-4"/></button>
                                                  </div>
                                              ))}
                                              <button 
                                                onClick={() => updateComponent(selectedComponent.id, { options: [...selectedComponent.options, `Option ${selectedComponent.options.length + 1}`] })}
                                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                              >
                                                  <Plus className="w-3 h-3" /> Add Option
                                              </button>
                                          </div>
                                      </div>
                                  )}

                              </div>
                          ) : (
                              <div className="p-8 text-center text-gray-400 mt-20">
                                  <MousePointerClick className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">Select a component on the phone screen to edit properties.</p>
                              </div>
                          )}
                          
                          {/* Screen Settings (When nothing selected) */}
                          {!selectedComponent && (
                              <div className="p-4 border-t border-gray-200 mt-auto bg-gray-50">
                                  <h4 className="text-xs font-bold text-gray-500 mb-2">Screen Settings</h4>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Screen Title</label>
                                  <input 
                                      value={activeScreen.title}
                                      onChange={(e) => setActiveScreen(prev => ({ ...prev, title: e.target.value }))}
                                      className="w-full border border-gray-300 rounded p-2 text-sm"
                                  />
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // --- RENDER LIST ---
  return (
    <div className="space-y-6 relative">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Flows</h1>
          <p className="text-gray-500">Create and manage structured interactions</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-wa text-white px-4 py-2 rounded-lg hover:bg-wa-dark flex items-center gap-2 font-medium">
          <Plus className="w-4 h-4" /> Create Flow
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-wa" /></div>
        ) : flows.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
                <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Flows Yet</h3>
                <button onClick={() => setIsModalOpen(true)} className="text-wa font-medium hover:underline mt-2">Create your first flow</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {flows.map(flow => (
                    <div key={flow.id} className="border border-gray-200 rounded-lg p-5 hover:border-wa hover:shadow-md transition-all group bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-wa group-hover:text-white transition-colors">
                                <Workflow className="w-6 h-6" />
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${flow.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {flow.status}
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">{flow.name}</h3>
                        <p className="text-xs text-gray-500 mb-4 font-mono">ID: {flow.id}</p>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => handleOpenEditor(flow)}
                                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded py-2 hover:bg-white hover:text-wa font-medium transition-colors"
                             >
                                Edit Flow
                             </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Create New Flow</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleCreateFlow} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Flow Name</label>
                          <input 
                              type="text" value={newFlowName} onChange={(e) => setNewFlowName(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="e.g. Appointment Booking" autoFocus
                          />
                      </div>
                      <div className="pt-4 flex justify-end gap-3">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
                          <button type="submit" disabled={isCreating} className="px-4 py-2 bg-wa text-white rounded-lg text-sm font-medium flex items-center gap-2">
                              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

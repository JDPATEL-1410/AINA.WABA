
import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { WebhookLog } from '../types';
import { RefreshCw, CheckCircle, XCircle, Code } from 'lucide-react';

export const AdminWebhooks: React.FC = () => {
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        adminService.getWebhookLogs().then(data => {
            setLogs(data);
            setLoading(false);
        });
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Webhook Logs</h1>
                    <p className="text-gray-500">Monitor system-wide webhook delivery health</p>
                </div>
                <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg">
                    <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-medium">
                        <tr>
                            <th className="px-6 py-4">Time</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono">
                                    {new Date(log.createdAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">{log.userId}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.eventType}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {log.status === 'SUCCESS' ? (
                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><CheckCircle className="w-3 h-3"/> 200 OK</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold"><XCircle className="w-3 h-3"/> {log.statusCode}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-blue-600 hover:underline text-xs flex items-center gap-1 justify-end">
                                        <Code className="w-3 h-3"/> View Payload
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { AuditLog } from '../types';
import { Shield } from 'lucide-react';

export const AdminAudit: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);

    useEffect(() => {
        adminService.getAuditLogs().then(setLogs);
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                <p className="text-gray-500">Security and action trail for compliance</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-slate-50 text-slate-700 font-medium">
                        <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Actor</th>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                                    {new Date(log.createdAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                    <Shield className="w-3 h-3 text-slate-400" />
                                    {log.actorName}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-xs font-bold text-slate-700">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {log.details}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

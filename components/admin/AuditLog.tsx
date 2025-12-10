
import React, { useState } from 'react';
import { AuditLogEntry } from '../../types';

const AuditLog: React.FC = () => {
  const [logs] = useState<AuditLogEntry[]>([]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">SOP Ref</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                      {logs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                  {log.action}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {log.actorId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  {log.sopReference ? (
                                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded font-mono">
                                          {log.sopReference}
                                      </span>
                                  ) : <span className="text-slate-400">-</span>}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                  {log.details}
                              </td>
                          </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                                No audit logs found.
                            </td>
                        </tr>
                      )}
                  </tbody>
              </table>
          </div>
       </div>
    </div>
  );
};

export default AuditLog;

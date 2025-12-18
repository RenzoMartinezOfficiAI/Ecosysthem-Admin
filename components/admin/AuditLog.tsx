
import React, { useState } from 'react';
import { AuditLogEntry } from '../../types';

const AuditLog: React.FC = () => {
  const [logs] = useState<AuditLogEntry[]>([]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
       <div className="bg-matte-900 p-6 rounded-xl shadow-sm border border-matte-800">
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-matte-800">
                  <thead className="bg-matte-900/50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SOP Ref</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                  </thead>
                  <tbody className="bg-matte-900 divide-y divide-matte-800">
                      {logs.map(log => (
                          <tr key={log.id} className="hover:bg-matte-800/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                  {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                  {log.action}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                  {log.actorId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  {log.sopReference ? (
                                      <span className="px-2 py-1 bg-neon-blue/10 text-neon-blue text-xs rounded font-mono border border-neon-blue/20">
                                          {log.sopReference}
                                      </span>
                                  ) : <span className="text-gray-600">-</span>}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                  {log.details}
                              </td>
                          </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
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

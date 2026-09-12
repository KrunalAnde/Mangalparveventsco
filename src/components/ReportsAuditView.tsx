import React, { useState } from 'react';
import { EventItem, EventVendorAssignment, Quote, AuditLog, Vendor } from '../types';
import {
  BarChart3,
  Shield,
  TrendingUp,
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  IndianRupee,
  Layers,
} from 'lucide-react';

interface ReportsAuditViewProps {
  events: EventItem[];
  assignments: EventVendorAssignment[];
  quotes: Quote[];
  auditLogs: AuditLog[];
  vendors: Vendor[];
}

export const ReportsAuditView: React.FC<ReportsAuditViewProps> = ({
  events,
  assignments,
  quotes,
  auditLogs,
  vendors,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'audit'>('reports');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  // Compute Event-by-event Commercial Profitability
  const eventProfitability = events.map((evt) => {
    const evtAssignments = assignments.filter((a) => a.eventId === evt.id && a.status === 'Confirmed');
    const vendorCost = evtAssignments.reduce((sum, a) => sum + (a.agreedCost || 0), 0);
    const acceptedQuote = quotes.find((q) => q.eventId === evt.id && q.status === 'Accepted');
    const latestQuote = quotes.filter((q) => q.eventId === evt.id).sort((a, b) => b.version - a.version)[0];
    const revenue = acceptedQuote ? acceptedQuote.subtotal : latestQuote ? latestQuote.subtotal : evt.budgetMin;
    const grossMargin = Math.max(0, revenue - vendorCost);
    const marginPercent = revenue > 0 ? Math.round((grossMargin / revenue) * 100) : 0;

    return {
      id: evt.id,
      title: evt.title,
      customerName: evt.customerName,
      status: evt.status,
      revenue,
      vendorCost,
      grossMargin,
      marginPercent,
    };
  });

  const totalPortfolioRevenue = eventProfitability.reduce((sum, e) => sum + e.revenue, 0);
  const totalPortfolioCost = eventProfitability.reduce((sum, e) => sum + e.vendorCost, 0);
  const totalPortfolioMargin = totalPortfolioRevenue - totalPortfolioCost;
  const portfolioMarginPercent =
    totalPortfolioRevenue > 0 ? Math.round((totalPortfolioMargin / totalPortfolioRevenue) * 100) : 0;

  const filteredAuditLogs = auditLogs.filter((log) => {
    return (
      log.actorName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.entityType.toLowerCase().includes(auditSearch.toLowerCase())
    );
  });

  return (
    <div className="space-y-6" id="reports_audit_view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
            Analytics, Profitability & Audit Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            S19 / S16: Event commercial margin reports & tamper-resistant system audit trail
          </p>
        </div>

        <div className="flex items-center gap-2 border border-slate-200 bg-white p-1 rounded-xl shadow-2xs">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'reports' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profitability & Margin Reports
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'audit' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            System Audit Log ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Reports & Profitability */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-xs font-bold uppercase">Total Booked Volume</span>
              <div className="text-xl font-black text-slate-900 mt-1">{formatINR(totalPortfolioRevenue)}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">Across all active pipelines</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-xs font-bold uppercase">Vendor Outflows</span>
              <div className="text-xl font-black text-slate-900 mt-1">{formatINR(totalPortfolioCost)}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">Agreed partner obligations</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-xs font-bold uppercase">Gross Margin Profit</span>
              <div className="text-xl font-black text-emerald-700 mt-1">{formatINR(totalPortfolioMargin)}</div>
              <span className="text-[11px] text-emerald-600 mt-1 block">Retained company revenue</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-xs font-bold uppercase">Average Margin %</span>
              <div className="text-xl font-black text-amber-800 mt-1">{portfolioMarginPercent}%</div>
              <span className="text-[11px] text-slate-500 mt-1 block">Targeting 18-25% baseline</span>
            </div>
          </div>

          {/* Event-level Margin Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-5">
            <h3 className="font-bold text-sm text-slate-900">Event-Wise Profitability Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Event Name & Client</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Customer Revenue</th>
                    <th className="p-3 text-right">Direct Vendor Cost</th>
                    <th className="p-3 text-right">Gross Margin (₹)</th>
                    <th className="p-3 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {eventProfitability.map((ep) => (
                    <tr key={ep.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">
                        <div>{ep.title}</div>
                        <div className="text-slate-500 text-[11px]">{ep.customerName}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {ep.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatINR(ep.revenue)}</td>
                      <td className="p-3 text-right font-semibold text-slate-700">{formatINR(ep.vendorCost)}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">+{formatINR(ep.grossMargin)}</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded font-black text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {ep.marginPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Vendors by Reliability Score */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Top Rated Partner Network</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {vendors.slice(0, 3).map((v) => (
                <div key={v.id} className="p-3.5 rounded-lg border border-slate-200 space-y-1 text-xs">
                  <div className="font-bold text-slate-900">{v.businessName}</div>
                  <div className="text-slate-500">Categories: {v.categories.join(', ')}</div>
                  <div className="flex items-center justify-between pt-1">
                    <span>Quality Score: <strong>{v.qualityScore}%</strong></span>
                    <span>Reliability: <strong>{v.reliabilityScore}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: System Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Section 16: Audit Trail & Compliance Ledger</span>
              </h3>
              <p className="text-xs text-slate-500">
                Immutable records of quotation modifications, vendor assignments, status advances, and payments
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredAuditLogs.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No audit events matching criteria.
              </div>
            ) : (
              filteredAuditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {log.entityType}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{log.details}</p>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>👤 {log.actorName}</span>
                      <span>&bull;</span>
                      <span>Target ID: {log.entityId}</span>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

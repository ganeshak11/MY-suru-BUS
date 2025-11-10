'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline'; // ADDED icons

// Define the type for a report
interface Report {
    report_id: number;
    created_at: string;
    report_type: string;
    message: string;
    status: string;
    trip_id?: number;
    bus_id?: number;
}

// Define theme-aware statuses
const REPORT_STATUSES = {
    New: { color: 'bg-danger', text: 'text-white' },
    'In Progress': { color: 'bg-warning', text: 'text-foreground' },
    Resolved: { color: 'bg-success', text: 'text-white' },
    Archived: { color: 'bg-secondary', text: 'text-foreground' },
};

// --- ADDED: Report Stats Component ---
interface ReportStatsProps {
    reports: Report[];
}
function ReportStats({ reports }: ReportStatsProps) {
    const stats = useMemo(() => {
        const counts = { New: 0, 'In Progress': 0, Resolved: 0, total: reports.length };
        reports.forEach(r => {
            if (r.status in counts) {
                counts[r.status as keyof typeof counts]++;
            }
        });
        return counts;
    }, [reports]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <StatCard label="Total Reports" value={stats.total} className="bg-card shadow-lg" />
            <StatCard 
                label="New" 
                value={stats.New} 
                className="bg-danger shadow-lg text-white" 
                secondaryLabel="Immediate Action"
            />
            <StatCard 
                label="In Progress" 
                value={stats['In Progress']} 
                className="bg-warning shadow-lg" 
                secondaryLabel="Under Review"
            />
            <StatCard 
                label="Resolved" 
                value={stats.Resolved} 
                className="bg-success shadow-lg text-white"
            />
        </div>
    );
}

// Simple Stat Card for theme consistency
function StatCard({ label, value, className, secondaryLabel }: { label: string, value: number, className: string, secondaryLabel?: string }) {
    return (
        <div className={`p-4 rounded-lg border border-secondary/30 ${className}`}>
            <p className="text-sm font-medium opacity-80">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {secondaryLabel && <p className="text-xs opacity-70 mt-1">{secondaryLabel}</p>}
        </div>
    );
}
// --- END ADDED COMPONENTS ---


export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('All'); // ADDED filter state

    const supabase = createClientComponentClient();

    const fetchReports = async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase
            .from('passenger_reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('Error fetching reports:', fetchError);
            setError('Failed to load reports.');
        } else {
            setReports(data as Report[]);
        }
        setLoading(false);
    };

    const updateStatus = async (report_id: number, newStatus: string) => {
        setError(null);
        const { error: updateError } = await supabase
            .from('passenger_reports')
            .update({ status: newStatus })
            .eq('report_id', report_id);

        if (updateError) {
            alert('Failed to update status. Please try again.'); // Should use Modal for consistency
            console.error('Update error:', updateError);
            setError('Failed to update status. Please check server logs.');
        }
        // The real-time listener will handle the UI update
    };

    useEffect(() => {
        fetchReports();

        const channel = supabase
            .channel('passenger-reports-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'passenger_reports' },
                (payload) => {
                    // Refetch all data on any change for simplicity (can be optimized later)
                    fetchReports();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);
    
    // --- ADDED: Client-side filtering logic ---
    const filteredReports = reports.filter(r => 
        filterStatus === 'All' || r.status === filterStatus
    );

    const statuses = ['All', 'New', 'In Progress', 'Resolved'];

    // --- ADDED: Status to theme mapping function ---
    const getStatusClasses = (status: string) => {
        return REPORT_STATUSES[status as keyof typeof REPORT_STATUSES] || { color: 'bg-secondary', text: 'text-foreground' };
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="sm:flex sm:items-center justify-between">
                <div className="sm:flex-auto">
                    <h1 className="text-3xl font-bold text-foreground">Passenger Reports</h1>
                    <p className="mt-2 text-secondary">Feedback and issues submitted by passengers.</p>
                </div>
                {/* ADDED: Manual Refresh Button */}
                <button
                    onClick={fetchReports}
                    className="inline-flex items-center px-4 py-2 border border-secondary/50 rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-background/80 transition-colors mt-4 sm:mt-0"
                >
                    <ArrowPathIcon className="h-5 w-5 mr-2" />
                    Refresh
                </button>
            </div>

            {/* ADDED: Report Stats Visualization */}
            <ReportStats reports={reports} />
            
            {/* ADDED: Filter Bar */}
            <div className="mt-6 flex flex-wrap gap-2 items-center">
                <FunnelIcon className="h-5 w-5 text-secondary mr-2" />
                <span className="text-sm text-secondary">Filter:</span>
                {statuses.map(status => {
                    const statusClass = status === 'All' ? { color: 'bg-secondary/30', text: 'text-foreground' } : getStatusClasses(status);
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${statusClass.color} ${statusClass.text} ${filterStatus === status ? 'ring-2 ring-primary ring-offset-2' : 'hover:opacity-80'}`}
                        >
                            {status}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <p className="mt-8 text-center text-secondary">Loading reports...</p>
            ) : error ? (
                <p className="mt-8 text-center text-danger">{error}</p>
            ) : reports.length === 0 ? (
                <div className="mt-8 text-center bg-card p-6 rounded-lg border border-secondary/30">
                    <h3 className="mt-2 text-lg font-medium text-foreground">No reports found</h3>
                    <p className="mt-1 text-sm text-secondary">New reports from the passenger app will appear here.</p>
                </div>
            ) : (
                <div className="mt-8 space-y-4">
                    {filteredReports.map((report) => {
                        const classes = getStatusClasses(report.status);
                        return (
                            <div key={report.report_id} className="p-4 rounded-lg bg-card shadow border border-secondary/30">
                                <div className="flex justify-between items-start">
                                    <div className="flex-grow">
                                        <span 
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes.color} ${classes.text}`}>
                                            {report.status}
                                        </span>
                                        <p className="mt-2 text-sm font-semibold text-foreground">{report.report_type} {report.bus_id ? ` (Bus ID: ${report.bus_id})` : ''}</p>
                                        <p className="mt-1 text-sm text-secondary">{report.message}</p>
                                    </div>
                                    <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                                        <span className="text-xs text-secondary">{new Date(report.created_at).toLocaleString()}</span>
                                        <div className="flex space-x-2">
                                            {/* Status Update Buttons */}
                                            {report.status === 'New' && (
                                                <button onClick={() => updateStatus(report.report_id, 'In Progress')} className="text-xs px-3 py-1 rounded-md transition-colors bg-warning text-foreground hover:bg-warning/80 shadow-sm">Acknowledge</button>
                                            )}
                                            {report.status === 'In Progress' && (
                                                <button onClick={() => updateStatus(report.report_id, 'Resolved')} className="text-xs px-3 py-1 rounded-md transition-colors bg-success text-white hover:bg-success/80 shadow-sm">Resolve</button>
                                            )}
                                            {report.status !== 'Resolved' && report.status !== 'Archived' && (
                                                <button onClick={() => updateStatus(report.report_id, 'Archived')} className="text-xs px-3 py-1 rounded-md transition-colors bg-secondary/50 text-foreground hover:bg-secondary/70 shadow-sm">Archive</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
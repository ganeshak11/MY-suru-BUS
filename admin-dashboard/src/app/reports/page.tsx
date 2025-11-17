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
    driver_id?: number;
    route_id?: number;
    buses?: { bus_no: string };
    drivers?: { name: string };
    routes?: { route_name: string };
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
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterBus, setFilterBus] = useState('All');
    const [filterRoute, setFilterRoute] = useState('All');
    const [filterDriver, setFilterDriver] = useState('All');

    const supabase = createClientComponentClient();

    const fetchReports = async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase
            .from('passenger_reports')
            .select(`
                *,
                buses(bus_no),
                drivers(name),
                routes(route_name)
            `)
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
    const filteredReports = reports.filter(r => {
        if (filterStatus !== 'All' && r.status !== filterStatus) return false;
        if (filterBus !== 'All' && r.buses?.bus_no !== filterBus) return false;
        if (filterRoute !== 'All' && r.routes?.route_name !== filterRoute) return false;
        if (filterDriver !== 'All' && r.drivers?.name !== filterDriver) return false;
        return true;
    });

    const uniqueBuses = ['All', ...new Set(reports.filter(r => r.buses).map(r => r.buses!.bus_no))];
    const uniqueRoutes = ['All', ...new Set(reports.filter(r => r.routes).map(r => r.routes!.route_name))];
    const uniqueDrivers = ['All', ...new Set(reports.filter(r => r.drivers).map(r => r.drivers!.name))];

    const statuses = ['All', 'New', 'In Progress', 'Resolved'];

    // --- ADDED: Status to theme mapping function ---
    const getStatusClasses = (status: string) => {
        return REPORT_STATUSES[status as keyof typeof REPORT_STATUSES] || { color: 'bg-secondary', text: 'text-foreground' };
    };


    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Reports</h1>
                    <p className="text-secondary text-base">Passenger feedback and issues management</p>
                </div>
                <button
                    onClick={fetchReports}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-border rounded-xl text-sm font-semibold text-secondary hover:text-foreground hover:bg-card transition-all hover:shadow-md hover:border-primary/30"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                    Refresh
                </button>
            </div>

            {/* ADDED: Report Stats Visualization */}
            <ReportStats reports={reports} />
            
            <div className="my-8 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-foreground">Status:</span>
                    <div className="flex gap-2 flex-wrap">
                        {statuses.map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    filterStatus === status
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-card text-secondary hover:bg-primary/10 border border-border'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-foreground">Bus:</span>
                    <select
                        value={filterBus}
                        onChange={(e) => setFilterBus(e.target.value)}
                        className="px-4 py-2 rounded-lg text-sm bg-card border border-border text-foreground"
                    >
                        {uniqueBuses.map(bus => <option key={bus} value={bus}>{bus}</option>)}
                    </select>
                    <span className="text-sm font-medium text-foreground">Route:</span>
                    <select
                        value={filterRoute}
                        onChange={(e) => setFilterRoute(e.target.value)}
                        className="px-4 py-2 rounded-lg text-sm bg-card border border-border text-foreground"
                    >
                        {uniqueRoutes.map(route => <option key={route} value={route}>{route}</option>)}
                    </select>
                    <span className="text-sm font-medium text-foreground">Driver:</span>
                    <select
                        value={filterDriver}
                        onChange={(e) => setFilterDriver(e.target.value)}
                        className="px-4 py-2 rounded-lg text-sm bg-card border border-border text-foreground"
                    >
                        {uniqueDrivers.map(driver => <option key={driver} value={driver}>{driver}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 bg-primary/10 rounded-full"></div>
                        </div>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center shadow-soft">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl mb-3">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-red-700 dark:text-red-300 font-semibold text-lg">{error}</p>
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-card to-slate-50 dark:to-slate-900 rounded-2xl border border-border shadow-soft">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-4">
                        <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">No reports found</h3>
                    <p className="mt-2 text-secondary max-w-sm mx-auto">New reports from passengers will appear here</p>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-card to-slate-50 dark:to-slate-900 rounded-2xl border border-border shadow-soft">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/10 rounded-2xl mb-4">
                        <FunnelIcon className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">No reports match your filters</h3>
                    <p className="mt-2 text-secondary max-w-sm mx-auto">Try adjusting your filter criteria to see more results</p>
                    <button
                        onClick={() => { setFilterStatus('All'); setFilterBus('All'); setFilterRoute('All'); setFilterDriver('All'); }}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                    >
                        Clear All Filters
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReports.map((report) => {
                        const classes = getStatusClasses(report.status);
                        return (
                            <div key={report.report_id} className="p-6 rounded-2xl bg-card shadow-soft border-2 border-border hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                                <div className="flex justify-between items-start">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span 
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes.color} ${classes.text}`}>
                                                {report.status}
                                            </span>
                                            {report.buses && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                                    Bus {report.buses.bus_no}
                                                </span>
                                            )}
                                            {report.routes && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-secondary/20 text-foreground">
                                                    {report.routes.route_name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-sm font-semibold text-foreground">
                                            {report.report_type}
                                            {report.drivers && <span className="text-secondary font-normal"> • Driver: {report.drivers.name}</span>}
                                        </p>
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
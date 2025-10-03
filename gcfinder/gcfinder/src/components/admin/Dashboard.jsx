import React, { useEffect, useState } from 'react';
import {Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { getDashboardStats } from '../../admin-firebase';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A020F0', '#FF69B4', '#778899', '#2E8B57'];

const Dashboard = () => {
    const [mounted, setMounted] = useState(false);
    const [dashboardStats, setDashboardStats] = useState({
        pendingReports: { count: 0, fromYesterday: 0 },
        pendingClaims: { count: 0, fromYesterday: 0 }, 
        activeItems: { count: 0, fromYesterday: 0 }, 
        itemCategoryDistribution: [],
        reportResolutionData: [],
    });
    const [loadingStats, setLoadingStats] = useState(true);
    const [errorStats, setErrorStats] = useState(null);

    useEffect(() => {
        setMounted(true);
        const fetchDashboardData = async () => {
            setLoadingStats(true);
            setErrorStats(null);
            try {
                // Fetch all dashboard stats from backend API
                const stats = await getDashboardStats();
                
                setDashboardStats({
                    pendingReports: stats.pendingReports,
                    pendingClaims: stats.pendingClaims,
                    activeItems: stats.activeItems,
                    itemCategoryDistribution: stats.itemCategoryDistribution,
                    reportResolutionData: stats.reportResolutionData
                });

            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
                setErrorStats("Failed to load dashboard statistics.");
            } finally {
                setLoadingStats(false);
            }
        };

        fetchDashboardData();
        return () => setMounted(false);
    }, []);
    
    // Prepare stats for rendering
    const statsToRender = [
        {
            title: 'Pending Reports',
            count: loadingStats ? '...' : dashboardStats.pendingReports.count,
            change: loadingStats ? '...' : `+${dashboardStats.pendingReports.fromYesterday} from today/yesterday`,
            icon: 'fa-clipboard',
        },
        {
            title: 'Pending Claims',
            count: loadingStats ? '...' : dashboardStats.pendingClaims.count,
            change: loadingStats ? '...' : `+${dashboardStats.pendingClaims.fromYesterday} from today/yesterday`,
            icon: 'fa-hand-paper',
        },
        {
            title: 'Active Items',
            count: loadingStats ? '...' : dashboardStats.activeItems.count,
            change: loadingStats ? '...' : `+${dashboardStats.activeItems.fromYesterday} from today/yesterday`,
            icon: 'fa-box-open',
        }
    ];


    return (
        <div className="dashboard-container">
            {/* Stats Cards */}
            <div className="stats-container">
                {statsToRender.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon">
                            <i className={`fas ${stat.icon}`}></i>
                        </div>
                        <div className="stat-content">
                            <h3>{stat.title}</h3>
                            <div className="stat-number">{stat.count}</div>
                            <div className="stat-change">{stat.change}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            {/* Pie Chart Section */}
            <div className="dashboard-charts-container">
            <div className="dashboard-pie-chart-container"> {/* New container for Pie Chart */}
                <h2>Distribution of Item Categories Lost</h2>
                {errorStats && <p style={{color: 'red'}}>{errorStats}</p>} {/* Show general error if any */}
                {mounted && !loadingStats && !errorStats && dashboardStats.itemCategoryDistribution.length > 0 && (
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={dashboardStats.itemCategoryDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={window.innerWidth < 768 ? null : ({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                                fontSize={14}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {dashboardStats.itemCategoryDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend 
                                layout="horizontal"
                                iconSize={12}
                                wrapperStyle={{ fontSize: '14px' }}
                                formatter={window.innerWidth < 768 ? (value, entry) => {
                                    const total = dashboardStats.itemCategoryDistribution.reduce((sum, item) => sum + item.value, 0);
                                    const percentage = ((entry.payload.value / total) * 100).toFixed(1);
                                    return `${value}: ${entry.payload.value} (${percentage}%)`;
                                } : null}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
                {mounted && !loadingStats && !errorStats && dashboardStats.itemCategoryDistribution.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '20px' }}>No category data available to display.</p>
                )}
                {mounted && !loadingStats && !errorStats && (
                    <h3 style={{ textAlign: 'center', fontSize: '0.95rem', color: 'var(--sub-color)', fontWeight: 400, marginTop: '15px' }}>
                        Shows which types of items are most frequently lost.
                    </h3>
                )}
            </div>

            {/* Report Resolution Rate Pie Chart Section */}
            <div className="dashboard-resolution-chart-container"> {/* New container */}
                <h2>Resolution Rate of Reports</h2>
                {errorStats && <p style={{color: 'red'}}>{errorStats}</p>}
                {mounted && !loadingStats && !errorStats && dashboardStats.reportResolutionData.some(data => data.value > 0) && (
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={dashboardStats.reportResolutionData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={window.innerWidth < 768 ? null : ({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                                fontSize={14}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {dashboardStats.reportResolutionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Resolved' ? COLORS[1] : COLORS[3]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value, name, props) => {
                                const total = dashboardStats.reportResolutionData.reduce((sum, item) => sum + item.value, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [`${value} (${percentage}%)`, name];
                            }} />
                            <Legend 
                                layout="horizontal"
                                iconSize={12}
                                wrapperStyle={{ fontSize: '14px' }}
                                formatter={window.innerWidth < 768 ? (value, entry) => {
                                    const total = dashboardStats.reportResolutionData.reduce((sum, item) => sum + item.value, 0);
                                    const percentage = ((entry.payload.value / total) * 100).toFixed(1);
                                    return `${value}: ${entry.payload.value} (${percentage}%)`;
                                } : null}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
                {mounted && !loadingStats && !errorStats && !dashboardStats.reportResolutionData.some(data => data.value > 0) && (
                    <p style={{ textAlign: 'center', padding: '20px' }}>No report resolution data available.</p>
                )}
                 {mounted && !loadingStats && !errorStats && (
                    <h3 style={{ textAlign: 'center', fontSize: '0.95rem', color: 'var(--sub-color)', fontWeight: 400, marginTop: '15px' }}>
                        Percentage of cases successfully closed.
                    </h3>
                )}
            </div>
            </div>
        </div>
    );
};

export default Dashboard;
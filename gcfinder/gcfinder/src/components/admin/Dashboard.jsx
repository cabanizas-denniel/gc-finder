import React, { useEffect, useState } from 'react';
import {Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { getPendingItems, db } from '../../admin-firebase'; 
import { collection, query, where, getDocs } from 'firebase/firestore';

const wasTodayOrYesterday = (date) => {
    if (!date) return false;

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let comparisonDate = date;
    if (date.toDate) { // Firebase Timestamp
        comparisonDate = date.toDate();
    }

    const isToday = comparisonDate.getFullYear() === today.getFullYear() &&
                    comparisonDate.getMonth() === today.getMonth() &&
                    comparisonDate.getDate() === today.getDate();

    const isActuallyYesterday = comparisonDate.getFullYear() === yesterday.getFullYear() &&
                              comparisonDate.getMonth() === yesterday.getMonth() &&
                              comparisonDate.getDate() === yesterday.getDate();

    return isToday || isActuallyYesterday;
};

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
                // Fetch Pending Reports
                const pendingItemsData = await getPendingItems();
                let reportsFromTodayOrYesterday = 0;
                pendingItemsData.forEach(item => {
                    if (item.createdAt && wasTodayOrYesterday(item.createdAt)) {
                        reportsFromTodayOrYesterday++;
                    }
                });

                // Fetch Pending Claims
                const claimsRef = collection(db, 'claims');
                const qClaims = query(claimsRef, where('claimStatus', '==', 'Pending'));
                const claimsSnapshot = await getDocs(qClaims);
                let claimsFromTodayOrYesterday = 0;
                claimsSnapshot.forEach(doc => {
                    const claimData = doc.data();
                    if (claimData.createdAt && wasTodayOrYesterday(claimData.createdAt)) {
                        claimsFromTodayOrYesterday++;
                    }
                });

                // Fetch Active (Available) Items
                const itemsRef = collection(db, 'items');
                const qActiveItems = query(itemsRef, where('status', '==', 'Unclaimed'));
                const activeItemsSnapshot = await getDocs(qActiveItems);
                let activeItemsFromTodayOrYesterday = 0;
                activeItemsSnapshot.forEach(doc => {
                    const itemData = doc.data();
                    if (itemData.updatedAt && wasTodayOrYesterday(itemData.updatedAt)) {
                        activeItemsFromTodayOrYesterday++;
                    }
                });

                // Fetch Item Category Distribution
                const qItemsForCategories = query(
                    itemsRef,
                    where('adminApproval', '==', true) // Query only by adminApproval
                );
                const itemsForCategoriesSnapshot = await getDocs(qItemsForCategories);
                const categoryCounts = {};
                const excludedStatuses = ['Archived', 'Disapproved']; // Define statuses to exclude

                itemsForCategoriesSnapshot.forEach(doc => {
                    const itemData = doc.data();
                    // Client-side filtering for status
                    if (itemData.category && !excludedStatuses.includes(itemData.status)) {
                        categoryCounts[itemData.category] = (categoryCounts[itemData.category] || 0) + 1;
                    }
                });
                const newItemCategoryDistribution = Object.keys(categoryCounts).map(key => ({
                    name: key,
                    value: categoryCounts[key]
                }));

                // Fetch data for Report Resolution Rate
                const allItemsSnapshot = await getDocs(collection(db, 'items'));
                let resolvedCount = 0;
                let unresolvedCount = 0;
                allItemsSnapshot.forEach(doc => {
                    const itemData = doc.data();
                    const status = itemData.status;
                    if ((status !== 'Archived' && status === 'Claimed') || (status === 'Archived' && status === 'Claimed') || status === 'Claiming') {
                        resolvedCount++;
                    } else if ((status !== 'Archived' && status === 'Unclaimed') || (status === 'Pending' && itemData.adminApproval === true) || (status === 'Archived' && status !== 'Claimed')) {
                        unresolvedCount++;
                    }
                });
                const newReportResolutionData = [
                    { name: 'Resolved', value: resolvedCount },
                    { name: 'Unresolved', value: unresolvedCount },
                ];

                setDashboardStats(prevStats => ({
                    ...prevStats,
                    pendingReports: {
                        count: pendingItemsData.length,
                        fromYesterday: reportsFromTodayOrYesterday
                    },
                    pendingClaims: {
                        count: claimsSnapshot.size,
                        fromYesterday: claimsFromTodayOrYesterday
                    },
                    activeItems: {
                        count: activeItemsSnapshot.size,
                        fromYesterday: activeItemsFromTodayOrYesterday // Updated variable name
                    },
                    itemCategoryDistribution: newItemCategoryDistribution, // Set pie chart data
                    reportResolutionData: newReportResolutionData // Set resolution rate data
                }));

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
                                formatter={(value, entry) => {
                                    const total = dashboardStats.itemCategoryDistribution.reduce((sum, item) => sum + item.value, 0);
                                    const percentage = ((entry.payload.value / total) * 100).toFixed(1);
                                    return `${value}: ${entry.payload.value} (${percentage}%)`;
                                }}
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
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {dashboardStats.reportResolutionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Resolved' ? COLORS[1] : COLORS[3]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value, name, props) => [`${value} (${(props.payload.percent * 100).toFixed(0)}%)`, name]} />
                            <Legend 
                                layout="horizontal"
                                iconSize={12}
                                wrapperStyle={{ fontSize: '14px' }}
                                formatter={(value, entry) => {
                                    const total = dashboardStats.reportResolutionData.reduce((sum, item) => sum + item.value, 0);
                                    const percentage = ((entry.payload.value / total) * 100).toFixed(1);
                                    return `${value}: ${entry.payload.value} (${percentage}%)`;
                                }}
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
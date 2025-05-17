import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label
} from 'recharts';

const Dashboard = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const stats = [
        {
            title: 'Pending Reports',
            count: 2,
            change: '+1 from yesterday',
        },
        {
            title: 'Pending Claims',
            count: 2,
            change: '+1 from yesterday',
        },
        {
            title: 'Active Items',
            count: 6,
            change: '+3 from yesterday',
        }
    ];


    const reportVolumeByYearLevel = [
        { yearLevel: 'Freshman', reportVolume: 150 },
        { yearLevel: 'Sophomore', reportVolume: 220 },
        { yearLevel: 'Junior', reportVolume: 180 },
        { yearLevel: 'Senior', reportVolume: 250 },
    ];

    return (
        <div className="dashboard-container">
            {/* Stats Cards */}
            <div className="stats-cards">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon">
                            <i className={`fas ${index === 0 ? 'fa-clipboard' : index === 1 ? 'fa-hand-paper' : 'fa-box-open'}`}></i>
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
            <div className="dashboard-chart" style={{ width: '100%', height: '400px' }}>
                <h2>System Statistics</h2>
                {mounted && (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            data={reportVolumeByYearLevel}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 20,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="yearLevel">
                                <Label value="Year Level" position="insideBottom" />
                            </XAxis>
                            <YAxis label={{ value: 'Report Volume', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="reportVolume" fill="#8884d8" name="Report Volume" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
                <h3>Correlation Between Year Level and Report Volume</h3>
            </div>
        </div>
    );
};

export default Dashboard;
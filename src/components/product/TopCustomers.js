import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { api } from '../../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const TopCustomers = () => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    api.get('/api/dashboard/customers/top')
      .then(res => {
        const labels = res.data.map(c => c.name);
        const values = res.data.map(c => c.totalSpent);

        setChartData({
          labels,
          datasets: [{
            label: 'Total Spent ($)',
            data: values,
            backgroundColor: '#36a2eb'
          }]
        });
      })
      .catch(err => {
        console.error("Failed to load top customers", err);
      });
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true
      }
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', height: '400px', marginTop: '2rem' }}>
      <h3>👑 Top Customers</h3>
      {chartData ? <Bar data={chartData} options={options} /> : <p>Loading...</p>}
    </div>
  );
};

export default TopCustomers;

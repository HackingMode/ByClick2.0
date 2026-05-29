document.addEventListener('DOMContentLoaded', function () {

    // Mobile sidebar
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('overlay');
    const toggle   = document.getElementById('menuToggle');
    const open = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
    const close= () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    toggle.addEventListener('click', () => sidebar.classList.contains('active') ? close() : open());
    overlay.addEventListener('click', close);

    // Chart tab switching
    const tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach(t => t.addEventListener('click', function() {
        tabs.forEach(x => x.classList.remove('active'));
        this.classList.add('active');
    }));

    // ===== MAIN SALES CHART =====
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    const grad = salesCtx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(0,200,83,0.35)');
    grad.addColorStop(1, 'rgba(0,200,83,0.01)');

    new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: ['01 Mai','03 Mai','05 Mai','07 Mai','09 Mai','11 Mai','13 Mai','15 Mai','17 Mai'],
            datasets: [{
                data: [18000, 42000, 35000, 65000, 98500, 80000, 120000, 155000, 190000],
                borderColor: '#00c853',
                backgroundColor: grad,
                borderWidth: 2.5,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#00c853',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111',
                    titleColor: '#aaa',
                    bodyColor: '#fff',
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: ctx => `Vendas: ${ctx.raw.toLocaleString('pt-AO')} Kz`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
                y: {
                    beginAtZero: true, max: 220000,
                    grid: { color: '#f3f4f6' },
                    ticks: {
                        color: '#9ca3af', font: { size: 11 },
                        callback: v => v >= 1000 ? (v/1000)+'K' : v
                    }
                }
            }
        }
    });

    // ===== MINI: ORDERS BAR CHART =====
    const ordCtx = document.getElementById('ordersChart').getContext('2d');
    new Chart(ordCtx, {
        type: 'bar',
        data: {
            labels: ['S1','S2','S3','S4','S5','S6','S7'],
            datasets: [{
                data: [1, 2, 1, 3, 2, 4, 3],
                backgroundColor: 'rgba(59,130,246,0.6)',
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false, beginAtZero: true }
            }
        }
    });

    // ===== MINI: CATEGORY DOUGHNUT =====
    const catCtx = document.getElementById('catChart').getContext('2d');
    new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: ['Audio', 'Wearables', 'Periféricos'],
            datasets: [{
                data: [38, 32, 30],
                backgroundColor: ['#00c853', '#a855f7', '#3b82f6'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: c => `${c.label}: ${c.raw}%` }
                }
            }
        }
    });

});

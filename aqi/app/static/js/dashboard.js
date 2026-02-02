// Obtém o ID da sala pela URL
const params = new URLSearchParams(window.location.search);
const SALA_ID = params.get('sala_id');

// Validação de Segurança
if (!SALA_ID) {
    alert("Nenhuma sala selecionada! Redirecionando para a Home...");
    window.location.href = "/";
}

// Definição das Rotas da API baseadas no ID da sala
const API_URLS = {
    DATA: `/api/sensors/data/${SALA_ID}`,
    CONFORTO: `/api/sensors/conforto/${SALA_ID}`
};


// CONFIGURAÇÃO DOS GRÁFICOS (CHART.JS)

// Função helper para criar gráficos padronizados
function createChart(ctx, label, color) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { maxTicksLimit: 6, color: '#94a3b8' }
                },
                y: {
                    display: true,
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    beginAtZero: false
                }
            }
        }
    });
}

// Inicialização das Instâncias dos Gráficos
const charts = {
    co2: createChart(document.getElementById('co2Chart'), 'CO₂ (ppm)', '#ef4444'),
    tvoc: createChart(document.getElementById('tvocChart'), 'TVOC (ppb)', '#f59e0b'),
    temp: createChart(document.getElementById('tempChart'), 'Temperatura (°C)', '#3b82f6'),
    hum: createChart(document.getElementById('humChart'), 'Umidade (%)', '#10b981')
};


//LÓGICA DE BUSCA E ATUALIZAÇÃO

// Chamada a cada 5 segundos
async function updateDashboard() {
    await Promise.all([
        updateCharts(),
        updateConforto()
    ]);
}

//Atualização dos Gráficos
async function updateCharts() {
    try {
        const response = await fetch(API_URLS.DATA);
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Pega os 50 dados mais recentes e inverte para ordem cronológica
        const recentData = data.slice(0, 50).reverse();

        // Cria array de horários
        const labels = recentData.map(d => 
            new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );

        // Atualiza cada gráfico
        updateSingleChart(charts.co2, labels, recentData.map(d => d.co2));
        updateSingleChart(charts.tvoc, labels, recentData.map(d => d.tvoc));
        updateSingleChart(charts.temp, labels, recentData.map(d => d.temperature));
        updateSingleChart(charts.hum, labels, recentData.map(d => d.humidity));

    } catch (error) {
        console.error("Erro ao atualizar gráficos:", error);
    }
}

function updateSingleChart(chart, labels, data) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

//Atualização dos Cards e Termômetro
async function updateConforto() {
    try {
        const response = await fetch(API_URLS.CONFORTO);
        if (!response.ok) return;

        const data = await response.json();
        if (!data.avaliacoes) return;

        const a = data.avaliacoes;

        // Atualiza Cards
        updateCard('co2', a.co2.valor + ' ppm', a.co2.status);
        updateCard('tvoc', a.tvoc.valor + ' ppb', a.tvoc.status);
        updateCard('temp', a.temperatura.valor + ' °C', a.temperatura.status);
        updateCard('hum', a.umidade.valor + ' %', a.umidade.status);

        // Atualiza AQI
        updateAQI(a.aqi.valor, a.aqi.status);

    } catch (error) {
        console.error("Erro ao atualizar conforto:", error);
    }
}

// Helper para atualizar texto e classe CSS dos cards
function updateCard(type, value, status) {
    const valueEl = document.getElementById(`${type}-value`);
    const statusEl = document.getElementById(`${type}-status`);
    const cardEl = document.getElementById(`${type}Card`);

    if (valueEl) valueEl.innerText = value;
    if (statusEl) statusEl.innerText = status;

    // Remove classes antigas e adiciona nova baseada no status
    if (cardEl) {
        cardEl.classList.remove('ok', 'alerta', 'fora');
        if (status === 'OK' || status === 'Ideal' || status === 'Excelente') cardEl.classList.add('ok');
        else if (status === 'ALERTA' || status === 'Moderado') cardEl.classList.add('alerta');
        else cardEl.classList.add('fora');
    }
}

// Helper para o Termômetro Visual
function updateAQI(valor, statusTexto) {
    const liquid = document.getElementById('aqi-liquid');
    const bulb = document.querySelector('.bulb');
    const valueText = document.getElementById('aqi-value');
    const statusText = document.getElementById('aqi-status');

    if (!liquid) return;

    // Atualiza Textos
    if (valueText) valueText.innerText = valor;
    if (statusText) statusText.innerText = statusTexto;

    // Remove níveis antigos
    liquid.classList.remove('level-1', 'level-2', 'level-3', 'level-4', 'level-5');

    // Mapeamento de Cores e Classes
    const config = {
        1: { class: 'level-1', color: '#00e400' }, // Excelente
        2: { class: 'level-2', color: '#ffff00' }, // Bom
        3: { class: 'level-3', color: '#ff7e00' }, // Moderado
        4: { class: 'level-4', color: '#ff0000' }, // Ruim
        5: { class: 'level-5', color: '#7a0000' }  // Péssimo
    };

    const current = config[valor] || config[1];

    // Aplica nova altura e cor
    liquid.classList.add(current.class);
    
    // Sincroniza cores dos elementos
    if (bulb) bulb.style.backgroundColor = current.color;
    if (valueText) valueText.style.color = current.color;
    if (statusText) statusText.style.color = current.color;
}

//EXECUÇÃO

// Primeira chamada imediata
updateDashboard();

// Loop a cada 5 segundos
setInterval(updateDashboard, 5000);
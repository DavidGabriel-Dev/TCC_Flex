// Variáveis globais para armazenar os gráficos
let chartAir = null;
let chartClimate = null;

document.addEventListener("DOMContentLoaded", () => {
    // Carrega os dados assim que a página abre
    carregarDados();
    
    // Configura para atualizar os dados sozinho a cada 10 segundos
    setInterval(carregarDados, 10000);
});

function carregarDados() {
    if (typeof SALA_ID === 'undefined' || !SALA_ID) return;

    // Adicionamos o cabeçalho do Ngrok no Fetch (Javascript)
    fetch(`/api/sensors/historico?sala_id=${SALA_ID}`, {
        headers: {
            'ngrok-skip-browser-warning': 'true' // <-- O PASSE LIVRE AQUI
        }
    })
    .then(res => {
        // Se a resposta não for JSON (ex: página do Ngrok), deteta o erro
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new TypeError("O Ngrok bloqueou o pedido ou a sessão expirou.");
        }
        return res.json();
    })
    .then(dados => {
        if (dados.error) {
            console.error(dados.error);
            return;
        }
        
        if (dados.length === 0) {
            document.getElementById('sala-titulo').innerText = "Sala " + SALA_ID;
            document.getElementById('sala-desc').innerText = "Aguardando dados da ESP32...";
            return;
        }

        const atual = dados[dados.length - 1];
        
        document.getElementById('sala-titulo').innerText = "Monitoramento - Sala " + SALA_ID;
        document.getElementById('sala-desc').innerText = "Última leitura: " + atual.hora_formatada;
        
        document.getElementById('val-co2').innerText = atual.co2;
        document.getElementById('val-tvoc').innerText = atual.tvoc;
        
        if (atual.temperature !== null) {
            document.getElementById('val-temp').innerText = parseFloat(atual.temperature).toFixed(1) + "°C";
        }
        if (atual.humidity !== null) {
            document.getElementById('val-hum').innerText = parseFloat(atual.humidity).toFixed(0) + "%";
        }

        renderizarGraficos(dados);
    })
    .catch(err => {
        console.error("Erro ao desenhar gráficos:", err);
        document.getElementById('sala-desc').innerText = "Erro ao carregar dados. Prima F5.";
    });
}

function renderizarGraficos(dados) {
    // Separa os dados em listas para o Chart.js
    const labels = dados.map(d => d.hora_formatada);
    const co2Data = dados.map(d => d.co2);
    const tvocData = dados.map(d => d.tvoc);
    const tempData = dados.map(d => d.temperature);
    const humData = dados.map(d => d.humidity);

    // ==========================================
    // GRÁFICO 1: Qualidade do Ar (CO2 e TVOC)
    // ==========================================
    const ctxAir = document.getElementById('chartAirQuality').getContext('2d');
    
    // Destrói o gráfico antigo antes de desenhar o novo (evita sobreposição)
    if (chartAir) chartAir.destroy();

    chartAir = new Chart(ctxAir, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'CO2 (ppm)', 
                    data: co2Data, 
                    borderColor: '#0d6efd', 
                    backgroundColor: 'rgba(13, 110, 253, 0.1)', 
                    tension: 0.3, 
                    yAxisID: 'y' 
                },
                { 
                    label: 'TVOC (ppb)', 
                    data: tvocData, 
                    borderColor: '#ffc107', 
                    backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                    tension: 0.3, 
                    yAxisID: 'y1' 
                }
            ]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { labels: { color: '#fff' } } 
            },
            scales: {
                x: { ticks: { color: '#aaa' }, grid: { color: '#333' } },
                y: { type: 'linear', display: true, position: 'left', ticks: { color: '#aaa' }, grid: { color: '#333' } },
                y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#aaa' }, grid: { drawOnChartArea: false } }
            }
        }
    });

    // ==========================================
    // GRÁFICO 2: Clima (Temperatura e Umidade)
    // ==========================================
    const ctxClimate = document.getElementById('chartClimate').getContext('2d');
    
    if (chartClimate) chartClimate.destroy();

    chartClimate = new Chart(ctxClimate, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Temperatura (°C)', 
                    data: tempData, 
                    borderColor: '#dc3545', 
                    backgroundColor: 'rgba(220, 53, 69, 0.1)', 
                    tension: 0.3, 
                    yAxisID: 'y' 
                },
                { 
                    label: 'Umidade (%)', 
                    data: humData, 
                    borderColor: '#0dcaf0', 
                    backgroundColor: 'rgba(13, 202, 240, 0.1)', 
                    tension: 0.3, 
                    yAxisID: 'y1' 
                }
            ]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { labels: { color: '#fff' } } 
            },
            scales: {
                x: { ticks: { color: '#aaa' }, grid: { color: '#333' } },
                y: { type: 'linear', display: true, position: 'left', ticks: { color: '#aaa' }, grid: { color: '#333' } },
                y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#aaa' }, grid: { drawOnChartArea: false } }
            }
        }
    });
}
function baixarCSV() {
    const inicio = document.getElementById('dt-inicio').value;
    const fim = document.getElementById('dt-fim').value;

    if (!SALA_ID) return;

    let url = `/api/sensors/exportar_csv?sala_id=${SALA_ID}`;
    if (inicio && fim) {
        url += `&inicio=${inicio}&fim=${fim}`;
    }

    // Fetch com bypass do ngrok
    fetch(url, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    .then(response => {
        if (!response.ok) throw new Error("Erro ao gerar arquivo");
        return response.blob();
    })
    .then(blob => {
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = `relatorio_sala_${SALA_ID}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    })
    .catch(err => alert("Erro: " + err.message));
}
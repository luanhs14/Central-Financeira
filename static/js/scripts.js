/**
 * Central Financeira - scripts.js
 * Responsável por manipular interações dinâmicas e gráficos:
 * - Histórico de indicadores
 * - Simulador de investimento
 * - Comparador de aporte mensal
 */


// Função para formatar valores para o padrão brasileiro (R$ X.XXX,XX ou X,XX%)
function formatCurrencyBr(value, isPercentage = false, decimalPlaces = 2) {
    if (value === null || typeof value === 'undefined') {
        return 'N/A';
    }
    const valFloat = parseFloat(value);
    if (isNaN(valFloat)) {
        return 'N/A';
    }

    // Usa Intl.NumberFormat para formatação robusta de números e moedas
    // Adapta para percentagem se for o caso
    if (isPercentage) {
        // Para porcentagem, formata como decimal e adiciona o '%'
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        }).format(valFloat) + '%';
    } else {
        // Para moeda
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        }).format(valFloat);
    }
}


// ===========================================
// Funções para a página de Histórico
// ===========================================

// Renderiza o gráfico de histórico com base nos dados e ativos selecionados
function renderHistoricoChart(historicoData, selectedAssets) {
    const ctx = document.getElementById('historicoChart');
    if (!ctx) return; // Garante que o canvas existe

    // Destruir o gráfico existente se houver um para evitar sobreposição
    if (window.historicoChartInstance) {
        window.historicoChartInstance.destroy();
    }

    const labels = historicoData.map(item => {
        // Assume que item.data já é uma string de data válida (YYYY-MM-DD)
        const date = new Date(item.data);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }).reverse(); // Reverte para ter a data mais antiga primeiro

    const datasets = selectedAssets.map(asset => {
        // Mapeamento de nomes de ativos para exibição amigável
        const assetNames = {
            'selic': 'SELIC', 'cdi': 'CDI', 'dolar': 'Dólar', 'bitcoin': 'Bitcoin',
            'ibovespa': 'Ibovespa', 'sp500': 'S&P 500', 'ifix': 'IFIX', 'inpc': 'INPC',
            'ipca': 'IPCA', 'poupanca': 'Poupança'
        };
        const borderColorMap = {
            'selic': '#FF6384', 'cdi': '#36A2EB', 'dolar': '#FFCE56', 'bitcoin': '#4BC0C0',
            'ibovespa': '#9966FF', 'sp500': '#FF9F40', 'ifix': '#C9CBCF', 'inpc': '#E7E9ED',
            'ipca': '#8A2BE2', 'poupanca': '#32CD32'
        };
        const backgroundColorMap = {
            'selic': 'rgba(255, 99, 132, 0.2)', 'cdi': 'rgba(54, 162, 235, 0.2)',
            'dolar': 'rgba(255, 206, 86, 0.2)', 'bitcoin': 'rgba(75, 192, 192, 0.2)',
            'ibovespa': 'rgba(153, 102, 255, 0.2)', 'sp500': 'rgba(255, 159, 64, 0.2)',
            'ifix': 'rgba(201, 203, 207, 0.2)', 'inpc': 'rgba(231, 233, 237, 0.2)',
            'ipca': 'rgba(138, 43, 226, 0.2)', 'poupanca': 'rgba(50, 205, 50, 0.2)'
        };

        const data = historicoData.map(item => item[asset]).reverse(); // Reverte para alinhar com as labels
        
        // Verifica se o ativo é uma porcentagem para formatar o tooltip
        const isPercentage = ['selic', 'cdi', 'ifix', 'inpc', 'ipca', 'poupanca'].includes(asset);

        return {
            label: assetNames[asset] || asset,
            data: data,
            borderColor: borderColorMap[asset] || '#000000',
            backgroundColor: backgroundColorMap[asset] || 'rgba(0,0,0,0.1)',
            fill: false,
            tension: 0.1, // Linhas mais suaves
            hidden: false // Todos visíveis por padrão, mas pode ser mudado pelo usuário
        };
    });

    window.historicoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.parsed.y;
                            const asset = Object.keys(assetNames).find(key => assetNames[key] === datasetLabel);
                            const isPercentage = ['selic', 'cdi', 'ifix', 'inpc', 'ipca', 'poupanca'].includes(asset);
                            return `${datasetLabel}: ${formatCurrencyBr(value, isPercentage, 2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category', // Define o tipo de escala para categórica
                    labels: labels // Fornece as labels para a escala x
                },
                y: {
                    beginAtZero: false, // Pode não começar em zero para valores de mercado
                    ticks: {
                        callback: function(value, index, values) {
                            // Obtém o nome do dataset que está sendo exibido para determinar a formatação
                            const datasetIndex = values.findIndex(v => v.value === value);
                            if (datasetIndex !== -1 && window.historicoChartInstance.data.datasets.length > 0) {
                                const assetName = window.historicoChartInstance.data.datasets[datasetIndex].label;
                                const asset = Object.keys(assetNames).find(key => assetNames[key] === assetName);
                                const isPercentage = ['selic', 'cdi', 'ifix', 'inpc', 'ipca', 'poupanca'].includes(asset);
                                return formatCurrencyBr(value, isPercentage);
                            }
                            return value; // Valor padrão se não conseguir determinar o tipo
                        }
                    }
                }
            }
        }
    });
}


// Função para buscar dados do histórico da API
async function fetchHistoricoData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const selectedAssets = Array.from(document.querySelectorAll('input[name="asset"]:checked'))
                               .map(cb => cb.value);

    // Se nenhum ativo for selecionado, selecione todos (ou um padrão)
    if (selectedAssets.length === 0) {
        // Ou você pode optar por exibir uma mensagem ao usuário
        // Por enquanto, vamos retornar uma lista vazia ou lançar um erro para não carregar o gráfico.
        console.warn("Nenhum ativo selecionado. O gráfico não será renderizado.");
        renderHistoricoChart([], []); // Renderiza um gráfico vazio
        updateHistoricoTable([]); // Atualiza a tabela para vazia
        return;
    }

    const queryParams = new URLSearchParams({
        startDate: startDate,
        endDate: endDate,
        assets: selectedAssets.join(',')
    }).toString();

    try {
        const response = await fetch(`/api/historico?${queryParams}`);
        const data = await response.json();

        if (response.ok) {
            // Os dados vêm do mais recente para o mais antigo, precisamos inverter para o gráfico
            const historico = data.historico.reverse();
            renderHistoricoChart(historico, selectedAssets);
            updateHistoricoTable(historico);
        } else {
            console.error('Erro ao buscar histórico:', data.error);
            alert('Erro ao carregar o histórico: ' + data.error);
        }
    } catch (error) {
        console.error('Erro de rede ou ao processar dados:', error);
        alert('Ocorreu um erro ao conectar-se ao servidor ou processar os dados.');
    }
}

// Função para atualizar a tabela de histórico
function updateHistoricoTable(historicoData) {
    const tableBody = document.getElementById('historico-table-body');
    tableBody.innerHTML = ''; // Limpa a tabela

    if (historicoData.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 10; // Cobre todas as colunas
        cell.textContent = 'Nenhum dado encontrado para os filtros selecionados.';
        cell.className = 'text-center text-muted';
        return;
    }

    // Define a ordem das colunas e se são porcentagens
    const columnDefinitions = [
        { key: 'data', label: 'Data', isPercentage: false },
        { key: 'selic', label: 'SELIC', isPercentage: true },
        { key: 'cdi', label: 'CDI', isPercentage: true },
        { key: 'ipca', label: 'IPCA', isPercentage: true },
        { key: 'poupanca', label: 'Poupança', isPercentage: true },
        { key: 'ibovespa', label: 'Ibovespa', isPercentage: false },
        { key: 'dolar', label: 'Dólar', isPercentage: false },
        { key: 'bitcoin', label: 'Bitcoin', isPercentage: false },
        { key: 'ifix', label: 'IFIX', isPercentage: true },
        { key: 'inpc', label: 'INPC', isPercentage: true },
        { key: 'sp500', label: 'S&P 500', isPercentage: false }
    ];

    // Atualiza o cabeçalho da tabela dinamicamente
    const tableHeadRow = document.querySelector('#historico-table thead tr');
    tableHeadRow.innerHTML = '';
    const selectedAssetKeys = Array.from(document.querySelectorAll('input[name="asset"]:checked')).map(cb => cb.value);
    
    // Sempre adiciona a coluna de Data no cabeçalho
    tableHeadRow.insertCell().textContent = 'Data';

    columnDefinitions.forEach(col => {
        if (selectedAssetKeys.includes(col.key)) {
            const th = document.createElement('th');
            th.textContent = col.label;
            tableHeadRow.appendChild(th);
        }
    });


    historicoData.forEach(item => {
        const row = tableBody.insertRow();
        
        // Adiciona a célula de data
        const dateCell = row.insertCell();
        const date = new Date(item.data);
        dateCell.textContent = date.toLocaleDateString('pt-BR');

        // Adiciona as células dos ativos selecionados
        columnDefinitions.forEach(col => {
            if (selectedAssetKeys.includes(col.key)) {
                const cell = row.insertCell();
                const value = item[col.key];
                cell.textContent = formatCurrencyBr(value, col.isPercentage);
                cell.classList.add('text-end'); // Alinha valores à direita
            }
        });
    });
}


// Event Listeners para a página de Histórico
document.addEventListener('DOMContentLoaded', () => {
    // Busca inicial de dados ao carregar a página de histórico
    if (document.getElementById('historicoChart')) {
        fetchHistoricoData();

        // Adiciona event listeners para os filtros
        document.getElementById('start-date').addEventListener('change', fetchHistoricoData);
        document.getElementById('end-date').addEventListener('change', fetchHistoricoData);
        document.querySelectorAll('input[name="asset"]').forEach(checkbox => {
            checkbox.addEventListener('change', fetchHistoricoData);
        });
    }
});


// ===========================================
// Funções para o Comparador de Aporte Mensal
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('comparador-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault(); // Impede o envio padrão do formulário

            // Captura os dados do formulário
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            try {
                const response = await fetch('/api/comparar-aporte-mensal', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                
                if (response.ok) {
                    displayComparisonResults(result);
                    document.getElementById('resultado-comparacao').style.display = 'block';
                    document.getElementById('error-message').style.display = 'none';

                } else {
                    document.getElementById('error-message').textContent = result.error || 'Erro desconhecido.';
                    document.getElementById('error-message').style.display = 'block';
                    document.getElementById('resultado-comparacao').style.display = 'none';
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                document.getElementById('error-message').textContent = 'Erro ao comunicar com o servidor. Tente novamente.';
                document.getElementById('error-message').style.display = 'block';
                document.getElementById('resultado-comparacao').style.display = 'none';
            }
        });

        // Event listener para o botão de alternar detalhes
        document.getElementById('toggle-monthly-table').addEventListener('click', toggleMonthlyTable);
    }
});

function displayComparisonResults(data) {
    document.getElementById('montante-investido').textContent = formatCurrencyBr(data.montante_investido);
    document.getElementById('economia-juros').textContent = formatCurrencyBr(data.economia_juros_amortizacao);
    document.getElementById('diferenca-valor').textContent = formatCurrencyBr(data.diferenca);

    let recomendacaoPrincipal = '';
    let recomendacaoDiferenca = '';
    let recomendacaoClass = '';

    if (data.recomendacao === 'INVESTIR') {
        recomendacaoPrincipal = 'É melhor investir!';
        recomendacaoDiferenca = `Você teria R$ ${formatCurrencyBr(data.diferenca)} a mais investindo.`;
        recomendacaoClass = 'success-bg';
    } else if (data.recomendacao === 'AMORTIZAR') {
        recomendacaoPrincipal = 'É melhor amortizar!';
        recomendacaoDiferenca = `Você economizaria R$ ${formatCurrencyBr(data.diferenca)} amortizando.`;
        recomendacaoClass = 'danger-bg';
    } else {
        recomendacaoPrincipal = 'É indiferente!';
        recomendacaoDiferenca = 'Os resultados são muito próximos, considere outros fatores.';
        recomendacaoClass = 'neutral-bg';
    }

    const recomendacaoDiv = document.getElementById('recomendacao-principal-div');
    recomendacaoDiv.className = `highlight-recommendation ${recomendacaoClass} destaque`; // Aplica a classe de cor de fundo
    document.getElementById('recomendacao-principal').textContent = recomendacaoPrincipal;
    document.getElementById('recomendacao-diferenca').textContent = recomendacaoDiferenca;

    // Popula a tabela de detalhamento mensal
    const monthlyTableBody = document.getElementById('monthly-table-body');
    monthlyTableBody.innerHTML = '';

    // CORREÇÃO: Verifica se os dados de breakdown existem antes de tentar iterar
    if (data.monthly_breakdown_investimento && data.monthly_breakdown_investimento.length > 0 &&
        data.monthly_breakdown_amortizacao && data.monthly_breakdown_amortizacao.length > 0) {
        
        data.monthly_breakdown_investimento.forEach((item, index) => {
            const row = monthlyTableBody.insertRow();
            const monthCell = row.insertCell();
            const investCell = row.insertCell();
            const amortCell = row.insertCell();

            monthCell.textContent = item.mes;
            investCell.textContent = formatCurrencyBr(item.valor_acumulado);
            
            // CORREÇÃO: Verifica se o item correspondente existe no array de amortização
            const amortEquivalent = data.monthly_breakdown_amortizacao[index]?.economia_acumulada_equivalente;
            amortCell.textContent = formatCurrencyBr(amortEquivalent !== undefined ? amortEquivalent : 0);
        });
    } else {
        const row = monthlyTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3; // Cobre todas as colunas
        cell.textContent = 'Nenhum detalhe mensal disponível.';
        cell.className = 'text-center text-muted';
    }
}

function toggleMonthlyTable() {
    const tableDiv = document.getElementById('monthly-breakdown');
    if (tableDiv) {
        // Altera a visibilidade usando a propriedade 'display'
        tableDiv.style.display = tableDiv.style.display === 'none' || tableDiv.style.display === '' ? 'block' : 'none';
    }
}

// Função para exportar CSV (apenas para o comparador de aporte mensal)
function exportarCSV() {
    const table = document.getElementById('monthly-breakdown-table');
    if (!table) {
        alert("Tabela de detalhes mensais não encontrada.");
        return;
    }

    let csv = [];
    // Captura o cabeçalho
    const headerRow = table.querySelector('thead tr');
    let rowData = [];
    headerRow.querySelectorAll('th').forEach(th => {
        rowData.push(`"${th.textContent.trim()}"`);
    });
    csv.push(rowData.join(';')); // Usa ponto e vírgula como separador

    // Captura os dados da tabela
    table.querySelectorAll('tbody tr').forEach(row => {
        let rowData = [];
        row.querySelectorAll('td').forEach(td => {
            rowData.push(`"${td.textContent.trim()}"`);
        });
        csv.push(rowData.join(';'));
    });

    const csvString = csv.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'comparacao_aporte_mensal.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Adiciona listener ao botão de exportar CSV (se existir na página)
document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('export-csv-button');
    if (exportButton) {
        exportButton.addEventListener('click', exportarCSV);
    }
});

// ===========================================

// Script para adicionar animações e interatividade às taxas
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar animação de fade-in aos cards quando entram na tela
    const cards = document.querySelectorAll('.taxas-indicadores-section .card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    });

    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    // Adicionar efeito de "pulse" nos valores quando a página carrega
    setTimeout(() => {
        const values = document.querySelectorAll('.taxas-indicadores-section .card-value');
        values.forEach(value => {
            value.style.animation = 'pulse 0.5s ease-in-out';
        });
    }, 1000);
});

// Animação CSS para o pulse
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
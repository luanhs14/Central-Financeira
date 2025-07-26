/**
 * Central Financeira - scripts.js (Versão Corrigida)
 * Responsável por manipular interações dinâmicas e gráficos
 */

// ===========================================
// Configurações Globais - Corrigidas
// ===========================================

// Declaração única e segura das variáveis globais
window.centralFinanceiraGlobals = window.centralFinanceiraGlobals || {
    chartInstances: {
        historico: null
    },
    isInitialized: false
};

// ===========================================
// Funções Utilitárias
// ===========================================

function formatCurrencyBr(value, isPercentage = false) {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    
    if (isPercentage) {
        return num.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }) + '%';
    } else {
        return 'R$ ' + num.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }
}

function getAssetColor(asset) {
    const colors = {
        selic: '#FF6384',      // Rosa/Vermelho
        cdi: '#36A2EB',        // Azul
        dolar: '#FFCE56',      // Amarelo
        bitcoin: '#FF9500',    // Laranja Bitcoin
        ibovespa: '#4BC0C0',   // Verde água
        sp500: '#9966FF',      // Roxo
        ifix: '#FF6B9D',       // Rosa claro
        ipca: '#36A2EB',       // Azul (diferente do CDI)
        inpc: '#8FBC8F',       // Verde claro
        poupanca: '#32CD32'    // Verde
    };
    return colors[asset.toLowerCase()] || '#6B7280';
}

function getAssetInfo(asset) {
    const info = {
        selic: { label: 'SELIC', type: 'percentage', category: 'taxa' },
        cdi: { label: 'CDI', type: 'percentage', category: 'taxa' },
        dolar: { label: 'Dólar (US$)', type: 'currency', category: 'moeda' },
        bitcoin: { label: 'Bitcoin', type: 'currency', category: 'crypto' },
        ibovespa: { label: 'Ibovespa', type: 'points', category: 'indice' },
        sp500: { label: 'S&P 500', type: 'points', category: 'indice' },
        ifix: { label: 'IFIX', type: 'percentage', category: 'fii' },
        ipca: { label: 'IPCA', type: 'percentage', category: 'inflacao' },
        inpc: { label: 'INPC', type: 'percentage', category: 'inflacao' },
        poupanca: { label: 'Poupança', type: 'percentage', category: 'taxa' }
    };
    return info[asset.toLowerCase()] || { label: asset.toUpperCase(), type: 'number', category: 'outros' };
}

function validateDates(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate > endDate) {
        showNotification('A data final deve ser maior que a data inicial', 'error');
        return false;
    }
    
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365 * 2) { // Máximo 2 anos
        showNotification('O período selecionado é muito longo. Máximo: 2 anos.', 'warning');
        return false;
    }
    
    return true;
}

function showNotification(message, type = 'info') {
    // Remove notificações anteriores
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}
            </span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove após 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// ===========================================
// Funções para Gráficos
// ===========================================

function getChartOptions(hasMultipleTypes = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 12
                    }
                },
                onClick: function(e, legendItem, legend) {
                    const index = legendItem.datasetIndex;
                    const chart = legend.chart;
                    const meta = chart.getDatasetMeta(index);
                    
                    meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
                    chart.update();
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#ccc',
                borderWidth: 1,
                callbacks: {
                    title: function(context) {
                        return `Data: ${context[0].label}`;
                    },
                    label: function(context) {
                        const asset = context.dataset.label.toLowerCase().replace(/[^a-z]/g, '');
                        const info = getAssetInfo(asset);
                        const value = context.parsed.y;
                        
                        let formattedValue;
                        if (info.type === 'percentage') {
                            formattedValue = value.toFixed(2) + '%';
                        } else if (info.type === 'currency') {
                            formattedValue = formatCurrencyBr(value);
                        } else if (info.type === 'points') {
                            formattedValue = value.toLocaleString('pt-BR') + ' pts';
                        } else {
                            formattedValue = value.toFixed(2);
                        }
                        
                        return `${context.dataset.label}: ${formattedValue}`;
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Período',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: hasMultipleTypes ? 'Valores' : 'Valor',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    callback: function(value) {
                        // Se há múltiplos tipos, usa formatação genérica
                        if (hasMultipleTypes) {
                            return value.toLocaleString('pt-BR');
                        }
                        
                        // Detecta o tipo baseado no primeiro dataset visível
                        const chart = this.chart;
                        const visibleDatasets = chart.data.datasets.filter((dataset, index) => {
                            const meta = chart.getDatasetMeta(index);
                            return !meta.hidden;
                        });
                        
                        if (visibleDatasets.length > 0) {
                            const firstAsset = visibleDatasets[0].label.toLowerCase().replace(/[^a-z]/g, '');
                            const info = getAssetInfo(firstAsset);
                            
                            if (info.type === 'percentage') {
                                return value.toFixed(1) + '%';
                            } else if (info.type === 'currency') {
                                return 'R$ ' + value.toFixed(0);
                            } else if (info.type === 'points') {
                                return value.toLocaleString('pt-BR');
                            }
                        }
                        
                        return value.toLocaleString('pt-BR');
                    }
                }
            }
        },
        elements: {
            line: {
                tension: 0.2
            },
            point: {
                radius: 3,
                hoverRadius: 6
            }
        }
    };
}

// ===========================================
// Funções para Histórico
// ===========================================

function renderHistoricoChart(data, assets) {
    try {
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('Nenhum dado disponível para o gráfico');
        }

        const canvas = document.getElementById('historicoChart');
        if (!canvas) {
            throw new Error('Canvas do gráfico não encontrado');
        }

        // Preparação dos dados
        const sortedData = [...data].sort((a, b) => new Date(a.data) - new Date(b.data));
        
        const labels = sortedData.map(item => {
            const date = new Date(item.data);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
        });

        // Criação dos datasets
        const datasets = assets
            .filter(asset => sortedData.some(item => item[asset] !== undefined && item[asset] !== null))
            .map(asset => {
                const info = getAssetInfo(asset);
                return {
                    label: info.label,
                    data: sortedData.map(item => {
                        const value = Number(item[asset]);
                        return isNaN(value) ? null : value;
                    }),
                    borderColor: getAssetColor(asset),
                    backgroundColor: getAssetColor(asset) + '20',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: false,
                    pointBackgroundColor: getAssetColor(asset),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                };
            });

        if (datasets.length === 0) {
            throw new Error('Nenhum dataset válido encontrado');
        }

        // Destruição segura do gráfico anterior
        if (window.centralFinanceiraGlobals.chartInstances.historico) {
            window.centralFinanceiraGlobals.chartInstances.historico.destroy();
            window.centralFinanceiraGlobals.chartInstances.historico = null;
        }

        // Detecta se há múltiplos tipos de dados
        const types = [...new Set(datasets.map(d => {
            const asset = d.label.toLowerCase().replace(/[^a-z]/g, '');
            return getAssetInfo(asset).type;
        }))];
        const hasMultipleTypes = types.length > 1;

        // Criação do novo gráfico
        const ctx = canvas.getContext('2d');
        window.centralFinanceiraGlobals.chartInstances.historico = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: getChartOptions(hasMultipleTypes)
        });

        // Atualiza informações do período
        updateChartPeriodInfo(sortedData[0].data, sortedData[sortedData.length - 1].data);

    } catch (error) {
        console.error('Erro no gráfico:', error);
        showNotification(`Erro ao renderizar gráfico: ${error.message}`, 'error');
        
        // Mostra mensagem de erro no canvas
        const canvas = document.getElementById('historicoChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6B7280';
            ctx.font = '16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Erro ao carregar gráfico', canvas.width / 2, canvas.height / 2);
        }
    }
}

function updateChartPeriodInfo(startDate, endDate) {
    const periodInfo = document.getElementById('chart-period-info');
    if (periodInfo) {
        const start = new Date(startDate).toLocaleDateString('pt-BR');
        const end = new Date(endDate).toLocaleDateString('pt-BR');
        periodInfo.textContent = `Período: ${start} até ${end}`;
    }
}

async function fetchHistoricoData() {
    try {
        // Validação de elementos
        const startDateEl = document.getElementById('start-date');
        const endDateEl = document.getElementById('end-date');
        
        if (!startDateEl || !endDateEl) {
            throw new Error('Elementos de data não encontrados');
        }

        const startDate = startDateEl.value;
        const endDate = endDateEl.value;

        if (!startDate || !endDate) {
            throw new Error('Por favor, selecione as datas inicial e final');
        }

        if (!validateDates(startDate, endDate)) {
            return;
        }

        const selectedAssets = Array.from(document.querySelectorAll('input[name="asset"]:checked'))
            .map(el => el.value);

        if (selectedAssets.length === 0) {
            showNotification('Selecione pelo menos um indicador', 'warning');
            return;
        }

        // Mostra loading
        showLoadingState(true);

        // Requisição à API
        const params = new URLSearchParams({
            startDate,
            endDate,
            assets: selectedAssets.join(',')
        });

        const response = await fetch(`/api/historico?${params}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
        }

        const result = await response.json();
        
        if (!result?.historico?.length) {
            throw new Error('Nenhum dado encontrado para o período e indicadores selecionados');
        }

        // Atualização da interface
        renderHistoricoChart(result.historico, selectedAssets);
        updateHistoricoTable(result.historico, selectedAssets);
        
        showNotification(`Dados carregados com sucesso! ${result.historico.length} registros encontrados.`, 'success');

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        showNotification(`Erro ao carregar dados: ${error.message}`, 'error');
        showLoadingState(false);
    } finally {
        showLoadingState(false);
    }
}

function updateHistoricoTable(data, selectedAssets) {
    try {
        const table = document.getElementById('historico-table');
        const tbody = document.getElementById('historico-table-body');
        const headerRow = document.getElementById('historico-table-header-row');
        
        if (!table || !tbody || !headerRow) {
            console.warn('Elementos da tabela não encontrados');
            return;
        }

        // Limpa conteúdo anterior
        tbody.innerHTML = '';
        headerRow.innerHTML = '<th class="sticky-col">Data</th>';

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="no-data-cell">
                        <div class="no-data-message">
                            <i class="fas fa-chart-line"></i>
                            <p>Nenhum dado disponível para o período selecionado</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Ordena dados por data
        const sortedData = [...data].sort((a, b) => new Date(b.data) - new Date(a.data));

        // Cria cabeçalhos dinamicamente
        selectedAssets.forEach(asset => {
            const info = getAssetInfo(asset);
            const th = document.createElement('th');
            th.textContent = info.label;
            th.setAttribute('data-asset', asset);
            headerRow.appendChild(th);
        });

        // Preenche dados
        sortedData.forEach(item => {
            const row = tbody.insertRow();
            
            // Coluna de data (fixa)
            const dateCell = row.insertCell();
            dateCell.className = 'sticky-col date-cell';
            const date = new Date(item.data);
            dateCell.innerHTML = `
                <div class="date-display">
                    <span class="date-main">${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    <span class="date-year">${date.getFullYear()}</span>
                </div>
            `;

            // Colunas de valores
            selectedAssets.forEach(asset => {
                const cell = row.insertCell();
                const info = getAssetInfo(asset);
                const value = item[asset];
                
                cell.setAttribute('data-asset', asset);
                cell.className = 'value-cell';
                
                if (value === null || value === undefined || value === '') {
                    cell.innerHTML = '<span class="no-value">-</span>';
                } else {
                    const numValue = Number(value);
                    if (isNaN(numValue)) {
                        cell.innerHTML = '<span class="invalid-value">N/A</span>';
                    } else {
                        let formattedValue;
                        let className = '';
                        
                        if (info.type === 'percentage') {
                            formattedValue = numValue.toFixed(2) + '%';
                            className = 'percentage-value';
                        } else if (info.type === 'currency') {
                            formattedValue = formatCurrencyBr(numValue);
                            className = 'currency-value';
                        } else if (info.type === 'points') {
                            formattedValue = numValue.toLocaleString('pt-BR') + ' pts';
                            className = 'points-value';
                        } else {
                            formattedValue = numValue.toFixed(2);
                            className = 'number-value';
                        }
                        
                        cell.innerHTML = `<span class="${className}">${formattedValue}</span>`;
                    }
                }
            });
        });

    } catch (error) {
        console.error('Erro ao atualizar tabela:', error);
        showNotification('Erro ao atualizar tabela de dados', 'error');
    }
}

function showLoadingState(show) {
    const tbody = document.getElementById('historico-table-body');
    const chartCanvas = document.getElementById('historicoChart');
    
    if (show) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="loading-cell">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Carregando dados...</span>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        if (chartCanvas) {
            const ctx = chartCanvas.getContext('2d');
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
            ctx.fillStyle = '#6B7280';
            ctx.font = '16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Carregando dados...', chartCanvas.width / 2, chartCanvas.height / 2);
        }
    }
}

// ===========================================
// Funções de Controle
// ===========================================

function selectAllAssets() {
    const checkboxes = document.querySelectorAll('input[name="asset"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    fetchHistoricoData();
}

function clearAllAssets() {
    const checkboxes = document.querySelectorAll('input[name="asset"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Limpa o gráfico e tabela
    const tbody = document.getElementById('historico-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="no-data-cell">
                    <div class="no-data-message">
                        <i class="fas fa-chart-line"></i>
                        <p>Selecione os indicadores para visualizar os dados</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    if (window.centralFinanceiraGlobals.chartInstances.historico) {
        window.centralFinanceiraGlobals.chartInstances.historico.destroy();
        window.centralFinanceiraGlobals.chartInstances.historico = null;
    }
}

function exportTableToCSV() {
    try {
        const table = document.getElementById('historico-table');
        if (!table) {
            showNotification('Tabela não encontrada para exportação', 'error');
            return;
        }

        let csv = [];
        
        // Cabeçalho
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
            const headers = Array.from(headerRow.querySelectorAll('th')).map(th => 
                `"${th.textContent.trim()}"`
            );
            csv.push(headers.join(';'));
        }

        // Dados
        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length > 1) { // Ignora linhas de loading/erro
                const rowData = cells.map(td => {
                    const text = td.textContent.trim().replace(/"/g, '""'); // Escapa aspas duplas
                    return `"${text}"`;
                });
                csv.push(rowData.join(';'));
            }
        });

        if (csv.length <= 1) {
            showNotification('Nenhum dado disponível para exportação', 'warning');
            return;
        }

        // Cria e baixa o arquivo
        const csvContent = csv.join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para UTF-8
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `historico_rendimentos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        showNotification('Arquivo CSV exportado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao exportar CSV:', error);
        showNotification('Erro ao exportar arquivo CSV', 'error');
    }
}

// ===========================================
// Inicialização Segura
// ===========================================

function initHistoricoPageSafe() {
    try {
        // Previne inicialização múltipla
        if (window.centralFinanceiraGlobals.isInitialized) {
            console.log('Página já inicializada');
            return;
        }

        // Verifica se estamos na página correta
        const chartCanvas = document.getElementById('historicoChart');
        if (!chartCanvas) {
            console.log('Canvas não encontrado - não é a página de histórico');
            return;
        }

        console.log('Inicializando página de histórico...');

        // Configura datas padrão se não estiverem definidas
        const startDateEl = document.getElementById('start-date');
        const endDateEl = document.getElementById('end-date');
        
        if (startDateEl && endDateEl) {
            if (!startDateEl.value || !endDateEl.value) {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1); // 1 mês atrás
                
                startDateEl.value = startDate.toISOString().split('T')[0];
                endDateEl.value = endDate.toISOString().split('T')[0];
            }
        }

        // Configura event listeners
        setupEventListeners();
        
        // Carrega dados iniciais
        fetchHistoricoData();
        
        // Marca como inicializado
        window.centralFinanceiraGlobals.isInitialized = true;
        
        console.log('Página de histórico inicializada com sucesso');

    } catch (error) {
        console.error('Erro na inicialização:', error);
        showNotification('Erro ao inicializar a página', 'error');
    }
}

function setupEventListeners() {
    try {
        // Event listeners para filtros de data
        const startDateEl = document.getElementById('start-date');
        const endDateEl = document.getElementById('end-date');
        
        if (startDateEl && endDateEl) {
            startDateEl.addEventListener('change', fetchHistoricoData);
            endDateEl.addEventListener('change', fetchHistoricoData);
        }

        // Event listeners para checkboxes
        const assetCheckboxes = document.querySelectorAll('input[name="asset"]');
        assetCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', fetchHistoricoData);
        });

        // Botões de controle
        const applyBtn = document.getElementById('apply-filters-btn');
        const selectAllBtn = document.getElementById('select-all-btn');
        const clearAllBtn = document.getElementById('clear-all-btn');
        const exportBtn = document.getElementById('export-csv-btn');

        if (applyBtn) {
            applyBtn.addEventListener('click', fetchHistoricoData);
        }

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', selectAllAssets);
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', clearAllAssets);
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', exportTableToCSV);
        }

        console.log('Event listeners configurados com sucesso');

    } catch (error) {
        console.error('Erro ao configurar event listeners:', error);
    }
}

// ===========================================
// Funções para outras páginas (mantidas para compatibilidade)
// ===========================================

function displayComparisonResults(data) {
    const montanteEl = document.getElementById('montante-investido');
    const economiaEl = document.getElementById('economia-juros');
    const diferencaEl = document.getElementById('diferenca-valor');

    if (montanteEl) montanteEl.textContent = formatCurrencyBr(data.montante_investido);
    if (economiaEl) economiaEl.textContent = formatCurrencyBr(data.economia_juros_amortizacao);
    if (diferencaEl) diferencaEl.textContent = formatCurrencyBr(data.diferenca);

    let recomendacaoPrincipal = '';
    let recomendacaoDiferenca = '';
    let recomendacaoClass = '';

    if (data.recomendacao === 'INVESTIR') {
        recomendacaoPrincipal = 'É melhor investir!';
        recomendacaoDiferenca = `Você teria ${formatCurrencyBr(data.diferenca)} a mais investindo.`;
        recomendacaoClass = 'success-bg';
    } else if (data.recomendacao === 'AMORTIZAR') {
        recomendacaoPrincipal = 'É melhor amortizar!';
        recomendacaoDiferenca = `Você economizaria ${formatCurrencyBr(data.diferenca)} amortizando.`;
        recomendacaoClass = 'danger-bg';
    } else {
        recomendacaoPrincipal = 'É indiferente!';
        recomendacaoDiferenca = 'Os resultados são muito próximos, considere outros fatores.';
        recomendacaoClass = 'neutral-bg';
    }

    const recomendacaoDiv = document.getElementById('recomendacao-principal-div');
    if (recomendacaoDiv) {
        recomendacaoDiv.className = `highlight-recommendation ${recomendacaoClass} destaque`;
    }

    const recomendacaoPrincipalEl = document.getElementById('recomendacao-principal');
    const recomendacaoDiferencaEl = document.getElementById('recomendacao-diferenca');
    
    if (recomendacaoPrincipalEl) recomendacaoPrincipalEl.textContent = recomendacaoPrincipal;
    if (recomendacaoDiferencaEl) recomendacaoDiferencaEl.textContent = recomendacaoDiferenca;

    const monthlyTableBody = document.getElementById('monthly-table-body');
    if (monthlyTableBody) {
        monthlyTableBody.innerHTML = '';

        if (data.monthly_breakdown_investimento && data.monthly_breakdown_investimento.length > 0 &&
            data.monthly_breakdown_amortizacao && data.monthly_breakdown_amortizacao.length > 0) {
            
            data.monthly_breakdown_investimento.forEach((item, index) => {
                const row = monthlyTableBody.insertRow();
                const monthCell = row.insertCell();
                const investCell = row.insertCell();
                const amortCell = row.insertCell();

                monthCell.textContent = item.mes;
                investCell.textContent = formatCurrencyBr(item.valor_acumulado);
                
                const amortEquivalent = data.monthly_breakdown_amortizacao[index]?.economia_acumulada_equivalente;
                amortCell.textContent = formatCurrencyBr(amortEquivalent !== undefined ? amortEquivalent : 0);
            });
        } else {
            const row = monthlyTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 3;
            cell.textContent = 'Nenhum detalhe mensal disponível.';
            cell.className = 'text-center text-muted';
        }
    }
}

function toggleMonthlyTable() {
    const tableDiv = document.getElementById('tabela-evolucao');
    const btn = document.getElementById('toggle-monthly-table');
    
    if (tableDiv && btn) {
        if (tableDiv.style.display === 'none' || tableDiv.style.display === '') {
            tableDiv.style.display = 'block';
            btn.textContent = 'Ocultar evolução mês a mês';
            
            if (document.getElementById('monthly-table-body').children.length === 0) {
                if (typeof calcularComparacao === 'function') {
                    calcularComparacao();
                }
            }
        } else {
            tableDiv.style.display = 'none';
            btn.textContent = 'Ver evolução mês a mês';
        }
    }
}

function exportarCSV() {
    const table = document.getElementById('monthly-breakdown-table');
    if (!table) {
        showNotification("Tabela de detalhes mensais não encontrada.", 'error');
        return;
    }

    let csv = [];
    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
        let rowData = [];
        headerRow.querySelectorAll('th').forEach(th => {
            rowData.push(`"${th.textContent.trim()}"`);
        });
        csv.push(rowData.join(';'));
    }

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

// ===========================================
// Inicialização de Animações (mantida para compatibilidade)
// ===========================================

function initAnimations() {
    const cards = document.querySelectorAll('.taxas-indicadores-section .card');
    if (cards.length === 0) return;

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

    setTimeout(() => {
        const values = document.querySelectorAll('.taxas-indicadores-section .card-value');
        values.forEach(value => {
            value.style.animation = 'pulse 0.5s ease-in-out';
        });
    }, 1000);
}

// ===========================================
// Event Listeners Globais
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, iniciando aplicação...');
    
    // Inicializa animações se existirem
    initAnimations();
    
    // Outros event listeners para outras páginas podem ser adicionados aqui
    const comparadorForm = document.getElementById('comparador-form');
    if (comparadorForm) {
        comparadorForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (typeof calcularComparacao === 'function') {
                await calcularComparacao();
            }
        });
    }

    const exportButton = document.getElementById('export-csv-button');
    if (exportButton) {
        exportButton.addEventListener('click', exportarCSV);
    }
});

// Adiciona estilos de animação CSS dinamicamente
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 400px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease-out;
    }
    
    .notification-info { background-color: #EBF8FF; border-left: 4px solid #3182CE; }
    .notification-success { background-color: #F0FFF4; border-left: 4px solid #48BB78; }
    .notification-warning { background-color: #FFFBEB; border-left: 4px solid #ED8936; }
    .notification-error { background-color: #FED7D7; border-left: 4px solid #E53E3E; }
    
    .notification-content {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        color: #2D3748;
    }
    
    .notification-icon {
        margin-right: 10px;
        font-size: 18px;
    }
    
    .notification-message {
        flex: 1;
        font-weight: 500;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #718096;
        margin-left: 10px;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);
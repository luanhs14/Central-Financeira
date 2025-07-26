# app.py
from flask import Flask, render_template, request, jsonify, send_file
from datetime import datetime, timedelta # Certifique-se de que datetime está importado
import sqlite3
import os
import time

# Importe o APScheduler
from flask_apscheduler import APScheduler

# --- IMPORTAÇÕES IMPORTANTES ---
# Certifique-se de que 'scripts.database' e 'scripts.fetch_data' existam e estejam corretos.
# A pasta 'scripts' deve estar no mesmo nível de 'app.py' ou configurada no PYTHONPATH.
from scripts.database import obter_taxa_atual, init_db

# Corrigido: Se calculations.py estiver dentro de uma pasta 'utils'
from utils.calculations import calcular_rendimentos, comparar_aporte_mensal_detalhado
# Se calculations.py estiver no mesmo nível que app.py, use:
# from calculations import calcular_rendimentos, comparar_aporte_mensal_detalhado


# Importe a função de atualização do seu fetch_data.py
# Certifique-se de que fetch_data.py está dentro da pasta 'scripts'
from scripts.fetch_data import update_database_job

class Config:
    SCHEDULER_API_ENABLED = True
    JOBS = [
        {
            'id': 'update_rates_job',
            'func': update_database_job,
            'trigger': 'interval',
            'seconds': 600, # A cada 10 minutos
            'next_run_time': datetime.now() # Inicia imediatamente após o servidor
        }
    ]

app = Flask(__name__)
app.config.from_object(Config())
app.config['DATABASE'] = os.path.join(os.path.dirname(__file__), 'data', 'financas.db')

# --- Filtro de formatação para o padrão brasileiro ---
def format_currency_br(value, is_percentage=False, decimal_places=2):
    if value is None:
        return 'N/A'
    try:
        val_float = float(value)
    except (ValueError, TypeError):
        return 'N/A'

    if is_percentage:
        # Para percentual, formata com casas decimais e adiciona %
        formatted_value = f"{val_float:.{decimal_places}f}"
        # Substitui ponto por vírgula para decimais
        formatted_value = formatted_value.replace('.', ',')
        return f"{formatted_value}%"
    else:
        # Para moeda, usa formatação brasileira
        return f"R$ {val_float:,.{decimal_places}f}".replace(",", "X").replace(".", ",").replace("X", ".")


app.jinja_env.filters['currency_br'] = format_currency_br

# Inicializa o banco de dados
with app.app_context():
    init_db()

# Cria o scheduler e o inicia
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()


# --- Rotas da Aplicação ---

@app.route('/')
def index():
    rates = {
        'selic': obter_taxa_atual('selic'),
        'cdi': obter_taxa_atual('cdi'),
        'ipca': obter_taxa_atual('ipca'),
        'poupanca': obter_taxa_atual('poupanca'),
        'ibovespa': obter_taxa_atual('ibovespa'),
        'dolar': obter_taxa_atual('dolar'),
        'bitcoin': obter_taxa_atual('bitcoin'),
        'ifix': obter_taxa_atual('ifix'),
        'inpc': obter_taxa_atual('inpc'),
        'sp500': obter_taxa_atual('sp500')
    }
    # Obter o ano atual para o rodapé
    now = datetime.now()
    return render_template('index.html', rates=rates, now=now)

@app.route('/simulador', methods=['GET', 'POST'])
def simulador():
    resultado = None
    erro = None
    if request.method == 'POST':
        try:
            valor_inicial = request.form['valor'].replace('.', '').replace(',', '.') # Trata a vírgula
            periodo = request.form['periodo']
            tipo_rendimento = request.form['tipo_rendimento']
            taxa_personalizada = request.form.get('rendimento_personalizado') # Pode ser None

            # Obter a taxa com base no tipo de rendimento selecionado
            if tipo_rendimento == 'outro':
                if not taxa_personalizada:
                    raise ValueError("Por favor, insira a taxa personalizada.")
                taxa = float(taxa_personalizada.replace(',', '.'))
            else:
                taxa = obter_taxa_atual(tipo_rendimento)
                if taxa is None:
                    # Se a taxa obtida da base de dados for None, use um valor padrão ou retorne erro.
                    # Para taxas obtidas da API, pode levar um tempo até ter dados.
                    # Aqui, apenas alerta que não está disponível.
                    erro = f"Taxa de {tipo_rendimento.upper()} não encontrada ou disponível. Tente novamente mais tarde."
                    return render_template('simulador.html', resultado=resultado, erro=erro, now=datetime.now())


            resultado = calcular_rendimentos(
                valor_inicial=valor_inicial,
                taxa=taxa,
                periodo_meses=periodo
            )

        except ValueError as e:
            erro = str(e)
        except Exception as e:
            erro = f"Ocorreu um erro inesperado: {str(e)}"

    # --- CORREÇÃO: Passa 'now' para o template ---
    return render_template('simulador.html', resultado=resultado, erro=erro, now=datetime.now())


@app.route('/comparador', methods=['GET', 'POST'])
def comparador_investimento():
    if request.method == 'POST':
        return api_comparar_aporte_mensal()
    return render_template('comparador.html', now=datetime.now())

@app.route('/api/comparar-aporte-mensal', methods=['POST'])
def api_comparar_aporte_mensal():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Dados inválidos"}), 400

    try:
        # Extração de dados do JSON e tratamento de formato para float
        # Garante que os valores não são vazios antes de tentar replace e float
        valor_disponivel_mensal = data.get('valor_disponivel_mensal', '').replace('.', '').replace(',', '.')
        num_parcelas_restantes = data.get('num_parcelas_restantes', '')
        taxa_rendimento_mensal = data.get('taxa_rendimento_mensal', '').replace(',', '.')
        taxa_juros_financiamento_mensal = data.get('taxa_juros_financiamento_mensal', '').replace(',', '.')

        # Converte para float/int. Se a string estiver vazia, float() ou int() falharão com ValueError.
        valor_disponivel_mensal = float(valor_disponivel_mensal) if valor_disponivel_mensal else 0.0
        num_parcelas_restantes = int(num_parcelas_restantes) if num_parcelas_restantes else 0
        taxa_rendimento_mensal = float(taxa_rendimento_mensal) if taxa_rendimento_mensal else 0.0
        taxa_juros_financiamento_mensal = float(taxa_juros_financiamento_mensal) if taxa_juros_financiamento_mensal else 0.0


        # --- CHAMADA DA FUNÇÃO CORRETA ---
        resultado = comparar_aporte_mensal_detalhado(
            valor_disponivel_mensal,
            num_parcelas_restantes,
            taxa_rendimento_mensal,
            taxa_juros_financiamento_mensal
        )

        # A função comparar_aporte_mensal_detalhado já retorna um dicionário com 'erro' se houver.
        if 'erro' in resultado:
            return jsonify({"error": resultado['erro']}), 400

        return jsonify(resultado), 200

    except ValueError as ve:
        # Captura erros de conversão de tipo (ex: texto em campo numérico)
        return jsonify({"error": f"Erro de formato nos dados. Por favor, verifique se todos os campos numéricos estão corretos. Detalhes: {str(ve)}"}), 400
    except KeyError as ke:
        # Captura campos faltando na requisição JSON
        return jsonify({"error": f"Campo obrigatório faltando na requisição. Detalhes: {str(ke)}"}), 400
    except Exception as e:
        # Captura qualquer outro erro inesperado no backend
        print(f"Erro interno no servidor (api_comparar_aporte_mensal): {e}") # Imprime no console do servidor
        return jsonify({"error": "Ocorreu um erro interno no servidor ao processar a comparação."}), 500


@app.route('/historico')
def historico_page():
    # Define datas padrão (últimos 30 dias)
    data_final = datetime.now()
    data_inicial = data_final - timedelta(days=30)
    
    return render_template('historico.html', 
                         data_inicial_padrao=data_inicial.strftime('%Y-%m-%d'),
                         data_final_padrao=data_final.strftime('%Y-%m-%d'),
                         now=datetime.now())

@app.route('/api/historico', methods=['GET'])
def api_historico():
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    assets = request.args.get('assets', '')

    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()

    # Define todos os ativos disponíveis para o histórico
    all_assets = ['selic', 'cdi', 'dolar', 'bitcoin', 'ibovespa', 'sp500', 'ifix', 'inpc', 'ipca', 'poupanca']

    # Se 'assets' for fornecido, use-o; caso contrário, use todos
    if assets:
        selected_assets = assets.split(',')
        # Garante que apenas ativos válidos sejam selecionados
        selected_assets = [asset for asset in selected_assets if asset in all_assets]
        if not selected_assets: # Se a lista ficar vazia após validação, mostrar todos
            selected_assets = all_assets
    else:
        selected_assets = all_assets

    columns_to_select = ['data'] + selected_assets
    columns_str = ", ".join(f'"{col}"' for col in columns_to_select)  # Adiciona aspas para nomes de colunas

    query = f"SELECT {columns_str} FROM ativos"
    conditions = []
    query_params = []

    if start_date:
        try:
            # Valida e formata a data
            datetime.strptime(start_date, '%Y-%m-%d')
            conditions.append("data >= ?")
            query_params.append(start_date)
        except ValueError:
            return jsonify({"error": "Formato de data inicial inválido. Use YYYY-MM-DD."}), 400

    if end_date:
        try:
            # Valida e formata a data
            datetime.strptime(end_date, '%Y-%m-%d')
            conditions.append("data <= ?")
            query_params.append(end_date)
        except ValueError:
            return jsonify({"error": "Formato de data final inválido. Use YYYY-MM-DD."}), 400

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY data DESC" # Ordena do mais recente para o mais antigo

    try:
        cursor.execute(query, query_params)
        historico = cursor.fetchall()
        conn.close()

        historico_formatado = []
        if historico:
            for item in historico:
                record_dict = {'data': item[0]}
                for i, col_name in enumerate(columns_to_select[1:]):
                    value = item[i+1]
                    record_dict[col_name] = float(value) if value is not None else None
                historico_formatado.append(record_dict)

        return jsonify({'historico': historico_formatado}), 200

    except sqlite3.Error as e:
        print(f"Erro no banco de dados: {e}")
        return jsonify({"error": "Erro ao buscar dados do histórico no banco de dados."}), 500
    except Exception as e:
        print(f"Erro inesperado na API do histórico: {e}")
        return jsonify({"error": "Erro interno do servidor ao carregar histórico."}), 500


if __name__ == '__main__':
    # Garante que o diretório 'data' exista
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    app.run(debug=True) # Mude para debug=False em produção
# scripts/fetch_data.py
import requests
import sqlite3
from datetime import datetime
import os
import time

# Importa a chave da API do seu arquivo config.py
# Certifique-se de que config.py está no mesmo nível de app.py
try:
    from config import ALPHA_VANTAGE_API_KEY
except ImportError:
    print("ERRO: O arquivo config.py ou a chave ALPHA_VANTAGE_API_KEY não foi encontrada.")
    print("Por favor, crie um arquivo config.py na raiz do projeto com ALPHA_VANTAGE_API_KEY = 'SUA_CHAVE_AQUI'")
    ALPHA_VANTAGE_API_KEY = "DEMO" # Chave DEMO limitada do Alpha Vantage para evitar crashes


DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'financas.db')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def fetch_alpha_vantage_data(function, **kwargs):
    """
    Função genérica para buscar dados do Alpha Vantage.
    function: A função da API (ex: "GLOBAL_QUOTE", "FX_DAILY", "DIGITAL_CURRENCY_DAILY")
    kwargs: Parâmetros adicionais específicos da função (ex: symbol='IBM', from_symbol='USD', to_symbol='BRL', market='USD')
    """
    base_url = "https://www.alphavantage.co/query"
    params = {
        "function": function,
        "apikey": ALPHA_VANTAGE_API_KEY
    }
    
    # Adiciona parâmetros específicos com base na função
    if function == "GLOBAL_QUOTE":
        params["symbol"] = kwargs.get("symbol")
        print(f"Buscando dados para {params.get('symbol')} com função {function}...")
    elif function == "FX_DAILY":
        params["from_symbol"] = kwargs.get("from_symbol")
        params["to_symbol"] = kwargs.get("to_symbol")
        print(f"Buscando dados para {params.get('from_symbol')}/{params.get('to_symbol')} com função {function}...")
    elif function == "DIGITAL_CURRENCY_DAILY":
        params["symbol"] = kwargs.get("symbol") # Símbolo da cripto (ex: BTC)
        params["market"] = kwargs.get("market") # Moeda do mercado (ex: USD)
        print(f"Buscando dados para {params.get('symbol')}/{params.get('market')} com função {function}...")
    else:
        # Para outras funções não explicitamente tratadas, apenas passa kwargs
        params.update(kwargs)
        print(f"Buscando dados com função {function} e parâmetros adicionais {kwargs}...")


    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status() # Lança um erro para status HTTP ruins (4xx ou 5xx)
        data = response.json()

        # Verifica se há mensagens de erro da API (limite de chamada, etc.)
        if "Error Message" in data:
            print(f"Erro da API Alpha Vantage: {data['Error Message']}")
            return None
        if "Note" in data:
            print(f"Nota da API Alpha Vantage: {data['Note']}")
            # Isso geralmente indica limite de chamadas. Espere um pouco mais.
            time.sleep(16) # Pausa maior se o limite for atingido
            return None
        
        # Verifica se a resposta não está vazia ou malformada
        if not data:
            print(f"Resposta vazia ou inválida da API Alpha Vantage para função {function}.")
            return None

        # Pequena pausa para respeitar o limite de 5 requisições por minuto (12 segundos por requisição)
        time.sleep(13) # Ajuste este valor se continuar recebendo "Note" ou "Error Message"
        return data
    except requests.exceptions.RequestException as e:
        print(f"Erro ao buscar dados do Alpha Vantage: {e}")
        return None
    except ValueError as e: # Erro ao decodificar JSON
        print(f"Erro ao decodificar resposta JSON do Alpha Vantage: {e}")
        # print(f"Resposta bruta: {response.text}") # Descomente para depurar a resposta bruta
        return None
    except Exception as e:
        print(f"Erro inesperado em fetch_alpha_vantage_data: {e}")
        return None


def update_database_job():
    """
    Função agendada para buscar e atualizar os dados no banco de dados.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Criar a tabela se não existir (garante que as colunas existem)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ativos (
            data TEXT PRIMARY KEY,
            selic REAL,
            cdi REAL,
            ipca REAL,
            poupanca REAL,
            ibovespa REAL,
            dolar REAL,
            bitcoin REAL,
            ifix REAL,
            inpc REAL,
            sp500 REAL
        )
    """)
    conn.commit()

    today_str = datetime.now().strftime('%Y-%m-%d')
    print(f"Executando job de atualização de dados para {today_str}...")

    # --- Dados de Mercado (Alpha Vantage) ---
    # Alpha Vantage não tem Ibovespa e IFIX diretos na API gratuita.
    # Usaremos ETFs como proxy para Ibovespa (EWZ) e S&P 500 (SPY).
    
    sp500_data = fetch_alpha_vantage_data("GLOBAL_QUOTE", symbol="SPY") # S&P 500
    ibovespa_data = fetch_alpha_vantage_data("GLOBAL_QUOTE", symbol="EWZ") # Ibovespa
    
    # Para Dólar (Forex Exchange Rate)
    dolar_data = fetch_alpha_vantage_data("FX_DAILY", from_symbol="USD", to_symbol="BRL")
    
    # Para Bitcoin (Digital Currency Daily)
    bitcoin_data = fetch_alpha_vantage_data("DIGITAL_CURRENCY_DAILY", symbol="BTC", market="USD")

    # --- Valores Fixos ou Manuais para Índices Nacionais ---
    # Para estas taxas, APIs gratuitas consistentes são mais raras.
    # Você pode precisar de integrações específicas (Ex: Bacen API) ou atualizá-las manualmente.
    selic_value = 10.5 # Exemplo: Última taxa SELIC (anual)
    cdi_value = 10.4 # Exemplo: CDI ~ SELIC - 0.1% (anual)
    ipca_value = 0.45 # Exemplo: IPCA mensal (último valor divulgado)
    poupanca_value = 0.6 # Exemplo: Poupança mensal (0.5% + TR, ou 70% da Selic)
    ifix_value = 0.9 # Exemplo: IFIX mensal (proxy, como Alpha Vantage não tem)
    inpc_value = 0.4 # Exemplo: INPC mensal

    # --- Extração e Tratamento dos Dados do Alpha Vantage ---
    ibovespa_close = None
    if ibovespa_data and "Global Quote" in ibovespa_data:
        ibovespa_close = float(ibovespa_data["Global Quote"].get("05. price", 0))
        
    sp500_close = None
    if sp500_data and "Global Quote" in sp500_data:
        sp500_close = float(sp500_data["Global Quote"].get("05. price", 0))

    dolar_close = None
    if dolar_data and "Time Series FX (Daily)" in dolar_data:
        # Pega a data mais recente no dicionário de séries temporais para o câmbio
        # === CORREÇÃO DE SINTAXE APLICADA AQUI ===
        latest_date_fx = sorted(dolar_data["Time Series FX (Daily)"].keys(), reverse=True)[0]
        dolar_close_str = dolar_data["Time Series FX (Daily)"][latest_date_fx].get("4. close")
        if dolar_close_str is not None:
            dolar_close = float(dolar_close_str)

    bitcoin_close = None
    if bitcoin_data and "Time Series (Digital Currency Daily)" in bitcoin_data:
        # Pega a data mais recente no dicionário de séries temporais para criptomoedas
        # === CORREÇÃO DE SINTAXE APLICADA AQUI ===
        latest_date_crypto = sorted(bitcoin_data["Time Series (Digital Currency Daily)"].keys(), reverse=True)[0]
        bitcoin_close_str = bitcoin_data["Time Series (Digital Currency Daily)"][latest_date_crypto].get("4a. close (USD)")
        if bitcoin_close_str is not None:
            bitcoin_close = float(bitcoin_close_str)

    # Tenta inserir, se já existir, atualiza (PRIMARY KEY `data` cuida disso)
    cursor.execute(f"""
        INSERT OR REPLACE INTO ativos (data, selic, cdi, ipca, poupanca, ibovespa, dolar, bitcoin, ifix, inpc, sp500)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        today_str,
        selic_value,
        cdi_value,
        ipca_value,
        poupanca_value,
        ibovespa_close,
        dolar_close,
        bitcoin_close,
        ifix_value,
        inpc_value,
        sp500_close
    ))
    conn.commit()
    conn.close()
    print(f"Dados atualizados no banco para {today_str}.")

# Este bloco é apenas para testar a função individualmente (opcional)
if __name__ == '__main__':
    # Para testar este script diretamente:
    # 1. Certifique-se de que 'config.py' está na pasta acima (raiz do projeto)
    #    com sua ALPHA_VANTAGE_API_KEY.
    # 2. Certifique-se de que a pasta 'data' existe na raiz do projeto.
    # 3. Rode: python scripts/fetch_data.py
    
    # Criar a pasta 'data' se não existir (necessário se rodar este script isolado)
    project_root_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    os.makedirs(os.path.join(project_root_dir, 'data'), exist_ok=True)
    
    print("Iniciando teste de update_database_job...")
    update_database_job()
    print("Teste de update_database_job concluído.")
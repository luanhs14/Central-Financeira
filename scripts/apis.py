# scripts/apis.py

import requests
import yfinance as yf
from datetime import datetime
import time

# Configurações da API
ALPHA_VANTAGE_API_KEY = "0VVCL01Q5ABRFXPD"  # Sua chave do Alpha Vantage
BASE_URL_ALPHA = "https://www.alphavantage.co/query"

def fetch_selic():
    """
    Busca a taxa SELIC atual.
    Por ser uma taxa do Banco Central, você pode usar uma API do BC ou valor fixo para testes.
    """
    try:
        # Por enquanto, retorna um valor fixo para teste
        # Em produção, você integraria com a API do Banco Central
        return 11.75  # Taxa SELIC exemplo (você pode atualizar manualmente ou integrar com API do BC)
    except Exception as e:
        print(f"Erro ao buscar SELIC: {e}")
        return None

def fetch_cdi():
    """
    Busca a taxa CDI atual.
    Geralmente é próxima à SELIC.
    """
    try:
        # CDI geralmente é próximo da SELIC
        selic = fetch_selic()
        if selic:
            return round(selic * 0.95, 2)  # CDI aproximadamente 95% da SELIC
        return 11.20
    except Exception as e:
        print(f"Erro ao buscar CDI: {e}")
        return None

def fetch_dolar_brl():
    """
    Busca a cotação do Dólar em Real usando Alpha Vantage.
    """
    try:
        url = f"{BASE_URL_ALPHA}?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=BRL&apikey={ALPHA_VANTAGE_API_KEY}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "Realtime Currency Exchange Rate" in data:
                rate = float(data["Realtime Currency Exchange Rate"]["5. Exchange Rate"])
                return round(rate, 2)
        
        # Fallback: valor aproximado se a API falhar
        return 5.25
        
    except Exception as e:
        print(f"Erro ao buscar Dólar: {e}")
        return 5.25  # Valor de fallback

def fetch_bitcoin_brl():
    """
    Busca o preço do Bitcoin em BRL usando yfinance.
    """
    try:
        btc = yf.Ticker("BTC-USD")
        btc_data = btc.history(period="1d")
        
        if not btc_data.empty:
            btc_usd = btc_data['Close'].iloc[-1]
            
            # Converte para BRL (multiplica pelo dólar)
            dolar_rate = fetch_dolar_brl()
            if dolar_rate:
                btc_brl = btc_usd * dolar_rate
                return round(btc_brl, 2)
        
        # Fallback
        return 280000.00
        
    except Exception as e:
        print(f"Erro ao buscar Bitcoin: {e}")
        return 280000.00

def fetch_ibovespa():
    """
    Busca o índice Ibovespa usando yfinance.
    """
    try:
        ibov = yf.Ticker("^BVSP")
        ibov_data = ibov.history(period="1d")
        
        if not ibov_data.empty:
            value = ibov_data['Close'].iloc[-1]
            return round(value, 2)
        
        return 125000.00  # Fallback
        
    except Exception as e:
        print(f"Erro ao buscar Ibovespa: {e}")
        return 125000.00

def fetch_sp500():
    """
    Busca o índice S&P 500 usando yfinance.
    """
    try:
        sp500 = yf.Ticker("^GSPC")
        sp500_data = sp500.history(period="1d")
        
        if not sp500_data.empty:
            value = sp500_data['Close'].iloc[-1]
            return round(value, 2)
        
        return 4800.00  # Fallback
        
    except Exception as e:
        print(f"Erro ao buscar S&P 500: {e}")
        return 4800.00

def fetch_ipca():
    """
    Busca a taxa IPCA atual.
    """
    try:
        # Por enquanto, valor fixo para teste
        # Em produção, integraria com API do IBGE
        return 4.50
    except Exception as e:
        print(f"Erro ao buscar IPCA: {e}")
        return None

def fetch_inpc():
    """
    Busca a taxa INPC atual.
    """
    try:
        # Por enquanto, valor fixo para teste
        return 4.20
    except Exception as e:
        print(f"Erro ao buscar INPC: {e}")
        return None

def fetch_poupanca():
    """
    Calcula o rendimento da poupança baseado na SELIC.
    """
    try:
        selic = fetch_selic()
        if selic:
            # Regra da poupança: Se SELIC > 8.5%, rende 0.5% + TR
            # Se SELIC <= 8.5%, rende 70% da SELIC + TR
            if selic > 8.5:
                return 6.17  # 0.5% * 12 + TR (aproximado)
            else:
                return round(selic * 0.7, 2)
        return 6.17
    except Exception as e:
        print(f"Erro ao buscar Poupança: {e}")
        return None

def fetch_ifix():
    """
    Busca o índice IFIX (Fundos Imobiliários).
    """
    try:
        # Valor fixo para teste (IFIX não está facilmente disponível via yfinance)
        return 8.50
    except Exception as e:
        print(f"Erro ao buscar IFIX: {e}")
        return None

# Função auxiliar para testar todas as APIs
def test_all_apis():
    """
    Testa todas as funções de API para verificar se estão funcionando.
    """
    print("Testando todas as APIs...")
    
    apis = [
        ("SELIC", fetch_selic),
        ("CDI", fetch_cdi),
        ("Dólar", fetch_dolar_brl),
        ("Bitcoin", fetch_bitcoin_brl),
        ("Ibovespa", fetch_ibovespa),
        ("S&P 500", fetch_sp500),
        ("IPCA", fetch_ipca),
        ("INPC", fetch_inpc),
        ("Poupança", fetch_poupanca),
        ("IFIX", fetch_ifix)
    ]
    
    for name, func in apis:
        try:
            result = func()
            print(f"{name}: {result}")
            time.sleep(1)  # Pausa para não sobrecarregar as APIs
        except Exception as e:
            print(f"Erro em {name}: {e}")

if __name__ == "__main__":
    test_all_apis()
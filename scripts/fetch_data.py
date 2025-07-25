# scripts/fetch_data.py

from scripts.apis import (
    fetch_dolar_brl,
    fetch_bitcoin_brl,
    fetch_sp500,
    fetch_ibovespa,
    fetch_ipca,
    fetch_inpc,
    fetch_selic,
    fetch_cdi,
    fetch_poupanca,
    fetch_ifix
)
from scripts.database import insert_data
from datetime import datetime

def update_database_job():
    """
    Função principal que busca todos os dados das APIs e atualiza o banco de dados.
    Esta função é chamada pelo scheduler do Flask-APScheduler.
    """
    try:
        print(f"Iniciando atualização do banco de dados às {datetime.now()}")
        
        # Busca todos os dados das APIs
        selic_value = fetch_selic()
        cdi_value = fetch_cdi()
        ipca_value = fetch_ipca()
        poupanca_value = fetch_poupanca()
        inpc_value = fetch_inpc()
        dolar_value = fetch_dolar_brl()
        bitcoin_value = fetch_bitcoin_brl()
        ibovespa_value = fetch_ibovespa()
        sp500_value = fetch_sp500()
        ifix_value = fetch_ifix()

        # Log dos valores obtidos
        print("Valores obtidos das APIs:")
        print(f"SELIC: {selic_value}")
        print(f"CDI: {cdi_value}")
        print(f"IPCA: {ipca_value}")
        print(f"Poupança: {poupanca_value}")
        print(f"INPC: {inpc_value}")
        print(f"Dólar: {dolar_value}")
        print(f"Bitcoin: {bitcoin_value}")
        print(f"Ibovespa: {ibovespa_value}")
        print(f"S&P 500: {sp500_value}")
        print(f"IFIX: {ifix_value}")

        # Organiza os dados em um dicionário
        data_values = {
            'selic': selic_value,
            'cdi': cdi_value,
            'ipca': ipca_value,
            'poupanca': poupanca_value,
            'inpc': inpc_value,
            'dolar': dolar_value,
            'bitcoin': bitcoin_value,
            'ibovespa': ibovespa_value,
            'sp500': sp500_value,
            'ifix': ifix_value
        }

        # Insere os dados no banco
        insert_data(data_values)
        print(f"Banco de dados atualizado com sucesso às {datetime.now()}")
        
        return True
        
    except Exception as e:
        print(f"Erro ao atualizar o banco de dados: {e}")
        return False

if __name__ == "__main__":
    print("Iniciando teste de update_database_job...")
    success = update_database_job()
    if success:
        print("Teste concluído com sucesso!")
    else:
        print("Teste falhou. Verifique os logs de erro acima.")
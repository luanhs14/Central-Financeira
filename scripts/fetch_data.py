from apis import (
    fetch_dolar_brl,
    fetch_bitcoin_brl,
    fetch_sp500,
    fetch_ibovespa,
    fetch_ipca,
    fetch_inpc,
    fetch_selic,
    fetch_cdi,
    fetch_poupanca
)

def update_database_job():
    # ... outras partes da função ...

    selic_value = fetch_selic()
    cdi_value = fetch_cdi()
    ipca_value = fetch_ipca()
    poupanca_value = fetch_poupanca()
    inpc_value = fetch_inpc()

    print("SELIC:", selic_value)
    print("CDI:", cdi_value)
    print("IPCA:", ipca_value)
    print("Poupança:", poupanca_value)
    print("INPC:", inpc_value)

    # ... restante da função ...


if __name__ == "__main__":
    print("Iniciando teste de update_database_job...")
    update_database_job()
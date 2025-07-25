# scripts/database.py

import sqlite3
import os
from datetime import datetime

DATABASE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'financas.db')

def init_db():
    """
    Inicializa o banco de dados, criando a tabela se não existir.
    """
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ativos (
                data TEXT PRIMARY KEY,
                selic REAL,
                cdi REAL,
                dolar REAL,
                bitcoin REAL,
                ibovespa REAL,
                sp500 REAL,
                ifix REAL,
                inpc REAL,
                ipca REAL,
                poupanca REAL
            )
        ''')
        conn.commit()
    print(f"Banco de dados inicializado em: {DATABASE}")

def insert_data(data_values):
    """
    Insere ou substitui dados na tabela 'ativos' para a data atual.
    """
    current_date_for_pk = datetime.now().strftime('%Y-%m-%d')
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO ativos (data, selic, cdi, dolar, bitcoin, ibovespa, sp500, ifix, inpc, ipca, poupanca)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            current_date_for_pk,
            data_values.get('selic'),
            data_values.get('cdi'),
            data_values.get('dolar'),
            data_values.get('bitcoin'),
            data_values.get('ibovespa'),
            data_values.get('sp500'),
            data_values.get('ifix'),
            data_values.get('inpc'),
            data_values.get('ipca'),
            data_values.get('poupanca')
        ))
        conn.commit()

def obter_taxa_atual(tipo):
    """
    Obtém a taxa mais recente do banco de dados para um determinado tipo.
    """
    tipos_validos = [
        'selic', 'cdi', 'dolar', 'bitcoin', 'ibovespa',
        'sp500', 'ifix', 'inpc', 'ipca', 'poupanca'
    ]
    if tipo not in tipos_validos:
        raise ValueError(f"Tipo de taxa inválido: {tipo}")

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute(f'SELECT "{tipo}" FROM "ativos" ORDER BY "data" DESC LIMIT 1')
        result = cursor.fetchone()
    if result and result[0] is not None:
        return result[0]
    return 0.0  # Ou retorne None, se preferir diferenciar ausência de dado
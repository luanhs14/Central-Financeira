from datetime import datetime

def calcular_rendimento(valor_inicial, taxa_anual, periodo_dias):
    """
    Calcula o rendimento simples para um período em dias.
    """
    taxa_diaria = (1 + taxa_anual/100) ** (1/365) - 1
    valor_final = valor_inicial * (1 + taxa_diaria) ** periodo_dias
    return round(valor_final, 2)

def comparar_investimento_amortizacao(valor, taxa_financiamento, taxa_investimento, periodo_anos):
    """
    Função comparativa básica (para cenário de valor único, não aportes mensais).
    Pode ser mantida se ainda houver uso para ela em outras partes do seu app.
    """
    juros_financiamento = valor * (1 + taxa_financiamento/100) ** periodo_anos - valor
    rendimento_investimento = valor * (1 + taxa_investimento/100) ** periodo_anos - valor
    
    resultado = {
        'financiamento': round(juros_financiamento, 2),
        'investimento': round(rendimento_investimento, 2),
        'diferenca': round(rendimento_investimento - juros_financiamento, 2),
        'recomendacao': 'Investir' if rendimento_investimento > juros_financiamento else 'Amortizar'
    }
    
    return resultado

def calcular_rendimentos(valor_inicial, taxa, periodo_meses):
    """
    Calcula os rendimentos para o simulador, com base em valor inicial, taxa anual e período em meses.
    Retorna um dicionário com os detalhes.
    """
    try:
        valor_inicial = float(valor_inicial)
        taxa = float(taxa) # Taxa anual já em percentual (ex: 10.5 para 10.5%)
        periodo_meses = int(periodo_meses)
        
        if valor_inicial <= 0 or periodo_meses <= 0:
            return {'erro': "Valor inicial e período devem ser maiores que zero."}

        # Converte taxa anual para mensal e diária
        taxa_anual_decimal = taxa / 100
        taxa_mensal_decimal = (1 + taxa_anual_decimal) ** (1/12) - 1
        taxa_diaria_decimal = (1 + taxa_anual_decimal) ** (1/365) - 1

        # Calcula o valor final
        valor_final_mensal = valor_inicial * ((1 + taxa_mensal_decimal) ** periodo_meses)
        
        # Calcula os rendimentos específicos
        rendimento_total = valor_final_mensal - valor_inicial
        rendimento_mensal = (valor_inicial * taxa_mensal_decimal) # Rendimento do primeiro mês (aproximado)
        rendimento_anual = (valor_inicial * taxa_anual_decimal) # Rendimento aproximado anual do valor inicial

        # Cálculo de rendimento diário mais preciso
        # Considera um mês comercial de 21 dias úteis para cálculo de "dias úteis"
        dias_uteis_no_periodo = periodo_meses * 21 # Aproximação
        rendimento_diario = (valor_inicial * taxa_diaria_decimal) # Rendimento diário do valor inicial

        return {
            'valor_inicial': valor_inicial,
            'periodo': periodo_meses,
            'periodo_dias_uteis': dias_uteis_no_periodo,
            'rendimento_total': rendimento_total,
            'valor_final': valor_final_mensal,
            'rendimento_diario': rendimento_diario,
            'rendimento_mensal': rendimento_mensal,
            'rendimento_anual': rendimento_anual,
            'rendimento_x_meses': rendimento_total # O rendimento total é o rendimento para X meses
        }

    except ValueError:
        return {'erro': "Por favor, insira valores numéricos válidos para Valor Inicial, Taxa e Período."}
    except Exception as e:
        return {'erro': f"Ocorreu um erro inesperado no cálculo: {str(e)}"}

def comparar_aporte_mensal_detalhado(valor_disponivel_mensal, num_parcelas_restantes, taxa_rendimento_mensal, taxa_juros_financiamento_mensal):
    """
    Compara o cenário de investir um valor mensal vs. usar esse valor para amortizar uma dívida.
    Fornece um detalhamento mês a mês.
    As taxas são passadas em percentual (ex: 1.0 para 1%), convertidas para decimal dentro da função.
    """
    try:
        valor_disponivel_mensal = float(valor_disponivel_mensal)
        num_parcelas_restantes = int(num_parcelas_restantes)
        taxa_rendimento_mensal = float(taxa_rendimento_mensal) / 100  # Converte % para decimal
        taxa_juros_financiamento_mensal = float(taxa_juros_financiamento_mensal) / 100 # Converte % para decimal

        if num_parcelas_restantes <= 0:
            return {'erro': "Número de parcelas deve ser maior que zero."}
        if valor_disponivel_mensal <= 0:
            return {'erro': "Valor disponível mensal deve ser maior que zero."}
        if taxa_rendimento_mensal < 0 or taxa_juros_financiamento_mensal < 0:
            return {'erro': "As taxas não podem ser negativas."}

        # Inicializa saldos
        current_invest_balance = 0
        current_amort_equivalent = 0

        monthly_breakdown_investimento = []
        monthly_breakdown_amortizacao = []

        for month in range(1, num_parcelas_restantes + 1):
            # Lógica para o investimento:
            # Saldo atual é o saldo anterior corrigido pela taxa + o novo aporte mensal
            current_invest_balance = current_invest_balance * (1 + taxa_rendimento_mensal) + valor_disponivel_mensal

            # Lógica para a amortização (economia equivalente de juros não pagos):
            # Isso simula o "valor futuro" do dinheiro economizado em juros, caso ele tivesse sido investido
            # na mesma taxa da dívida (juros que deixaram de ser pagos = dinheiro economizado que pode render)
            current_amort_equivalent = current_amort_equivalent * (1 + taxa_juros_financiamento_mensal) + valor_disponivel_mensal

            monthly_breakdown_investimento.append({
                'mes': month,
                'valor_acumulado': round(current_invest_balance, 2)
            })
            monthly_breakdown_amortizacao.append({
                'mes': month,
                'economia_acumulada_equivalente': round(current_amort_equivalent, 2)
            })

        montante_investido = current_invest_balance
        economia_juros_amortizacao = current_amort_equivalent

        diff_raw = montante_investido - economia_juros_amortizacao
        diferenca_abs = abs(diff_raw)
        
        if diff_raw > 0:
            recomendacao = "INVESTIR" 
        elif diff_raw < 0:
            recomendacao = "AMORTIZAR" 
        else:
            recomendacao = "INDIFERENTE"

        return {
            'montante_investido': round(montante_investido, 2),
            'economia_juros_amortizacao': round(economia_juros_amortizacao, 2),
            'diferenca': round(diferenca_abs, 2), 
            'recomendacao': recomendacao,
            'periodo_meses': num_parcelas_restantes,
            'monthly_breakdown_investimento': monthly_breakdown_investimento,
            'monthly_breakdown_amortizacao': monthly_breakdown_amortizacao
        }

    except ValueError:
        return {'erro': "Por favor, insira valores numéricos válidos para todos os campos (valor, parcelas, taxas)."}
    except Exception as e:
        return {'erro': f"Erro inesperado no cálculo do comparador: {str(e)}"}
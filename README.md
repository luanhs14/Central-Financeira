# 💰 Central Financeira

**Central Financeira** é uma aplicação web moderna e responsiva para auxiliar na **organização financeira pessoal** e **simulações de investimentos**, construída com foco em acessibilidade e usabilidade tanto em **computadores quanto em dispositivos móveis**.

> ⚙️ Tecnologias: Python, Flask, HTML, CSS, JavaScript, Bootstrap, Chart.js  
> 📱 Interface otimizada para mobile e desktop

---

## 📌 Funcionalidades

- 📊 **Simulador de investimentos**: Compare rendimentos com base em taxas como SELIC, CDI, IPCA ou valor personalizado.
- 💸 **Amortização vs Investimento**: Calcule se vale mais a pena **investir ou amortizar um financiamento**.
- 📈 **Gráficos comparativos**: Visualize a evolução dos valores simulados.
- 📅 **Projeções de rendimento diário, mensal, anual**.
- 🧠 **Histórico de simulações** (em desenvolvimento).
- 📥 **Exportação de resultados** (em breve).

---

## 🚀 Como executar o projeto

### 1. Clonar o repositório

```bash
git clone https://github.com/luanhs14/Central-Financeira.git
cd Central-Financeira
```

### 2. Criar ambiente virtual

```bash
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
```

### 3. Instalar dependências

```bash
pip install -r requirements.txt
```

### 4. Executar o servidor Flask

```bash
FLASK_APP=app.py FLASK_ENV=development flask run
```

Acesse o navegador em: `http://127.0.0.1:5000`

---

## 📂 Estrutura do Projeto

```
Central-Financeira/
├── static/
│   ├── css/
│   ├── js/
│   └── imgs/
├── templates/
│   ├── index.html
│   ├── simulador.html
│   └── ...
├── app.py
├── requirements.txt
└── README.md
```

---

## 🎯 Objetivo

Este projeto foi criado com o propósito de **facilitar a educação financeira** e apoiar decisões conscientes relacionadas a **investimentos, financiamentos e planejamento pessoal**. A ideia é transformar cálculos complexos em algo simples e visual para qualquer pessoa.

---

## 🛠️ Em desenvolvimento

- [ ] Módulo de histórico com filtro de data  
- [ ] Exportação de simulações para PDF/CSV  
- [ ] Cadastro e login de usuário (opcional)  
- [ ] Dashboard interativo com metas financeiras

---

## 📸 Screenshots

> *(Adicione aqui prints da tela inicial, simulador, gráficos, etc.)*

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se livre para abrir issues, sugerir melhorias ou fazer um pull request.

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

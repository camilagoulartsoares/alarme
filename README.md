# ⏰ Projeto Despertador com React + Electron

Este é um aplicativo de alarme multiplataforma, construído com **React, Vite e Electron**, que funciona como despertador diário.

### 🎯 Funcionalidades principais:

- Interface visual para configurar um horário personalizado
- Alarmes automáticos fixos: **todos os dias às 04:00, 05:00 e 06:00**
- Alarme em **volume altíssimo** e duplicado para garantir que seja ouvido
- Duração de 5 minutos por alarme, sem possibilidade de fechar durante esse período
- **Bloqueio total de interações**:
  - Alt+F4
  - F1, F2, F3 (volume)
  - Ctrl+C no terminal
  - Botão de fechar da janela
- Pré-carregado com som estridente `.wav`

### 🖥️ Requisitos

- Node.js 18+
- npm

### 🚀 Como rodar

```bash
npm install
npm run dev


### 📦 Como gerar o aplicativo instalável (modo produção)

```bash
npm run build
npm run dist

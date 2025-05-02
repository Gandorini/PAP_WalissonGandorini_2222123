# S & T STATION

## Descrição

O **S & T STATION** é uma aplicação web desenvolvida para facilitar o acesso, upload, visualização e gestão de partituras musicais. A aplicação permite que os utilizadores explorem uma vasta biblioteca de partituras, façam upload de ficheiros, visualizem partituras em diferentes formatos e interajam com outros utilizadores através de comentários e avaliações.

## Funcionalidades Principais

- **Explorar Biblioteca**: Aceda a uma vasta coleção de partituras organizadas por instrumentos, compositores e dificuldade.
- **Upload de Partituras**: Carregue ficheiros nos formatos PDF, MusicXML ou SVG e visualize-os diretamente na aplicação.
- **Visualização de Partituras**: Utilize o visualizador integrado para explorar partituras em detalhe.
- **Interação Social**: Comente, avalie e guarde partituras como favoritas.
- **Conversão de Formatos**: Converta ficheiros para o formato MEI utilizando o serviço de conversão integrado.

## Estrutura do Projeto

A estrutura do projeto está organizada da seguinte forma:

```
project/
├── src/
│   ├── components/       # Componentes reutilizáveis da interface
│   ├── pages/            # Páginas principais da aplicação
│   ├── store/            # Gestão de estado com Zustand
│   ├── lib/              # Serviços e integrações (e.g., Supabase)
│   ├── context/          # Contextos globais (e.g., tema)
│   ├── types/            # Definições de tipos TypeScript
│   ├── index.css         # Estilos globais
│   ├── main.tsx          # Ponto de entrada da aplicação
│   └── theme.ts          # Configuração de tema com Material-UI
├── public/               # Recursos públicos (imagens, ícones, etc.)
├── conversion-service/   # Serviço de conversão de ficheiros
├── supabase/             # Configuração e funções do Supabase
└── vite.config.ts        # Configuração do Vite
```

## Tecnologias Utilizadas

- **Frontend**: React, TypeScript, Material-UI, TailwindCSS
- **Backend**: Node.js, Supabase (Base de Dados e Armazenamento)
- **Ferramentas de Build**: Vite

## Pré-requisitos

Certifique-se de que tem as seguintes ferramentas instaladas:

- Node.js (v16 ou superior)
- npm ou yarn
- Supabase CLI (opcional, para gestão local do Supabase)

## Instalação

1. Clone o repositório:

   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd <NOME_DO_DIRETORIO>
   ```

2. Instale as dependências:

   ```bash
   npm install
   # ou
   yarn install
   ```

3. Configure as variáveis de ambiente no ficheiro `.env` com as credenciais do Supabase.

4. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   # ou
   yarn dev
   ```


## Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento.
- `npm run build`: Gera a build de produção.
- `npm run preview`: Pré-visualiza a build de produção.

## Contribuição

Contribuições são bem-vindas! Siga os passos abaixo para contribuir:

1. Faça um fork do repositório.
2. Crie uma branch para a sua funcionalidade ou correção: `git checkout -b minha-feature`.
3. Faça commit das suas alterações: `git commit -m 'Adiciona nova funcionalidade'`.
4. Envie as alterações: `git push origin minha-feature`.
5. Abra um Pull Request.

## Licença

Este projeto está licenciado sob a licença MIT. Consulte o ficheiro `LICENSE` para mais informações.

---

**Nota**: Para dúvidas ou suporte, entre em contacto com o administrador do repositório.

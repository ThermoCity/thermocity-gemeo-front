# thermocity-gemeo-front

Painel web do **gêmeo digital do ThermoCity** para o gestor de saúde de Presidente Prudente.
É a "janela" do gêmeo: mostra a cidade agora (aba **Agora**) e, nas próximas entregas, os cenários
hipotéticos (aba **Simulação**).

PBI 124 — *Criar a base do painel web (login do gestor, layout e acesso às APIs)*.

## Como rodar

```powershell
npm install
copy .env.example .env.local   # opcional: os padrões já usam os dados mockados
npm run dev
```

Abra o endereço que o Vite mostrar (normalmente http://localhost:5173).

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | checagem de tipos + build de produção em `dist/` |
| `npm run lint` | oxlint |

## Variáveis de ambiente

| Variável | Padrão | Para que serve |
|---|---|---|
| `VITE_USE_MOCKS` | `true` | `true` usa `src/mocks`; `false` chama as APIs |
| `VITE_API_JAVA_URL` | `http://localhost:8080` | API Java (setores, lista do dia, contatos, simulações) |
| `VITE_API_CLIMA_URL` | `http://localhost:5000` | API de clima .NET (nível de calor) |
| `VITE_DEV_TOKEN` | vazio | JWT de um GESTOR enquanto não há tela de login |
| `VITE_API_TIMEOUT_MS` | `10000` | tempo máximo de cada requisição |

Nenhum segredo fica no código. O `.env.local` está no `.gitignore` do Vite.

## Estrutura

```
src/
  config/env.ts          leitura das variáveis de ambiente
  services/              http.ts (JWT, timeout, erros), javaApi.ts, climaApi.ts, mockApi.ts, index.ts (escolhe mock ou API)
  auth/AuthContext.tsx   sessão do usuário e bloqueio para quem não é GESTOR
  hooks/useDados.ts      carregamento assíncrono com estados de carregando e erro
  components/
    layout/              barra lateral, faixa de contexto e abas
    mapa/                mapa SVG dos 420 setores (zoom, arraste, camadas, legenda, escala)
    painel/              indicadores, contatos prioritários, detalhe do setor
  pages/                 AgoraPage e SimulacaoPage
  (public/mocks/)        setores.geo.json, servicos.json, carregados só com VITE_USE_MOCKS=true
  styles/                tema.css (tokens do brandbook, claro e escuro) e app.css
```

## Endpoints que o painel vai consumir

| Dado | API | Endpoint |
|---|---|---|
| Usuário logado | Java | `GET /auth/eu` |
| Setores (GeoJSON) | Java | `GET /setores/geojson` |
| UBS e refúgios | Java | `GET /servicos` |
| Estado do gêmeo | Java | `GET /gemeo/estado` |
| Lista do dia | Java | `GET /listas/hoje?page=&size=` |
| Nível de calor | .NET | `GET /niveis/atual` |

Os contratos estão em `src/types/index.ts`. Ao ligar `VITE_USE_MOCKS=false`, as respostas reais
precisam seguir esses formatos.

## Dados mockados

- **Reais** (do repositório `thermocity-banco-de-dados`): geometria simplificada dos 420 setores,
  nota de calor, IPVS, idosos 60+, UBS e refúgios.
- **Fictícios**: nível de calor do dia, lista de contatos ("Pessoa 001"...) e indicadores. O painel
  mostra a etiqueta **Dados demonstrativos** enquanto os mocks estão ligados.

## Identidade visual

Cores, escala NC1–NC5 e modos claro/escuro seguem o *Brandbook ThermoCity* (proposta "A — Azul
estrutural"): Azul Escuro `#1D2F36`, Laranja Sol `#E16C42`, Off-white `#F5F0E6`, fonte Arial.
A nota de calor do setor (1 a 5) usa a mesma rampa de laranjas, mas é uma informação diferente do
nível de calor da cidade (NC1–NC5), e a legenda deixa isso explícito.

## Uso de IA

Código gerado com apoio do Claude (Anthropic) e revisado pela equipe.

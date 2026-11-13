# Revisão técnica — 3 de novembro de 2026

## Origem e âmbito

Foi utilizado o ficheiro disponível `ByClick2.0-main.zip`, na pasta Downloads. O nome difere de `ByClick2.0-main(1).zip` mencionado na mensagem. O original foi preservado. Foram revistos os modelos, a cadeia Alembic, a configuração, a autenticação, os routers e a ligação do cliente JavaScript. Não foi feita publicação nem alteração da base existente.

## Problemas corrigidos

| Área | Problema | Correção |
|---|---|---|
| Alembic `def0664d357e` | Eliminava uma tabela de chat não criada pela cadeia; falhava em bases novas e podia apagar dados em bases antigas | Removidas as operações de eliminação/recriação do chat |
| Migrações | `imobiliaria` existia no modelo mas não no enum PostgreSQL | Nova revisão `f41c90a62e07`, preservando os restantes valores |
| Migrações | Coordenadas de endereço existiam no modelo mas não no histórico | Nova revisão `71b26f9c804d`; adiciona apenas colunas ausentes |
| Downgrade | Tipos enum sobreviviam à eliminação das tabelas e bloqueavam uma nova aplicação | Remoção dos tipos após as tabelas correspondentes; downgrade de `imobiliaria` recusa lojas ainda dependentes do valor |
| Pedidos | `valor_subtotal` obrigatório não era preenchido; cálculo em float | Preenchimento de subtotal e total com Decimal |
| Pedidos | Quantidades negativas aumentavam stock; compras concorrentes podiam excedê-lo | Validação positiva, bloqueio de linhas PostgreSQL em ordem estável e rollback na dependência de sessão |
| Pedidos | Atualização de estado acedia a `ItemPedido.vendedor`, relação inexistente | Relação adicionada; pedidos com vários vendedores requerem administrador para alteração global |
| Segurança | `/seed-db` público repunha contas com palavra-passe conhecida | Rota removida; scripts de demonstração continuam locais |
| JWT | Refresh tokens eram aceites como tokens de acesso; claims incompletos causavam erro interno | Tipo explícito e validação de `sub`, com resposta 401 |
| Configuração | Segredo previsível e URL de base predefinidos | Configuração obrigatória, validação do segredo e exemplo para `kitanda_db` |
| Recuperação | OTP pseudoaleatório e exposto nos logs | Geração com `secrets`, retirada dos códigos dos logs e limitação local de tentativas |
| Uploads | Extensão controlada pelo cliente, conteúdo arbitrário e sem limite | JPEG/PNG/WebP verificados e recodificados, limite de 5 MB e 20 milhões de píxeis, nomes gerados pelo servidor |
| Avaliações | A regra de compra prévia estava apenas no comentário | Verificação de compra entregue e da associação ao vendedor |
| SMTP | Leitura direta de variáveis ignorava valores carregados por Settings do `.env` | Uso de `settings`, com timeout |
| Integração | CORS global com credenciais; frontend dependia de um endereço Render fixo | Origens explícitas configuráveis; URL de API configurável ou relativa; campo de imagem da gestão de loja alinhado com o schema |
| Distribuição | ZIP original incluía `.env`, ambiente virtual e bytecode | Pacote corrigido exclui `.env`, venv e bytecode; inclui `.env.example` |

## Validação realizada

- 10 testes locais de regressão passaram, com SQLite e TestClient: saúde/OpenAPI, ausência de seed público, login e tipos de token, pedidos e stock, rollback de compra inválida, serviços, imóveis, CORS, limite de tentativas, imagens e avaliações.
- A cadeia até `head` foi aplicada numa base SQLite temporária. A comparação com os modelos não encontrou diferenças de tabelas/colunas/índices; o tipo enum é excluído desta comparação porque SQLite não implementa enums PostgreSQL.
- SQL PostgreSQL de atualização foi gerado offline, incluindo todas as revisões. Isto valida a geração, não a execução no servidor.
- Modelos e relações SQLAlchemy foram carregados e configurados; OpenAPI gerado com sucesso.
- Foi incluído um teste PostgreSQL real, opcional, que não foi executado por falta de ligação disponível.

Ambiente de teste: Python 3.12, FastAPI 0.111.0, Starlette 0.37.2, SQLAlchemy 2.0.30, Alembic 1.13.1, Pydantic 2.7.1, httpx 0.28.1. Foram utilizadas as bibliotecas do ambiente incluído no ZIP para executar os testes, sem redistribuir esse ambiente. A instalação limpa das dependências não ficou concluída nesta sessão. As versões originais foram preservadas no requirements para evitar apresentar como testada uma atualização ainda não validada.

## Pendências e riscos identificados

1. **PostgreSQL real e base existente:** os executáveis instalados falharam ao iniciar com erro de DLL; a ligação local configurada também não ficou disponível. Falta validar `upgrade head`, `alembic check`, enums e concorrência num servidor PostgreSQL. As bases criadas por dump/create_all podem necessitar de reconciliação inicial. Nenhum `stamp` automático foi introduzido.
2. **Dependências antigas:** o projeto mantém bibliotecas de 2024, incluindo python-jose 3.3.0, python-multipart 0.0.9, Pillow 10.3.0 e a cadeia FastAPI/Starlette. Existem avisos publicados pelos mantenedores. A atualização conjunta, instalação limpa e auditoria das dependências continuam necessárias antes de produção. Não foi alegada ausência de vulnerabilidades.
3. **Frontend e XSS:** várias páginas constroem HTML com `innerHTML` a partir de valores de API, por exemplo nomes em `gestao_loja.js` e `explorar.js`. Deve ser feita uma revisão de escape contextual e URLs; os tokens em localStorage aumentam o impacto de XSS. Estes fluxos não foram corrigidos integralmente nem testados num navegador.
4. **Documentos e comprovativos:** os ficheiros em `/imagens` continuam públicos por compatibilidade. Comprovativos e documentos pessoais precisam de armazenamento privado e acesso autenticado antes de uso com dados reais. Os nomes aleatórios de uploads novos não substituem autorização.
5. **Contas e recuperação:** a limitação de tentativas é por processo e IP; múltiplos workers requerem um mecanismo partilhado. Alterar a senha ainda não revoga tokens já emitidos. Não existe um fluxo completo de rotação/revogação de refresh tokens. SMTP e entrega real de email/SMS não foram validados; a verificação inicial de email carece de revisão da entrega.
6. **Dados de demonstração:** scripts de seed mantêm contas e palavras-passe de teste. Não os execute numa base real. Se o ZIP ou o endpoint original tiver sido usado em produção, substitua os segredos distribuídos e as credenciais de demonstração.
7. **Regras de negócio:** transições de estado, cancelamento/restituição de stock, autorização de pagamentos e separação de pedidos por vendedor precisam de testes adicionais. A correção atual impede um vendedor de alterar o estado global de um pedido que contenha itens de terceiros.

## Referências consultadas

- [FastAPI: CORS](https://fastapi.tiangolo.com/tutorial/cors/) — configuração de origens e credenciais.
- [python-jose: versões publicadas](https://github.com/mpdavis/python-jose/releases).
- [python-multipart: avisos dos mantenedores](https://github.com/Kludex/python-multipart/security/advisories).

Consulte `INICIAR.md` para a configuração e os comandos de validação.

# Andamento da estabilização da Ilha V5

## Implementado até aqui

- O contrato do estado passou de V4 para V5. A migração aceita V2, V3 e V4, conserva recursos, memórias e auditoria, e mantém a recusa de calendários ambíguos.
- A migração automática cria um backup `estado-ilha.json.pre-v5.bak` antes de substituir um estado antigo. O estado real da pasta não foi migrado nem alterado durante esta implementação.
- Foi criado `ecossistema.js`. O mundo agora tem fontes de água separadas (lago, nascente e poço), com nível, capacidade, qualidade, chuva, recarga e evaporação; árvores persistentes com espécie, idade, saúde, frutos e sementes; clima sazonal com efeitos materiais; e reprodução, mortalidade e migração de populações.
- Aves e mamíferos têm indivíduos com idade, sexo, saúde, energia, necessidades e localização. Peixes continuam como população agregada. Populações de peixes zeradas não voltam espontaneamente.
- Maria e João foram incorporados ao estado persistido. Ambos têm inventário, necessidades físicas e sociais, relações, experiências e memória. Uma política de necessidades executa suas ações a cada ciclo, mesmo depois da morte de Ícaro.
- Ícaro recebe percepção ambiental e memória individual no contexto enviado ao decisor. Há um experimento comparativo em `experimento-trajetoria.js`: controle sem memória/experiência no contexto do decisor versus trajetória acumulada, iniciado do mesmo estado-base.
- A documentação principal foi atualizada em `README.md`.

## Validação já executada

`node testes.js` passou com **21 testes** na última execução. Ela incluiu migração V2/V3/V4, contrato V5, fontes ecológicas, indivíduos animais, atuação social de Maria e João, continuidade após a morte de Ícaro e dois braços de trajetória com 240 ciclos cada.

Resultado da política de referência nos 240 ciclos:

- Ícaro permaneceu vivo nos dois braços e acumulou 13 memórias.
- As frequências de ação e os estoques finais de peixes e lago foram iguais nos dois braços.
- Esse resultado é esperado: a política de referência é determinística e ignora memória. Portanto, valida a mecânica e o pareamento, mas **não demonstra aprendizagem de um modelo**.
- Um decisor-prova separado confirmou que o braço acumulado recebe memórias e o controle não as recebe.

`git diff --check` também passou. Os avisos restantes eram apenas conversão de fim de linha LF/CRLF do Git.

## Pendências antes de considerar concluído

1. A alteração final acrescentou a ação social de Ícaro e uma função para atualizar solidão, pertencimento, segurança, frustração, satisfação, confiança e vínculos. Essa integração ainda precisa ser conectada ao ciclo e testada; a suíte acima foi executada antes dessa última alteração.
2. Rodar novamente `node testes.js` e `git diff --check` após integrar a ação social.
3. Fazer uma execução com o decisor Ollama real, se estiver disponível, com várias réplicas pareadas. Até aqui não foi feita chamada a modelo nem se alegou adaptação emergente.
4. Revisar o estado JSON real e a migração V4→V5 em cópia isolada antes de iniciar uma sessão de produção longa.

## Arquivos desta rodada

- Novos: `ecossistema.js`, `experimento-trajetoria.js`, este documento.
- Alterados: `estado-v2.js`, `motor-v2.js`, `ilha.js`, `percepcao-v2.js`, `testes-v2.js`, `README.md`.

O backup `estado-ilha.json.pre-v3.bak` e os dois arquivos não rastreados de nomes incomuns já existentes foram deixados intactos.

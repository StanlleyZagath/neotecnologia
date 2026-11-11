# Programa de Engenharia Clínica

Plano base para implantar ou estruturar o setor em um hospital ou clínica. Adapte à realidade da instituição e confirme as exigências legais vigentes (ANVISA, normas ABNT/IEC, Vigilância Sanitária local).

## 1. Objetivos
- Garantir segurança do paciente e do usuário no uso de tecnologias em saúde.
- Manter alta disponibilidade dos equipamentos críticos.
- Reduzir custos de manutenção e prolongar a vida útil dos ativos.
- Manter conformidade regulatória e rastreabilidade documental.

## 2. Escopo
Todo equipamento médico-assistencial (EMA): monitores, ventiladores, bombas de infusão, desfibriladores, autoclaves, equipamentos de imagem, etc. Fora do escopo inicial: infraestrutura predial e TI (definir interface com as áreas responsáveis).

## 3. Estrutura e responsabilidades
| Função | Responsabilidades |
|---|---|
| Engenheiro clínico (RT) | Coordenação técnica, planejamento, indicadores, parecer de compra, tecnovigilância |
| Técnico em manutenção | Execução de preventivas, corretivas e testes de segurança elétrica |
| Administrativo / compras | Contratos, peças, garantias, terceirizados |
| Usuários (assistência) | Abertura de chamados, uso correto, limpeza e comunicação de falhas |

## 4. Processos principais
1. **Inventário**: cadastro de todo ativo com plaqueta/tag, fabricante, modelo, série, setor, criticidade, data de aquisição e garantia.
2. **Classificação de criticidade**: Alta (suporte à vida), Média, Baixa. Define prioridade de atendimento e frequência de preventiva.
3. **Manutenção preventiva**: plano anual por equipamento, com periodicidade conforme fabricante e criticidade; checklist por tipo.
4. **Calibração e testes de segurança**: periodicidade definida, certificados arquivados, rastreabilidade metrológica.
5. **Manutenção corretiva**: abertura de OS, priorização, diagnóstico, reparo, teste e liberação, com registro de causa e solução.
6. **Gestão de tecnologia**: parecer técnico para aquisição, recebimento técnico, treinamento, descarte e substituição.
7. **Tecnovigilância**: notificação de eventos adversos e queixas técnicas.

## 5. Metas e indicadores
| Indicador | Fórmula | Meta sugerida |
|---|---|---|
| Cumprimento de preventivas | preventivas realizadas no prazo / programadas | ≥ 90% |
| MTTR | tempo total de reparo / nº de corretivas | menor possível, por criticidade |
| MTBF | tempo de operação / nº de falhas | tendência crescente |
| Disponibilidade | MTBF / (MTBF + MTTR) | ≥ 95% (críticos ≥ 98%) |
| Razão corretiva/preventiva | OS corretivas / OS preventivas | tendência decrescente |
| Custo de manutenção / valor do parque | custo anual / valor patrimonial | acompanhar tendência |
| Calibrações em dia | calibrações válidas / exigidas | 100% |

## 6. Documentação (POPs)
- POP de abertura e atendimento de chamados
- POP de preventiva por tipo de equipamento
- POP de calibração e segurança elétrica
- POP de recebimento técnico e de descarte
- POP de tecnovigilância
- Registros: OS, laudos, certificados, treinamentos

## 7. Cronograma de implantação (sugestão)
| Fase | Prazo | Entregas |
|---|---|---|
| 1. Diagnóstico | Mês 1 | Levantamento de equipamentos, contratos e pendências |
| 2. Inventário e criticidade | Meses 1 a 2 | Parque cadastrado e classificado no sistema |
| 3. Planos de manutenção | Mês 3 | Preventivas e calibrações programadas |
| 4. Processos e POPs | Meses 3 a 4 | POPs aprovados, equipe treinada |
| 5. Operação e indicadores | Mês 5 em diante | Relatório mensal e revisão trimestral |

## 8. Riscos
- Inventário incompleto: faça varredura física por setor.
- Baixa adesão dos usuários na abertura de chamados: treine e simplifique o canal.
- Falta de peças e contratos: mapeie fornecedores e garantias cedo.
- Dados desatualizados no sistema: defina responsável e rotina de revisão.

## 9. Sistema de apoio
O web app desta pasta (`index.html`) implementa os módulos de inventário, ordens de serviço, preventiva/calibração e indicadores descritos acima.

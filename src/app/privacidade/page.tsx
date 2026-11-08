/**
 * Vellum — Política de Privacidade (RGPD)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Política de Privacidade" };

const sections: LegalSection[] = [
  {
    id: "responsavel",
    title: "Responsável pelo tratamento",
    paragraphs: [
      "O responsável pelo tratamento dos dados pessoais recolhidos através do Vellum é Leonardo Barreiras, titular da plataforma. Os pedidos relativos a dados pessoais podem ser feitos através do Centro de Suporte, escolhendo a categoria «Conta e acesso».",
      "Esta política aplica-se nos termos do Regulamento (UE) 2016/679 (Regulamento Geral sobre a Proteção de Dados, RGPD) e da Lei n.º 58/2019.",
    ],
  },
  {
    id: "dados",
    title: "Dados que tratamos",
    paragraphs: [
      "Dados de conta: nome, nome de utilizador, endereço de email, palavra-passe (guardada apenas em forma cifrada irreversível), cargo, biografia e fotografia de perfil, quando o utilizador os indica.",
      "Conteúdos: documentos, notas, projetos, eventos de agenda, comentários e imagens que o utilizador cria ou carrega.",
      "Dados de utilização: tempo de foco e palavras escritas por dia (telemetria de esforço mostrada apenas ao próprio utilizador), preferências de tema e de leitura, e registos técnicos de segurança (por exemplo, tentativas de início de sessão).",
      "Pedidos de suporte: o conteúdo da mensagem, o email de resposta e, se o utilizador o enviar, um diagnóstico técnico do navegador (versão, ecrã e página atual).",
    ],
  },
  {
    id: "finalidades",
    title: "Finalidades e fundamentos",
    paragraphs: [
      "Prestar o serviço contratado: criar e gerir a conta, guardar e exportar conteúdos, partilhar documentos (execução do contrato, art. 6.º, n.º 1, alínea b) do RGPD).",
      "Segurança: confirmar o email, enviar códigos de acesso e de recuperação, prevenir abusos (interesse legítimo, alínea f)).",
      "Suporte: responder a pedidos de ajuda (execução do contrato e interesse legítimo).",
      "Não usamos os dados para publicidade nem os vendemos a terceiros.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies e armazenamento local",
    paragraphs: [
      "O Vellum usa apenas cookies estritamente necessários: o cookie de sessão que mantém o utilizador autenticado. Guarda ainda no navegador (armazenamento local) o tema escolhido e o rascunho da telemetria do dia. Estes elementos não exigem consentimento por serem essenciais ao funcionamento.",
    ],
  },
  {
    id: "subcontratantes",
    title: "Subcontratantes",
    paragraphs: [
      "Para funcionar, o Vellum recorre a prestadores que tratam dados em seu nome: alojamento da aplicação (Railway), base de dados (Neon) e envio de emails transacionais (Brevo ou Resend). Estes prestadores estão vinculados por contratos de tratamento de dados e, quando há transferência para fora do Espaço Económico Europeu, por garantias adequadas, como as cláusulas contratuais-tipo da Comissão Europeia.",
    ],
  },
  {
    id: "conservacao",
    title: "Conservação",
    paragraphs: [
      "Os dados de conta e os conteúdos são conservados enquanto a conta estiver ativa. Após o pedido de eliminação, são apagados num prazo máximo de 30 dias, salvo quando a lei exija conservação por mais tempo. Os códigos de confirmação expiram em minutos e os registos de segurança são conservados pelo tempo estritamente necessário.",
    ],
  },
  {
    id: "direitos",
    title: "Direitos do titular",
    paragraphs: [
      "O utilizador pode, a qualquer momento, exercer os direitos de acesso, retificação, apagamento, limitação do tratamento, portabilidade (por exemplo, através da exportação de documentos) e oposição. Pode editar o perfil diretamente no Vellum e pedir o restante através do Centro de Suporte; responderemos no prazo de um mês.",
      "O utilizador tem ainda o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD).",
    ],
  },
  {
    id: "seguranca",
    title: "Segurança",
    paragraphs: [
      "Aplicamos medidas técnicas e organizativas adequadas: ligações cifradas (HTTPS), palavras-passe com hash, confirmação de email, controlo de permissões por papel em cada documento e projeto, e validação no servidor dos ficheiros carregados.",
    ],
  },
  {
    id: "alteracoes",
    title: "Alterações a esta política",
    paragraphs: [
      <>
        Esta política pode ser atualizada. Alterações relevantes serão comunicadas no Vellum antes de produzirem
        efeitos. Consulte também os <Link href="/termos">Termos e Condições</Link>.
      </>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Informação legal · RGPD"
      title="Política de Privacidade"
      updated="8 de novembro de 2026"
      sections={sections}
    />
  );
}

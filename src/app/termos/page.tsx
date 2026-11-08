/**
 * Vellum — Termos e Condições
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Termos e Condições" };

const sections: LegalSection[] = [
  {
    id: "objeto",
    title: "Objeto e titularidade",
    paragraphs: [
      "Os presentes Termos e Condições regulam o acesso e a utilização do Vellum, uma plataforma de escrita, organização de conhecimento e paginação de documentos disponibilizada através da Internet.",
      "O Vellum, incluindo o código-fonte, o desenho, a marca, os textos e as ilustrações próprias, é propriedade exclusiva de Leonardo Barreiras e está protegido por uma licença proprietária. Todos os direitos não expressamente concedidos nestes Termos ficam reservados.",
    ],
  },
  {
    id: "conta",
    title: "Conta de utilizador",
    paragraphs: [
      "Para utilizar o Vellum é necessário criar uma conta com um endereço de email válido, um nome de utilizador e uma palavra-passe. O utilizador declara que os dados indicados são verdadeiros e compromete-se a mantê-los atualizados.",
      "O utilizador é responsável pela confidencialidade da sua palavra-passe e dos códigos de confirmação recebidos por email, bem como por toda a atividade realizada na sua conta. Qualquer utilização não autorizada deve ser comunicada de imediato através do Centro de Suporte.",
      "A criação de conta exige a aceitação expressa destes Termos e da Política de Privacidade.",
    ],
  },
  {
    id: "utilizacao",
    title: "Utilização aceitável",
    paragraphs: [
      "O utilizador compromete-se a não utilizar o Vellum para publicar ou partilhar conteúdos ilícitos, difamatórios, que violem direitos de terceiros (incluindo direitos de autor e de imagem) ou que contenham código malicioso.",
      "É proibido tentar aceder a áreas, contas ou documentos sem autorização, contornar as permissões de partilha, ou sobrecarregar intencionalmente a infraestrutura do serviço.",
    ],
  },
  {
    id: "conteudos",
    title: "Conteúdos do utilizador",
    paragraphs: [
      "Os documentos, notas, imagens e restantes conteúdos criados pelo utilizador continuam a pertencer-lhe. Ao utilizar o Vellum, o utilizador concede apenas a licença técnica necessária para guardar, processar, apresentar e exportar esses conteúdos em seu nome.",
      "Quando o utilizador partilha um documento ou projeto através de convite ou ligação pública, é responsável por escolher o papel atribuído (por exemplo, leitor, comentador ou editor) e pelas consequências dessa partilha.",
    ],
  },
  {
    id: "disponibilidade",
    title: "Disponibilidade e alterações do serviço",
    paragraphs: [
      "O Vellum é disponibilizado «tal como está». Procuramos manter o serviço disponível e seguro, mas não garantimos a ausência de interrupções, erros ou perdas de dados. Recomenda-se exportar regularmente os documentos importantes (PDF, Word, HTML ou Markdown).",
      "Podemos alterar, suspender ou descontinuar funcionalidades, informando previamente os utilizadores sempre que a alteração seja relevante.",
    ],
  },
  {
    id: "responsabilidade",
    title: "Limitação de responsabilidade",
    paragraphs: [
      "Na máxima medida permitida pela lei aplicável, o titular do Vellum não é responsável por danos indiretos, lucros cessantes ou perda de dados resultantes da utilização ou da impossibilidade de utilização do serviço. Nada nestes Termos limita direitos que a lei reconheça aos consumidores de forma imperativa.",
    ],
  },
  {
    id: "cessacao",
    title: "Cessação",
    paragraphs: [
      "O utilizador pode deixar de usar o Vellum e pedir a eliminação da conta a qualquer momento através do Centro de Suporte. Podemos suspender contas que violem gravemente estes Termos, comunicando o motivo ao utilizador.",
    ],
  },
  {
    id: "lei",
    title: "Lei aplicável e litígios",
    paragraphs: [
      "Estes Termos regem-se pela lei portuguesa. Em caso de litígio de consumo, o utilizador pode recorrer a uma entidade de resolução alternativa de litígios ou à plataforma europeia de resolução de litígios em linha.",
      <>
        Para questões sobre estes Termos, use o Centro de Suporte. O tratamento de dados pessoais é descrito na{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </>,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Informação legal"
      title="Termos e Condições"
      updated="8 de novembro de 2026"
      sections={sections}
    />
  );
}

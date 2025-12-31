import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">
          Termos de Serviço
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma BarberSmart, um serviço da <strong>Sync Smart</strong> (
              <a href="https://syncsmart.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">syncsmart.com.br</a>
              ), você concorda com estes Termos de Serviço e nossa Política de Privacidade. Se você não concordar com algum termo, não utilize nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Descrição do Serviço</h2>
            <p>
              O BarberSmart é uma plataforma SaaS (Software como Serviço) de gestão para barbearias, desenvolvida e operada pela <strong>Sync Smart</strong>, que oferece:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Sistema de agendamento online integrado com WhatsApp.</li>
              <li>Gestão financeira com controle de receitas e despesas.</li>
              <li>Gerenciamento de equipe e comissões.</li>
              <li>Relacionamento com clientes e programa de fidelidade.</li>
              <li>Ferramentas de marketing e campanhas automatizadas.</li>
              <li>Relatórios e análises de desempenho.</li>
              <li>Suporte a múltiplas unidades.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Cadastro e Conta</h2>
            <p>Para utilizar nossos serviços, você deve:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Ter pelo menos 18 anos de idade.</li>
              <li>Fornecer informações verdadeiras, precisas e atualizadas.</li>
              <li>Manter a confidencialidade de suas credenciais de acesso.</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado.</li>
            </ul>
            <p className="mt-4">
              Você é responsável por todas as atividades realizadas em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Planos e Pagamentos</h2>
            <p>
              A BarberSmart oferece diferentes planos de assinatura com funcionalidades variadas:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Cobrança:</strong> Os planos são cobrados mensalmente ou anualmente, conforme escolhido.</li>
              <li><strong>Renovação:</strong> As assinaturas são renovadas automaticamente até o cancelamento.</li>
              <li><strong>Cancelamento:</strong> Você pode cancelar a qualquer momento. O acesso continua até o fim do período pago.</li>
              <li><strong>Reembolsos:</strong> Não oferecemos reembolsos por períodos parciais ou não utilizados.</li>
              <li><strong>Alteração de Preços:</strong> Podemos alterar preços com aviso prévio de 30 dias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Uso Aceitável</h2>
            <p>Ao usar nossa plataforma, você concorda em NÃO:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Violar leis ou regulamentos aplicáveis.</li>
              <li>Infringir direitos de propriedade intelectual de terceiros.</li>
              <li>Transmitir vírus, malware ou código malicioso.</li>
              <li>Tentar acessar sistemas sem autorização.</li>
              <li>Usar a plataforma para spam ou comunicações não solicitadas.</li>
              <li>Compartilhar sua conta com terceiros não autorizados.</li>
              <li>Fazer engenharia reversa do software.</li>
              <li>Usar a plataforma para atividades fraudulentas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo da plataforma BarberSmart, incluindo software, design, textos, gráficos, 
              logos e marcas são de propriedade exclusiva da <strong>Sync Smart</strong> ou licenciados para nós. 
              Você não pode copiar, modificar, distribuir ou criar obras derivadas sem autorização.
            </p>
            <p className="mt-4">
              Os dados que você insere na plataforma (clientes, agendamentos, etc.) permanecem de sua propriedade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Disponibilidade do Serviço</h2>
            <p>
              Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos disponibilidade 
              ininterrupta. Podemos realizar manutenções programadas ou emergenciais. Não somos responsáveis 
              por perdas decorrentes de indisponibilidade temporária.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Limitação de Responsabilidade</h2>
            <p>
              A BarberSmart é fornecida "como está". Não nos responsabilizamos por:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Perdas de lucros ou oportunidades de negócio.</li>
              <li>Danos indiretos, incidentais ou consequenciais.</li>
              <li>Ações de terceiros ou falhas de sistemas externos.</li>
              <li>Perda de dados causada por sua negligência.</li>
            </ul>
            <p className="mt-4">
              Nossa responsabilidade total está limitada ao valor pago nos últimos 12 meses de assinatura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Indenização</h2>
            <p>
              Você concorda em indenizar e isentar a BarberSmart de quaisquer reclamações, danos, perdas 
              ou despesas decorrentes de seu uso da plataforma ou violação destes termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">10. Rescisão</h2>
            <p>
              Podemos suspender ou encerrar sua conta imediatamente se:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Você violar estes Termos de Serviço.</li>
              <li>Houver atividade fraudulenta ou ilegal.</li>
              <li>O pagamento não for realizado após tentativas de cobrança.</li>
              <li>A conta permanecer inativa por período prolongado.</li>
            </ul>
            <p className="mt-4">
              Você pode encerrar sua conta a qualquer momento através das configurações da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">11. Alterações nos Termos</h2>
            <p>
              Podemos modificar estes Termos de Serviço a qualquer momento. Alterações significativas 
              serão comunicadas com antecedência. O uso continuado após as alterações constitui aceitação 
              dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">12. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa 
              será resolvida no foro da comarca de São Paulo, SP, com exclusão de qualquer outro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">13. Disposições Gerais</h2>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Integralidade:</strong> Estes termos constituem o acordo completo entre você e a BarberSmart.</li>
              <li><strong>Renúncia:</strong> A não exigência de qualquer direito não constitui renúncia.</li>
              <li><strong>Separabilidade:</strong> Se alguma cláusula for inválida, as demais permanecem em vigor.</li>
              <li><strong>Cessão:</strong> Você não pode ceder seus direitos sem nosso consentimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">14. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos de Serviço, entre em contato:
            </p>
            <ul className="list-none mt-2 space-y-1">
              <li><strong>E-mail:</strong> suporte@barbersmart.app</li>
              <li><strong>Empresa:</strong> Sync Smart</li>
              <li><strong>Site:</strong> <a href="https://syncsmart.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">syncsmart.com.br</a></li>
              <li><strong>Plataforma:</strong> Barber Smart</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Barber Smart. Um produto <a href="https://syncsmart.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Sync Smart</a>. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

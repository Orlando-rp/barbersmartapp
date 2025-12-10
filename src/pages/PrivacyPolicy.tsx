import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
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
          Política de Privacidade
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Introdução</h2>
            <p>
              A BarberSmart ("nós", "nosso" ou "plataforma") está comprometida em proteger sua privacidade. 
              Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas 
              informações quando você utiliza nossa plataforma de gestão para barbearias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Informações que Coletamos</h2>
            <p>Coletamos os seguintes tipos de informações:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Informações de Cadastro:</strong> Nome completo, e-mail, telefone, endereço da barbearia.</li>
              <li><strong>Dados de Agendamento:</strong> Histórico de agendamentos, serviços utilizados, preferências de horário.</li>
              <li><strong>Informações Financeiras:</strong> Dados de transações, métodos de pagamento utilizados (não armazenamos dados completos de cartão).</li>
              <li><strong>Dados de Uso:</strong> Como você interage com a plataforma, páginas visitadas, funcionalidades utilizadas.</li>
              <li><strong>Informações de Dispositivo:</strong> Tipo de dispositivo, sistema operacional, navegador utilizado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Como Usamos Suas Informações</h2>
            <p>Utilizamos suas informações para:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Fornecer e manter nossos serviços de agendamento e gestão.</li>
              <li>Enviar notificações sobre agendamentos via WhatsApp, SMS ou e-mail.</li>
              <li>Processar pagamentos e gerar relatórios financeiros.</li>
              <li>Melhorar a experiência do usuário e desenvolver novas funcionalidades.</li>
              <li>Enviar comunicações de marketing (com seu consentimento).</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Compartilhamento de Informações</h2>
            <p>Podemos compartilhar suas informações com:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Barbearias Parceiras:</strong> Para viabilizar agendamentos e serviços.</li>
              <li><strong>Processadores de Pagamento:</strong> Para processar transações financeiras de forma segura.</li>
              <li><strong>Provedores de Serviço:</strong> Empresas que nos auxiliam na operação da plataforma (hospedagem, análises, suporte).</li>
              <li><strong>Autoridades Legais:</strong> Quando exigido por lei ou para proteger nossos direitos.</li>
            </ul>
            <p className="mt-4">
              <strong>Não vendemos suas informações pessoais a terceiros.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Criptografia de dados em trânsito (HTTPS/TLS).</li>
              <li>Criptografia de dados sensíveis em repouso.</li>
              <li>Controle de acesso baseado em funções.</li>
              <li>Monitoramento contínuo de segurança.</li>
              <li>Backups regulares de dados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Seus Direitos (LGPD)</h2>
            <p>
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Acesso:</strong> Solicitar uma cópia dos dados que temos sobre você.</li>
              <li><strong>Correção:</strong> Solicitar a correção de dados incorretos ou incompletos.</li>
              <li><strong>Exclusão:</strong> Solicitar a exclusão de seus dados pessoais.</li>
              <li><strong>Portabilidade:</strong> Solicitar a transferência de seus dados para outro serviço.</li>
              <li><strong>Revogação:</strong> Revogar o consentimento para uso de seus dados.</li>
              <li><strong>Informação:</strong> Saber com quem seus dados foram compartilhados.</li>
            </ul>
            <p className="mt-4">
              Para exercer esses direitos, entre em contato conosco através do e-mail de suporte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Cookies e Tecnologias Similares</h2>
            <p>
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Cookies Essenciais:</strong> Necessários para o funcionamento básico da plataforma.</li>
              <li><strong>Cookies de Desempenho:</strong> Para analisar como a plataforma é utilizada.</li>
              <li><strong>Cookies de Funcionalidade:</strong> Para lembrar suas preferências.</li>
            </ul>
            <p className="mt-4">
              Você pode gerenciar suas preferências de cookies nas configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Retenção de Dados</h2>
            <p>
              Mantemos seus dados pelo tempo necessário para fornecer nossos serviços e cumprir 
              obrigações legais. Dados de agendamentos são mantidos por 5 anos para fins de histórico 
              e relatórios. Após esse período, os dados são anonimizados ou excluídos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre 
              alterações significativas através da plataforma ou por e-mail. Recomendamos revisar 
              esta política regularmente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">10. Contato</h2>
            <p>
              Para dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus dados, 
              entre em contato conosco:
            </p>
            <ul className="list-none mt-2 space-y-1">
              <li><strong>E-mail:</strong> privacidade@barbersmart.app</li>
              <li><strong>Plataforma:</strong> BarberSmart</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} BarberSmart. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

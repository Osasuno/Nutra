import { Search, Stethoscope } from "lucide-react";
import { ButtonLink, Card, CardBody, CardHeader } from "@/components/ui";
import { CodeConnectForm } from "./ConnectForms";

/** Mostrado quando o paciente ainda não tem acompanhamento ativo. */
export function NoLink({ feature }: { feature?: string }) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader
        icon={<Stethoscope className="h-5 w-5" />}
        title="Conecte-se à sua nutricionista"
        description={
          feature
            ? `${feature} fica disponível quando você estiver em acompanhamento com uma nutricionista.`
            : "Para usar o plano alimentar, o diário e o chat, conecte-se a uma nutricionista."
        }
      />
      <CardBody className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Tenho o código da minha nutricionista</p>
          <CodeConnectForm />
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Ainda não tenho nutricionista</p>
          <ButtonLink href="/paciente/nutricionistas" variant="outline">
            <Search className="h-4 w-4" /> Encontrar nutricionista
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}

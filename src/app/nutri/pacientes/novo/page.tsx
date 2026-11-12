import type { Metadata } from "next";
import { PatientForm } from "@/components/nutri/PatientForm";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Novo paciente" };

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Novo paciente"
        description="Depois de salvar, você recebe um link de convite para o paciente criar a conta já vinculada a você."
      />
      <Card>
        <CardBody className="py-6">
          <PatientForm submitLabel="Cadastrar paciente" />
        </CardBody>
      </Card>
    </div>
  );
}

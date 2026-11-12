import { Suspense } from "react";
import { NotebookPen } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { NoteForm } from "@/components/nutri/NoteForm";
import { Card, CardBody, CardHeader, EmptyState, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";
import { fmtDateTime } from "@/lib/format";

export default function NotesPage(props: PageProps<"/nutri/pacientes/[id]/notas">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/pacientes/[id]/notas">["params"] }) {
  const { id } = await params;
  await requireNutriPatient(id);
  const notes = await prisma.clinicalNote.findMany({ where: { patientId: id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {notes.length === 0 ? (
          <EmptyState
            icon={<NotebookPen className="h-8 w-8" />}
            title="Nenhuma anotação"
            description="Registre a evolução de cada consulta: queixas, adesão, ajustes de conduta e combinados."
          />
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardBody>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">{fmtDateTime(note.createdAt)}</p>
                  <DeleteButton url={`/api/notes/${note.id}`} confirmText="Excluir esta anotação?" />
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{note.content}</p>
              </CardBody>
            </Card>
          ))
        )}
      </div>
      <Card className="lg:sticky lg:top-20 lg:self-start">
        <CardHeader title="Nova anotação" description="Visível apenas para você." icon={<NotebookPen className="h-5 w-5" />} />
        <CardBody>
          <NoteForm patientId={id} />
        </CardBody>
      </Card>
    </div>
  );
}

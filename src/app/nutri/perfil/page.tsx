import { Suspense } from "react";
import type { Metadata } from "next";
import { KeyRound, Ticket, UserCog } from "lucide-react";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { InviteCodeCard, NutriProfileForm } from "@/components/profile/NutriProfileForm";
import { Card, CardBody, CardHeader, PageHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Meu perfil" };

export default function NutriProfilePage() {
  return (
    <>
      <PageHeader title="Meu perfil" description="Dados profissionais, código de convite e senha." />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("NUTRITIONIST");
  const data = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, phone: true, nutritionistProfile: true },
  });
  const profile = data?.nutritionistProfile;
  if (!data || !profile) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader title="Dados profissionais" icon={<UserCog className="h-5 w-5" />} />
        <CardBody className="py-5">
          <NutriProfileForm
            initial={{
              name: data.name,
              phone: data.phone ?? "",
              crn: profile.crn,
              specialties: profile.specialties,
              bio: profile.bio,
              city: profile.city,
              state: profile.state,
              acceptingPatients: profile.acceptingPatients,
              showInDirectory: profile.showInDirectory,
            }}
          />
        </CardBody>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Código de convite" icon={<Ticket className="h-5 w-5" />} />
          <CardBody>
            <InviteCodeCard code={profile.inviteCode} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Senha" icon={<KeyRound className="h-5 w-5" />} />
          <CardBody>
            <PasswordForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

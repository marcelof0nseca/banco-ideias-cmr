import { sessaoDaPagina } from "@/lib/seguranca/auth";
import { SemPermissao } from "../_componentes/Blocos";
import { NavSecundaria } from "../_componentes/NavSecundaria";

/**
 * Moldura da Administracao: exige perfil ADMIN e mostra o sub-menu.
 * Cada pagina e cada Server Action conferem o perfil de novo (defesa em
 * profundidade). DONO: Pessoa B.
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoDaPagina("/admin");
  if (sessao.perfil !== "ADMIN") {
    return <SemPermissao area="administração" inicio={sessao.perfil === "GABINETE" ? "/gabinete" : "/triagem"} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <NavSecundaria
        rotulo="Administração"
        itens={[
          { href: "/admin", rotulo: "Visão geral" },
          { href: "/admin/acessos", rotulo: "Usuários" },
          { href: "/admin/listas", rotulo: "Temas e motivos" },
          { href: "/admin/auditoria", rotulo: "Trilha de auditoria" },
        ]}
      />
      {children}
    </div>
  );
}

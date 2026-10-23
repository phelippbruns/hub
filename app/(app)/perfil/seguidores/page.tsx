import { redirect } from "next/navigation";

/**
 * As duas listas viraram uma tela com abas.
 *
 * O endereço continua respondendo porque já existiu: link antigo não pode
 * morrer, e o perfil apontava para cá. Ele leva à aba certa.
 */
export default function SeguidoresPage() {
  redirect("/perfil/seguindo?aba=seguidores");
}

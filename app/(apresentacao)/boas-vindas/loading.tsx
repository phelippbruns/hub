import { PaginaCarregando } from "@/design/components";

/**
 * O que a pessoa vê enquanto a apresentação é montada no servidor.
 *
 * Toda rota do Hub renderiza por requisição, e esta consulta a lista de
 * comunidades para o último card. Sem este arquivo, quem acaba de criar a
 * conta fica na tela de cadastro, parada, até a apresentação chegar
 * inteira.
 *
 * O limite de Suspense que este arquivo abre é seguro aqui: as duas guardas
 * da página são `redirect()`, que o Next resolve mesmo depois de começar a
 * transmitir. O caso proibido é `notFound()`, que viraria 200 — e esta rota
 * não tem nenhum.
 */
export default function Carregando() {
  return (
    <div className="max-w-stageColumn flex w-full flex-1 flex-col justify-center">
      <PaginaCarregando label="Carregando a apresentação do Hub" linhas={2} />
    </div>
  );
}

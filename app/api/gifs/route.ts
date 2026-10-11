import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/session";
import { procurarGifs } from "@/lib/midia/giphy";
import { serverEnv } from "@/lib/env";

/**
 * A busca de GIFs que a tela usa.
 *
 * Existe para a chave do GIPHY ficar no servidor (regra de segurança 3). A
 * tela pede daqui; a chave nunca atravessa.
 *
 * **Exige sessão.** Sem isso, a rota seria um proxy aberto do GIPHY com a
 * nossa cota: qualquer um na internet poderia usá-la até o limite acabar, e
 * o GIF pararia de funcionar para quem usa o Hub.
 */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return NextResponse.json({ gifs: [] }, { status: 401 });
  }

  const termo = new URL(request.url).searchParams.get("q") ?? "";
  const gifs = await procurarGifs(termo.slice(0, 100), serverEnv().GIPHY_API_KEY);
  return NextResponse.json({ gifs });
}

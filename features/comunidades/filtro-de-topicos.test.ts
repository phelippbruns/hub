import { describe, expect, it } from "vitest";
import { filtroDeTopicos } from "./shared";
import type { FiltroDeTopicos as DaCamadaDeDados } from "@/lib/data/comunidades";
import type { FiltroDeTopicos as DaTela } from "./shared";

/**
 * A união dos filtros está escrita em dois lugares, e isso é de propósito:
 * a tela não pode importar `lib/data/`, porque um componente de cliente que
 * o fizesse arrastaria o Prisma para o pacote do navegador — o build quebra
 * com "Can't resolve 'dns'", que não diz nada sobre a causa.
 *
 * O preço é duas declarações que podem divergir em silêncio. Este teste é o
 * que cobra: acrescentar um filtro de um lado só não compila.
 */

// Se as duas uniões divergirem, uma destas atribuições para de compilar.
const _daTelaCabeNaCamada: DaCamadaDeDados = "seguindo" satisfies DaTela;
const _daCamadaCabeNaTela: DaTela = "novas" satisfies DaCamadaDeDados;
void _daTelaCabeNaCamada;
void _daCamadaCabeNaTela;

describe("o filtro lido da URL", () => {
  it.each(["alta", "recentes", "seguindo", "novas"])("aceita %s", (valor) => {
    expect(filtroDeTopicos(valor)).toBe(valor);
  });

  it.each([undefined, "", "placar", "ordem", "SEGUINDO"])(
    "cai em 'alta' com %s, que é o padrão do escopo (RN12)",
    (valor) => {
      expect(filtroDeTopicos(valor as string | undefined)).toBe("alta");
    },
  );
});

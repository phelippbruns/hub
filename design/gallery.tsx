"use client";

/**
 * Galeria do design system, servida em /design.
 *
 * Primeiro a tela 29 do protótipo (Estados do sistema), na mesma ordem dos
 * cartões, e depois o resto do sistema: tokens, tipografia, componentes.
 *
 * É de cliente porque os controles aqui são interativos de verdade — dá para
 * apertar o chip, virar o interruptor e ver o estado mudar.
 */
import { useState, type ReactNode } from "react";
import {
  AnswerCard,
  BottomSheet,
  Button,
  Checkbox,
  Chip,
  CodeInput,
  ConfirmSheet,
  CommunityCover,
  CommunityDoor,
  CoverButton,
  CommunityRow,
  EmptyState,
  EndOfList,
  ErrorState,
  FollowButton,
  HotTopicCard,
  Input,
  LevelMark,
  LoadingBlock,
  PasswordInput,
  PinButton,
  Skeleton,
  SectionTitle,
  Segmented,
  SortToggle,
  Steps,
  SuccessMessage,
  Switch,
  Tabs,
  TextField,
  TopicRow,
} from "./components";
import {
  BackIcon,
  BlockIcon,
  CabinNavIcon,
  ChronologicalIcon,
  CommunitiesNavIcon,
  ConfirmedIcon,
  CopyLinkIcon,
  CreateIcon,
  ExploreNavIcon,
  FollowIcon,
  ForwardIcon,
  GifIcon,
  HomeNavIcon,
  ImageIcon,
  LeaveIcon,
  MoreAnswersIcon,
  MoreOptionsIcon,
  NotificationsNavIcon,
  ProfileNavIcon,
  ReportIcon,
  SearchIcon,
  SendIcon,
  SettingsIcon,
  PinIcon,
  ShareIcon,
  WarningIcon,
} from "./icons";
import { color, radius, spacing, typography } from "./tokens";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-title text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** Um cartão da folha de estados, igual ao `.stc` do protótipo. */
function Card({
  title,
  wide = false,
  children,
}: {
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-surfacePage flex flex-col items-start gap-2 rounded-md p-3 ${
        wide ? "col-span-full" : ""
      }`}
    >
      <h3 className="text-caption text-inkMuted">{title}</h3>
      {children}
    </div>
  );
}

const navItems = [
  { Icon: HomeNavIcon, label: "Início" },
  { Icon: ExploreNavIcon, label: "Explorar" },
  { Icon: CommunitiesNavIcon, label: "Comunidades" },
  { Icon: CabinNavIcon, label: "Cabine" },
  { Icon: ProfileNavIcon, label: "Perfil" },
  { Icon: NotificationsNavIcon, label: "Notificações" },
] as const;

const icons = [
  { Icon: MoreAnswersIcon, label: "Mais respostas" },
  { Icon: SearchIcon, label: "Buscar" },
  { Icon: CreateIcon, label: "Criar" },
  { Icon: BackIcon, label: "Voltar" },
  { Icon: ForwardIcon, label: "Avançar" },
  { Icon: MoreOptionsIcon, label: "Mais opções" },
  { Icon: FollowIcon, label: "Seguir" },
  { Icon: ShareIcon, label: "Compartilhar" },
  { Icon: PinIcon, label: "Fixar" },
  { Icon: CopyLinkIcon, label: "Copiar link" },
  { Icon: ImageIcon, label: "Imagem" },
  { Icon: GifIcon, label: "GIF" },
  { Icon: SendIcon, label: "Enviar" },
  { Icon: ChronologicalIcon, label: "Cronológico" },
  { Icon: ConfirmedIcon, label: "Confirmado" },
  { Icon: WarningIcon, label: "Aviso" },
  { Icon: ReportIcon, label: "Denunciar" },
  { Icon: BlockIcon, label: "Bloquear" },
  { Icon: LeaveIcon, label: "Sair" },
  { Icon: SettingsIcon, label: "Configurações" },
] as const;

/** Mostra os ícones de navegação inativo e ativo, num fundo claro e num escuro. */
function NavProof({ tone }: { tone: "light" | "dark" }) {
  return (
    <div
      className={`flex flex-wrap gap-3 rounded-sm p-3 ${
        tone === "light" ? "bg-paper text-ink" : "bg-ink text-paper"
      }`}
    >
      {navItems.map(({ Icon, label }) => (
        <div key={label} className="min-w-avatarLg grid justify-items-center gap-1">
          <div className="flex gap-2">
            <Icon label={`${label}, inativo`} className="size-iconNav" />
            <Icon active label={`${label}, ativo`} className="size-iconNav" />
          </div>
          <span className="text-caption">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function DesignGallery() {
  const [selectedChip, setSelectedChip] = useState(true);
  const [member, setMember] = useState(false);
  const [tab, setTab] = useState("respostas");
  const [notify, setNotify] = useState(true);
  const [agree, setAgree] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [filtro, setFiltro] = useState("tudo");
  const [seguindo, setSeguindo] = useState(false);
  const [ordem, setOrdem] = useState<"atividade" | "recentes">("atividade");
  const [fixada, setFixada] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [codigo, setCodigo] = useState("12");

  return (
    <main className="max-w-contentColumn mx-auto flex flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-title text-ink">Design system do Hub</h1>
        <p className="text-body text-inkMuted">
          Conferência visual. Os valores vêm de docs/design-system/tokens.json; os desenhos, da tela
          29 do protótipo.
        </p>
      </header>

      {/* ---------------------------------------------- tela 29 do protótipo */}
      <Section title="Estados do sistema">
        <div className="grid grid-cols-2 gap-3">
          <Card title="Destaque">
            <div className="flex flex-wrap gap-1">
              <span className="rounded-pill bg-sun text-caption text-ink px-2 font-bold">Hot</span>
              <span className="rounded-pill bg-lavender text-caption text-ink px-2 font-bold">
                2º
              </span>
              <span className="rounded-pill border-inkMuted text-caption text-inkMuted box-border border-2 px-2 font-bold">
                Seguindo
              </span>
            </div>
          </Card>

          <Card title="Ícones de navegação: inativo e ativo, no claro e no escuro" wide>
            <NavProof tone="light" />
            <NavProof tone="dark" />
            <p className="text-caption text-inkMuted">
              Mesma regra para todos: inativo em contorno de 2 px; ativo preenchido, com os detalhes
              internos vazados. O vazado mostra o fundo, então funciona no claro e no escuro.
            </p>
          </Card>

          <Card title="Ícones" wide>
            <div className="grid w-full grid-cols-6 gap-2">
              {icons.map(({ Icon, label }) => (
                <div
                  key={label}
                  className="bg-paper text-ink flex flex-col items-center gap-1 rounded-sm p-2"
                >
                  <Icon label={label} className="size-icon" />
                  <span className="text-caption text-inkMuted text-center">{label}</span>
                </div>
              ))}
            </div>

            <h3 className="text-caption text-inkMuted">Marcas de nível</h3>
            <div className="grid w-full grid-cols-6 gap-2">
              {(
                [
                  ["universe", "Universo"],
                  ["community", "Comunidade"],
                  ["topic", "Tópico"],
                ] as const
              ).map(([level, label]) => (
                <div
                  key={level}
                  className="bg-paper flex flex-col items-center gap-1 rounded-sm p-2"
                >
                  <LevelMark level={level} />
                  <span className="text-caption text-inkMuted text-center">{label}</span>
                </div>
              ))}
              <div className="bg-paper flex flex-col items-center gap-1 rounded-sm p-2">
                <CommunityDoor member={false} />
                <span className="text-caption text-inkMuted text-center">Entrar</span>
              </div>
              <div className="bg-paper flex flex-col items-center gap-1 rounded-sm p-2">
                <CommunityDoor member />
                <span className="text-caption text-inkMuted text-center">Membro</span>
              </div>
            </div>
          </Card>

          <Card title="Carregando">
            <LoadingBlock label="Carregando tópicos">
              <Skeleton className="h-avatarLg w-full" />
              <Skeleton className="h-3 w-1/2" />
            </LoadingBlock>
          </Card>

          <Card title="Erro de conexão">
            <ErrorState
              message="Não foi possível carregar os tópicos. Verifique sua conexão."
              onRetry={() => undefined}
            />
          </Card>

          <Card title="Sucesso">
            <SuccessMessage>Tópico criado em Música Eletrônica</SuccessMessage>
          </Card>

          <Card title="Vazio">
            <EmptyState
              title="Nenhum tópico ainda"
              description="Crie o primeiro. O que mais gente responder fica em destaque amanhã."
              action={<Button size="sm">Criar tópico</Button>}
            />
          </Card>

          <Card title="Perfil sem respostas">
            <EmptyState
              title="Nenhuma resposta ainda"
              description="As respostas de @liasouza aparecem aqui."
            />
          </Card>

          <Card title="Coleção vazia">
            <EmptyState
              title="Sua coleção está vazia"
              description="Toque no olho de um tópico para guardá-lo aqui."
            />
          </Card>

          <Card title="Nenhuma Cabine">
            <EmptyState
              title="Nenhuma conversa ainda"
              description="Abra uma Cabine pelo perfil de alguém das suas comunidades."
              action={<Button size="sm">Nova Cabine</Button>}
            />
          </Card>

          <Card title="Fim da lista">
            <EndOfList />
          </Card>

          <Card title="Convite pendente">
            <div className="bg-paper flex w-full items-center gap-2 rounded-sm p-2">
              <span className="min-w-0 flex-1">
                <span className="text-bodyStrong text-ink block">Aguardando Lia</span>
                <span className="text-caption text-inkMuted block">
                  A Cabine começa quando ela aceitar
                </span>
              </span>
              <Button variant="secondary" size="sm">
                Cancelar
              </Button>
            </div>
            <p className="text-caption text-inkMuted">
              Convites pendentes contam no limite de 10 por dia.
            </p>
          </Card>

          <Card title="Desativado">
            <Button disabled disabledHint="Preencha nome, intro, capa e Universo.">
              Criar comunidade
            </Button>
          </Card>
        </div>
      </Section>

      {/* ------------------------------------------------------------ tokens */}
      <Section title="Cores">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(color).map(([name, value]) => (
            <div key={name} className="bg-paper flex flex-col gap-1 rounded-sm p-2">
              <span
                aria-hidden="true"
                className="h-avatarMd border-line w-full rounded-sm border-2"
                style={{ backgroundColor: value }}
              />
              <span className="text-bodyStrong text-ink">{name}</span>
              <span className="text-caption text-inkMuted">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="bg-paper flex flex-col gap-2 rounded-sm p-3">
          {Object.entries(typography).map(([name, style]) => (
            <div key={name} className="border-line flex flex-col gap-1 border-b pb-2">
              <span className="text-caption text-inkMuted">
                {name} · {style.fontSize}/{style.lineHeight} · peso {style.fontWeight}
              </span>
              <span style={style} className="text-ink">
                Conecte-se pelo que realmente importa
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Espaçamento e raio">
        <div className="bg-paper flex flex-wrap gap-3 rounded-sm p-3">
          {Object.entries(spacing).map(([name, value]) => (
            <div key={name} className="flex flex-col items-start gap-1">
              <span
                aria-hidden="true"
                className="bg-lavender block"
                style={{ width: value, height: value }}
              />
              <span className="text-caption text-inkMuted">
                {name} · {value}
              </span>
            </div>
          ))}
          {Object.entries(radius).map(([name, value]) => (
            <div key={name} className="flex flex-col items-start gap-1">
              <span
                aria-hidden="true"
                className="size-avatarMd bg-lavender block"
                style={{ borderRadius: value }}
              />
              <span className="text-caption text-inkMuted">
                {name} · {value}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------- componentes */}
      <Section title="Componentes">
        <Card title="Filtro segmentado" wide>
          {/* O filtro de Explorar e da busca (F06): Tudo / Comunidades / … */}
          <Segmented
            label="Filtrar resultados"
            atual={filtro}
            onSelect={setFiltro}
            opcoes={[
              { id: "tudo", label: "Tudo" },
              { id: "comunidades", label: "Comunidades" },
              { id: "topicos", label: "Tópicos" },
              { id: "pessoas", label: "Pessoas" },
            ]}
          />
        </Card>

        <Card title="Seguir" wide>
          {/* O olho: ligado quer dizer que você já segue. */}
          <div className="flex items-center gap-2">
            <FollowButton seguindo={false} oQue="Lia Souza" onToggle={() => setSeguindo(true)} />
            <FollowButton seguindo oQue="Lia Souza" onToggle={() => setSeguindo(false)} />
            <FollowButton
              seguindo={seguindo}
              oQue="Lia Souza"
              onToggle={() => setSeguindo((v) => !v)}
            />
          </div>
        </Card>

        <Card title="Capa da comunidade" wide>
          <div className="w-full">
            <CommunityCover
              name="Música Eletrônica"
              coverUrl={null}
              esquerda={
                <CoverButton label="Voltar">
                  <BackIcon decorative className="size-icon" />
                </CoverButton>
              }
              direita={
                <>
                  <CoverButton label="Compartilhar">
                    <ShareIcon decorative className="size-icon" />
                  </CoverButton>
                  {/* Amarelo é o estado "a folha que eu abri está aberta". */}
                  <CoverButton label="Mais opções" ativo controla="exemplo">
                    <MoreOptionsIcon decorative className="size-icon" />
                  </CoverButton>
                </>
              }
            >
              <CommunityDoor member oQue="Música Eletrônica" />
              <span className="text-caption text-paper">3.412 membros</span>
            </CommunityCover>
          </div>
        </Card>

        <Card title="Fixar" wide>
          <div className="flex items-center gap-2">
            <PinButton fixada={false} oQue="Vinil" onToggle={() => setFixada(true)} />
            <PinButton fixada oQue="Vinil" onToggle={() => setFixada(false)} />
            <PinButton fixada={fixada} oQue="Vinil" onToggle={() => setFixada((v) => !v)} />
          </div>
        </Card>

        <Card title="Confirmação" wide>
          <Button size="sm" variant="secondary" onClick={() => setConfirmando((v) => !v)}>
            {confirmando ? "Fechar" : "Abrir"}
          </Button>
          <div className="w-full">
            <ConfirmSheet
              open={confirmando}
              titulo="Sair de Música Eletrônica?"
              descricao="Você deixa de ver os Hot Topics dela no Início. Seus tópicos e respostas continuam na comunidade."
              confirmar="Sair"
              cancelar="Continuar membro"
              onConfirm={() => setConfirmando(false)}
              onCancel={() => setConfirmando(false)}
            />
          </div>
        </Card>

        <Card title="Ordem" wide>
          <SortToggle ordem={ordem} onChange={setOrdem} />
        </Card>

        <Card title="Título de seção" wide>
          <div className="flex w-full flex-col gap-3">
            <SectionTitle>Universos</SectionTitle>
            <SectionTitle
              acao={
                <a className="text-caption text-inkMuted" href="#">
                  Ver todas
                </a>
              }
            >
              Para você
            </SectionTitle>
          </div>
        </Card>

        <Card title="Botão" wide>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Responder</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="highlight">Responder</Button>
            <Button variant="icon" aria-label="Criar tópico">
              <CreateIcon decorative className="size-icon" />
            </Button>
            <Button size="sm">Criar tópico</Button>
            <Button disabled disabledHint="Escolha ao menos 3 comunidades.">
              Continuar
            </Button>
          </div>
        </Card>

        <Card title="Chip" wide>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="Música"
              selected={selectedChip}
              onClick={() => setSelectedChip((v) => !v)}
            />
            <Chip label="Cinema" />
            <Chip label="Música" tone="sun" selected />
          </div>
        </Card>

        <Card title="Campo de texto com contador" wide>
          <TextField
            label="Sua resposta"
            maxLength={240}
            tall
            defaultValue="Achei uma prensagem japonesa num sebo do centro."
            className="w-full"
          />
          <TextField
            label="Descrição do perfil"
            maxLength={120}
            error="Links não são aceitos."
            defaultValue="meusite.com"
            className="w-full"
          />
        </Card>

        <Card title="Cartão de Hot Topic" wide>
          <div className="w-full">
            <HotTopicCard
              topic="primeira festa"
              opening="Como foi a primeira festa que te fez gostar de música eletrônica?"
              people={42}
              answers={87}
            />
          </div>
        </Card>

        <Card title="Cartão de resposta" wide>
          <div className="w-full">
            <AnswerCard author="Lia Souza" handle="liasouza" when="há 2 h">
              Um set de 6 horas num galpão. Saí de lá sabendo que era isso.
            </AnswerCard>
          </div>
        </Card>

        <Card title="Linha de comunidade e linha de tópico" wide>
          <div className="flex w-full flex-col gap-2">
            <CommunityRow
              name="Música Eletrônica"
              members={1240}
              activeTopics={8}
              action={<CommunityDoor member={member} onToggle={() => setMember((v) => !v)} />}
            />
            <TopicRow name="primeira festa" people={42} answers={87} when="há 10 min" />
          </div>
        </Card>

        <Card title="Abas" wide>
          <div className="w-full">
            <Tabs
              label="Seções do perfil"
              activeId={tab}
              onSelect={setTab}
              tabs={[
                { id: "respostas", label: "Respostas" },
                { id: "comunidades", label: "Comunidades" },
                { id: "colecao", label: "Coleção" },
              ]}
            />
          </div>
        </Card>

        <Card title="Caixa de seleção e interruptor" wide>
          <Checkbox
            checked={agree}
            onToggle={() => setAgree((v) => !v)}
            label="Li e aceito os Termos de uso"
          />
          <div className="bg-paper flex w-full items-center gap-2 rounded-sm p-2">
            <span className="text-body text-ink flex-1">Seu tópico ficou em destaque</span>
            <Switch
              checked={notify}
              onToggle={() => setNotify((v) => !v)}
              label="Avisar quando seu tópico ficar em destaque"
            />
          </div>
        </Card>

        <Card title="Campos de uma linha" wide>
          <div className="flex w-full flex-col gap-2">
            <Input label="Email" type="email" placeholder="seu@email.com" />
            <Input label="Nome completo" defaultValue="Ana Lima" />
            <Input
              label="Email"
              type="email"
              defaultValue="invalido"
              error="Informe um email válido"
            />
            <PasswordInput label="Senha" defaultValue="segredo" hint="Mínimo de 8 caracteres" />
          </div>
        </Card>

        <Card title="Código de 6 dígitos" wide>
          <div className="w-full">
            <CodeInput label="Código" value={codigo} onChange={setCodigo} />
          </div>
        </Card>

        <Card title="Etapas" wide>
          <div className="flex w-full flex-col gap-2">
            <Steps total={3} current={1} />
            <Steps total={3} current={2} />
            <Steps total={3} current={3} />
          </div>
        </Card>

        <Card title="Folha inferior" wide>
          <Button size="sm" variant="secondary" onClick={() => setSheetOpen((v) => !v)}>
            {sheetOpen ? "Fechar" : "Abrir"}
          </Button>
          <div className="w-full">
            <BottomSheet title="Ordenar tópicos" open={sheetOpen}>
              <div className="flex flex-col gap-1">
                <Button variant="secondary" size="sm">
                  Por número de respostas
                </Button>
                <Button variant="secondary" size="sm">
                  Mais recentes
                </Button>
              </div>
            </BottomSheet>
          </div>
        </Card>
      </Section>
    </main>
  );
}

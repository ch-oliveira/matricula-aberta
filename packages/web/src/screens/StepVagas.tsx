import { useMemo, useState } from 'react';
import { buscar, resumo } from '../domain/busca';
import { ETAPAS } from '../domain/etapas';
import type { Busca, Resultado } from '../domain/types';
import { useAgora } from '../hooks';
import { useEscolas } from '../services/vagasStore';
import { school, search } from '../stickers/icons';
import { Sticker } from '../stickers/Sticker';
import { RadarMap } from '../components/RadarMap';
import { SchoolCard } from '../components/SchoolCard';
import { DicaAjudante, TituloEtapa } from '../components/ui';

interface Props {
  busca: Busca;
  setBusca: (fn: (b: Busca) => Busca) => void;
  ajudante: boolean;
  comparar: string[];
  setComparar: (fn: (c: string[]) => string[]) => void;
  destaqueId: string | null;
  onEscolher: (id: string) => void;
  onAlerta: (escolaId?: string) => void;
  onAbrirComparador: () => void;
}

type Ordem = 'distancia' | 'vagas';
const PESO = { aberta: 0, ultimas: 1, espera: 2 } as const;

export function StepVagas(p: Props) {
  const { busca } = p;
  const escolas = useEscolas();
  const agora = useAgora();
  const [ordem, setOrdem] = useState<Ordem>('distancia');
  const [soComVaga, setSoComVaga] = useState(false);
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista');

  const todos = useMemo(() => buscar(escolas, busca), [escolas, busca]);
  const res = useMemo(() => resumo(todos), [todos]);
  const lista = useMemo(() => {
    const l = soComVaga ? todos.filter((r) => r.status !== 'espera') : [...todos];
    return l.sort((a: Resultado, b: Resultado) =>
      ordem === 'vagas'
        ? b.oferta.vagas - a.oferta.vagas || a.distanciaKm - b.distanciaKm
        : PESO[a.status] - PESO[b.status] || a.distanciaKm - b.distanciaKm,
    );
  }, [todos, ordem, soComVaga]);

  const etapa = busca.etapa ? ETAPAS[busca.etapa] : null;
  const proximoRaio = [2, 3, 5, 8].find((r) => r > busca.raioKm);

  function irParaCard(id: string) {
    setVista('lista');
    requestAnimationFrame(() => {
      const el = document.getElementById(`escola-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    });
  }

  const fala =
    res.total === 0
      ? `Não encontramos escolas de ${etapa?.nome} nesse raio.`
      : `Encontramos ${res.total} escolas. ${res.comVaga} têm vaga, somando ${res.vagas} vagas. ` +
        lista.slice(0, 3).map((r) => `${r.escola.nome}, a ${r.distanciaKm.toFixed(1).replace('.', ' vírgula ')} quilômetros, ${r.status === 'espera' ? 'lista de espera' : `${r.oferta.vagas} vagas`}.`).join(' ');

  return (
    <section className="etapa" aria-labelledby="t-vagas">
      <TituloEtapa
        id="t-vagas"
        emoji="🏫"
        sticker={school}
        titulo="Vagas perto de você"
        subtitulo={`${etapa?.emoji} ${etapa?.nome} · até ${busca.raioKm} km de ${busca.local?.rotulo}`}
        fala={fala}
      />

      <div className="placar" aria-live="polite">
        <div className="placar-principal">
          <span className="placar-numero">{res.vagas}</span>
          <span className="placar-rotulo">vagas em<br />{res.total} {res.total === 1 ? 'escola' : 'escolas'}</span>
          <span className="selo-vivo"><span className="ponto-vivo" aria-hidden="true" /> Ao vivo</span>
        </div>
        <ul className="placar-semaforo" aria-label="Resumo por situação">
          <li className="s-aberta"><span aria-hidden="true">✅</span> <strong>{res.aberta}</strong> com vaga</li>
          <li className="s-ultimas"><span aria-hidden="true">⚡</span> <strong>{res.ultimas}</strong> últimas</li>
          <li className="s-espera"><span aria-hidden="true">⏳</span> <strong>{res.espera}</strong> em espera</li>
        </ul>
      </div>

      <div className="barra-ferramentas">
        <div className="segmentado" role="radiogroup" aria-label="Forma de ver">
          {(['lista', 'mapa'] as const).map((v) => (
            <label key={v}>
              <input type="radio" name="vista" checked={vista === v} onChange={() => setVista(v)} />
              <span>{v === 'lista' ? '📋 Lista' : '🗺️ Mapa'}</span>
            </label>
          ))}
        </div>
        <label className="seletor">
          <span className="visually-hidden">Ordenar por</span>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
            <option value="distancia">Mais perto primeiro</option>
            <option value="vagas">Mais vagas primeiro</option>
          </select>
        </label>
        <label className="mini-toggle">
          <input type="checkbox" checked={soComVaga} onChange={(e) => setSoComVaga(e.target.checked)} />
          <span>Só com vaga</span>
        </label>
      </div>

      <DicaAjudante ativo={p.ajudante}>
        Verde ✅ = tem vaga. Amarelo ⚡ = poucas vagas, vale ir logo. Vermelho ⏳ = fila de espera: toque em “Avise-me” para receber mensagem quando abrir.
      </DicaAjudante>

      {vista === 'mapa' && busca.local && (
        <RadarMap centro={busca.local} raioKm={busca.raioKm} resultados={lista} onSelecionar={irParaCard} />
      )}

      {lista.length === 0 ? (
        <div className="vazio">
          <div className="vazio-sticker" aria-hidden="true">
            <Sticker icon={search} replayOnHover style={{ width: 96 }} />
          </div>
          <h2>Nenhuma vaga por aqui… ainda!</h2>
          <p>As vagas mudam todo dia. Você pode aumentar a distância ou pedir para ser avisado.</p>
          <div className="vazio-acoes">
            {proximoRaio && (
              <button type="button" className="btn btn-secundario" onClick={() => p.setBusca((b) => ({ ...b, raioKm: proximoRaio }))}>
                Buscar até {proximoRaio} km
              </button>
            )}
            <button type="button" className="btn btn-primario" onClick={() => p.onAlerta()}>
              <span aria-hidden="true">🔔</span> Me avise quando abrir
            </button>
          </div>
        </div>
      ) : (
        vista === 'lista' && (
          <div className="lista-cards">
            {lista.map((r) => (
              <SchoolCard
                key={r.escola.id}
                r={r}
                agora={agora}
                destaque={p.destaqueId === r.escola.id}
                comparando={p.comparar.includes(r.escola.id)}
                podeComparar={p.comparar.length < 3}
                onComparar={() =>
                  p.setComparar((c) => (c.includes(r.escola.id) ? c.filter((x) => x !== r.escola.id) : [...c, r.escola.id]))
                }
                onEscolher={() => p.onEscolher(r.escola.id)}
                onAlerta={() => p.onAlerta(r.escola.id)}
              />
            ))}
            <button type="button" className="card-alerta-geral" onClick={() => p.onAlerta()}>
              <span aria-hidden="true">🔔</span>
              <span>
                <strong>Não achou a ideal?</strong>
                <small>Receba no WhatsApp quando abrir vaga de {etapa?.nome} perto de você.</small>
              </span>
            </button>
          </div>
        )
      )}

      {p.comparar.length > 0 && (
        <div className="bandeja-comparar">
          <span>
            <strong>{p.comparar.length}</strong> de 3 para comparar
          </span>
          <button type="button" className="btn btn-escuro" onClick={p.onAbrirComparador} disabled={p.comparar.length < 2}>
            ⚖️ {p.comparar.length < 2 ? 'Escolha mais 1' : 'Comparar agora'}
          </button>
          <button type="button" className="btn-icone" aria-label="Limpar comparação" onClick={() => p.setComparar(() => [])}>
            ✕
          </button>
        </div>
      )}
    </section>
  );
}


import { useMemo, useState } from 'react';
import { DicaAjudante, TituloEtapa } from '../components/ui';
import { buscar, resumo } from '../domain/busca';
import { ETAPAS } from '../domain/etapas';
import { distanciaKm } from '../domain/geo';
import type { Busca } from '../domain/types';
import { useCatalogo, useEscolas } from '../services/vagasStore';
import { pin } from '../stickers/icons';

interface Props {
  busca: Busca;
  setBusca: (fn: (b: Busca) => Busca) => void;
  ajudante: boolean;
  erro: string | null;
}

const RAIOS = [1, 2, 3, 5];

export function StepOnde({ busca, setBusca, ajudante, erro }: Props) {
  const escolas = useEscolas();
  const catalogo = useCatalogo();
  const [gps, setGps] = useState<'parado' | 'buscando' | 'erro' | 'fora'>('parado');

  const previa = useMemo(() => resumo(buscar(escolas, busca)), [escolas, busca]);

  function usarLocalizacao() {
    if (!('geolocation' in navigator)) {
      setGps('erro');
      return;
    }
    setGps('buscando');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (distanciaKm(p, catalogo.centro) > 25) {
          setGps('fora');
          setBusca((b) => ({
            ...b,
            local: { ...catalogo.centro, rotulo: 'Centro · Patos - PB' },
          }));
          return;
        }
        setGps('parado');
        setBusca((b) => ({ ...b, local: { ...p, rotulo: 'Minha localização em Patos' } }));
      },
      () => setGps('erro'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }

  const etapa = busca.etapa ? ETAPAS[busca.etapa] : null;

  return (
    <section className="etapa" aria-labelledby="t-onde">
      <TituloEtapa
        id="t-onde"
        emoji="📍"
        sticker={pin}
        titulo="Qual o seu bairro em Patos - PB?"
        subtitulo="Usamos isso só para ordenar as creches e escolas municipais mais próximas. Não guardamos sua localização."
        fala="Qual o seu bairro em Patos? Toque em usar minha localização, ou escolha o seu bairro abaixo. Depois escolha a distância máxima até a escola."
      />

      <button type="button" className="btn-gps" onClick={usarLocalizacao} aria-busy={gps === 'buscando'}>
        <span aria-hidden="true" className="btn-gps-icone">{gps === 'buscando' ? '🛰️' : '📍'}</span>
        <span>
          <strong>{gps === 'buscando' ? 'Localizando em Patos - PB…' : 'Usar minha localização atual'}</strong>
          <small>Cálculo direto por GPS no seu celular</small>
        </span>
      </button>
      {gps === 'erro' && (
        <p className="aviso-suave" role="alert">
          <span aria-hidden="true">🙈</span> Não conseguimos ler o GPS. Sem problema — escolha seu bairro de Patos abaixo.
        </p>
      )}
      {gps === 'fora' && (
        <p className="aviso-suave" role="status">
          <span aria-hidden="true">🗺️</span> Você parece estar fora do perímetro urbano de Patos - PB. Selecionamos o{' '}
          <strong>Centro de Patos</strong> como ponto de partida.
        </p>
      )}

      <fieldset className="grupo">
        <legend>Ou escolha o seu bairro em Patos - PB</legend>
        <div className="chips">
          {catalogo.bairros.map((b) => (
            <label key={b.id ?? b.rotulo} className="chip">
              <input
                type="radio"
                name="bairro"
                checked={busca.local?.rotulo === b.rotulo}
                onChange={() => setBusca((x) => ({ ...x, local: b }))}
              />
              <span>{b.rotulo}</span>
            </label>
          ))}
        </div>
        {erro && (
          <p className="erro-campo" role="alert">
            <span aria-hidden="true">⚠️</span> {erro}
          </p>
        )}
      </fieldset>

      {busca.local && (
        <p className="local-escolhido">
          <span aria-hidden="true">📌</span> Ponto de partida em Patos - PB: <strong>{busca.local.rotulo}</strong>
          {busca.local.zona ? ` (${busca.local.zona})` : ''}
        </p>
      )}

      <fieldset className="grupo">
        <legend>Até que distância?</legend>
        <div className="chips chips-iguais">
          {RAIOS.map((r) => (
            <label key={r} className="chip">
              <input
                type="radio"
                name="raio"
                checked={busca.raioKm === r}
                onChange={() => setBusca((b) => ({ ...b, raioKm: r }))}
              />
              <span>{r} km</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>Qual período?</legend>
        <div className="chips chips-iguais">
          {(
            [
              ['tanto-faz', '🤷 Tanto faz'],
              ['integral', '🌞 Integral'],
              ['parcial', '🌤️ Meio período'],
            ] as const
          ).map(([v, r]) => (
            <label key={v} className="chip">
              <input
                type="radio"
                name="periodo"
                checked={busca.periodo === v}
                onChange={() => setBusca((b) => ({ ...b, periodo: v }))}
              />
              <span>{r}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="toggle-linha">
        <input
          type="checkbox"
          checked={busca.soAcessivel}
          onChange={(e) => setBusca((b) => ({ ...b, soAcessivel: e.target.checked }))}
        />
        <span>
          <strong>♿ Só unidades com acessibilidade e Sala AEE</strong>
          <small>Rampas, banheiros adaptados e Atendimento Educacional Especializado</small>
        </span>
      </label>

      <DicaAjudante ativo={ajudante}>
        Pergunte se a família prefere a unidade perto de casa (ex.: Jatobá, Belo Horizonte, Maternidade) ou perto do
        trabalho no Centro de Patos.
      </DicaAjudante>

      {busca.local && etapa && (
        <div className="previa" aria-live="polite">
          <span className="previa-emoji" aria-hidden="true">🔎</span>
          <p>
            {previa.total === 0 ? (
              <>
                Nenhuma unidade de <strong>{etapa.nome}</strong> nesse raio. Tente aumentar a distância para 3 km ou 5
                km.
              </>
            ) : (
              <>
                Encontramos <strong>{previa.total} {previa.total === 1 ? 'unidade' : 'unidades'}</strong> de{' '}
                {etapa.nome} com <strong>{previa.vagas} vagas livres</strong> em até {busca.raioKm} km.
              </>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

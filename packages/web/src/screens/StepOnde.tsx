import { useMemo, useState } from 'react';
import { Icone } from '../components/Icone';
import { BAIRROS_MAPA_PATOS, MapaPatos } from '../components/MapaPatos';
import { DicaAjudante, TituloEtapa } from '../components/ui';
import { distanciaKm } from '../domain/geo';
import type { Busca, Local } from '../domain/types';
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
            local: { ...catalogo.centro, rotulo: 'Centro' },
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

  const bairrosLista: Local[] = useMemo(
    () =>
      catalogo.bairros.length > 0
        ? catalogo.bairros
        : BAIRROS_MAPA_PATOS.map((b) => ({
            id: b.id,
            rotulo: b.rotulo,
            zona: b.zona,
            lat: b.lat,
            lng: b.lng,
          })),
    [catalogo.bairros],
  );

  return (
    <section className="etapa" aria-labelledby="t-onde">
      <TituloEtapa
        id="t-onde"
        emoji="pin"
        sticker={pin}
        titulo="Qual o seu bairro em Patos - PB?"
        subtitulo="Toque no seu bairro no mapa abaixo ou use o GPS. Não guardamos sua localização."
        fala="Qual o seu bairro em Patos? Toque direto no seu bairro no mapa de Patos, ou em usar meu GPS. Depois escolha a distância máxima até a escola."
      />

      <MapaPatos
        bairrosCatalogo={bairrosLista}
        escolas={escolas}
        busca={busca}
        onSelecionarBairro={(local) => setBusca((x) => ({ ...x, local }))}
        onUsarGps={usarLocalizacao}
        gpsStatus={gps}
      />

      {erro && (
        <p className="erro-campo" role="alert">
          <Icone nome="alert-triangle" tamanho={16} /> {erro}
        </p>
      )}
      {gps === 'erro' && (
        <p className="aviso-suave" role="alert">
          <Icone nome="eye-off" tamanho={16} /> Não conseguimos ler o GPS. Toque no seu bairro direto no mapa acima.
        </p>
      )}
      {gps === 'fora' && (
        <p className="aviso-suave" role="status">
          <Icone nome="map" tamanho={16} /> Você parece estar fora de Patos - PB. Selecionamos o{' '}
          <strong>Centro</strong> como ponto de partida.
        </p>
      )}

      <div className="onde-filtros-duplos">
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
                ['tanto-faz', 'clock', 'Tanto faz'],
                ['integral', 'sun', 'Integral'],
                ['parcial', 'cloud-sun', 'Meio período'],
              ] as const
            ).map(([v, icone, r]) => (
              <label key={v} className="chip">
                <input
                  type="radio"
                  name="periodo"
                  checked={busca.periodo === v}
                  onChange={() => setBusca((b) => ({ ...b, periodo: v }))}
                />
                <span>
                  <Icone nome={icone} tamanho={15} /> {r}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="toggle-linha">
        <input
          type="checkbox"
          checked={busca.soAcessivel}
          onChange={(e) => setBusca((b) => ({ ...b, soAcessivel: e.target.checked }))}
        />
        <span>
          <strong>
            <Icone nome="accessibility" tamanho={16} /> Só unidades com acessibilidade e Sala AEE
          </strong>
          <small>Rampas, banheiros adaptados e Atendimento Educacional Especializado</small>
        </span>
      </label>

      <DicaAjudante ativo={ajudante}>
        Pergunte se a família prefere a unidade perto de casa (ex.: Jatobá, Belo Horizonte, Maternidade) ou perto do
        trabalho no Centro de Patos.
      </DicaAjudante>
    </section>
  );
}

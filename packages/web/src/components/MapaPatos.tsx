import { useMemo } from 'react';
import { ETAPAS } from '../domain/etapas';
import { distanciaKm } from '../domain/geo';
import type { Busca, DemandaBairroDTO, Escola, Local } from '../domain/types';
import { Icone } from './Icone';

export interface BairroMapaMeta {
  id: string;
  rotulo: string;
  zona: 'Zona Central' | 'Zona Norte' | 'Zona Sul' | 'Zona Leste' | 'Zona Oeste';
  lat: number;
  lng: number;
  /** Posição X (%) fiel à malha viária real de Patos - PB (viewBox 1000x600) */
  x: number;
  /** Posição Y (%) fiel à malha viária real de Patos - PB (viewBox 1000x600) */
  y: number;
  icone: string;
  marco: string;
}

/**
 * Coordenadas e posições cartográficas reais de Patos - PB (IBGE 2510808),
 * alinhadas aos eixos da BR-230, BR-361, BR-110, Alça Sudeste e Rio Espinharas.
 */
export const BAIRROS_MAPA_PATOS: BairroMapaMeta[] = [
  {
    id: 'noe-trajano',
    rotulo: 'Noé Trajano',
    zona: 'Zona Norte',
    lat: -7.0025,
    lng: -37.2895,
    x: 42,
    y: 19,
    icone: 'music',
    marco: 'Entroncamento BR-230 / BR-110 · Jardim Magnólia',
  },
  {
    id: 'belo-horizonte',
    rotulo: 'Belo Horizonte',
    zona: 'Zona Norte',
    lat: -7.0148,
    lng: -37.2795,
    x: 48,
    y: 35,
    icone: 'graduation-cap',
    marco: 'Eixo BR-110 · Próximo ao Patos Shopping e Novo Horizonte',
  },
  {
    id: 'sao-sebastiao',
    rotulo: 'São Sebastião',
    zona: 'Zona Leste',
    lat: -7.0115,
    lng: -37.2695,
    x: 64,
    y: 28,
    icone: 'shopping-bag',
    marco: 'Margem Leste do Rio Espinharas · R. Antônio Félix',
  },
  {
    id: 'vitoria',
    rotulo: 'Vitória',
    zona: 'Zona Leste',
    lat: -7.0125,
    lng: -37.2554,
    x: 81,
    y: 25,
    icone: 'cactus',
    marco: 'Sete Casas · Rotatória BR-230 / Atacadão',
  },
  {
    id: 'liberdade',
    rotulo: 'Liberdade',
    zona: 'Zona Oeste',
    lat: -7.0235,
    lng: -37.2892,
    x: 33,
    y: 47,
    icone: 'bird',
    marco: 'Adjacente ao Morro e Guedes Shopping',
  },
  {
    id: 'centro',
    rotulo: 'Centro',
    zona: 'Zona Central',
    lat: -7.0244,
    lng: -37.2769,
    x: 54,
    y: 50,
    icone: 'church',
    marco: 'Cruzamento BR-361 / BR-110 · Catedral e Prefeitura',
  },
  {
    id: 'salgadinho',
    rotulo: 'Salgadinho',
    zona: 'Zona Leste',
    lat: -7.0195,
    lng: -37.2615,
    x: 75,
    y: 43,
    icone: 'accordion',
    marco: 'Eixo BR-361 Leste · Adjacente à Brasília e Alça Sudeste',
  },
  {
    id: 'maternidade',
    rotulo: 'Maternidade',
    zona: 'Zona Oeste',
    lat: -7.0315,
    lng: -37.2874,
    x: 39,
    y: 64,
    icone: 'hospital',
    marco: 'Sul da BR-361 · Próximo ao Jardim Guanabara e Bivar Olinto',
  },
  {
    id: 'monte-castelo',
    rotulo: 'Monte Castelo',
    zona: 'Zona Sul',
    lat: -7.0385,
    lng: -37.2755,
    x: 56,
    y: 72,
    icone: 'mountain',
    marco: 'Eixo Sul BR-110 · Hiper Queiroz e Jardim Frei Manoel',
  },
  {
    id: 'jatoba',
    rotulo: 'Jatobá',
    zona: 'Zona Sul',
    lat: -7.0465,
    lng: -37.2725,
    x: 61,
    y: 88,
    icone: 'tree',
    marco: 'Saída Sul BR-110 · Campus UFCG Patos',
  },
];

interface Props {
  bairrosCatalogo: Local[];
  escolas: Escola[];
  busca: Busca;
  onSelecionarBairro: (local: Local) => void;
  onUsarGps?: () => void;
  gpsStatus?: 'parado' | 'buscando' | 'erro' | 'fora';
  demandaSecretaria?: DemandaBairroDTO[];
}

interface StatusBairroCalculado {
  meta: BairroMapaMeta;
  local: Local;
  vagasNoBairro: number;
  unidadesNoBairro: number;
  vagasNoRaio: number;
  unidadesNoRaio: number;
  dentroDoRaio: boolean;
  selecionado: boolean;
}

export function MapaPatos({
  bairrosCatalogo,
  escolas,
  busca,
  onSelecionarBairro,
  onUsarGps,
  gpsStatus = 'parado',
}: Props) {
  const etapaInfo = busca.etapa ? ETAPAS[busca.etapa] : null;

  const itens = useMemo<StatusBairroCalculado[]>(() => {
    return BAIRROS_MAPA_PATOS.map((meta) => {
      const doCatalogo = bairrosCatalogo.find(
        (b) => b.id === meta.id || b.rotulo.toLowerCase() === meta.rotulo.toLowerCase(),
      );
      const local: Local = doCatalogo ?? {
        id: meta.id,
        rotulo: meta.rotulo,
        zona: meta.zona,
        lat: meta.lat,
        lng: meta.lng,
      };

      const escolasDoBairro = escolas.filter(
        (e) => e.bairro.toLowerCase() === meta.rotulo.toLowerCase() && (!busca.soAcessivel || e.acessivel),
      );

      let vagasNoBairro = 0;
      let unidadesNoBairro = 0;

      for (const esc of escolasDoBairro) {
        const ofertasCompativeis = esc.ofertas.filter(
          (o) =>
            (!busca.etapa || o.etapa === busca.etapa) &&
            (busca.periodo === 'tanto-faz' || o.periodo === busca.periodo),
        );
        if (ofertasCompativeis.length > 0) {
          unidadesNoBairro += 1;
          for (const ofr of ofertasCompativeis) {
            vagasNoBairro += ofr.vagas;
          }
        }
      }

      let vagasNoRaio = 0;
      let unidadesNoRaio = 0;
      for (const esc of escolas) {
        if (busca.soAcessivel && !esc.acessivel) continue;
        if (distanciaKm(local, esc) <= busca.raioKm) {
          const ofertasCompativeis = esc.ofertas.filter(
            (o) =>
              (!busca.etapa || o.etapa === busca.etapa) &&
              (busca.periodo === 'tanto-faz' || o.periodo === busca.periodo),
          );
          if (ofertasCompativeis.length > 0) {
            unidadesNoRaio += 1;
            for (const ofr of ofertasCompativeis) {
              vagasNoRaio += ofr.vagas;
            }
          }
        }
      }

      const selecionado =
        busca.local?.rotulo.toLowerCase() === meta.rotulo.toLowerCase() || busca.local?.id === meta.id;

      const distanciaDoSelecionadoKm = busca.local ? distanciaKm(busca.local, local) : null;
      const dentroDoRaio =
        selecionado || (distanciaDoSelecionadoKm !== null && distanciaDoSelecionadoKm <= busca.raioKm);

      return {
        meta,
        local,
        vagasNoBairro,
        unidadesNoBairro,
        vagasNoRaio,
        unidadesNoRaio,
        dentroDoRaio,
        selecionado,
      };
    });
  }, [bairrosCatalogo, escolas, busca]);

  const itemSelecionado = useMemo(() => {
    const direto = itens.find((i) => i.selecionado);
    if (direto) return direto;
    if (!busca.local) return null;
    let maisProximo = itens[0];
    let menorDist = Infinity;
    for (const item of itens) {
      const d = distanciaKm(busca.local, item.local);
      if (d < menorDist) {
        menorDist = d;
        maisProximo = item;
      }
    }
    return maisProximo;
  }, [itens, busca.local]);

  const raioSvg = useMemo(() => {
    const mapaRaio: Record<number, number> = {
      1: 105,
      2: 175,
      3: 245,
      5: 370,
    };
    return mapaRaio[busca.raioKm] ?? 175;
  }, [busca.raioKm]);

  return (
    <div className="mapa-patos-bloco">
      <div className="mapa-patos-barra-topo">
        <div className="mapa-patos-legenda" aria-label="Legenda do mapa de Patos">
          <span className="leg-item leg-ok">
            <i aria-hidden="true" /> Com vaga
          </span>
          <span className="leg-item leg-fila">
            <i aria-hidden="true" /> Fila
          </span>
          <span className="leg-item leg-viz">
            <i aria-hidden="true" /> No raio ({busca.raioKm} km)
          </span>
        </div>

        {onUsarGps && (
          <button
            type="button"
            className="btn-gps-compacto"
            onClick={onUsarGps}
            aria-busy={gpsStatus === 'buscando'}
          >
            <Icone nome={gpsStatus === 'buscando' ? 'radar' : 'pin'} tamanho={16} />
            <span>{gpsStatus === 'buscando' ? 'Localizando…' : 'Usar meu GPS'}</span>
          </button>
        )}
      </div>

      <div className="mapa-patos-palco">
        {/* Mapa Cartográfico Vetorial Fiel à Malha Urbana e Viária de Patos - PB */}
        <svg
          className="mapa-patos-svg"
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* 1. Fundo periurbano / Caatinga e áreas verdes de Patos (Lagoa de Pedra, Sol Nascente, Medeiros) */}
          <rect x="0" y="0" width="1000" height="600" fill="#e5f4df" />

          {/* Mancha de terreno / relevo suave leste-sul */}
          <path
            d="M 650 0 L 1000 0 L 1000 600 L 720 600 Q 680 420 710 240 Z"
            fill="#eef2e6"
            opacity="0.7"
          />

          {/* 2. Perímetro Urbano Consolidado de Patos - PB (Mancha Urbana Creme/Areia fiel ao Google Maps) */}
          <path
            d="M 330 65
               Q 460 50 585 85
               L 775 110
               Q 885 145 895 255
               Q 905 365 865 445
               Q 785 510 685 575
               L 510 590
               Q 470 505 405 465
               L 215 455
               Q 115 440 135 355
               Q 165 280 255 245
               Q 290 155 330 65 Z"
            fill="#f7f2e7"
            stroke="#ded5c3"
            strokeWidth="2.5"
          />

          {/* 3. Malha de Arruamento Urbano (Quadras estilizadas dos bairros de Patos) */}
          <g stroke="#e5decb" strokeWidth="1.4" fill="none">
            {/* Quadras Noé Trajano / Novo Horizonte / Belo Horizonte */}
            <path d="M 340 110 L 540 135 M 330 140 L 550 165 M 345 170 L 560 195 M 360 200 L 565 225" />
            <path d="M 380 95 L 350 240 M 420 100 L 390 250 M 460 105 L 435 260 M 500 110 L 480 265" />

            {/* Quadras São Sebastião / Sete Casas / Salgadinho */}
            <path d="M 595 150 L 820 140 M 600 180 L 835 170 M 605 210 L 840 200 M 615 245 L 850 235" />
            <path d="M 635 125 L 645 330 M 680 125 L 690 340 M 730 125 L 740 350 M 780 130 L 790 355" />
            <path d="M 650 310 L 870 285 M 665 345 L 880 320 M 680 380 L 885 355" />

            {/* Quadras Liberdade / Morro / Maternidade / Bivar Olinto */}
            <path d="M 210 280 L 490 275 M 190 310 L 495 305 M 175 340 L 500 335 M 165 375 L 510 370 M 180 410 L 515 405" />
            <path d="M 235 265 L 245 435 M 285 260 L 295 440 M 335 255 L 345 445 M 385 255 L 395 450 M 440 255 L 450 455" />

            {/* Quadras Monte Castelo / Jatobá */}
            <path d="M 485 420 L 645 405 M 495 455 L 660 440 M 505 490 L 670 475 M 520 525 L 680 510 M 535 560 L 690 545" />
            <path d="M 525 395 L 565 575 M 560 390 L 605 575 M 600 385 L 645 575" />
          </g>

          {/* 4. Hidrografia Real de Patos: Rio Espinharas + Rio da Cruz / Açudes */}
          {/* Açudes e lagoas (Sol Nascente a oeste, Lagoa de Pedra a noroeste, açude sul) */}
          <path
            d="M 215 235 Q 240 225 252 245 Q 238 262 212 252 Z"
            fill="#8fd0ff"
            stroke="#5aaee8"
            strokeWidth="1.5"
          />
          <path
            d="M 165 75 Q 185 68 195 88 Q 178 102 158 90 Z"
            fill="#8fd0ff"
            stroke="#5aaee8"
            strokeWidth="1.5"
          />

          {/* Corredor ripário verde do Rio Espinharas */}
          <path
            d="M 605 0
               Q 572 95 565 185
               Q 560 265 595 330
               Q 635 395 628 465
               Q 622 535 665 600"
            fill="none"
            stroke="#cceac4"
            strokeWidth="34"
            strokeLinecap="round"
          />

          {/* Leito principal do Rio Espinharas (Norte -> Centro/Brasília -> Sul/Sudeste) */}
          <path
            d="M 605 0
               Q 572 95 565 185
               Q 560 265 595 330
               Q 635 395 628 465
               Q 622 535 665 600"
            fill="none"
            stroke="#73c2fb"
            strokeWidth="13"
            strokeLinecap="round"
          />

          {/* Afluente Sudeste (Rio da Cruz / Riacho vindo do Leste/Sudeste juntando próximo à Alça Sudeste) */}
          <path
            d="M 602 342
               Q 690 395 755 465
               Q 805 520 835 600"
            fill="none"
            stroke="#73c2fb"
            strokeWidth="9"
            strokeLinecap="round"
          />

          <text
            x="612"
            y="225"
            fontSize="9.5"
            fontWeight="900"
            fill="#1f6ca6"
            letterSpacing="0.06em"
            transform="rotate(82, 612, 225)"
          >
            RIO ESPINHARAS
          </text>

          {/* 5. Malha Rodoviária Oficial de Patos (BR-230, BR-361, BR-110, PB-275, Alça Sudeste) */}

          {/* Alça Sudeste (ligando BR-110/Monte Castelo à BR-361/Salgadinho/Aeroporto) */}
          <path
            d="M 555 415 Q 685 385 785 318 Q 830 285 835 232"
            fill="none"
            stroke="#d4c5a9"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text
            x="735"
            y="366"
            fontSize="9.5"
            fontWeight="800"
            fill="#6e6555"
            transform="rotate(-26, 735, 366)"
          >
            Alça Sudeste
          </text>

          {/* PB-275 (Subindo do entroncamento da BR-230 para o Norte - Cacimba de Areia) */}
          <path
            d="M 692 148 L 675 0"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 692 148 L 675 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeDasharray="6 6"
          />

          {/* BR-230 (Transamazônica: Noroeste -> Noé Trajano -> São Sebastião -> Rotatória Atacadão -> Leste) */}
          <path
            d="M 195 0
               Q 315 68 415 112
               Q 535 135 692 148
               Q 775 188 835 228
               L 1000 238"
            fill="none"
            stroke="#64748b"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 195 0
               Q 315 68 415 112
               Q 535 135 692 148
               Q 775 188 835 228
               L 1000 238"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2.2"
          />

          {/* BR-361 (Oeste: Várzea da Jurema/Morada do Sol -> Maternidade/Morro -> Centro -> Brasília/Salgadinho -> Rotatória BR-230) */}
          <path
            d="M 0 432
               Q 165 392 315 352
               Q 445 318 545 315
               Q 665 278 835 228"
            fill="none"
            stroke="#64748b"
            strokeWidth="9.5"
            strokeLinecap="round"
          />
          <path
            d="M 0 432
               Q 165 392 315 352
               Q 445 318 545 315
               Q 665 278 835 228"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2"
          />

          {/* BR-110 (Espinha Dorsal Norte-Sul: Noé Trajano -> Belo Horizonte -> Centro -> Monte Castelo -> Jatobá/UFCG) */}
          <path
            d="M 415 112
               Q 465 195 522 268
               Q 555 315 542 385
               Q 548 465 595 600"
            fill="none"
            stroke="#64748b"
            strokeWidth="9.5"
            strokeLinecap="round"
          />
          <path
            d="M 415 112
               Q 465 195 522 268
               Q 555 315 542 385
               Q 548 465 595 600"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2"
          />

          {/* Rotatória Leste (Entroncamento BR-230 / BR-361 / Atacadão) */}
          <circle cx="835" cy="228" r="8" fill="#f8fafc" stroke="#475569" strokeWidth="3.5" />

          {/* 6. Escudos de Rodovias (Estilo Google Maps) */}
          {[
            { x: 345, y: 82, txt: '230', w: 30 },
            { x: 615, y: 142, txt: '230', w: 30 },
            { x: 905, y: 233, txt: '230', w: 30 },
            { x: 684, y: 88, txt: 'PB-275', w: 44 },
            { x: 245, y: 370, txt: '361', w: 30 },
            { x: 685, y: 272, txt: '361', w: 30 },
            { x: 472, y: 202, txt: '110', w: 30 },
            { x: 545, y: 405, txt: '110', w: 30 },
            { x: 582, y: 548, txt: '110', w: 30 },
          ].map((r, i) => (
            <g key={i} transform={`translate(${r.x - r.w / 2}, ${r.y - 9})`}>
              <rect
                x="0"
                y="0"
                width={r.w}
                height="18"
                rx="4"
                fill="#ffffff"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <text
                x={r.w / 2}
                y="12.5"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="900"
                fill="#1e293b"
              >
                {r.txt}
              </text>
            </g>
          ))}

          {/* 7. Rótulos Cartográficos Secundários (Sub-bairros e Pontos de Referência Reais de Patos) */}
          <g className="mapa-rotulos-secundarios">
            <text x="548" y="88">JARDIM MAGNÓLIA</text>
            <text x="392" y="175">NOVO HORIZONTE</text>
            <text x="770" y="135">JARDIM ESTELVINA</text>
            <text x="775" y="196">SETE CASAS</text>
            <text x="632" y="294">BRASÍLIA</text>
            <text x="378" y="328">MORRO</text>
            <text x="195" y="352">MORADA DO SOL</text>
            <text x="115" y="405">VÁRZEA DA JUREMA</text>
            <text x="268" y="428">BIVAR OLINTO</text>
            <text x="335" y="412">JARDIM GUANABARA</text>
            <text x="615" y="432">JARDIM FREI MANOEL</text>
            <text x="845" y="340">JARDIM SANTA TEREZA</text>
            <text x="895" y="395">JARDIM SORAIA</text>
          </g>

          {/* Marcos Urbanos de Referência (Shopping, UFCG, Aeroporto, Atacadão) */}
          <g className="mapa-marcos-referencia">
            <text x="530" y="242" textAnchor="middle">
              Patos Shopping
            </text>
            <text x="448" y="298" textAnchor="middle">
              Guedes Shopping
            </text>
            <text x="835" y="208" textAnchor="middle">
              Atacadão
            </text>
            <text x="890" y="438" textAnchor="middle">
              Aeroporto de Patos
            </text>
            <text x="515" y="555" textAnchor="middle">
              UFCG
            </text>
          </g>

          {/* 8. Halo do Raio de Alcance sobre o Mapa Real de Patos */}
          {itemSelecionado && (
            <circle
              cx={itemSelecionado.meta.x * 10}
              cy={itemSelecionado.meta.y * 6}
              r={raioSvg}
              className="mapa-patos-anel-raio"
            />
          )}
        </svg>

        {/* Pinos Interativos dos 10 Bairros sobre suas Posições Geográficas Reais */}
        <div className="mapa-patos-pinos" role="group" aria-label="Escolha seu bairro no mapa de Patos - PB">
          {itens.map((item) => {
            const { meta, vagasNoBairro, unidadesNoBairro, dentroDoRaio, selecionado } = item;

            const tom: 'ok' | 'fila' | 'neutro' =
              unidadesNoBairro === 0 ? 'neutro' : vagasNoBairro > 0 ? 'ok' : 'fila';

            return (
              <button
                key={meta.id}
                type="button"
                className={[
                  'pino-bairro',
                  `pino-tom-${tom}`,
                  selecionado ? 'pino-selecionado' : '',
                  !selecionado && dentroDoRaio ? 'pino-no-raio' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: `${meta.x}%`,
                  top: `${meta.y}%`,
                }}
                aria-pressed={selecionado}
                onClick={() => onSelecionarBairro(item.local)}
              >
                <span className="pino-icone" aria-hidden="true">
                  <Icone nome={selecionado ? 'pin' : meta.icone} tamanho={15} />
                </span>
                <span className="pino-nome">{meta.rotulo}</span>
                {unidadesNoBairro > 0 && (
                  <span
                    className={`pino-ponto pino-ponto-${tom}`}
                    title={vagasNoBairro > 0 ? `${vagasNoBairro} vagas no bairro` : 'Lista de espera no bairro'}
                  >
                    {vagasNoBairro > 0 ? vagasNoBairro : <Icone nome="hourglass" tamanho={11} />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra Resumo Enxuta em Linha Única */}
      {itemSelecionado ? (
        <div className="mapa-patos-resumo-bar" aria-live="polite">
          <div className="mapa-resumo-local">
            <span className="mapa-resumo-icone" aria-hidden="true">
              <Icone nome={itemSelecionado.meta.icone} tamanho={20} />
            </span>
            <div>
              <strong>{busca.local?.rotulo ?? itemSelecionado.meta.rotulo}</strong>
              <small>{itemSelecionado.meta.marco}</small>
            </div>
          </div>

          <div className="mapa-resumo-pills">
            <span className="mapa-pill-dado">
              <strong>{itemSelecionado.unidadesNoRaio}</strong>{' '}
              {itemSelecionado.unidadesNoRaio === 1 ? 'escola' : 'escolas'} em {busca.raioKm} km
            </span>
            <span className="mapa-pill-dado mapa-pill-vagas">
              <strong>{itemSelecionado.vagasNoRaio}</strong> vagas
              {etapaInfo ? ` (${etapaInfo.nome})` : ''}
            </span>
          </div>
        </div>
      ) : (
        <p className="mapa-patos-dica-toque">
          <Icone nome="hand-tap" tamanho={16} /> Toque no seu bairro no mapa de Patos acima para ver as escolas mais
          próximas.
        </p>
      )}
    </div>
  );
}
